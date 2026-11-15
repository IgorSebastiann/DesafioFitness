-- 0009 · Reações e comentários nas atividades + lembrete diário de treino.

-- ---------------------------------------------------------------------------
-- Quem participa do desafio da atividade (security definer evita recursão no RLS).
-- ---------------------------------------------------------------------------
create or replace function public.is_activity_member(p_activity uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.activities a
      join public.challenge_participants cp on cp.challenge_id = a.challenge_id
     where a.id = p_activity and cp.user_id = public.current_user_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- Reações (uma de cada emoji por pessoa e atividade)
-- ---------------------------------------------------------------------------
create table public.activity_reactions (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  emoji       text not null check (emoji in ('🔥', '💪', '👏', '😮', '❤️')),
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id, emoji)
);

alter table public.activity_reactions enable row level security;
create policy reactions_select on public.activity_reactions for select to app_user
  using (public.is_activity_member(activity_id) or public.is_admin());
create policy reactions_insert_own on public.activity_reactions for insert to app_user
  with check (user_id = public.current_user_id() and public.is_activity_member(activity_id));
create policy reactions_delete_own on public.activity_reactions for delete to app_user
  using (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- Comentários
-- ---------------------------------------------------------------------------
create table public.activity_comments (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 300),
  created_at  timestamptz not null default now()
);

create index activity_comments_activity_idx on public.activity_comments (activity_id, created_at);

alter table public.activity_comments enable row level security;
create policy comments_select on public.activity_comments for select to app_user
  using (public.is_activity_member(activity_id) or public.is_admin());
create policy comments_insert_own on public.activity_comments for insert to app_user
  with check (user_id = public.current_user_id() and public.is_activity_member(activity_id));
create policy comments_delete_own on public.activity_comments for delete to app_user
  using (user_id = public.current_user_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Avisos: reação avisa o dono da atividade (no máximo um aviso a cada 30 min por atividade,
-- para não virar spam ao trocar de emoji); comentário avisa os outros participantes.
-- ---------------------------------------------------------------------------
create or replace function public.activity_reaction_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_label text;
  v_name text;
  v_link text := '/atividades/' || new.activity_id;
begin
  select a.user_id, c.name || ' de ' || to_char(a.activity_date, 'DD/MM')
    into v_owner, v_label
    from public.activities a join public.activity_categories c on c.id = a.category_id
   where a.id = new.activity_id;

  if v_owner is null or v_owner = new.user_id then
    return null;
  end if;
  if exists (
    select 1 from public.notifications
     where user_id = v_owner and kind = 'reaction' and link = v_link
       and created_at > now() - interval '30 minutes'
  ) then
    return null;
  end if;

  select coalesce(p.nickname, p.display_name) into v_name from public.profiles p where p.id = new.user_id;
  insert into public.notifications (user_id, kind, title, body, link)
  values (v_owner, 'reaction', coalesce(v_name, 'Seu parceiro') || ' reagiu ' || new.emoji,
          'Na sua atividade: ' || v_label || '.', v_link);
  return null;
end;
$$;

create trigger trg_activity_reaction_notify
  after insert on public.activity_reactions
  for each row execute function public.activity_reaction_notify();

create or replace function public.activity_comment_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge uuid;
  v_name text;
begin
  select a.challenge_id into v_challenge from public.activities a where a.id = new.activity_id;
  select coalesce(p.nickname, p.display_name) into v_name from public.profiles p where p.id = new.user_id;

  insert into public.notifications (user_id, kind, title, body, link)
  select cp.user_id, 'comment', coalesce(v_name, 'Seu parceiro') || ' comentou',
         left(new.body, 140), '/atividades/' || new.activity_id || '#comentarios'
    from public.challenge_participants cp
   where cp.challenge_id = v_challenge and cp.user_id <> new.user_id;
  return null;
end;
$$;

create trigger trg_activity_comment_notify
  after insert on public.activity_comments
  for each row execute function public.activity_comment_notify();

revoke execute on function public.activity_reaction_notify() from public, app_user;
revoke execute on function public.activity_comment_notify() from public, app_user;

-- ---------------------------------------------------------------------------
-- Lembrete diário (chamado pelo cron, como dono do banco).
-- Vai para quem: participa de um desafio ativo já iniciado, deixou o lembrete ligado,
-- tem aparelho com push ativo, ainda não registrou nada hoje e não foi lembrado hoje.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists daily_reminder boolean not null default true;

create or replace function public.queue_daily_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_day_start timestamptz := (v_today::timestamp at time zone 'America/Sao_Paulo');
  v_count integer;
begin
  with targets as (
    select cp.user_id, cp.challenge_id
      from public.challenge_participants cp
      join public.challenges ch on ch.id = cp.challenge_id
      join public.profiles pr on pr.id = cp.user_id
     where ch.is_active and ch.starts_on <= v_today
       and pr.daily_reminder
       and exists (select 1 from public.push_subscriptions s where s.user_id = cp.user_id)
       and not exists (
         select 1 from public.activities a
          where a.user_id = cp.user_id and a.challenge_id = cp.challenge_id
            and a.activity_date = v_today and a.status <> 'rejected')
       and not exists (
         select 1 from public.notifications n
          where n.user_id = cp.user_id and n.kind = 'daily_reminder' and n.created_at >= v_day_start)
  ),
  partner_today as (
    select t.user_id, coalesce(pp.nickname, pp.display_name) as partner_name
      from targets t
      join public.challenge_participants op on op.challenge_id = t.challenge_id and op.user_id <> t.user_id
      join public.profiles pp on pp.id = op.user_id
     where exists (
       select 1 from public.activities a
        where a.user_id = op.user_id and a.challenge_id = t.challenge_id
          and a.activity_date = v_today and a.status <> 'rejected')
  )
  insert into public.notifications (user_id, kind, title, body, link)
  select t.user_id, 'daily_reminder',
         case when pt.partner_name is not null then pt.partner_name || ' já treinou hoje 👀'
              else 'Bora treinar hoje? 💪' end,
         case when pt.partner_name is not null then 'Ainda dá tempo de registrar a sua atividade e não ficar para trás.'
              else 'Você ainda não registrou nenhuma atividade hoje.' end,
         '/atividades/nova'
    from targets t
    left join partner_today pt on pt.user_id = t.user_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.queue_daily_reminders() from public, app_user;
