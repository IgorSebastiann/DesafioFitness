"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { saveSchedule } from "@/app/actions/workouts";
import { Notice, buttonStyles } from "@/components/ui";
import { WEEKDAYS, WEEK_ORDER } from "@/lib/domain/workouts";

/** Para cada dia da semana, quais fichas fazer (pode ser mais de uma, ou nenhuma = descanso). */
export function WorkoutScheduleForm({
  sheets,
  selected,
}: {
  sheets: Array<{ id: string; name: string }>;
  selected: Array<{ weekday: number; sheet_id: string }>;
}) {
  const [state, action, pending] = useActionState(saveSchedule, null);
  const isOn = (day: number, id: string) => selected.some((s) => s.weekday === day && s.sheet_id === id);

  return (
    <form action={action} className="flex flex-col gap-4">
      {WEEK_ORDER.map((day) => (
        <fieldset key={day} className="group/day rounded-3xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">
            {WEEKDAYS[day]}
            <span className="ml-2 text-xs font-normal text-muted group-has-[:checked]/day:hidden">Descanso</span>
          </legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {sheets.map((s) => (
              <label
                key={s.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-4 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/15 has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40"
              >
                <input type="checkbox" name={`d${day}`} value={s.id} defaultChecked={isOn(day, s.id)} className="peer sr-only" />
                <Check className="hidden h-4 w-4 shrink-0 peer-checked:block" aria-hidden />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div aria-live="polite" className="empty:hidden">
        {state ? <Notice kind={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Notice> : null}
      </div>
      <button type="submit" disabled={pending} className={buttonStyles("primary", "lg")}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Salvar agenda
      </button>
    </form>
  );
}
