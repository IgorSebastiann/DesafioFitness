-- =============================================================================
-- Módulo de treinos, fase 2: fichas de musculação, agenda semanal e execução.
-- Idempotente: pode rodar de novo sem erro e sem duplicar dados.
--
-- Ficha (workout_sheets) → blocos (workout_blocks) → exercícios (workout_block_items).
-- Tipos de bloco:
--   warmup       aquecimento/mobilidade: texto (title), exercícios opcionais
--   straight     meta de repetição: 1 exercício, séries × repetições (ou tempo)
--   biset        2 exercícios seguidos, séries × repetições de cada
--   alternating  carga alternada/pirâmide: 1 exercício, cada série segue reps_scheme (ex.: {6,12})
--   circuit      circuito por tempo: 2+ exercícios com duration_seconds; sets = voltas
-- O formato de cada bloco é conferido no banco (trigger de constraint, no fim da transação).
--
-- Visibilidade: cada um vê as próprias fichas; as marcadas como compartilhadas ficam visíveis
-- para quem está no mesmo desafio (só leitura; dá para copiar). Modelos (is_template) são
-- visíveis para todos e só o admin altera. Agenda e histórico de execução são sempre privados.
-- =============================================================================

do $$ begin
  create type public.workout_block_kind as enum ('warmup', 'straight', 'biset', 'alternating', 'circuit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_session_status as enum ('in_progress', 'finished', 'abandoned');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Fichas
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sheets (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references public.profiles (id) on delete cascade,
  is_template     boolean not null default false,
  -- Modelos vêm em grupos (ex.: "ABC" tem as fichas A, B e C); copiar o modelo copia o grupo.
  template_group  text check (template_group is null or char_length(template_group) between 2 and 40),
  name            text not null check (char_length(btrim(name)) between 2 and 60),
  description     text check (description is null or char_length(description) <= 500),
  is_shared       boolean not null default false,
  copied_from     uuid references public.workout_sheets (id) on delete set null,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint workout_sheets_owner_or_template check (
    (is_template and owner_id is null and template_group is not null and not is_shared)
    or (not is_template and owner_id is not null and template_group is null)
  )
);

create index if not exists workout_sheets_owner_idx on public.workout_sheets (owner_id, position);
create index if not exists workout_sheets_template_idx on public.workout_sheets (template_group, position) where is_template;

drop trigger if exists trg_workout_sheets_touch on public.workout_sheets;
create trigger trg_workout_sheets_touch before update on public.workout_sheets
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Blocos e exercícios
-- ---------------------------------------------------------------------------
create table if not exists public.workout_blocks (
  id            uuid primary key default gen_random_uuid(),
  sheet_id      uuid not null references public.workout_sheets (id) on delete cascade,
  position      integer not null check (position >= 0),
  kind          public.workout_block_kind not null,
  title         text check (title is null or char_length(btrim(title)) between 1 and 120),
  sets          integer not null default 3 check (sets between 1 and 20),
  rest_seconds  integer check (rest_seconds is null or rest_seconds between 0 and 900),
  notes         text check (notes is null or char_length(notes) <= 300)
);

create index if not exists workout_blocks_sheet_idx on public.workout_blocks (sheet_id, position);

create table if not exists public.workout_block_items (
  id                uuid primary key default gen_random_uuid(),
  block_id          uuid not null references public.workout_blocks (id) on delete cascade,
  position          integer not null check (position >= 0),
  exercise_id       uuid not null references public.exercises (id),
  reps              integer check (reps is null or reps between 1 and 300),
  reps_scheme       integer[] check (
                      reps_scheme is null
                      or (cardinality(reps_scheme) between 2 and 6 and 1 <= all (reps_scheme) and 300 >= all (reps_scheme))
                    ),
  duration_seconds  integer check (duration_seconds is null or duration_seconds between 5 and 3600),
  load_kg           numeric(6,2) check (load_kg is null or load_kg between 0 and 1000),
  rest_seconds      integer check (rest_seconds is null or rest_seconds between 0 and 900),
  notes             text check (notes is null or char_length(notes) <= 300)
);

create index if not exists workout_block_items_block_idx on public.workout_block_items (block_id, position);
create index if not exists workout_block_items_exercise_idx on public.workout_block_items (exercise_id);

-- Confere o formato do bloco (tipo × exercícios). Roda no fim da transação, depois que o bloco
-- e os exercícios já foram gravados, para permitir montar o bloco em vários comandos.
create or replace function public.check_workout_block(p_block uuid)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  b public.workout_blocks;
  n integer;
  missing_target integer;
begin
  select * into b from public.workout_blocks where id = p_block;
  if not found then
    return; -- bloco apagado
  end if;

  select count(*),
         count(*) filter (where reps is null and duration_seconds is null)
    into n, missing_target
    from public.workout_block_items where block_id = p_block;

  if b.kind = 'warmup' then
    if b.title is null and n = 0 then
      raise exception 'Descreva o aquecimento ou inclua ao menos um exercício.' using errcode = '23514';
    end if;
  elsif b.kind = 'straight' then
    if n <> 1 then
      raise exception 'O bloco de meta de repetição precisa de exatamente 1 exercício.' using errcode = '23514';
    end if;
    if missing_target > 0 then
      raise exception 'Informe as repetições ou o tempo do exercício.' using errcode = '23514';
    end if;
  elsif b.kind = 'biset' then
    if n <> 2 then
      raise exception 'O bi-set precisa de exatamente 2 exercícios.' using errcode = '23514';
    end if;
    if missing_target > 0 then
      raise exception 'Informe as repetições ou o tempo dos dois exercícios do bi-set.' using errcode = '23514';
    end if;
  elsif b.kind = 'alternating' then
    if n <> 1 then
      raise exception 'O bloco de carga alternada precisa de exatamente 1 exercício.' using errcode = '23514';
    end if;
    if exists (select 1 from public.workout_block_items where block_id = p_block and reps_scheme is null) then
      raise exception 'Informe a sequência de repetições da carga alternada (ex.: 6/12).' using errcode = '23514';
    end if;
  elsif b.kind = 'circuit' then
    if n < 2 then
      raise exception 'O circuito precisa de pelo menos 2 exercícios.' using errcode = '23514';
    end if;
    if exists (select 1 from public.workout_block_items where block_id = p_block and duration_seconds is null) then
      raise exception 'Informe o tempo de cada exercício do circuito.' using errcode = '23514';
    end if;
  end if;
end;
$$;

create or replace function public.trg_check_workout_block()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'workout_blocks' then
    perform public.check_workout_block(coalesce(new.id, old.id));
  else
    perform public.check_workout_block(coalesce(new.block_id, old.block_id));
    if tg_op = 'UPDATE' and new.block_id <> old.block_id then
      perform public.check_workout_block(old.block_id);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_workout_blocks_check on public.workout_blocks;
create constraint trigger trg_workout_blocks_check
  after insert or update on public.workout_blocks
  deferrable initially deferred
  for each row execute function public.trg_check_workout_block();

drop trigger if exists trg_workout_block_items_check on public.workout_block_items;
create constraint trigger trg_workout_block_items_check
  after insert or update or delete on public.workout_block_items
  deferrable initially deferred
  for each row execute function public.trg_check_workout_block();

-- Mexer em bloco/exercício atualiza a data da ficha.
create or replace function public.touch_workout_sheet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sheet uuid;
begin
  if tg_table_name = 'workout_blocks' then
    v_sheet := coalesce(new.sheet_id, old.sheet_id);
  else
    select sheet_id into v_sheet from public.workout_blocks where id = coalesce(new.block_id, old.block_id);
  end if;
  update public.workout_sheets set updated_at = now() where id = v_sheet;
  return null;
end;
$$;

drop trigger if exists trg_workout_blocks_touch_sheet on public.workout_blocks;
create trigger trg_workout_blocks_touch_sheet after insert or update or delete on public.workout_blocks
  for each row execute function public.touch_workout_sheet();

-- ---------------------------------------------------------------------------
-- Quem pode ver e editar uma ficha (usado pelas políticas dos blocos e exercícios)
-- ---------------------------------------------------------------------------
create or replace function public.can_view_workout_sheet(p_sheet uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workout_sheets s
     where s.id = p_sheet
       and public.current_user_id() is not null
       and (
         s.owner_id = public.current_user_id()
         or s.is_template
         or (s.is_shared and public.shares_challenge_with(s.owner_id))
       )
  );
$$;

create or replace function public.can_edit_workout_sheet(p_sheet uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workout_sheets s
     where s.id = p_sheet
       and public.current_user_id() is not null
       and (
         (not s.is_template and s.owner_id = public.current_user_id())
         or (s.is_template and public.is_admin())
       )
  );
$$;

-- ---------------------------------------------------------------------------
-- Agenda semanal (0 = domingo … 6 = sábado, como no JavaScript)
-- ---------------------------------------------------------------------------
create table if not exists public.workout_schedule (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  weekday   smallint not null check (weekday between 0 and 6),
  sheet_id  uuid not null references public.workout_sheets (id) on delete cascade,
  position  integer not null default 0,
  primary key (user_id, weekday, sheet_id)
);

create or replace function public.check_workout_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.workout_sheets where id = new.sheet_id and owner_id = new.user_id) then
    raise exception 'Só dá para agendar fichas da sua conta. Copie a ficha antes.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_workout_schedule_check on public.workout_schedule;
