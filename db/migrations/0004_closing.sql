-- 0005 · Fechamento de períodos (histórico imutável), vencedor/empate e premiação.
-- Zerar o placar NÃO apaga nada: o ranking ao vivo sempre recalcula a partir das
-- atividades aprovadas de cada intervalo; o fechamento só acrescenta linhas.

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
  if public.current_user_id() is not null and not public.is_admin() then
    raise exception 'Somente administradores podem fechar períodos.' using errcode = '42501';
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

-- Fecha todos os períodos concluídos de todos os desafios ativos (inclusive pendências antigas).
-- Chamada pelo cron /api/cron/close-periods com a service role.
create or replace function public.close_due_periods()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ch record;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_last_week date := date_trunc('week', v_today)::date - 7;
  v_last_month date := (date_trunc('month', v_today) - interval '1 month')::date;
  v_d date;
  v_n integer := 0;
begin
  for v_ch in select c.id, c.starts_on from public.challenges c where c.is_active loop
    for v_d in
      select g::date from generate_series(
        date_trunc('week', v_ch.starts_on)::date, v_last_week, interval '7 days') g
    loop
      if public.close_period(v_ch.id, 'weekly', v_d) then v_n := v_n + 1; end if;
    end loop;

    for v_d in
      select g::date from generate_series(
        date_trunc('month', v_ch.starts_on)::date, v_last_month, interval '1 month') g
    loop
      if public.close_period(v_ch.id, 'monthly', v_d) then v_n := v_n + 1; end if;
    end loop;
  end loop;
  return v_n;
end;
$$;

-- Permissões: close_due_periods é chamada pelo servidor (dono do banco, cron).
-- Usuários comuns só chamam close_period, que verifica se é admin.
revoke execute on function public.close_due_periods() from public, app_user;
revoke execute on function public.close_period(uuid, public.award_period, date) from public;
grant execute on function public.close_period(uuid, public.award_period, date) to app_user;
