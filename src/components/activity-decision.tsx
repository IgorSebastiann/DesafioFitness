"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import {
  decideActivity,
  deleteOwnPendingActivity,
  updateOwnPendingActivity,
} from "@/app/actions/activities";
import { updateActivityAsAdmin } from "@/app/actions/admin";
import { Card, Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ActivityRow } from "@/lib/types";
import type { ActionState } from "@/lib/action-state";

export function ActivityDecisionPanel({
  activity,
  viewerId,
  isAdmin,
  canEditOwn,
}: {
  activity: ActivityRow;
  viewerId: string;
  isAdmin: boolean;
  canEditOwn: boolean;
}) {
  const isOwner = activity.user_id === viewerId;
  const canDecide = !isOwner && (activity.status === "pending" || isAdmin);

  return (
    <div className="flex flex-col gap-6">
      {canDecide ? <DecisionForm activityId={activity.id} status={activity.status} /> : null}
      {canEditOwn ? <OwnPendingEditor activity={activity} /> : null}
      {isAdmin ? <AdminCorrection activity={activity} /> : null}
      {isOwner && activity.status !== "pending" && !isAdmin ? (
        <Notice kind="info">Esta atividade já foi avaliada e não pode mais ser alterada.</Notice>
      ) : null}
    </div>
  );
}

function DecisionForm({
  activityId,
  status,
}: {
  activityId: string;
  status: ActivityRow["status"];
}) {
  const [state, action] = useActionState(decideActivity, null);
  const [note, setNote] = useState("");
  return (
    <Card>
      <h2 className="font-semibold">{status === "pending" ? "Validar atividade" : "Alterar decisão"}</h2>
      <p className="mt-1 text-sm text-muted">
        {status === "pending"
          ? "Confirme se a atividade aconteceu. Ao aprovar, ela passa a contar no ranking."
          : "Como administrador, você pode alterar esta decisão. A mudança fica registrada."}
      </p>
      <form action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="activityId" value={activityId} />
        <Field label="Observação (opcional)" hint="Use para explicar uma contestação.">
          <textarea
            name="note"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} h-auto py-3`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <DecisionButton value="approved" tone="accent" disabled={status === "approved"}>
            <Check className="h-5 w-5" aria-hidden /> Aprovar
          </DecisionButton>
          <DecisionButton value="rejected" tone="danger" disabled={status === "rejected"}>
            <X className="h-5 w-5" aria-hidden /> Contestar
          </DecisionButton>
        </div>
        {state ? <Feedback state={state} /> : null}
      </form>
    </Card>
  );
}

function DecisionButton({
  value,
  tone,
  disabled,
  children,
}: {
  value: "approved" | "rejected";
  tone: "accent" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const style =
    tone === "accent"
      ? "bg-accent text-accent-ink"
      : "bg-danger/15 text-danger border border-danger/30";
  return (
    <button
      type="submit"
      name="decision"
      value={value}
      disabled={disabled}
      className={`inline-flex h-13 min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-semibold transition active:scale-[0.98] disabled:opacity-40 ${style}`}
    >
      {children}
    </button>
  );
}

function OwnPendingEditor({ activity }: { activity: ActivityRow }) {
  const [state, action] = useActionState(updateOwnPendingActivity, null);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <Card>
      <h2 className="font-semibold">Editar antes da validação</h2>
      <form action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="activityId" value={activity.id} />
        <Field label="Duração (min)">
          <input name="durationMinutes" type="number" min={1} max={1440} defaultValue={activity.duration_minutes} className={inputClass} />
        </Field>
        <Field label="Observação">
          <textarea name="description" rows={2} maxLength={500} defaultValue={activity.description ?? ""} className={`${inputClass} h-auto py-3`} />
        </Field>
        {state ? <Feedback state={state} /> : null}
        <SubmitButton variant="secondary" pendingLabel="Salvando...">Salvar alterações</SubmitButton>
      </form>

      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => {
            if (!window.confirm("Excluir esta atividade pendente? A comprovação também será removida.")) return;
            setDeleteError(null);
            startDelete(async () => {
              const result = await deleteOwnPendingActivity(activity.id);
              if (result && !result.ok) setDeleteError(result.error);
            });
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Excluir atividade
        </button>
        {deleteError ? <div className="mt-3"><Notice kind="error">{deleteError}</Notice></div> : null}
      </div>
    </Card>
  );
}

function AdminCorrection({ activity }: { activity: ActivityRow }) {
  const [state, action] = useActionState(updateActivityAsAdmin, null);
  return (
    <Card>
      <h2 className="font-semibold">Correção administrativa</h2>
      <p className="mt-1 text-sm text-muted">Alterações são registradas na auditoria.</p>
      <form action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="id" value={activity.id} />
        <Field label="Duração (min)">
          <input name="durationMinutes" type="number" min={1} max={1440} defaultValue={activity.duration_minutes} className={inputClass} />
        </Field>
        <Field label="Observação">
          <textarea name="description" rows={2} maxLength={500} defaultValue={activity.description ?? ""} className={`${inputClass} h-auto py-3`} />
        </Field>
        {state ? <Feedback state={state} /> : null}
        <SubmitButton variant="secondary" pendingLabel="Salvando...">Salvar correção</SubmitButton>
      </form>
    </Card>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (!state.ok) return <Notice kind="error">{state.error}</Notice>;
  return state.message ? <Notice kind="success">{state.message}</Notice> : null;
}