create trigger trg_workout_schedule_check before insert or update on public.workout_schedule
  for each row execute function public.check_workout_schedule();

-- ---------------------------------------------------------------------------
-- Execução: sessões e séries feitas
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  sheet_id      uuid references public.workout_sheets (id) on delete set null,
  sheet_name    text not null check (char_length(sheet_name) between 1 and 60),
  local_date    date not null default (now() at time zone 'America/Sao_Paulo')::date,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        public.workout_session_status not null default 'in_progress',
  activity_id   uuid references public.activities (id) on delete set null,
  constraint workout_sessions_finished check (
    (status = 'in_progress' and finished_at is null)
    or (status <> 'in_progress' and finished_at is not null and finished_at >= started_at)
  ),
  constraint workout_sessions_activity_needs_finish check (activity_id is null or status = 'finished')
);

create index if not exists workout_sessions_user_date_idx on public.workout_sessions (user_id, local_date desc);

create or replace function public.check_workout_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sheet_id is not null and (tg_op = 'INSERT' or new.sheet_id is distinct from old.sheet_id) then
    if not exists (select 1 from public.workout_sheets where id = new.sheet_id and owner_id = new.user_id) then
      raise exception 'Só dá para executar fichas da sua conta. Copie a ficha antes.' using errcode = '23514';
    end if;
  end if;
  if new.activity_id is not null and (tg_op = 'INSERT' or new.activity_id is distinct from old.activity_id) then
    if not exists (select 1 from public.activities where id = new.activity_id and user_id = new.user_id) then
      raise exception 'A atividade precisa ser sua.' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.started_at <> old.started_at or new.local_date <> old.local_date then
      raise exception 'Não dá para mudar o dono nem o início do treino.' using errcode = '23514';
    end if;
    if old.status <> 'in_progress' and new.status = 'in_progress' then
      raise exception 'Treino encerrado não pode ser reaberto.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_workout_sessions_check on public.workout_sessions;
