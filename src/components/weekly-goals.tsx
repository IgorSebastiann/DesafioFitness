"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Target } from "lucide-react";
import { pokePartner } from "@/app/actions/social";
import { Avatar, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { launchConfetti } from "@/lib/confetti";
import { TONE, type Tone } from "@/lib/people";

export type GoalRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  goal: number;
  days: number;
  trainedToday: boolean;
  isMe: boolean;
  tone: Tone;
};

/** Meta semanal de cada participante (dias com treino na semana) e o botão de cutucar. */
export function WeeklyGoals({ rows, weekStart }: { rows: GoalRow[]; weekStart: string }) {
  const me = rows.find((r) => r.isMe);
  const myGoalDone = !!me && me.days >= me.goal;

  // Comemora uma vez por semana neste aparelho quando a sua meta é batida.
  useEffect(() => {
    if (!myGoalDone) return;
    const key = `meta-comemorada:${weekStart}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Sem armazenamento (aba anônima etc.): comemora mesmo assim.
    }
    launchConfetti();
  }, [myGoalDone, weekStart]);

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          <Target className="h-4 w-4" aria-hidden /> Meta da semana
        </h2>
        <Link href="/perfil#meta" className="text-xs font-semibold text-accent hover:underline">
          Mudar minha meta
        </Link>
      </div>
      {rows.map((r) => (
        <GoalLine key={r.userId} row={r} />
      ))}
    </Card>
  );
}

function GoalLine({ row }: { row: GoalRow }) {
  const done = row.days >= row.goal;
  const pct = Math.min(100, Math.round((row.days / row.goal) * 100));
  return (
    <div className="flex items-start gap-3">
      <Avatar name={row.name} src={row.avatarUrl} size={36} tone={row.tone} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="min-w-0 truncate font-semibold">{row.isMe ? "Você" : row.name}</span>
          <span
            className={cn(
              "shrink-0 tabular-nums",
              done ? cn("font-bold", TONE[row.tone].text) : "text-muted",
            )}
            title={done ? "Meta da semana batida" : undefined}
          >
            {done ? "✓ " : ""}
            {row.days}/{row.goal} dias
          </span>
        </div>
        <div
          className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={row.goal}
          aria-valuenow={Math.min(row.days, row.goal)}
          aria-label={`${row.isMe ? "Sua meta" : `Meta de ${row.name}`}: ${row.days} de ${row.goal} dias`}
        >
          <div
            className={cn("h-full rounded-full transition-all", TONE[row.tone].bg)}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Cutucar só faz sentido se a pessoa não treinou hoje e ainda não bateu a meta. */}
        {!row.isMe && !row.trainedToday && !done ? <PokeButton name={row.name} userId={row.userId} /> : null}
      </div>
    </div>
  );
}

function PokeButton({ name, userId }: { name: string; userId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        disabled={pending || message?.ok === true}
        onClick={() =>
          startTransition(async () => {
            const result = await pokePartner(userId);
            setMessage(
              result?.ok
                ? { ok: true, text: result.message ?? "Enviado." }
                : { ok: false, text: result?.ok === false ? result.error : "Não foi possível cutucar." },
            );
          })
        }
        aria-label={`Cutucar ${name} para treinar`}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 text-sm font-semibold transition hover:bg-surface-3 active:scale-95 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <span aria-hidden>👉</span>}
        {message?.ok ? "Cutucado" : `Cutucar ${name}`}
      </button>
      {message ? (
        <p role="status" className={cn("text-xs", message.ok ? "text-accent" : "text-danger")}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
