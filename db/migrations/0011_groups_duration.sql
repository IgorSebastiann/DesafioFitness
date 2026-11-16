-- 0011 · Desafio com data de fim (duração) e até 4 participantes.

-- ---------------------------------------------------------------------------
-- Duração: data de fim opcional (null = sem fim). Inclusiva.
-- ---------------------------------------------------------------------------
alter table public.challenges
  add column if not exists ends_on date;

alter table public.challenges
  drop constraint if exists challenges_ends_after_start;
alter table public.challenges
  add constraint challenges_ends_after_start check (ends_on is null or ends_on >= starts_on);

drop function if exists public.create_challenge(text, integer, date);

create or replace function public.create_challenge(p_name text, p_limit integer, p_starts date, p_ends date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_id uuid;
  v_starts date := coalesce(p_starts, current_date);
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
  if p_ends is not null and p_ends < v_starts then
    raise exception 'A data de fim precisa ser depois do início.' using errcode = 'check_violation';
  end if;

  insert into public.challenges (name, daily_point_limit, starts_on, ends_on)
  values (trim(p_name), p_limit, v_starts, p_ends)
  returning id into v_id;

  insert into public.challenge_participants (challenge_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

grant execute on function public.create_challenge(text, integer, date, date) to app_user;

-- Depois do fim do desafio não se registram atividades novas (aprovar as pendentes continua valendo).
create or replace function public.activities_within_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ends date;
begin
  select c.ends_on into v_ends from public.challenges c where c.id = new.challenge_id;
  if v_ends is not null and new.activity_date > v_ends then
    raise exception 'O desafio terminou em %. Não dá para registrar atividades depois do fim.', to_char(v_ends, 'DD/MM/YYYY')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_activities_within_challenge on public.activities;
create trigger trg_activities_within_challenge
  before insert or update of activity_date on public.activities
  for each row execute function public.activities_within_challenge();

revoke execute on function public.activities_within_challenge() from public, app_user;

-- ---------------------------------------------------------------------------
-- Até 4 participantes por desafio.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_max_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('participants:' || new.challenge_id::text));
  if (select count(*) from public.challenge_participants
        where challenge_id = new.challenge_id) >= 4 then
    raise exception 'Este desafio já possui 4 participantes.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Vários convites pendentes ao mesmo tempo (um por e-mail).
drop index if exists public.challenge_invitations_one_pending;
create unique index if not exists challenge_invitations_one_pending_email
  on public.challenge_invitations (challenge_id, invited_email) where status = 'pending';

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
  v_members integer;
  v_pending integer;
begin
  if v_uid is null or not public.is_challenge_member(p_challenge, v_uid) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;
  if v_email = (select lower(email) from public.users where id = v_uid) then
    raise exception 'Use o e-mail de quem você quer convidar, não o seu.' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.challenge_participants cp join public.users u on u.id = cp.user_id
     where cp.challenge_id = p_challenge and lower(u.email) = v_email
  ) then
    raise exception 'Essa pessoa já está no desafio.' using errcode = 'check_violation';
  end if;

  perform pg_advisory_xact_lock(hashtext('participants:' || p_challenge::text));

  -- Reenviar para o mesmo e-mail substitui o convite anterior (não ocupa outra vaga).
  update public.challenge_invitations set status = 'cancelled'
   where challenge_id = p_challenge and status = 'pending' and invited_email = v_email;

  select count(*) into v_members from public.challenge_participants where challenge_id = p_challenge;
  select count(*) into v_pending from public.challenge_invitations
   where challenge_id = p_challenge and status = 'pending' and expires_at > now();
  if v_members >= 4 then
    raise exception 'O desafio já tem 4 participantes.' using errcode = 'check_violation';
  end if;
  if v_members + v_pending >= 4 then
    raise exception 'Já há convites pendentes para todas as vagas (máximo de 4 pessoas). Cancele um para convidar outra pessoa.'
      using errcode = 'check_violation';
  end if;

  insert into public.challenge_invitations (challenge_id, invited_by, invited_email)
  values (p_challenge, v_uid, v_email)
  returning token into v_token;
  return v_token;
end;
$$;

