"use client";

import { useOptimistic, useTransition } from "react";
import { setWeeklyGoal } from "@/app/actions/social";
import { cn } from "@/lib/cn";

/** Escolha da meta semanal: de 1 a 7 dias de treino. */
export function WeeklyGoalForm({ goal }: { goal: number }) {
  const [value, setValue] = useOptimistic(goal);
  const [, startTransition] = useTransition();
  return (
    <div id="meta" className="scroll-mt-24">
      <p className="font-semibold">Meta semanal</p>
      <p className="text-sm text-muted">Quantos dias por semana você quer treinar.</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Dias por semana">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() =>
              startTransition(async () => {
                setValue(n);
                await setWeeklyGoal(n);
              })
            }
            className={cn(
              "h-11 rounded-xl text-base font-bold tabular-nums transition active:scale-95",
              value === n ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted hover:bg-surface-3",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
