-- 0003 · Row Level Security. Todas as tabelas de public têm RLS habilitado.
-- Escritas de resultados, conquistas e notificações ocorrem apenas por funções/triggers.

alter table public.profiles               enable row level security;
alter table public.challenges             enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.activity_categories    enable row level security;
alter table public.activities             enable row level security;
alter table public.activity_approvals     enable row level security;
alter table public.awards                 enable row level security;
alter table public.weekly_results         enable row level security;
alter table public.monthly_results        enable row level security;
alter table public.achievements           enable row level security;
alter table public.user_achievements      enable row level security;
alter table public.notifications          enable row level security;
alter table public.audit_logs             enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: cada um edita o próprio; vê perfis de quem divide desafio com ele.
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to app_user
  using (id = public.current_user_id() or public.shares_challenge_with(id) or public.is_admin());

create policy profiles_update_own on public.profiles for update to app_user
  using (id = public.current_user_id() or public.is_admin())
  with check (id = public.current_user_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- challenges: membros leem; somente admin escreve.
-- ---------------------------------------------------------------------------
create policy challenges_select on public.challenges for select to app_user
  using (public.is_challenge_member(id, public.current_user_id()) or public.is_admin());

create policy challenges_admin_write on public.challenges for all to app_user
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- challenge_participants: membros veem o próprio desafio; só admin altera.
-- ---------------------------------------------------------------------------
create policy participants_select on public.challenge_participants for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()) or public.is_admin());

create policy participants_admin_write on public.challenge_participants for all to app_user
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- activity_categories: leitura para autenticados; escrita só admin.
-- ---------------------------------------------------------------------------
create policy categories_select on public.activity_categories for select to app_user
  using (true);

create policy categories_admin_write on public.activity_categories for all to app_user
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- activities
--   leitura: membros do desafio
--   inserção: o próprio usuário (triggers validam regras)
--   atualização: dono (só pendentes), outro participante (aprovar/contestar), admin
--   exclusão: dono (só pendentes) e admin
-- ---------------------------------------------------------------------------
create policy activities_select on public.activities for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()) or public.is_admin());

create policy activities_insert_own on public.activities for insert to app_user
  with check (user_id = public.current_user_id());

create policy activities_update on public.activities for update to app_user
  using (
    user_id = public.current_user_id()
    or public.is_challenge_member(challenge_id, public.current_user_id())
    or public.is_admin()
  )
  with check (
    user_id = public.current_user_id()
    or public.is_challenge_member(challenge_id, public.current_user_id())
    or public.is_admin()
  );

create policy activities_delete on public.activities for delete to app_user
  using ((user_id = public.current_user_id() and status = 'pending') or public.is_admin());

-- ---------------------------------------------------------------------------
-- activity_approvals: leitura para membros; escrita só via trigger.
-- ---------------------------------------------------------------------------
create policy approvals_select on public.activity_approvals for select to app_user
  using (exists (
    select 1 from public.activities a
    where a.id = activity_id
      and (public.is_challenge_member(a.challenge_id, public.current_user_id()) or public.is_admin())
  ));

-- ---------------------------------------------------------------------------
-- awards: leitura para membros; escrita só admin.
-- ---------------------------------------------------------------------------
create policy awards_select on public.awards for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()) or public.is_admin());

create policy awards_admin_write on public.awards for all to app_user
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Resultados de período: leitura para membros. Sem política de escrita
-- (gravados por public.close_period, security definer).
-- ---------------------------------------------------------------------------
create policy weekly_results_select on public.weekly_results for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()) or public.is_admin());

create policy monthly_results_select on public.monthly_results for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Conquistas
-- ---------------------------------------------------------------------------
create policy achievements_select on public.achievements for select to app_user
  using (true);

create policy achievements_admin_write on public.achievements for all to app_user
  using (public.is_admin()) with check (public.is_admin());

create policy user_achievements_select on public.user_achievements for select to app_user
  using (public.is_challenge_member(challenge_id, public.current_user_id()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications: cada um lê e marca como lida as próprias.
-- ---------------------------------------------------------------------------
create policy notifications_select_own on public.notifications for select to app_user
  using (user_id = public.current_user_id());

create policy notifications_update_own on public.notifications for update to app_user
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- audit_logs: somente admin lê. Escrita só via trigger.
-- ---------------------------------------------------------------------------
create policy audit_select_admin on public.audit_logs for select to app_user
  using (public.is_admin());

