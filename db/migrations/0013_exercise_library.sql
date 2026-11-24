-- 0013 · Biblioteca de exercícios: grupos musculares, exercícios, mídias de execução
-- e o desenho do corpo escolhido no perfil. Idempotente (pode ser reaplicada).
--
-- Catálogo global: qualquer pessoa logada lê; só o admin escreve.
-- Mídia só entra com licença conhecida (CC0, CC BY, CC BY-SA ou própria) — garantido por constraints.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.body_figure as enum ('male', 'female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.muscle_view as enum ('front', 'back', 'both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_equipment as enum (
    'barbell', 'dumbbell', 'machine', 'cable', 'body_weight', 'band', 'kettlebell',
    'ez_bar', 'smith', 'bench', 'medicine_ball', 'exercise_ball', 'foam_roll', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_mechanic as enum ('compound', 'isolation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exercise_category as enum ('strength', 'stretching', 'cardio', 'plyometrics', 'mobility');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_kind as enum ('video', 'gif', 'image');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_angle as enum ('front', 'side', 'back');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_origin as enum ('wger', 'everkinetic', 'wikimedia', 'own');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_license as enum ('cc0', 'cc_by', 'cc_by_sa', 'own');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Perfil: qual desenho do corpo o mapa mostra primeiro (vazio = masculino, alternável).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists body_figure public.body_figure;

-- ---------------------------------------------------------------------------
-- Busca sem acento e sem diferença de maiúsculas (imutável, serve para coluna gerada).
-- ---------------------------------------------------------------------------
create or replace function public.fold_text(p text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(translate(coalesce(p, ''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'))
$$;

-- ---------------------------------------------------------------------------
-- Grupos musculares (as áreas clicáveis do mapa corporal)
-- ---------------------------------------------------------------------------
create table if not exists public.muscle_groups (
  code       text primary key check (code ~ '^[a-z_]{2,30}$'),
  name       text not null unique check (char_length(name) between 2 and 40),
  view       public.muscle_view not null,
  sort_order smallint not null
);

insert into public.muscle_groups (code, name, view, sort_order) values
  ('chest',          'Peitoral',              'front',  1),
  ('front_delts',    'Ombro anterior',        'front',  2),
  ('side_delts',     'Ombro lateral',         'both',   3),
  ('rear_delts',     'Ombro posterior',       'back',   4),
  ('biceps',         'Bíceps',                'front',  5),
  ('triceps',        'Tríceps',               'back',   6),
  ('forearms',       'Antebraço',             'both',   7),
  ('abs',            'Abdômen',               'front',  8),
  ('obliques',       'Oblíquos',              'front',  9),
  ('traps',          'Trapézio',              'both',  10),
  ('lats',           'Dorsais',               'back',  11),
  ('middle_back',    'Meio das costas',       'back',  12),
  ('lower_back',     'Lombar',                'back',  13),
  ('glutes',         'Glúteos',               'back',  14),
  ('quadriceps',     'Quadríceps',            'front', 15),
  ('hamstrings',     'Posteriores de coxa',   'back',  16),
  ('adductors',      'Adutores',              'both',  17),
  ('abductors',      'Abdutores',             'both',  18),
  ('calves',         'Panturrilhas',          'both',  19)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Exercícios
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name            text not null unique check (char_length(name) between 3 and 80),
  name_en         text check (name_en is null or char_length(name_en) between 2 and 120),
  primary_muscle  text not null references public.muscle_groups (code),
  equipment       public.exercise_equipment not null,
  level           public.exercise_level not null,
  mechanic        public.exercise_mechanic not null,
  category        public.exercise_category not null default 'strength',
  steps           text[] not null check (cardinality(steps) between 1 and 15),
  common_mistakes text[] not null default '{}' check (cardinality(common_mistakes) <= 10),
  tips            text[] not null default '{}' check (cardinality(tips) <= 10),
  -- De onde veio o texto: free-exercise-db (domínio público, traduzido) ou escrito aqui.
  text_source     text not null default 'own' check (text_source in ('free-exercise-db', 'own')),
  is_active       boolean not null default true,
  search_text     text generated always as (public.fold_text(name || ' ' || coalesce(name_en, ''))) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists exercises_primary_muscle_idx on public.exercises (primary_muscle);

create table if not exists public.exercise_secondary_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle      text not null references public.muscle_groups (code),
  primary key (exercise_id, muscle)
);

create index if not exists exercise_secondary_muscle_idx on public.exercise_secondary_muscles (muscle);

-- Um músculo secundário não pode ser o principal do mesmo exercício.
create or replace function public.exercise_secondary_not_primary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.exercises e where e.id = new.exercise_id and e.primary_muscle = new.muscle) then
    raise exception 'O músculo secundário não pode ser o principal do exercício.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_exercise_secondary_not_primary on public.exercise_secondary_muscles;
create trigger trg_exercise_secondary_not_primary
  before insert or update on public.exercise_secondary_muscles
  for each row execute function public.exercise_secondary_not_primary();

-- Ao trocar o músculo principal, ele sai da lista de secundários.
create or replace function public.exercises_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.primary_muscle is distinct from old.primary_muscle then
    delete from public.exercise_secondary_muscles
     where exercise_id = new.id and muscle = new.primary_muscle;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_exercises_before_update on public.exercises;
create trigger trg_exercises_before_update
  before update on public.exercises
  for each row execute function public.exercises_before_update();

-- ---------------------------------------------------------------------------
-- Mídias de execução (imagem, GIF, vídeo), salvas no Blob público de mídias.
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_media (
  id              uuid primary key default gen_random_uuid(),
  exercise_id     uuid not null references public.exercises (id) on delete cascade,
  kind            public.media_kind not null,
  angle           public.media_angle not null default 'side',
  position        smallint not null default 0 check (position between 0 and 99),
  url             text not null unique check (url ~ '^https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/exercises/'),
  poster_url      text check (poster_url is null or poster_url ~ '^https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/exercises/'),
  origin          public.media_origin not null,
  author          text check (author is null or char_length(author) between 1 and 200),
  license         public.media_license not null,
  license_version text check (license_version is null or license_version ~ '^[0-9]\.[0-9]$'),
  source_url      text check (source_url is null or source_url ~ '^https://'),
  -- Chave da mídia na fonte (ex.: "wger-image-123"), para a importação ser idempotente.
  source_key      text unique check (source_key is null or char_length(source_key) between 3 and 120),
  -- Recorte/cor alterados: a versão editada continua sob a mesma licença (CC BY-SA).
  is_edited       boolean not null default false,
  is_primary      boolean not null default false,
  width           integer check (width is null or width between 1 and 10000),
  height          integer check (height is null or height between 1 and 10000),
  duration_ms     integer check (duration_ms is null or duration_ms between 1 and 60000),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),

  -- Origem própria ⇔ licença própria.
  constraint exercise_media_own_license check ((origin = 'own') = (license = 'own')),
  -- Terceiros: sempre com link da fonte e chave de origem.
  constraint exercise_media_third_party_source check (origin = 'own' or (source_url is not null and source_key is not null)),
  -- CC BY e CC BY-SA exigem autor (atribuição).
  constraint exercise_media_attribution check (license not in ('cc_by', 'cc_by_sa') or author is not null),
  -- Imagem não tem duração.
  constraint exercise_media_image_duration check (kind <> 'image' or duration_ms is null)
);

create index if not exists exercise_media_exercise_idx on public.exercise_media (exercise_id, position);
-- Uma única mídia principal por exercício.
create unique index if not exists exercise_media_one_primary on public.exercise_media (exercise_id) where is_primary;

-- ---------------------------------------------------------------------------
-- RLS: catálogo lido por quem está logado; escrito só pelo admin.
-- ---------------------------------------------------------------------------
alter table public.muscle_groups              enable row level security;
alter table public.exercises                  enable row level security;
alter table public.exercise_secondary_muscles enable row level security;
alter table public.exercise_media             enable row level security;

drop policy if exists muscle_groups_select on public.muscle_groups;
create policy muscle_groups_select on public.muscle_groups for select to app_user
  using (public.current_user_id() is not null);

drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select to app_user
  using (public.current_user_id() is not null and (is_active or public.is_admin()));
drop policy if exists exercises_admin_write on public.exercises;
create policy exercises_admin_write on public.exercises for all to app_user
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists exercise_secondary_select on public.exercise_secondary_muscles;
create policy exercise_secondary_select on public.exercise_secondary_muscles for select to app_user
  using (public.current_user_id() is not null);
drop policy if exists exercise_secondary_admin_write on public.exercise_secondary_muscles;
create policy exercise_secondary_admin_write on public.exercise_secondary_muscles for all to app_user
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists exercise_media_select on public.exercise_media;
create policy exercise_media_select on public.exercise_media for select to app_user
  using (public.current_user_id() is not null);
drop policy if exists exercise_media_admin_write on public.exercise_media;
create policy exercise_media_admin_write on public.exercise_media for all to app_user
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on
  public.muscle_groups, public.exercises, public.exercise_secondary_muscles, public.exercise_media
  to app_user;
grant execute on function public.fold_text(text) to app_user;
