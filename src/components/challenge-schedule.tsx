"use client";

import { useId, useState } from "react";
import { Field, inputClass } from "@/components/ui";
import { addDays, daysBetweenInclusive } from "@/lib/domain/periods";
import { formatDatePtBr } from "@/lib/time";
import { cn } from "@/lib/cn";

export const DURATION_PRESETS = [30, 60, 90, 180] as const;
type Choice = `${(typeof DURATION_PRESETS)[number]}` | "custom" | "none";

const LABEL: Record<Choice, string> = {
  "30": "30 dias",
  "60": "60 dias",
  "90": "90 dias",
  "180": "6 meses",
  custom: "Outra data",
  none: "Sem fim",
};

function initialChoice(start: string, end: string | null): Choice {
  if (!end) return "none";
  const days = daysBetweenInclusive(start, end);
  return (DURATION_PRESETS as readonly number[]).includes(days) ? (String(days) as Choice) : "custom";
}

/**
 * Início + duração do desafio. Envia `startsOn`, `duration` (30/60/90/180/custom/none)
 * e `endsOn` (só quando "Outra data"); o servidor calcula a data de fim.
 */
export function ChallengeScheduleFields({ defaultStart, defaultEnd = null }: { defaultStart: string; defaultEnd?: string | null }) {
  const [start, setStart] = useState(defaultStart);
  const [choice, setChoice] = useState<Choice>(() => initialChoice(defaultStart, defaultEnd));
  const [customEnd, setCustomEnd] = useState(defaultEnd ?? addDays(defaultStart, 44));
  const groupId = useId();

  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(start);
  const end =
    choice === "none" ? null : choice === "custom" ? customEnd : validStart ? addDays(start, Number(choice) - 1) : null;
  const summary =
    choice === "none"
      ? "O desafio continua até vocês decidirem parar."
      : end && validStart && end >= start
        ? `Termina em ${formatDatePtBr(end)} · ${daysBetweenInclusive(start, end)} dias no total.`
        : "Escolha uma data de fim depois do início.";

  return (
    <div className="grid gap-4">
      <Field label="Início">
        <input name="startsOn" type="date" value={start} onChange={(e) => setStart(e.target.value)} required className={inputClass} />
      </Field>

      <fieldset className="flex flex-col gap-2" aria-describedby={`${groupId}-resumo`}>
        <legend className="mb-1.5 text-sm font-medium text-foreground/90">Duração</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LABEL) as Choice[]).map((key) => (
            <label
              key={key}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40",
                choice === key ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface-2 text-muted hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="duration"
                value={key}
                checked={choice === key}
                onChange={() => setChoice(key)}
                className="sr-only"
              />
              {LABEL[key]}
            </label>
          ))}
        </div>
        {choice === "custom" ? (
          <Field label="Último dia do desafio">
            <input
              name="endsOn"
              type="date"
              min={validStart ? start : undefined}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        ) : null}
        <p id={`${groupId}-resumo`} className="text-xs text-muted">{summary}</p>
      </fieldset>
    </div>
  );
}
