-- 0008 · Modalidades por desafio.
-- O casal escolhe quais modalidades valem no desafio, o tempo mínimo de cada uma
-- e pode criar modalidades próprias (só daquele desafio).
--
-- Compatibilidade: desafio sem nenhuma linha em challenge_categories continua como antes
-- (todas as modalidades globais ativas, com o tempo mínimo padrão). Na primeira vez que o
-- casal salva a configuração, ela passa a valer de forma explícita.

-- ---------------------------------------------------------------------------
-- Modalidades próprias de um desafio
-- ---------------------------------------------------------------------------
alter table public.activity_categories
  add column challenge_id uuid references public.challenges (id) on delete cascade;

-- O nome continua único entre as modalidades globais; as próprias são únicas dentro do desafio.
alter table public.activity_categories drop constraint activity_categories_name_key;
create unique index activity_categories_global_name
  on public.activity_categories (name) where challenge_id is null;
create unique index activity_categories_challenge_name
  on public.activity_categories (challenge_id, lower(name)) where challenge_id is not null;

drop policy if exists categories_select on public.activity_categories;
create policy categories_select on public.activity_categories for select to app_user
  using (
    challenge_id is null
    or public.is_challenge_member(challenge_id, public.current_user_id())
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Configuração das modalidades do desafio (linha presente = modalidade vale)
-- ---------------------------------------------------------------------------
create table public.challenge_categories (
  challenge_id          uuid not null references public.challenges (id) on delete cascade,
  category_id           uuid not null references public.activity_categories (id) on delete cascade,
  min_duration_minutes  integer not null check (min_duration_minutes between 0 and 600),
  primary key (challenge_id, category_id)
);

alter table public.challenge_categories enable row level security;

-- Leitura pelos participantes; escrita só pelas funções abaixo (security definer).
create policy challenge_categories_select on public.challenge_categories for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()) or public.is_admin());

grant select on public.challenge_categories to app_user;

