-- 0010 · Meta semanal de dias de treino + "cutucar" o parceiro.

-- ---------------------------------------------------------------------------
-- Meta semanal: quantos dias por semana a pessoa quer treinar (1 a 7).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists weekly_goal integer not null default 4 check (weekly_goal between 1 and 7);

-- ---------------------------------------------------------------------------
-- Cutucadas: só pela função (com limite de uma a cada 4 horas para o mesmo parceiro).
-- ---------------------------------------------------------------------------
create table public.pokes (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles (id) on delete cascade,
  to_user    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index pokes_pair_idx on public.pokes (from_user, to_user, created_at desc);

alter table public.pokes enable row level security;
create policy pokes_select_own on public.pokes for select to app_user
  using (from_user = public.current_user_id() or to_user = public.current_user_id());
-- Sem políticas de escrita: app_user só cutuca pela função abaixo.

create or replace function public.poke_partner()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_challenge uuid;
  v_partner uuid;
  v_name text;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_trained boolean;
begin
  if v_uid is null then
    raise exception 'Você precisa estar logado.' using errcode = '42501';
  end if;

  select cp.challenge_id into v_challenge
    from public.challenge_participants cp where cp.user_id = v_uid limit 1;
  select cp.user_id into v_partner
    from public.challenge_participants cp
   where cp.challenge_id = v_challenge and cp.user_id <> v_uid limit 1;

  if v_partner is null then
    raise exception 'Você ainda não tem parceiro(a) no desafio.' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.pokes
     where from_user = v_uid and to_user = v_partner and created_at > now() - interval '4 hours'
  ) then
    raise exception 'Você já cutucou há pouco. Espere umas horas para cutucar de novo.' using errcode = 'check_violation';
  end if;

  insert into public.pokes (from_user, to_user) values (v_uid, v_partner);

  select coalesce(nickname, display_name) into v_name from public.profiles where id = v_uid;
  select exists (
    select 1 from public.activities a
     where a.user_id = v_uid and a.challenge_id = v_challenge
       and a.activity_date = v_today and a.status <> 'rejected'
  ) into v_trained;

  insert into public.notifications (user_id, kind, title, body, link)
  values (
    v_partner, 'poke', coalesce(v_name, 'Seu parceiro') || ' te cutucou 👉',
    case when v_trained then 'Já treinei hoje. E você, vai ficar para trás?'
         else 'Bora treinar? Ninguém treinou ainda hoje.' end,
    '/atividades/nova'
  );
end;
$$;
