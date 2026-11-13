-- 0002 · Regras de negócio no backend (fonte da verdade da pontuação).
-- O frontend NUNCA envia pontos: o trigger recalcula `points_awarded` sempre.

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer evita recursão nas políticas de RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = public.current_user_id() and p.role = 'admin'
  );
$$;

create or replace function public.is_challenge_member(p_challenge uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.challenge_participants cp
    where cp.challenge_id = p_challenge and cp.user_id = p_user
  );
$$;

-- Verdadeiro se o usuário autenticado compartilha algum desafio com p_user.
create or replace function public.shares_challenge_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.challenge_participants me
    join public.challenge_participants other
      on other.challenge_id = me.challenge_id
    where me.user_id = public.current_user_id() and other.user_id = p_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Ranking: soma apenas atividades APROVADAS dentro do intervalo.
-- ---------------------------------------------------------------------------
create or replace function public.standings(p_challenge uuid, p_from date, p_to date)
returns table (
  user_id        uuid,
  display_name   text,
  nickname       text,
  avatar_path    text,
  points         bigint,
  activity_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    cp.user_id,
    pr.display_name,
    pr.nickname,
    pr.avatar_path,
    coalesce(sum(a.points_awarded), 0)::bigint as points,
    count(a.id)::bigint as activity_count
  from public.challenge_participants cp
  join public.profiles pr on pr.id = cp.user_id
  left join public.activities a
    on a.user_id = cp.user_id
   and a.challenge_id = cp.challenge_id
   and a.status = 'approved'
   and a.activity_date between p_from and p_to
  where cp.challenge_id = p_challenge
  group by cp.user_id, pr.display_name, pr.nickname, pr.avatar_path;
$$;

-- Líder do período; null se não houver pontuação ou se houver empate.
-- p_user/p_delta permitem simular o placar "antes" de uma mudança.
create or replace function public.period_leader(
  p_challenge uuid,
  p_from date,
  p_to date,
  p_user uuid default null,
  p_delta integer default 0
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_top bigint;
  v_count integer;
  v_leader uuid;
begin
  select max(s.pts) into v_top
  from (
    select st.user_id,
           st.points + case when st.user_id = p_user then p_delta else 0 end as pts
    from public.standings(p_challenge, p_from, p_to) st
  ) s;

  if v_top is null or v_top <= 0 then
    return null;
  end if;

  select count(*), min(s.user_id::text)::uuid
    into v_count, v_leader
  from (
    select st.user_id,
           st.points + case when st.user_id = p_user then p_delta else 0 end as pts
    from public.standings(p_challenge, p_from, p_to) st
  ) s
  where s.pts = v_top;

  if v_count <> 1 then
    return null;
  end if;
  return v_leader;
end;
$$;

-- ---------------------------------------------------------------------------
-- Conquistas: avalia critérios e insere apenas as novas (idempotente).
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_achievements(p_challenge uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with s as (
    select
      (select count(*) from public.activities a
        where a.challenge_id = p_challenge and a.user_id = p_user and a.status = 'approved') as n_act,
      (select coalesce(sum(a.points_awarded), 0) from public.activities a
        where a.challenge_id = p_challenge and a.user_id = p_user and a.status = 'approved') as pts,
      (select count(distinct a.activity_date) from public.activities a
        where a.challenge_id = p_challenge and a.user_id = p_user and a.status = 'approved') as days,
      (select exists (
          select 1 from public.activities a
          join public.activity_categories c on c.id = a.category_id
          where a.challenge_id = p_challenge and a.user_id = p_user
            and a.status = 'approved' and c.name = 'Corrida')) as has_run,
      (select coalesce(max(g.cnt), 0) from (
          select count(*) as cnt
          from (
            select d.day - (row_number() over (order by d.day))::integer as grp
            from (
              select distinct a.activity_date as day
              from public.activities a
              where a.challenge_id = p_challenge and a.user_id = p_user and a.status = 'approved'
            ) d
          ) x
          group by x.grp
        ) g) as streak,
      (select exists (select 1 from public.weekly_results w
         where w.challenge_id = p_challenge and w.user_id = p_user and w.is_winner)) as wk,
      (select exists (select 1 from public.monthly_results m
         where m.challenge_id = p_challenge and m.user_id = p_user and m.is_winner)) as mo
  ),
  earned as (
    select 'first_activity'    as code from s where s.n_act >= 1
    union all select 'first_run'       from s where s.has_run
    union all select 'active_days_5'   from s where s.days >= 5
    union all select 'activities_10'   from s where s.n_act >= 10
    union all select 'points_20'       from s where s.pts >= 20
    union all select 'streak_3'        from s where s.streak >= 3
    union all select 'weekly_champion' from s where s.wk
    union all select 'monthly_champion' from s where s.mo
  ),
  ins as (
    insert into public.user_achievements (challenge_id, user_id, achievement_code)
    select p_challenge, p_user, e.code from earned e
    on conflict do nothing
    returning achievement_code
  )
  insert into public.notifications (user_id, kind, title, body, link)
  select p_user, 'achievement_unlocked', 'Conquista desbloqueada!',
         a.title || ' — ' || a.description, '/conquistas'
  from ins
  join public.achievements a on a.code = ins.achievement_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Validação de atividade (usada no INSERT e em edições do dono)
-- ---------------------------------------------------------------------------
create or replace function public.assert_activity_rules(a public.activities, p_exclude uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.challenges;
  v_cat public.activity_categories;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_used integer;
begin
  select * into v_challenge from public.challenges where id = a.challenge_id;
  if not found or not v_challenge.is_active then
    raise exception 'Desafio inativo ou inexistente.' using errcode = 'check_violation';
  end if;

  if not public.is_challenge_member(a.challenge_id, a.user_id) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;

  select * into v_cat from public.activity_categories where id = a.category_id;
  if not found or not v_cat.is_active then
    raise exception 'Modalidade indisponível.' using errcode = 'check_violation';
  end if;

  if a.activity_date > v_today then
    raise exception 'Não é possível registrar atividades em datas futuras.' using errcode = 'check_violation';
  end if;

  if a.duration_minutes < v_cat.min_duration_minutes then
    raise exception 'Duração mínima para % é de % minutos.', v_cat.name, v_cat.min_duration_minutes
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.activities x
    where x.user_id = a.user_id
      and x.category_id = a.category_id
      and x.activity_date = a.activity_date
      and x.activity_time = a.activity_time
      and x.id is distinct from p_exclude
  ) then
    raise exception 'Esta atividade já foi registrada.' using errcode = 'unique_violation';
  end if;

  -- Serializa o cálculo do limite por usuário+desafio+dia (evita corrida entre duas abas).
  perform pg_advisory_xact_lock(
    hashtext(a.user_id::text || ':' || a.challenge_id::text || ':' || a.activity_date::text)
  );

  select coalesce(sum(c.points), 0) into v_used
  from public.activities x
  join public.activity_categories c on c.id = x.category_id
  where x.user_id = a.user_id
    and x.challenge_id = a.challenge_id
    and x.activity_date = a.activity_date
    and x.status <> 'rejected'
    and x.id is distinct from p_exclude;

  if v_used + v_cat.points > v_challenge.daily_point_limit then
    raise exception 'Limite diário de % pontos atingido.', v_challenge.daily_point_limit
      using errcode = 'check_violation';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: INSERT de atividade
-- ---------------------------------------------------------------------------
create or replace function public.activities_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_id() is not null and new.user_id <> public.current_user_id() then
    raise exception 'Você só pode registrar as próprias atividades.' using errcode = '42501';
  end if;

  if new.proof_path not like ('proofs/' || new.user_id::text || '/%') then
    raise exception 'Comprovação inválida.' using errcode = 'check_violation';
  end if;

  perform public.assert_activity_rules(new, null);

  -- Estado inicial fixo: nasce pendente e sem pontos.
  new.status := 'pending';
  new.points_awarded := 0;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.review_note := null;
  return new;
end;
$$;

create trigger trg_activities_before_insert
  before insert on public.activities
  for each row execute function public.activities_before_insert();

-- ---------------------------------------------------------------------------
-- Trigger: UPDATE de atividade (permissões, aprovação e pontuação)
-- ---------------------------------------------------------------------------
create or replace function public.activities_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_admin boolean := public.is_admin();
  v_owner boolean := v_uid is not null and v_uid = old.user_id;
  v_status_changed boolean := new.status is distinct from old.status;
  v_fields_changed boolean;
  v_points integer;
begin
  if new.id <> old.id or new.user_id <> old.user_id or new.challenge_id <> old.challenge_id
     or new.proof_path <> old.proof_path or new.proof_kind <> old.proof_kind
     or new.created_at <> old.created_at then
    raise exception 'Identificação e comprovação da atividade não podem ser alteradas.'
      using errcode = '42501';
  end if;

  v_fields_changed := new.category_id <> old.category_id
    or new.activity_date <> old.activity_date
    or new.activity_time <> old.activity_time
    or new.duration_minutes <> old.duration_minutes
    or new.distance_km is distinct from old.distance_km
    or new.description is distinct from old.description;

  -- Ninguém aprova a própria atividade (vale inclusive para admin).
  if v_status_changed and v_owner and new.status <> old.status then
    raise exception 'Você não pode aprovar ou contestar a própria atividade.' using errcode = '42501';
  end if;

  if v_admin then
    if v_fields_changed and new.status <> 'rejected' then
      perform public.assert_activity_rules(new, old.id);
    end if;
  elsif v_owner then
    if old.status <> 'pending' then
      raise exception 'Atividade já avaliada não pode ser editada.' using errcode = '42501';
    end if;
    if new.status <> 'pending' then
      raise exception 'Você não pode alterar o status da própria atividade.' using errcode = '42501';
    end if;
    perform public.assert_activity_rules(new, old.id);
  elsif v_uid is not null and public.is_challenge_member(old.challenge_id, v_uid) then
    -- Outro participante do casal: apenas aprova ou contesta uma atividade pendente.
    if old.status <> 'pending' then
      raise exception 'Esta atividade já foi avaliada.' using errcode = '42501';
    end if;
    if not v_status_changed or new.status = 'pending' or v_fields_changed then
      raise exception 'Você só pode aprovar ou contestar esta atividade.' using errcode = '42501';
    end if;
  else
    raise exception 'Sem permissão para alterar esta atividade.' using errcode = '42501';
  end if;

  if v_status_changed then
    if new.status = 'pending' then
      new.reviewed_by := null;
      new.reviewed_at := null;
    else
      new.reviewed_by := v_uid;
      new.reviewed_at := now();
    end if;
  end if;

  select c.points into v_points from public.activity_categories c where c.id = new.category_id;
  new.points_awarded := case when new.status = 'approved' then coalesce(v_points, 0) else 0 end;
  return new;
end;
$$;

create trigger trg_activities_before_update
  before update on public.activities
  for each row execute function public.activities_before_update();

-- ---------------------------------------------------------------------------
-- Trigger: pós-INSERT/UPDATE de atividade (histórico, notificações, conquistas, liderança)
-- ---------------------------------------------------------------------------
create or replace function public.activities_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_name text;
begin
  select c.name into v_cat_name from public.activity_categories c where c.id = new.category_id;

  insert into public.notifications (user_id, kind, title, body, link)
  select cp.user_id,
         'activity_created',
         'Nova atividade para validar',
         coalesce(v_cat_name, 'Atividade') || ' em ' || to_char(new.activity_date, 'DD/MM') || ' aguarda sua aprovação.',
         '/atividades/' || new.id
  from public.challenge_participants cp
  where cp.challenge_id = new.challenge_id and cp.user_id <> new.user_id;

  return null;
end;
$$;

create trigger trg_activities_after_insert
  after insert on public.activities
  for each row execute function public.activities_after_insert();

create or replace function public.activities_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_name text;
  v_delta integer := new.points_awarded - old.points_awarded;
  v_scope record;
  v_before uuid;
  v_after uuid;
  v_leader_name text;
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    insert into public.activity_approvals (activity_id, reviewer_id, decision, note)
    values (new.id, new.reviewed_by, new.status, new.review_note);

    select c.name into v_cat_name from public.activity_categories c where c.id = new.category_id;

    insert into public.notifications (user_id, kind, title, body, link)
    values (
      new.user_id,
      case when new.status = 'approved' then 'activity_approved' else 'activity_rejected' end,
      case when new.status = 'approved' then 'Atividade aprovada' else 'Atividade contestada' end,
      coalesce(v_cat_name, 'Atividade') || ' de ' || to_char(new.activity_date, 'DD/MM')
        || case when new.status = 'approved' then ' contou para o ranking.' else ' não foi aceita.' end,
      '/atividades/' || new.id
    );

    if new.status = 'approved' then
      perform public.evaluate_achievements(new.challenge_id, new.user_id);
    end if;
  end if;

  -- Mudança de liderança nos períodos afetados pela alteração de pontos.
  if v_delta <> 0 then
    for v_scope in
      select s.kind, s.p_from, s.p_to
      from (values
        ('semanal'::text,
          date_trunc('week', new.activity_date)::date,
          (date_trunc('week', new.activity_date) + interval '6 days')::date),
        ('mensal'::text,
          date_trunc('month', new.activity_date)::date,
          (date_trunc('month', new.activity_date) + interval '1 month - 1 day')::date)
      ) as s(kind, p_from, p_to)
    loop
      v_before := public.period_leader(new.challenge_id, v_scope.p_from, v_scope.p_to, new.user_id, -v_delta);
      v_after := public.period_leader(new.challenge_id, v_scope.p_from, v_scope.p_to, null, 0);

      if v_after is not null and v_after is distinct from v_before then
        select pr.display_name into v_leader_name from public.profiles pr where pr.id = v_after;

        insert into public.notifications (user_id, kind, title, body, link)
        select cp.user_id,
               'leadership_change',
               'Mudança de liderança',
               coalesce(v_leader_name, 'Um participante') || ' assumiu a liderança do ranking ' || v_scope.kind || '.',
               '/ranking'
        from public.challenge_participants cp
        where cp.challenge_id = new.challenge_id;
      end if;
    end loop;
  end if;

  return null;
end;
$$;

create trigger trg_activities_after_update
  after update on public.activities
  for each row execute function public.activities_after_update();

-- Alterar a pontuação de uma modalidade recalcula atividades já existentes.
create or replace function public.category_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.points is distinct from old.points then
    update public.activities
       set points_awarded = case when status = 'approved' then new.points else 0 end
     where category_id = new.id;
  end if;
  return null;
end;
$$;

create trigger trg_category_after_update
  after update on public.activity_categories
  for each row execute function public.category_after_update();

-- ---------------------------------------------------------------------------
-- Proteção de perfil: só admin altera o papel (role).
-- ---------------------------------------------------------------------------
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Somente administradores podem alterar papéis.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ---------------------------------------------------------------------------
-- Auditoria: INSERT/UPDATE/DELETE em tabelas sensíveis.
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb;
begin
  if tg_op = 'DELETE' then
    j := to_jsonb(old);
  else
    j := to_jsonb(new);
  end if;

  insert into public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
  values (
    tg_table_name,
    coalesce(j ->> 'id', (j ->> 'challenge_id') || ':' || (j ->> 'user_id')),
    tg_op,
    public.current_user_id(),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger trg_audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();
create trigger trg_audit_challenges
  after insert or update or delete on public.challenges
  for each row execute function public.audit_row_change();
create trigger trg_audit_participants
  after insert or update or delete on public.challenge_participants
  for each row execute function public.audit_row_change();
create trigger trg_audit_categories
  after insert or update or delete on public.activity_categories
  for each row execute function public.audit_row_change();
create trigger trg_audit_activities
  after insert or update or delete on public.activities
  for each row execute function public.audit_row_change();
create trigger trg_audit_awards
  after insert or update or delete on public.awards
  for each row execute function public.audit_row_change();
