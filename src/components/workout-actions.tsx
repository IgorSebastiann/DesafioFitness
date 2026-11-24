"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { createSheet, setSheetShared } from "@/app/actions/workouts";
import type { ActionState } from "@/lib/action-state";
import { Field, Notice, buttonStyles, inputClass } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Botão que chama uma Server Action já ligada aos argumentos (ex.: startWorkout.bind(null, id)).
 * Se a ação redireciona, a navegação acontece sozinha; se falha, a mensagem aparece abaixo.
 */
export function ActionButton({
  action,
  children,
  variant = "primary",
  size = "md",
  className,
  confirm,
  block = false,
}: {
  action: () => Promise<ActionState>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  className?: string;
  /** Texto do segundo clique (pede confirmação antes de executar). */
  confirm?: string;
  /** Ocupa a largura toda também em telas largas (ex.: coluna lateral). */
  block?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  function run() {
    if (confirm && !armed) {
      setArmed(true);
      return;
    }
    setError(null);
    start(async () => {
      const result = await action();
      if (result && !result.ok) setError(result.error);
      setArmed(false);
    });
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className={buttonStyles(armed ? "danger" : variant, size, block ? "w-full" : "w-full sm:w-auto")}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {armed ? confirm : children}
        </button>
        {armed ? (
          <button type="button" onClick={() => setArmed(false)} className={buttonStyles("ghost", size, block ? "w-full" : "w-full sm:w-auto")}>
            Cancelar
          </button>
        ) : null}
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}
    </div>
  );
}

/** Liga/desliga o compartilhamento com o desafio (atualização otimista). */
export function ShareToggle({ sheetId, shared }: { sheetId: string; shared: boolean }) {
  const [value, setValue] = useState(shared);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ActionState>(null);

  function toggle() {
    const next = !value;
    setValue(next);
    start(async () => {
      const result = await setSheetShared(sheetId, next);
      if (result && !result.ok) setValue(!next);
      setMessage(result);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={toggle}
        disabled={pending}
        className="flex min-h-11 items-center justify-between gap-4 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-left"
      >
        <span className="flex flex-col">
          <span className="text-sm font-medium">Compartilhar com o meu desafio</span>
          <span className="text-xs text-muted">Quem está no seu desafio vê a ficha e pode copiar para a própria conta.</span>
        </span>
        <span
          aria-hidden
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", value ? "bg-accent" : "bg-surface-3")}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", value ? "left-[1.375rem]" : "left-0.5")} />
        </span>
      </button>
      <div aria-live="polite" className="empty:hidden">
        {message ? <Notice kind={message.ok ? "success" : "error"}>{message.ok ? message.message : message.error}</Notice> : null}
      </div>
    </div>
  );
}

export function NewSheetForm() {
  const [state, action, pending] = useActionState(createSheet, null);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label="Nome da ficha" error={state && !state.ok ? state.fieldErrors?.name : undefined}>
          <input name="name" required minLength={2} maxLength={60} placeholder="Ex.: Treino A — Peito" className={inputClass} />
        </Field>
      </div>
      <button type="submit" disabled={pending} className={buttonStyles("primary", "md", "h-12")}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Criar e montar
      </button>
      {state && !state.ok && !state.fieldErrors?.name ? <Notice kind="error">{state.error}</Notice> : null}
    </form>
  );
}
