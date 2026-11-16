"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { addChallengeCategory, saveChallengeCategories } from "@/app/actions/challenge";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { ChallengeCategoryRule } from "@/lib/data/queries";
import { cn } from "@/lib/cn";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (!state.ok) return <Notice kind="error">{state.error}</Notice>;
  return state.message ? <Notice kind="success">{state.message}</Notice> : null;
}

/** Quais modalidades valem no desafio e o tempo mínimo de cada uma. */
export function ChallengeCategoriesForm({ rules }: { rules: ChallengeCategoryRule[] }) {
  const [state, action] = useActionState(saveChallengeCategories, null);
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(rules.filter((r) => r.enabled).map((r) => r.id)));

  const toggle = (id: string) =>
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOn = enabled.size === rules.length;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {enabled.size} de {rules.length} valendo
        </p>
        <button
          type="button"
          onClick={() => setEnabled(allOn ? new Set() : new Set(rules.map((r) => r.id)))}
          className="text-sm font-semibold text-accent"
        >
          {allOn ? "Desmarcar todas" : "Marcar todas"}
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
        {rules.map((r) => {
          const on = enabled.has(r.id);
          return (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="enabled"
                  value={r.id}
                  checked={on}
                  onChange={() => toggle(r.id)}
                  className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className={cn("block truncate font-medium", !on && "text-muted")}>{r.name}</span>
                  <span className="block text-xs text-muted">
                    {r.points} {r.points === 1 ? "ponto" : "pontos"}
                    {r.is_custom ? " · criada por vocês" : ""}
                  </span>
                </span>
              </label>
              <label className="flex shrink-0 items-center gap-1.5 text-sm text-muted">
                <span className="sr-only">Tempo mínimo de {r.name} em minutos</span>
                <input
                  name={`min_${r.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={600}
                  step={1}
                  defaultValue={r.min_duration_minutes}
                  disabled={!on}
                  className={cn(inputClass, "h-10 w-20 px-3 text-right disabled:opacity-40")}
                />
                min
              </label>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">
        O tempo mínimo é quanto a atividade precisa durar para valer pontos. As mudanças valem para os próximos registros
        e quem participa recebe um aviso.
      </p>
      <Feedback state={state} />
      <SubmitButton variant="secondary">Salvar modalidades</SubmitButton>
    </form>
  );
}

/** Cria uma modalidade que não está na lista (só para este desafio). */
export function AddCategoryForm() {
  const [state, action] = useActionState(addChallengeCategory, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-accent hover:bg-surface-2"
      >
        <Plus className="h-4 w-4" aria-hidden /> Criar outra modalidade
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <Field label="Nome da modalidade">
        <input name="name" required minLength={2} maxLength={40} placeholder="Ex.: Yoga, Escalada, Tênis" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Pontos" hint="De 1 a 10.">
          <input name="points" type="number" inputMode="numeric" min={1} max={10} defaultValue={1} required className={inputClass} />
        </Field>
        <Field label="Tempo mínimo (min)">
          <input name="minDuration" type="number" inputMode="numeric" min={0} max={600} defaultValue={20} required className={inputClass} />
        </Field>
      </div>
      <Feedback state={state} />
      <div className="flex gap-3">
        <button type="button" onClick={() => setOpen(false)} className="h-11 flex-1 rounded-xl border border-border text-sm font-semibold text-muted">
          Cancelar
        </button>
        <SubmitButton className="flex-1">Criar modalidade</SubmitButton>
      </div>
    </form>
  );
}
