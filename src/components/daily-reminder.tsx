"use client";

import { useOptimistic, useTransition } from "react";
import { AlarmClock } from "lucide-react";
import { setDailyReminder } from "@/app/actions/social";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Interruptor do lembrete diário (19h, só nos dias sem atividade registrada). */
export function DailyReminderToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useOptimistic(enabled);
  const [, startTransition] = useTransition();

  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <AlarmClock className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p id="lembrete-titulo" className="font-semibold">Lembrete diário</p>
        <p className="text-sm text-muted">Às 19h, se você ainda não registrou nada hoje.</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="lembrete-titulo"
        onClick={() =>
          startTransition(async () => {
            setOn(!on);
            await setDailyReminder(!on);
          })
        }
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition",
          on ? "bg-accent" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
            on ? "left-7" : "left-1",
          )}
          aria-hidden
        />
      </button>
    </Card>
  );
}
