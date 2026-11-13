"use client";

import { useActionState } from "react";
import { updateActivityAsAdmin, updateCategory, updateProfileAsAdmin } from "@/app/actions/admin";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { Category } from "@/lib/types";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (!state.ok) return <Notice kind="error">{state.error}</Notice>;
  return state.message ? <Notice kind="success">{state.message}</Notice> : null;
}

export function CategoryAdminForm({ category }: { category: Category }) {
  const [state, action] = useActionState(updateCategory, null);
  return (
    <form action={action} className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_0.7fr_0.9fr_auto_auto] md:items-end">
      <input type="hidden" name="id" value={category.id} />
      <div className="col-span-2 font-medium md:col-span-1 md:self-center">{category.name}</div>
      <Field label="Pontos">
        <input name="points" type="number" min={0} max={10} defaultValue={category.points} required className={inputClass} />
      </Field>
      <Field label="Mín. (min)">
        <input name="minDurationMinutes" type="number" min={0} max={1440} defaultValue={category.min_duration_minutes} required className={inputClass} />
      </Field>
      <label className="flex h-12 items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={category.is_active} className="h-5 w-5 accent-[#c6ff3d]" />
        Ativa
      </label>
      <SubmitButton variant="secondary" className="w-full md:w-auto">Salvar</SubmitButton>
      <div className="col-span-2 md:col-span-5"><Feedback state={state} /></div>
    </form>
  );
}

export function ProfileAdminForm({
  profile,
}: {
  profile: { id: string; display_name: string; nickname: string | null; role: "member" | "admin" };
}) {
  const [state, action] = useActionState(updateProfileAsAdmin, null);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
      <input type="hidden" name="userId" value={profile.id} />
      <Field label="Nome">
        <input name="displayName" defaultValue={profile.display_name} required minLength={2} className={inputClass} />
      </Field>
      <Field label="Apelido">
        <input name="nickname" defaultValue={profile.nickname ?? ""} maxLength={20} className={inputClass} />
      </Field>
      <label className="flex h-12 items-center gap-2 text-sm">
        <span className="text-muted">Admin</span>
        <input name="role" type="checkbox" value="admin" defaultChecked={profile.role === "admin"} className="h-5 w-5 accent-[#c6ff3d]" />
      </label>
      <SubmitButton variant="secondary" className="md:w-auto">Salvar</SubmitButton>
      <div className="md:col-span-4"><Feedback state={state} /></div>
    </form>
  );
}

/** Correção de um registro (duração e observação). Fica registrada na auditoria. */
export function ActivityCorrectionForm({
  activity,
}: {
  activity: { id: string; duration_minutes: number; description: string | null };
}) {
  const [state, action] = useActionState(updateActivityAsAdmin, null);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[0.6fr_1.4fr_auto] md:items-end">
      <input type="hidden" name="id" value={activity.id} />
      <Field label="Duração (min)">
        <input name="durationMinutes" type="number" min={1} max={1440} defaultValue={activity.duration_minutes} className={inputClass} />
      </Field>
      <Field label="Observação">
        <input name="description" maxLength={500} defaultValue={activity.description ?? ""} className={inputClass} />
      </Field>
      <SubmitButton variant="secondary" className="md:w-auto">Corrigir</SubmitButton>
      <div className="md:col-span-3"><Feedback state={state} /></div>
    </form>
  );
}
