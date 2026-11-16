"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import {
  acceptInvitation,
  cancelInvitation,
  closePeriodManually,
  createAward,
  createChallenge,
  createInvitation,
  leaveChallenge,
  toggleAward,
  updateChallengeInfo,
} from "@/app/actions/challenge";
import { ChallengeScheduleFields } from "@/components/challenge-schedule";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { Challenge } from "@/lib/types";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (!state.ok) return <Notice kind="error">{state.error}</Notice>;
  return state.message && !state.message.startsWith("http") ? <Notice kind="success">{state.message}</Notice> : null;
}

export function CreateChallengeForm({ today }: { today: string }) {
  const [state, action] = useActionState(createChallenge, null);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Nome do desafio" error={state && !state.ok ? state.fieldErrors?.name : undefined}>
        <input name="name" required minLength={3} maxLength={80} placeholder="Ex.: Verão em forma 2027" className={inputClass} />
      </Field>
      <Field label="Limite diário (pontos)" hint="Quantos pontos por dia contam para cada pessoa.">
        <input name="dailyPointLimit" type="number" min={0} max={10} defaultValue={2} required className={inputClass} />
      </Field>
      <ChallengeScheduleFields defaultStart={today} defaultEnd={null} />
      <Feedback state={state} />
      <SubmitButton>Criar desafio</SubmitButton>
    </form>
  );
}

export function EditChallengeForm({ challenge }: { challenge: Challenge }) {
  const [state, action] = useActionState(updateChallengeInfo, null);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Nome">
        <input name="name" defaultValue={challenge.name} required minLength={3} maxLength={80} className={inputClass} />
      </Field>
      <Field label="Limite diário (pontos)" hint="Máximo de pontos por pessoa em um dia.">
        <input name="dailyPointLimit" type="number" min={0} max={10} defaultValue={challenge.daily_point_limit} required className={inputClass} />
      </Field>
      <ChallengeScheduleFields defaultStart={challenge.starts_on} defaultEnd={challenge.ends_on} />
      <Feedback state={state} />
      <SubmitButton variant="secondary">Salvar alterações</SubmitButton>
    </form>
  );
}

/** Gera o link de convite e permite copiar ou compartilhar (WhatsApp etc.). */
export function InviteForm() {
  const [state, action] = useActionState(createInvitation, null);
  const [copied, setCopied] = useState(false);
  const link = state?.ok && state.message?.startsWith("http") ? state.message : null;

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      await navigator.share({ title: "Desafio Fitness", text: "Entra no nosso desafio fitness:", url: link }).catch(() => undefined);
    } else {
      await copy();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="E-mail de quem você quer convidar" hint="A pessoa precisa entrar com este e-mail para aceitar.">
          <input name="email" type="email" required placeholder="amigo@exemplo.com" className={inputClass} />
        </Field>
        <SubmitButton variant="secondary" className="sm:w-auto">Gerar convite</SubmitButton>
      </form>
      {state && !state.ok ? <Notice kind="error">{state.error}</Notice> : null}
      {link ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-accent" aria-hidden /> Convite criado (vale por 7 dias)</p>
          <p className="break-all rounded-xl bg-surface-2 p-3 font-mono text-xs text-muted">{link}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
              <Share2 className="h-4 w-4" aria-hidden /> Compartilhar
            </button>
            <button type="button" onClick={copy} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold">
              {copied ? <Check className="h-4 w-4 text-accent" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Copiado" : "Copiar link"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Convites enviados que ainda não foram aceitos: copiar o link de novo ou cancelar. */
export function PendingInvitations({ items }: { items: { id: string; email: string; link: string; expiresOn: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Aguardando aceitar</p>
      <ul className="flex flex-col divide-y divide-border rounded-2xl bg-surface-2">
        {items.map((inv) => (
          <li key={inv.id} className="flex items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{inv.email}</p>
              <p className="text-xs text-muted">Vale até {inv.expiresOn}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(inv.link);
                setCopiedId(inv.id);
                setTimeout(() => setCopiedId(null), 2000);
              }}
              aria-label={`Copiar link do convite para ${inv.email}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold"
            >
              {copiedId === inv.id ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copiedId === inv.id ? "Copiado" : "Link"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await cancelInvitation(inv.id);
                  if (result && !result.ok) setError(result.error);
                })
              }
              className="h-9 rounded-lg px-2.5 text-xs font-semibold text-danger disabled:opacity-50"
            >
              Cancelar
            </button>
          </li>
        ))}
      </ul>
      {error ? <Notice kind="error">{error}</Notice> : null}
    </div>
  );
}

/** Botão da página do convite: aceita e entra no desafio. */
export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptInvitation(token);
            if (result && !result.ok) setError(result.error);
          })
        }
        className="inline-flex h-13 min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Aceitar convite e entrar no desafio"}
      </button>
      {error ? <Notice kind="error">{error}</Notice> : null}
    </div>
  );
}

export function LeaveChallengeButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Sair deste desafio? Seu histórico de atividades continua salvo.")) return;
          startTransition(async () => {
            const result = await leaveChallenge();
            if (result && !result.ok) setError(result.error);
          });
        }}
        className="text-sm font-semibold text-danger disabled:opacity-50"
      >
        Sair do desafio
      </button>
      {error ? <Notice kind="error">{error}</Notice> : null}
    </div>
  );
}

export function AwardForm() {
  const [state, action] = useActionState(createAward, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="Período">
        <select name="period" required className={inputClass}>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
        </select>
      </Field>
      <Field label="Prêmio">
        <input name="title" required minLength={2} maxLength={80} placeholder="Ex.: Pagar um hambúrguer" className={inputClass} />
      </Field>
      <Field label="Valor ou observação">
        <input name="valueNote" maxLength={120} placeholder="Ex.: até R$ 60" className={inputClass} />
      </Field>
      <Field label="Descrição">
        <input name="description" maxLength={300} className={inputClass} />
      </Field>
      <div className="md:col-span-2 flex flex-col gap-3">
        <Feedback state={state} />
        <SubmitButton variant="secondary" className="md:w-auto">Cadastrar prêmio</SubmitButton>
      </div>
    </form>
  );
}

export function AwardToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionState>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setMessage(await toggleAward(id, !active)))}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
      >
        {active ? "Desativar" : "Ativar"}
      </button>
      {message && !message.ok ? <span className="text-xs text-danger">{message.error}</span> : null}
    </div>
  );
}

export function ClosePeriodForm({ today }: { today: string }) {
  const [state, action] = useActionState(closePeriodManually, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-3 md:items-end">
      <Field label="Período">
        <select name="period" required className={inputClass}>
          <option value="weekly">Semana</option>
          <option value="monthly">Mês</option>
        </select>
      </Field>
      <Field label="Data de referência" hint="Um dia dentro do período já encerrado.">
        <input name="anchor" type="date" required max={today} defaultValue={today} className={inputClass} />
      </Field>
      <SubmitButton variant="secondary">Fechar período</SubmitButton>
      <div className="md:col-span-3"><Feedback state={state} /></div>
    </form>
  );
}
