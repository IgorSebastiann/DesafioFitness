-- 0001 · Schema principal do Desafio Fitness
-- Aplicado pelo script `npm run db:migrate` (Neon Postgres).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('member', 'admin');
create type public.activity_status as enum ('pending', 'approved', 'rejected');
create type public.proof_kind as enum ('image', 'video');
create type public.award_period as enum ('weekly', 'monthly');

-- ---------------------------------------------------------------------------
-- Perfis (1:1 com public.users, criada pelo Better Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references public.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  nickname     text check (nickname is null or char_length(nickname) between 2 and 20),
  avatar_path  text,
  role         public.app_role not null default 'member',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Cria o perfil automaticamente ao cadastrar um usuário (tabela users do Better Auth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.name), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on public.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Desafio e participantes
-- ---------------------------------------------------------------------------
create table public.challenges (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 3 and 80),
  daily_point_limit integer not null default 2 check (daily_point_limit >= 0),
  starts_on         date not null default current_date,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- Regra: no máximo dois participantes por desafio (o casal).
create or replace function public.enforce_max_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('participants:' || new.challenge_id::text));
  if (select count(*) from public.challenge_participants
        where challenge_id = new.challenge_id) >= 2 then
    raise exception 'Este desafio já possui 2 participantes.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_max_participants
  before insert on public.challenge_participants
  for each row execute function public.enforce_max_participants();

-- ---------------------------------------------------------------------------
-- Modalidades (configuráveis pelo admin)
-- ---------------------------------------------------------------------------
create table public.activity_categories (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique check (char_length(name) between 2 and 40),
  points                integer not null default 1 check (points between 0 and 10),
  min_duration_minutes  integer not null default 20 check (min_duration_minutes >= 0),
  icon                  text not null default 'activity',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Atividades
-- ---------------------------------------------------------------------------
create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null references public.challenges (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  category_id     uuid not null references public.activity_categories (id),
  activity_date   date not null,
  activity_time   time not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  distance_km     numeric(7,2) check (distance_km is null or distance_km >= 0),
  description     text check (description is null or char_length(description) <= 500),
  proof_path      text not null,
  proof_kind      public.proof_kind not null,
  status          public.activity_status not null default 'pending',
  points_awarded  integer not null default 0 check (points_awarded >= 0),
  reviewed_by     uuid references public.profiles (id),
  reviewed_at     timestamptz,
  review_note     text check (review_note is null or char_length(review_note) <= 300),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Regra: não permitir a mesma atividade duas vezes.
  constraint activities_no_duplicate unique (user_id, category_id, activity_date, activity_time)
);

create index activities_challenge_date_idx on public.activities (challenge_id, activity_date);
create index activities_user_date_idx on public.activities (user_id, activity_date);
create index activities_status_idx on public.activities (status);

-- Histórico de decisões (quem aprovou/rejeitou e quando).
create table public.activity_approvals (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id),
  decision    public.activity_status not null check (decision in ('approved', 'rejected')),
  note        text check (note is null or char_length(note) <= 300),
  created_at  timestamptz not null default now()
);

create index activity_approvals_activity_idx on public.activity_approvals (activity_id);

-- ---------------------------------------------------------------------------
-- Premiações e fechamento de períodos
-- ---------------------------------------------------------------------------
create table public.awards (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  period       public.award_period not null,
  title        text not null check (char_length(title) between 2 and 80),
  description  text check (description is null or char_length(description) <= 300),
  value_note   text check (value_note is null or char_length(value_note) <= 120),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.weekly_results (
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  points         integer not null default 0,
  activity_count integer not null default 0,
  is_winner      boolean not null default false,
  is_tie         boolean not null default false,
  award_id       uuid references public.awards (id) on delete set null,
  closed_at      timestamptz not null default now(),
  primary key (challenge_id, period_start, user_id),
  check (period_end = period_start + 6)
);

create table public.monthly_results (
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  points         integer not null default 0,
  activity_count integer not null default 0,
  is_winner      boolean not null default false,
  is_tie         boolean not null default false,
  award_id       uuid references public.awards (id) on delete set null,
  closed_at      timestamptz not null default now(),
  primary key (challenge_id, period_start, user_id),
  check (period_start = date_trunc('month', period_start)::date)
);

-- ---------------------------------------------------------------------------
-- Conquistas
-- ---------------------------------------------------------------------------
create table public.achievements (
  code        text primary key,
  title       text not null,
  description text not null,
  icon        text not null default 'medal',
  sort_order  integer not null default 0
);

create table public.user_achievements (
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  achievement_code text not null references public.achievements (code) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  primary key (challenge_id, user_id, achievement_code)
);

-- ---------------------------------------------------------------------------
-- Notificações e auditoria
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  text not null,
  action     text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id   uuid,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);

-- Timestamps de atualização.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_activities_touch before update on public.activities
  for each row execute function public.touch_updated_at();