create trigger trg_workout_sessions_check before insert or update on public.workout_sessions
  for each row execute function public.check_workout_session();

create table if not exists public.workout_set_logs (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.workout_sessions (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  item_id           uuid references public.workout_block_items (id) on delete set null,
  exercise_id       uuid not null references public.exercises (id),
  set_number        integer not null check (set_number between 1 and 50),
  -- Posição dentro da série (carga alternada: 1 = 6 pesada, 2 = 12 leve).
  step              integer not null default 1 check (step between 1 and 6),
  reps              integer check (reps is null or reps between 0 and 500),
  load_kg           numeric(6,2) check (load_kg is null or load_kg between 0 and 1000),
  duration_seconds  integer check (duration_seconds is null or duration_seconds between 0 and 3600),
  done_at           timestamptz not null default now()
);

create unique index if not exists workout_set_logs_unique
  on public.workout_set_logs (session_id, item_id, set_number, step);
create index if not exists workout_set_logs_user_exercise_idx on public.workout_set_logs (user_id, exercise_id, done_at);

create or replace function public.check_workout_set_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.workout_sessions;
begin
  -- Editar a ficha apaga exercícios antigos; o histórico só perde o vínculo (item_id vira null).
  if tg_op = 'UPDATE' and new.item_id is null and old.item_id is not null
     and (new.session_id, new.user_id, new.exercise_id, new.set_number, new.step)
         = (old.session_id, old.user_id, old.exercise_id, old.set_number, old.step) then
    return new;
  end if;
  select * into s from public.workout_sessions where id = coalesce(new.session_id, old.session_id);
  if s.status <> 'in_progress' then
    raise exception 'Este treino já foi encerrado.' using errcode = '23514';
  end if;
  if tg_op <> 'DELETE' and new.user_id <> s.user_id then
    raise exception 'A série precisa ser do dono do treino.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_workout_set_logs_check on public.workout_set_logs;
create trigger trg_workout_set_logs_check before insert or update or delete on public.workout_set_logs
  for each row execute function public.check_workout_set_log();

-- ---------------------------------------------------------------------------
-- Gravação da ficha inteira a partir de JSON (editor, script do treino pessoal e modelos)
--   p_blocks: [{kind, title, sets, rest_seconds, notes,
--               items: [{exercise_id | slug, reps, reps_scheme, duration_seconds, load_kg, rest_seconds, notes}]}]
-- Roda com as permissões de quem chama (RLS vale). Substitui todos os blocos da ficha.
-- ---------------------------------------------------------------------------
create or replace function public.replace_workout_blocks(p_sheet uuid, p_blocks jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  blk jsonb;
  itm jsonb;
  v_block uuid;
  v_exercise uuid;
  bpos integer := 0;
  ipos integer;
begin
  if jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'Formato inválido dos blocos.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_blocks) > 30 then
    raise exception 'Uma ficha pode ter até 30 blocos.' using errcode = '23514';
  end if;

  -- RLS: se a pessoa não pode editar, o delete/insert não acha a ficha.
  if not exists (select 1 from public.workout_sheets where id = p_sheet) then
    raise exception 'Ficha não encontrada.' using errcode = 'P0002';
  end if;

  delete from public.workout_blocks where sheet_id = p_sheet;

  for blk in select * from jsonb_array_elements(p_blocks) loop
    insert into public.workout_blocks (sheet_id, position, kind, title, sets, rest_seconds, notes)
    values (
      p_sheet, bpos, (blk ->> 'kind')::public.workout_block_kind,
      nullif(btrim(blk ->> 'title'), ''),
      coalesce((blk ->> 'sets')::integer, 1),
      (blk ->> 'rest_seconds')::integer,
      nullif(btrim(blk ->> 'notes'), '')
    )
    returning id into v_block;

    ipos := 0;
    if jsonb_array_length(coalesce(blk -> 'items', '[]'::jsonb)) > 12 then
      raise exception 'Um bloco pode ter até 12 exercícios.' using errcode = '23514';
    end if;
    for itm in select * from jsonb_array_elements(coalesce(blk -> 'items', '[]'::jsonb)) loop
      if itm ? 'exercise_id' and itm ->> 'exercise_id' is not null then
        v_exercise := (itm ->> 'exercise_id')::uuid;
      else
        select id into v_exercise from public.exercises where slug = itm ->> 'slug';
        if v_exercise is null then
          raise exception 'Exercício não encontrado: %', itm ->> 'slug' using errcode = 'P0002';
        end if;
      end if;
      insert into public.workout_block_items
        (block_id, position, exercise_id, reps, reps_scheme, duration_seconds, load_kg, rest_seconds, notes)
      values (
        v_block, ipos, v_exercise,
        (itm ->> 'reps')::integer,
        case when jsonb_typeof(itm -> 'reps_scheme') = 'array'
             then array(select jsonb_array_elements_text(itm -> 'reps_scheme')::integer) end,
        (itm ->> 'duration_seconds')::integer,
        (itm ->> 'load_kg')::numeric,
        (itm ->> 'rest_seconds')::integer,
        nullif(btrim(itm ->> 'notes'), '')
      );
      ipos := ipos + 1;
      v_exercise := null;
    end loop;
    bpos := bpos + 1;
  end loop;
end;
$$;

-- Copia uma ficha visível (própria, compartilhada no desafio ou modelo) para a conta de quem chama.
create or replace function public.copy_workout_sheet(p_sheet uuid, p_name text default null)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  src public.workout_sheets;
  v_new uuid;
  v_blocks jsonb;
begin
  if public.current_user_id() is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  select * into src from public.workout_sheets where id = p_sheet; -- RLS filtra o que não pode ver
  if not found then
    raise exception 'Ficha não encontrada.' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'kind', b.kind, 'title', b.title, 'sets', b.sets, 'rest_seconds', b.rest_seconds, 'notes', b.notes,
             'items', (select coalesce(jsonb_agg(jsonb_build_object(
                          'exercise_id', i.exercise_id, 'reps', i.reps, 'reps_scheme', to_jsonb(i.reps_scheme),
                          'duration_seconds', i.duration_seconds, 'load_kg', i.load_kg,
                          'rest_seconds', i.rest_seconds, 'notes', i.notes) order by i.position), '[]'::jsonb)
                         from public.workout_block_items i where i.block_id = b.id)
           ) order by b.position), '[]'::jsonb)
    into v_blocks
    from public.workout_blocks b where b.sheet_id = p_sheet;

  insert into public.workout_sheets (owner_id, name, description, copied_from, position)
  values (
    public.current_user_id(),
    left(coalesce(nullif(btrim(p_name), ''), src.name), 60),
    src.description,
    src.id,
    coalesce((select max(position) + 1 from public.workout_sheets where owner_id = public.current_user_id()), 0)
  )
  returning id into v_new;

  perform public.replace_workout_blocks(v_new, v_blocks);
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.workout_sheets enable row level security;
alter table public.workout_blocks enable row level security;
alter table public.workout_block_items enable row level security;
alter table public.workout_schedule enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_set_logs enable row level security;