-- Cancela um convite pendente (qualquer participante do desafio).
create or replace function public.cancel_invitation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge uuid;
begin
  select challenge_id into v_challenge from public.challenge_invitations where id = p_id and status = 'pending';
  if v_challenge is null then
    raise exception 'Convite não encontrado.' using errcode = 'no_data_found';
  end if;
  if not public.is_challenge_member(v_challenge, public.current_user_id()) then
    raise exception 'Você não participa deste desafio.' using errcode = '42501';
  end if;
  update public.challenge_invitations set status = 'cancelled' where id = p_id;
end;
$$;

grant execute on function public.cancel_invitation(uuid) to app_user;

-- Aceitar avisa todos que já estão no desafio.
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
  select cp.user_id, 'invite_accepted', 'Gente nova no desafio!',
         coalesce(v_name, 'Alguém') || ' entrou no desafio.', '/desafio'
    from public.challenge_participants cp
   where cp.challenge_id = v_inv.challenge_id and cp.user_id <> v_uid;

  return v_inv.challenge_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cutucar uma pessoa específica (p_to null = a primeira outra pessoa, compatível com 0010).
-- ---------------------------------------------------------------------------
drop function if exists public.poke_partner();

create or replace function public.poke_partner(p_to uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.current_user_id();
  v_challenge uuid;
  v_target uuid;
  v_name text;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_trained boolean;
begin
  if v_uid is null then
    raise exception 'Você precisa estar logado.' using errcode = '42501';
  end if;

  select cp.challenge_id into v_challenge
    from public.challenge_participants cp where cp.user_id = v_uid limit 1;
  select cp.user_id into v_target
    from public.challenge_participants cp
   where cp.challenge_id = v_challenge and cp.user_id <> v_uid
     and (p_to is null or cp.user_id = p_to)
   order by cp.joined_at
   limit 1;

  if v_target is null then
    raise exception 'Essa pessoa não está no seu desafio.' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.pokes
     where from_user = v_uid and to_user = v_target and created_at > now() - interval '4 hours'
  ) then
    raise exception 'Você já cutucou há pouco. Espere umas horas para cutucar de novo.' using errcode = 'check_violation';
  end if;

  insert into public.pokes (from_user, to_user) values (v_uid, v_target);

  select coalesce(nickname, display_name) into v_name from public.profiles where id = v_uid;
  select exists (
    select 1 from public.activities a
     where a.user_id = v_uid and a.challenge_id = v_challenge
       and a.activity_date = v_today and a.status <> 'rejected'
  ) into v_trained;

  insert into public.notifications (user_id, kind, title, body, link)
  values (
    v_target, 'poke', coalesce(v_name, 'Alguém do desafio') || ' te cutucou 👉',
    case when v_trained then 'Já treinei hoje. E você, vai ficar para trás?'
         else 'Bora treinar? Ninguém treinou ainda hoje.' end,
    '/atividades/nova'
  );
end;
$$;

grant execute on function public.poke_partner(uuid) to app_user;

-- ---------------------------------------------------------------------------
-- Lembrete diário: um aviso por pessoa (junta os nomes de quem já treinou) e
-- nada para desafios encerrados.
-- ---------------------------------------------------------------------------
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
       and (ch.ends_on is null or ch.ends_on >= v_today)
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
  others_today as (
    select t.user_id,
           string_agg(coalesce(pp.nickname, pp.display_name), ' e ' order by op.joined_at) as names,
           count(*) as n
      from targets t
      join public.challenge_participants op on op.challenge_id = t.challenge_id and op.user_id <> t.user_id
      join public.profiles pp on pp.id = op.user_id
     where exists (
       select 1 from public.activities a
        where a.user_id = op.user_id and a.challenge_id = t.challenge_id
          and a.activity_date = v_today and a.status <> 'rejected')
     group by t.user_id
  )
  insert into public.notifications (user_id, kind, title, body, link)
  select t.user_id, 'daily_reminder',
         case when o.names is null then 'Bora treinar hoje? 💪'
              when o.n = 1 then o.names || ' já treinou hoje 👀'
              else o.names || ' já treinaram hoje 👀' end,
         case when o.names is not null then 'Ainda dá tempo de registrar a sua atividade e não ficar para trás.'
              else 'Você ainda não registrou nenhuma atividade hoje.' end,
         '/atividades/nova'
    from targets t
    left join others_today o on o.user_id = t.user_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.queue_daily_reminders() from public, app_user;
