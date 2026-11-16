import Link from "next/link";
import { CalendarClock, Flag } from "lucide-react";
import { Card } from "@/components/ui";
import { challengeProgress } from "@/lib/domain/periods";
import { formatDatePtBr, formatDayMonth } from "@/lib/time";

/** Em que dia do desafio estamos, quanto falta e link para o resultado final quando acaba. */
export function ChallengeProgress({
  startsOn,
  endsOn,
  today,
  compact = false,
}: {
  startsOn: string;
  endsOn: string | null;
  today: string;
  compact?: boolean;
}) {
  const p = challengeProgress(startsOn, endsOn, today);
  const pct = p.totalDays ? Math.round((p.day / p.totalDays) * 100) : null;

  if (p.ended && endsOn) {
    return (
      <Card className="flex items-center gap-3 border-warning/40 bg-warning/10 p-4">
        <Flag className="h-6 w-6 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Desafio encerrado</p>
          <p className="text-xs text-muted">Terminou em {formatDatePtBr(endsOn)} depois de {p.totalDays} dias.</p>
        </div>
        <Link href="/ranking?periodo=geral" className="shrink-0 text-xs font-semibold text-accent hover:underline">
          Resultado final →
        </Link>
      </Card>
    );
  }

  const title = p.notStarted
    ? `Começa em ${formatDayMonth(startsOn)}`
    : p.totalDays
      ? `Dia ${p.day} de ${p.totalDays}`
      : `Dia ${p.day} do desafio`;
  const detail = p.notStarted
    ? plural(daysUntil(startsOn, today), "Falta 1 dia para começar.", (n) => `Faltam ${n} dias para começar.`)
    : p.daysLeft === null
      ? "Sem data de fim."
      : p.daysLeft === 0
        ? "Último dia! Tudo o que registrar hoje ainda conta."
        : `Faltam ${p.daysLeft} ${p.daysLeft === 1 ? "dia" : "dias"} · termina em ${formatDayMonth(endsOn!)}.`;

  return (
    <Card className={compact ? "flex flex-col gap-2.5 p-4" : "flex flex-col gap-3"}>
      <div className="flex items-center gap-3">
        <CalendarClock className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold tabular-nums">{title}</p>
          <p className="text-xs text-muted">{detail}</p>
        </div>
        {pct !== null && !p.notStarted ? (
          <span className="shrink-0 text-sm font-bold tabular-nums text-accent">{pct}%</span>
        ) : null}
      </div>
      {pct !== null && !p.notStarted ? (
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-label="Progresso do desafio"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
      ) : null}
    </Card>
  );
}

function plural(n: number, one: string, many: (n: number) => string) {
  return n === 1 ? one : many(n);
}

function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