drop policy if exists workout_sheets_select on public.workout_sheets;
create policy workout_sheets_select on public.workout_sheets for select to app_user
  using (
    public.current_user_id() is not null
    and (owner_id = public.current_user_id() or is_template or (is_shared and public.shares_challenge_with(owner_id)))
  );
drop policy if exists workout_sheets_insert on public.workout_sheets;
create policy workout_sheets_insert on public.workout_sheets for insert to app_user
  with check ((not is_template and owner_id = public.current_user_id()) or (is_template and public.is_admin()));
drop policy if exists workout_sheets_update on public.workout_sheets;
create policy workout_sheets_update on public.workout_sheets for update to app_user
  using ((not is_template and owner_id = public.current_user_id()) or (is_template and public.is_admin()))
  with check ((not is_template and owner_id = public.current_user_id()) or (is_template and public.is_admin()));
drop policy if exists workout_sheets_delete on public.workout_sheets;
create policy workout_sheets_delete on public.workout_sheets for delete to app_user
  using ((not is_template and owner_id = public.current_user_id()) or (is_template and public.is_admin()));

drop policy if exists workout_blocks_select on public.workout_blocks;
create policy workout_blocks_select on public.workout_blocks for select to app_user
  using (public.can_view_workout_sheet(sheet_id));
