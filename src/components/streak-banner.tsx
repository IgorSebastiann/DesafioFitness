import Link from "next/link";
import { cn } from "@/lib/cn";

/** Sequência atual de dias com atividade aprovada ou aguardando aprovação (incentivo para não quebrar). */
export function StreakBanner({ streak, trainedToday }: { streak: number; trainedToday: boolean }) {
  const title = streak === 0 ? "Comece uma sequência hoje" : `${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}`;
  const hint =
    streak === 0
      ? "Registre uma atividade para acender o fogo."
      : trainedToday
        ? "Hoje já está garantido. Volte amanhã para continuar."
        : "Treine hoje para não perder a sequência.";
  const tone =
    streak > 0 && trainedToday
      ? "border-accent/40 bg-accent/10"
      : streak > 0
        ? "border-warning/40 bg-warning/10 hover:bg-warning/15"
        : "border-border bg-surface hover:bg-surface-2";

  const body = (
    <>
      <span className={cn("text-2xl", streak === 0 && "opacity-40 grayscale")} aria-hidden>
        🔥
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {!trainedToday ? <span className="shrink-0 text-sm font-semibold text-accent">Registrar →</span> : null}
    </>
  );
  const className = cn("flex items-center gap-3 rounded-3xl border px-4 py-3 transition", tone);

  return trainedToday ? (
    <div className={className}>{body}</div>
  ) : (
    <Link href="/atividades/nova" className={className}>
      {body}
    </Link>
  );
}
