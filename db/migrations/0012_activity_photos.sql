-- 0012 · Várias fotos/vídeos por atividade.
-- A primeira comprovação continua em activities.proof_path (capa); as demais (até 4) ficam aqui.

create table if not exists public.activity_extra_proofs (
  activity_id uuid not null references public.activities (id) on delete cascade,
  position    smallint not null check (position between 1 and 4),
  proof_path  text not null unique check (char_length(proof_path) between 3 and 300),
  proof_kind  public.proof_kind not null,
  created_at  timestamptz not null default now(),
  primary key (activity_id, position)
);

alter table public.activity_extra_proofs enable row level security;

-- Vê quem participa do desafio da atividade (ou admin).
create policy extra_proofs_select on public.activity_extra_proofs for select to app_user
  using (public.is_activity_member(activity_id) or public.is_admin());

-- Só o dono adiciona, só enquanto a atividade está pendente e só arquivos da própria pasta.
create policy extra_proofs_insert_own on public.activity_extra_proofs for insert to app_user
  with check (
    proof_path like 'proofs/' || public.current_user_id()::text || '/%'
    and exists (
      select 1 from public.activities a
       where a.id = activity_id and a.user_id = public.current_user_id() and a.status = 'pending'
    )
  );

-- O dono remove enquanto a atividade está pendente.
create policy extra_proofs_delete_own on public.activity_extra_proofs for delete to app_user
  using (
    exists (
      select 1 from public.activities a
       where a.id = activity_id and a.user_id = public.current_user_id() and a.status = 'pending'
    )
  );
