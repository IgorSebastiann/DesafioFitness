import { Fragment } from "react";
import { addDays, weekRange } from "@/lib/domain/periods";
import { formatDayMonth } from "@/lib/time";
import { cn } from "@/lib/cn";

const ROW_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

/**
 * Mapa de treinos estilo GitHub: uma coluna por semana (segunda a domingo), um quadrado por dia.
 * Intensidade = número de atividades no dia (aprovadas e pendentes).
 */
export function TrainingHeatmap({
  title,
  counts,
  today,
  weeks = 16,
  tone,
}: {
  title: string;
  counts: Record<string, number>;
  today: string;
  weeks?: number;
  tone: "accent" | "partner";
}) {
  const lastMonday = weekRange(today).start;
  const firstMonday = addDays(lastMonday, -7 * (weeks - 1));
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)),
  );
  const activeDays = Object.keys(counts).filter((d) => d >= firstMonday && d <= today).length;

  const level = (n: number) =>
    n === 0 ? "bg-surface-3" : tone === "accent"
      ? n === 1 ? "bg-accent/45" : n === 2 ? "bg-accent/75" : "bg-accent"
      : n === 1 ? "bg-partner/45" : n === 2 ? "bg-partner/75" : "bg-partner";

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className={cn("font-semibold", tone === "accent" ? "text-accent" : "text-partner")}>{title}</span>
        <span className="text-xs text-muted tabular-nums">
          {activeDays} {activeDays === 1 ? "dia" : "dias"} em {weeks} semanas
        </span>
      </figcaption>
      {/* Uma grade só (rótulo + semanas por linha), para o rótulo ficar sempre na altura do seu dia. */}
      <div
        className="grid items-center gap-1"
        style={{ gridTemplateColumns: `0.75rem repeat(${weeks}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${title}: ${activeDays} dias com treino nas últimas ${weeks} semanas`}
      >
        {ROW_LABELS.map((label, d) => (
          <Fragment key={d}>
            <span className="text-[9px] leading-none text-muted" aria-hidden>
              {d % 2 === 0 ? label : ""}
            </span>
            {columns.map((days) => {
              const day = days[d];
              const future = day > today;
              const n = counts[day] ?? 0;
              return (
                <span
                  key={day}
                  aria-hidden
                  title={future ? undefined : `${formatDayMonth(day)}: ${n} ${n === 1 ? "atividade" : "atividades"}`}
                  className={cn(
                    "aspect-square w-full rounded-[3px]",
                    future ? "bg-transparent" : level(n),
                    day === today && "ring-1 ring-foreground/60",
                  )}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </figure>
  );
}
