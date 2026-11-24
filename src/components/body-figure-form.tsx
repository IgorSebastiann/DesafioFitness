"use client";

import { useOptimistic, useTransition } from "react";
import { setBodyFigure } from "@/app/actions/exercises";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
] as const;

/** Qual desenho do corpo o mapa muscular mostra primeiro (dá para alternar na tela). */
export function BodyFigureForm({ value }: { value: "male" | "female" | null }) {
  const [current, setCurrent] = useOptimistic(value);
  const [, startTransition] = useTransition();
  return (
    <div>
      <p className="font-semibold">Desenho do corpo</p>
      <p className="text-sm text-muted">O mapa de músculos dos exercícios abre com este desenho.</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label="Desenho do corpo">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={current === o.value}
            onClick={() =>
              startTransition(async () => {
                setCurrent(o.value);
                await setBodyFigure(o.value);
              })
            }
            className={cn(
              "h-11 rounded-xl text-sm font-semibold transition active:scale-95",
              current === o.value ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted hover:bg-surface-3",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
