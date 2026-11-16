import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import type { Mission } from "@/lib/domain/missions";
import { cn } from "@/lib/cn";
import { TONE, type Tone } from "@/lib/people";

export type MissionRow = { userId: string; name: string; isMe: boolean; tone: Tone; progress: number };

/** Missão da semana (muda toda segunda, não vale pontos) com o progresso de cada um. */
export function WeeklyMission({ mission, rows }: { mission: Mission; rows: MissionRow[] }) {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Missão da semana</p>
          <p className="mt-0.5 font-bold">{mission.title}</p>
          <p className="text-sm text-muted">{mission.description}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const done = r.progress >= mission.target;
          const pct = Math.min(100, Math.round((r.progress / mission.target) * 100));
          return (
            <li key={r.userId}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-semibold">{r.isMe ? "Você" : r.name}</span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    done ? cn("font-bold", TONE[r.tone].text) : "text-muted",
                  )}
                >
                  {done ? "✓ Concluída" : `${fmt(Math.min(r.progress, mission.target))}/${fmt(mission.target)} ${mission.unit}`}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={mission.target}
                aria-valuenow={Math.min(r.progress, mission.target)}
                aria-label={`Missão de ${r.isMe ? "você" : r.name}`}
              >
                <div className={cn("h-full rounded-full", TONE[r.tone].bg)} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">Vale só pela glória: não soma pontos. Muda toda segunda-feira.</p>
    </Card>
  );
}