-- ---------------------------------------------------------------------------
-- Leitura: regras efetivas das modalidades do desafio
-- ---------------------------------------------------------------------------
create or replace function public.challenge_category_rules(p_challenge uuid)
returns table (
  id uuid,
  name text,
  points integer,
  icon text,
  min_duration_minutes integer,
  default_min_duration integer,
  enabled boolean,
  is_custom boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with configured as (
    select exists (select 1 from public.challenge_categories where challenge_id = p_challenge) as yes
  )
  select c.id, c.name, c.points, c.icon,
         coalesce(cc.min_duration_minutes, c.min_duration_minutes),
         c.min_duration_minutes,
         case when (select yes from configured) then cc.category_id is not null else true end,
         c.challenge_id is not null
    from public.activity_categories c
    left join public.challenge_categories cc
      on cc.challenge_id = p_challenge and cc.category_id = c.id
   where c.is_active
     and (c.challenge_id is null or c.challenge_id = p_challenge)
     and (public.is_challenge_member(p_challenge, public.current_user_id()) or public.is_admin())
   order by c.challenge_id is not null, c.name;
$$;

-- Avisa o outro participante que as regras mudaram.
create or replace function public.notify_rules_changed(p_challenge uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_name text;
begin
  select coalesce(nullif(trim(p.nickname), ''), p.display_name) into v_name
    from public.profiles p where p.id = v_uid;
  insert into public.notifications (user_id, kind, title, body, link)
  select cp.user_id, 'rules_changed', 'Regras do desafio alteradas',
         coalesce(v_name, 'Seu parceiro(a)') || ' ' || p_body, '/desafio'
    from public.challenge_participants cp
   where cp.challenge_id = p_challenge and cp.user_id <> v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Escrita: salva quais modalidades valem e o tempo mínimo de cada uma.
-- p_items: [{"category_id": "...", "min_duration_minutes": 20}, ...] (só as que valem)
-- ---------------------------------------------------------------------------
create or replace function public.save_challenge_categories(p_challenge uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_item jsonb;
  v_cat public.activity_categories;
  v_min integer;
begin
  if v_uid is null or not public.is_challenge_member(p_challenge, v_uid) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Escolha pelo menos uma modalidade.' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_items) > 60 then
    raise exception 'Modalidades demais.' using errcode = 'check_violation';
  end if;

  delete from public.challenge_categories where challenge_id = p_challenge;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_cat from public.activity_categories
     where id = (v_item ->> 'category_id')::uuid;
    if not found or not v_cat.is_active
       or (v_cat.challenge_id is not null and v_cat.challenge_id <> p_challenge) then
      raise exception 'Modalidade indisponível.' using errcode = 'check_violation';
    end if;
    v_min := (v_item ->> 'min_duration_minutes')::integer;
    if v_min is null or v_min < 0 or v_min > 600 then
      raise exception 'O tempo mínimo de % deve estar entre 0 e 600 minutos.', v_cat.name
        using errcode = 'check_violation';
    end if;
    insert into public.challenge_categories (challenge_id, category_id, min_duration_minutes)
    values (p_challenge, v_cat.id, v_min)
    on conflict (challenge_id, category_id) do update set min_duration_minutes = excluded.min_duration_minutes;
  end loop;

  perform public.notify_rules_changed(p_challenge, 'alterou as modalidades e os tempos mínimos.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Escrita: cria uma modalidade própria do desafio (já entra valendo).
-- ---------------------------------------------------------------------------
create or replace function public.add_challenge_category(
  p_challenge uuid, p_name text, p_points integer, p_min integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_uid is null or not public.is_challenge_member(p_challenge, v_uid) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'O nome da modalidade precisa ter entre 2 e 40 caracteres.' using errcode = 'check_violation';
  end if;
  if p_points is null or p_points < 1 or p_points > 10 then
    raise exception 'Os pontos da modalidade devem estar entre 1 e 10.' using errcode = 'check_violation';
  end if;
  if p_min is null or p_min < 0 or p_min > 600 then
    raise exception 'O tempo mínimo deve estar entre 0 e 600 minutos.' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.activity_categories c
     where lower(c.name) = lower(v_name) and c.is_active
       and (c.challenge_id is null or c.challenge_id = p_challenge)
  ) then
    raise exception 'Já existe uma modalidade com este nome.' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.activity_categories where challenge_id = p_challenge) >= 30 then
    raise exception 'Limite de 30 modalidades próprias por desafio.' using errcode = 'check_violation';
  end if;

  -- Desafio ainda sem configuração: grava o padrão atual antes, para a nova não ficar sozinha.
  if not exists (select 1 from public.challenge_categories where challenge_id = p_challenge) then
    insert into public.challenge_categories (challenge_id, category_id, min_duration_minutes)
    select p_challenge, c.id, c.min_duration_minutes
      from public.activity_categories c
     where c.is_active and c.challenge_id is null;
  end if;

  insert into public.activity_categories (name, points, min_duration_minutes, icon, challenge_id)
  values (v_name, p_points, p_min, 'activity', p_challenge)
  returning id into v_id;

  insert into public.challenge_categories (challenge_id, category_id, min_duration_minutes)
  values (p_challenge, v_id, p_min);

  perform public.notify_rules_changed(p_challenge, 'criou a modalidade ' || v_name || '.');
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Regras da atividade: passam a respeitar a configuração do desafio.
-- (mesma função da 0002, mudando só a modalidade e o tempo mínimo)
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
  v_min integer;
begin
  select * into v_challenge from public.challenges where id = a.challenge_id;
  if not found or not v_challenge.is_active then
    raise exception 'Desafio inativo ou inexistente.' using errcode = 'check_violation';
  end if;

  if not public.is_challenge_member(a.challenge_id, a.user_id) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;

  select * into v_cat from public.activity_categories where id = a.category_id;
  if not found or not v_cat.is_active
     or (v_cat.challenge_id is not null and v_cat.challenge_id <> a.challenge_id) then
    raise exception 'Modalidade indisponível.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.challenge_categories where challenge_id = a.challenge_id) then
    select cc.min_duration_minutes into v_min
      from public.challenge_categories cc
     where cc.challenge_id = a.challenge_id and cc.category_id = a.category_id;
    if not found then
      raise exception '% não faz parte das modalidades deste desafio.', v_cat.name
        using errcode = 'check_violation';
    end if;
  else
    v_min := v_cat.min_duration_minutes;
  end if;

  if a.activity_date > v_today then
    raise exception 'Não é possível registrar atividades em datas futuras.' using errcode = 'check_violation';
  end if;

  if a.duration_minutes < v_min then
    raise exception 'Duração mínima para % é de % minutos.', v_cat.name, v_min
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

grant execute on function public.challenge_category_rules(uuid) to app_user;
grant execute on function public.save_challenge_categories(uuid, jsonb) to app_user;
grant execute on function public.add_challenge_category(uuid, text, integer, integer) to app_user;
-- Uso interno das funções acima; não é chamada direto pela aplicação.
revoke execute on function public.notify_rules_changed(uuid, text) from app_user, public;