drop policy if exists workout_blocks_write on public.workout_blocks;
create policy workout_blocks_write on public.workout_blocks for all to app_user
  using (public.can_edit_workout_sheet(sheet_id))
  with check (public.can_edit_workout_sheet(sheet_id));

drop policy if exists workout_block_items_select on public.workout_block_items;
create policy workout_block_items_select on public.workout_block_items for select to app_user
  using (exists (select 1 from public.workout_blocks b where b.id = block_id and public.can_view_workout_sheet(b.sheet_id)));
drop policy if exists workout_block_items_write on public.workout_block_items;
create policy workout_block_items_write on public.workout_block_items for all to app_user
  using (exists (select 1 from public.workout_blocks b where b.id = block_id and public.can_edit_workout_sheet(b.sheet_id)))
  with check (exists (select 1 from public.workout_blocks b where b.id = block_id and public.can_edit_workout_sheet(b.sheet_id)));

drop policy if exists workout_schedule_own on public.workout_schedule;
create policy workout_schedule_own on public.workout_schedule for all to app_user
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

drop policy if exists workout_sessions_own on public.workout_sessions;
create policy workout_sessions_own on public.workout_sessions for all to app_user
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

drop policy if exists workout_set_logs_own on public.workout_set_logs;
create policy workout_set_logs_own on public.workout_set_logs for all to app_user
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

