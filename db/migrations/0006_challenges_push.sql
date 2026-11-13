-- 0006 · Desafio criado pelos participantes (sem admin), convites por e-mail,
-- notificações push (fila de envio) e fechamento de período por qualquer participante.

-- ---------------------------------------------------------------------------
-- Políticas: quem participa de um desafio pode alterá-lo; admin só cuida de modalidades.
-- ---------------------------------------------------------------------------
drop policy if exists challenges_admin_write on public.challenges;
create policy challenges_member_update on public.challenges for update to app_user
  using (public.is_challenge_member(id, public.current_user_id()))
  with check (public.is_challenge_member(id, public.current_user_id()));

drop policy if exists participants_admin_write on public.challenge_participants;
create policy participants_delete_self on public.challenge_participants for delete to app_user
  using (user_id = public.current_user_id());

drop policy if exists awards_admin_write on public.awards;
create policy awards_member_write on public.awards for all to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()))
  with check (public.is_challenge_member(challenge_id, public.current_user_id()));

-- ---------------------------------------------------------------------------
-- Criação de desafio pelo próprio usuário (ele entra automaticamente).
-- Uma pessoa participa de um desafio por vez.
-- ---------------------------------------------------------------------------
create or replace function public.create_challenge(p_name text, p_limit integer, p_starts date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Você precisa estar logado.' using errcode = '42501';
  end if;
  if exists (select 1 from public.challenge_participants where user_id = v_uid) then
    raise exception 'Você já participa de um desafio.' using errcode = 'check_violation';
  end if;
  if char_length(trim(p_name)) < 3 or char_length(trim(p_name)) > 80 then
    raise exception 'O nome do desafio precisa ter entre 3 e 80 caracteres.' using errcode = 'check_violation';
  end if;
  if p_limit < 0 or p_limit > 10 then
    raise exception 'O limite diário deve estar entre 0 e 10 pontos.' using errcode = 'check_violation';
  end if;

  insert into public.challenges (name, daily_point_limit, starts_on)
  values (trim(p_name), p_limit, coalesce(p_starts, current_date))
  returning id into v_id;

  insert into public.challenge_participants (challenge_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Convites: um convite pendente por desafio, válido por 7 dias, aceito só pelo e-mail convidado.
-- ---------------------------------------------------------------------------
create table public.challenge_invitations (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  invited_by    uuid not null references public.profiles (id) on delete cascade,
  invited_email text not null check (position('@' in invited_email) > 1),
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_by   uuid references public.profiles (id) on delete set null,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

create unique index challenge_invitations_one_pending
  on public.challenge_invitations (challenge_id) where status = 'pending';

alter table public.challenge_invitations enable row level security;

create policy invitations_select_members on public.challenge_invitations for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()));

-- Cria (ou substitui) o convite pendente. Só participantes, e só enquanto há vaga.
create or replace function public.create_invitation(p_challenge uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_email text := lower(trim(p_email));
  v_token text;
begin
  if v_uid is null or not public.is_challenge_member(p_challenge, v_uid) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;
  if (select count(*) from public.challenge_participants where challenge_id = p_challenge) >= 2 then
    raise exception 'O desafio já tem 2 participantes.' using errcode = 'check_violation';
  end if;
  if v_email = (select lower(email) from public.users where id = v_uid) then
    raise exception 'Use o e-mail do seu parceiro(a), não o seu.' using errcode = 'check_violation';
  end if;

  update public.challenge_invitations set status = 'cancelled'
   where challenge_id = p_challenge and status = 'pending';

  insert into public.challenge_invitations (challenge_id, invited_by, invited_email)
  values (p_challenge, v_uid, v_email)
  returning token into v_token;
  return v_token;
end;
$$;

-- Dados exibidos na página do convite (só para quem tem o link).
create or replace function public.invitation_preview(p_token text)
returns table (challenge_name text, inviter_name text, invited_email text, valid boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.name, p.display_name, i.invited_email,
         (i.status = 'pending' and i.expires_at > now())
    from public.challenge_invitations i
    join public.challenges c on c.id = i.challenge_id
    join public.profiles p on p.id = i.invited_by
   where i.token = p_token;
$$;

-- Aceita o convite: o e-mail da conta logada precisa ser o convidado.
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_inv public.challenge_invitations;
  v_email text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Você precisa estar logado.' using errcode = '42501';
  end if;
  if exists (select 1 from public.challenge_participants where user_id = v_uid) then
    raise exception 'Você já participa de um desafio.' using errcode = 'check_violation';
  end if;

  select * into v_inv from public.challenge_invitations where token = p_token for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'Convite inválido ou expirado.' using errcode = 'check_violation';
  end if;

  select lower(email) into v_email from public.users where id = v_uid;
  if v_email <> v_inv.invited_email then
    raise exception 'Este convite foi enviado para outro e-mail. Entre com o e-mail convidado.' using errcode = '42501';
  end if;

  insert into public.challenge_participants (challenge_id, user_id) values (v_inv.challenge_id, v_uid);

  update public.challenge_invitations
     set status = 'accepted', accepted_by = v_uid, accepted_at = now()
   where id = v_inv.id;

  select display_name into v_name from public.profiles where id = v_uid;
  insert into public.notifications (user_id, kind, title, body, link)
  values (v_inv.invited_by, 'invite_accepted', 'Convite aceito!',
          coalesce(v_name, 'Seu parceiro(a)') || ' entrou no desafio.', '/desafio');

  return v_inv.challenge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notificações push: fila de envio e assinaturas dos dispositivos.
-- ---------------------------------------------------------------------------
alter table public.notifications add column if not exists push_sent_at timestamptz;
create index if not exists notifications_push_pending_idx
  on public.notifications (created_at) where push_sent_at is null;

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy push_select_own on public.push_subscriptions for select to app_user
  using (user_id = public.current_user_id());
create policy push_insert_own on public.push_subscriptions for insert to app_user
  with check (user_id = public.current_user_id());
create policy push_delete_own on public.push_subscriptions for delete to app_user
  using (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- Fechamento de período: qualquer participante pode fechar um período encerrado.
-- ---------------------------------------------------------------------------
create or replace function public.close_period(
  p_challenge uuid,
  p_period public.award_period,
  p_anchor date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_from date;
  v_to date;
  v_top bigint;
  v_count integer;
  v_award uuid;
  v_row record;
  v_is_win boolean;
  v_is_tie boolean;
  v_exists boolean;
  v_body text;
  v_name text;
begin
  -- Qualquer participante do desafio pode fechar um período já encerrado.
  if public.current_user_id() is not null
     and not public.is_challenge_member(p_challenge, public.current_user_id()) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.challenges where id = p_challenge) then
    raise exception 'Desafio inexistente.' using errcode = 'no_data_found';
  end if;

  if p_period = 'weekly' then
    v_from := date_trunc('week', p_anchor)::date;
    v_to := v_from + 6;
    select exists (select 1 from public.weekly_results
                   where challenge_id = p_challenge and period_start = v_from) into v_exists;
  else
    v_from := date_trunc('month', p_anchor)::date;
    v_to := (v_from + interval '1 month - 1 day')::date;
    select exists (select 1 from public.monthly_results
                   where challenge_id = p_challenge and period_start = v_from) into v_exists;
  end if;

  if v_to >= v_today then
    raise exception 'O período ainda está em andamento.' using errcode = 'check_violation';
  end if;

  if v_exists then
    return false; -- já fechado: operação idempotente
  end if;

  select max(s.points) into v_top
  from public.standings(p_challenge, v_from, v_to) s;

  select count(*) into v_count
  from public.standings(p_challenge, v_from, v_to) s
  where s.points = v_top;

  select a.id into v_award
  from public.awards a
  where a.challenge_id = p_challenge and a.period = p_period and a.is_active
  order by a.created_at desc
  limit 1;

  for v_row in select * from public.standings(p_challenge, v_from, v_to) loop
    v_is_win := coalesce(v_top, 0) > 0 and v_row.points = v_top and v_count = 1;
    v_is_tie := coalesce(v_top, 0) > 0 and v_row.points = v_top and v_count > 1;

    if p_period = 'weekly' then
      insert into public.weekly_results
        (challenge_id, period_start, period_end, user_id, points, activity_count, is_winner, is_tie, award_id)
      values
        (p_challenge, v_from, v_to, v_row.user_id, v_row.points, v_row.activity_count,
         v_is_win, v_is_tie, case when v_is_win then v_award end);
    else
      insert into public.monthly_results
        (challenge_id, period_start, period_end, user_id, points, activity_count, is_winner, is_tie, award_id)
      values
        (p_challenge, v_from, v_to, v_row.user_id, v_row.points, v_row.activity_count,
         v_is_win, v_is_tie, case when v_is_win then v_award end);
    end if;
  end loop;

  if coalesce(v_top, 0) = 0 then
    v_body := 'Nenhuma atividade aprovada no período.';
  elsif v_count > 1 then
    v_body := 'Houve empate no período.';
  else
    select st.display_name into v_name
    from public.standings(p_challenge, v_from, v_to) st
    where st.points = v_top
    limit 1;
    v_body := coalesce(v_name, 'Um participante') || ' venceu o período.';
  end if;

  insert into public.notifications (user_id, kind, title, body, link)
  select st.user_id,
         'period_closed',
         'Ranking ' || case when p_period = 'weekly' then 'semanal' else 'mensal' end || ' encerrado',
         v_body,
         '/ranking'
  from public.standings(p_challenge, v_from, v_to) st;

  -- Conquistas de campeão (e demais critérios) são reavaliadas para cada participante.
  for v_row in select st.user_id from public.standings(p_challenge, v_from, v_to) st loop
    perform public.evaluate_achievements(p_challenge, v_row.user_id);
  end loop;

  return true;
end;
$$;


grant execute on function public.create_challenge(text, integer, date) to app_user;
grant execute on function public.create_invitation(uuid, text) to app_user;
grant execute on function public.invitation_preview(text) to app_user;
grant execute on function public.accept_invitation(text) to app_user;
grant execute on function public.close_period(uuid, public.award_period, date) to app_user;