grant select, insert, update, delete on
  public.workout_sheets, public.workout_blocks, public.workout_block_items,
  public.workout_schedule, public.workout_sessions, public.workout_set_logs
  to app_user;
grant usage on type public.workout_block_kind, public.workout_session_status to app_user;

revoke all on function public.check_workout_block(uuid) from public;
revoke all on function public.can_view_workout_sheet(uuid) from public;
revoke all on function public.can_edit_workout_sheet(uuid) from public;
grant execute on function public.check_workout_block(uuid) to app_user;
grant execute on function public.can_view_workout_sheet(uuid) to app_user;
grant execute on function public.can_edit_workout_sheet(uuid) to app_user;
grant execute on function public.replace_workout_blocks(uuid, jsonb) to app_user;
grant execute on function public.copy_workout_sheet(uuid, text) to app_user;

-- ---------------------------------------------------------------------------
-- Modelos genéricos (ABC, ABCD, Full Body, Upper/Lower). IDs fixos: rodar de novo não duplica
-- nem sobrescreve o que o admin editar depois.
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('7e000000-0000-4000-8000-0000000000a1'::uuid, 'ABC', 0, 'A — Peito, ombro e tríceps', 'Divisão ABC: cada grupo uma vez por semana.',
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de ombros e aquecimento leve","sets":1},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"supino-reto-com-barra","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"supino-inclinado-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"desenvolvimento-com-halteres","reps":12}]},
         {"kind":"biset","sets":3,"rest_seconds":60,"items":[{"slug":"elevacao-lateral-com-halteres","reps":15},{"slug":"triceps-na-polia-com-corda","reps":15}]}]'),
      ('7e000000-0000-4000-8000-0000000000a2'::uuid, 'ABC', 1, 'B — Costas e bíceps', null,
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de ombros e aquecimento leve","sets":1},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"puxada-alta","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"remada-baixa","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"remada-com-halteres","reps":12}]},
         {"kind":"biset","sets":3,"rest_seconds":60,"items":[{"slug":"rosca-direta-com-halteres","reps":12},{"slug":"biceps-martelo","reps":12}]}]'),
      ('7e000000-0000-4000-8000-0000000000a3'::uuid, 'ABC', 2, 'C — Pernas e abdômen', null,
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de quadril e tornozelo","sets":1},
         {"kind":"straight","sets":3,"rest_seconds":90,"items":[{"slug":"agachamento-livre-com-barra","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"leg-press-45","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"mesa-flexora","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":45,"items":[{"slug":"panturrilha-em-pe","reps":15}]},
         {"kind":"straight","sets":3,"rest_seconds":30,"items":[{"slug":"prancha-abdominal","duration_seconds":30}]}]'),
      ('7e000000-0000-4000-8000-0000000000b1'::uuid, 'ABCD', 0, 'A — Peito e tríceps', 'Divisão ABCD: quatro treinos na semana.',
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de ombros e aquecimento leve","sets":1},
         {"kind":"straight","sets":4,"rest_seconds":60,"items":[{"slug":"supino-reto-com-barra","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"supino-inclinado-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"crucifixo-reto-com-halteres","reps":12}]},
         {"kind":"biset","sets":3,"rest_seconds":60,"items":[{"slug":"triceps-na-polia-com-barra","reps":12},{"slug":"triceps-frances-com-halter","reps":12}]}]'),
      ('7e000000-0000-4000-8000-0000000000b2'::uuid, 'ABCD', 1, 'B — Costas e bíceps', null,
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de ombros e aquecimento leve","sets":1},
         {"kind":"straight","sets":4,"rest_seconds":60,"items":[{"slug":"puxada-alta","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"remada-curvada-com-barra","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"remada-baixa","reps":12}]},
         {"kind":"biset","sets":3,"rest_seconds":60,"items":[{"slug":"rosca-direta-com-barra","reps":12},{"slug":"biceps-martelo","reps":12}]}]'),
      ('7e000000-0000-4000-8000-0000000000b3'::uuid, 'ABCD', 2, 'C — Pernas', null,
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de quadril e tornozelo","sets":1},
         {"kind":"straight","sets":4,"rest_seconds":90,"items":[{"slug":"agachamento-livre-com-barra","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"leg-press-45","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"cadeira-extensora","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"stiff-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":45,"items":[{"slug":"panturrilha-em-pe","reps":15}]}]'),
      ('7e000000-0000-4000-8000-0000000000b4'::uuid, 'ABCD', 3, 'D — Ombros e abdômen', null,
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de ombros","sets":1},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"desenvolvimento-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"elevacao-lateral-com-halteres","reps":15}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"face-pull-na-polia","reps":15}]},
         {"kind":"circuit","sets":2,"rest_seconds":60,"items":[{"slug":"abdominal-crunch","duration_seconds":30},{"slug":"prancha-abdominal","duration_seconds":30},{"slug":"abdominal-bicicleta","duration_seconds":30}]}]'),
      ('7e000000-0000-4000-8000-0000000000c1'::uuid, 'Full Body', 0, 'Corpo inteiro', 'Treino de corpo inteiro, 2 a 3 vezes por semana com um dia de descanso entre eles.',
       '[{"kind":"warmup","title":"5 a 10 min de aquecimento geral e mobilidade","sets":1},
         {"kind":"straight","sets":3,"rest_seconds":90,"items":[{"slug":"agachamento-goblet-com-kettlebell","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"supino-reto-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"remada-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"stiff-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"desenvolvimento-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":30,"items":[{"slug":"prancha-abdominal","duration_seconds":30}]}]'),
      ('7e000000-0000-4000-8000-0000000000d1'::uuid, 'Upper/Lower', 0, 'Superiores', 'Superiores e inferiores alternados, 4 vezes por semana.',
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de ombros e aquecimento leve","sets":1},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"supino-reto-com-barra","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"puxada-alta","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"desenvolvimento-com-halteres","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"remada-baixa","reps":12}]},
         {"kind":"biset","sets":3,"rest_seconds":60,"items":[{"slug":"rosca-direta-com-halteres","reps":12},{"slug":"triceps-na-polia-com-corda","reps":12}]}]'),
      ('7e000000-0000-4000-8000-0000000000d2'::uuid, 'Upper/Lower', 1, 'Inferiores', null,
       '[{"kind":"warmup","title":"5 a 10 min de mobilidade de quadril e tornozelo","sets":1},
         {"kind":"straight","sets":3,"rest_seconds":90,"items":[{"slug":"agachamento-livre-com-barra","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"levantamento-terra-romeno","reps":10}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"leg-press-45","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":60,"items":[{"slug":"mesa-flexora","reps":12}]},
         {"kind":"straight","sets":3,"rest_seconds":45,"items":[{"slug":"panturrilha-em-pe","reps":15}]}]')
    ) as v(id, grp, pos, name, description, blocks)
  loop
    if not exists (select 1 from public.workout_sheets where id = t.id) then
      insert into public.workout_sheets (id, owner_id, is_template, template_group, name, description, position)
      values (t.id, null, true, t.grp, t.name, t.description, t.pos);
      perform public.replace_workout_blocks(t.id, t.blocks::jsonb);
    end if;
  end loop;
end $$;
