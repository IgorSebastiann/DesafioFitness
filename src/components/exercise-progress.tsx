import { TrendingUp } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import type { ExerciseProgress } from "@/lib/data/workouts";
import { formatDayMonth, formatDatePtBr } from "@/lib/time";
import { oneRmMethod } from "@/lib/domain/workouts";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Evolução de carga do próprio usuário num exercício: recorde, 1RM estimado e gráfico por dia. */
export function ExerciseProgressCard({ progress }: { progress: ExerciseProgress }) {
  const { points, best, bestOneRm, bestOneRmReps } = progress;
  return (
    <Card>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <TrendingUp className="h-4 w-4" aria-hidden /> Sua evolução
        </span>
      </SectionTitle>
      {!best ? (
        <p className="text-sm text-muted">
          Ainda não há cargas suas neste exercício. Quando você executar um treino com ele e anotar a carga, o recorde e o gráfico
          aparecem aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">Recorde pessoal</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">
                {fmt(best.load)} kg × {best.reps}
              </dd>
              <dd className="text-xs text-muted">{formatDatePtBr(best.date)}</dd>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">1RM estimado</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">{fmt(bestOneRm)} kg</dd>
              <dd className="text-xs text-muted">{oneRmMethod(bestOneRmReps)}</dd>
            </div>
          </dl>
          {points.length >= 2 ? <LoadChart points={points} /> : <p className="text-xs text-muted">O gráfico aparece a partir do segundo dia de treino.</p>}
        </div>
      )}
    </Card>
  );
}

function LoadChart({ points }: { points: ExerciseProgress["points"] }) {
  const W = 320;
  const H = 120;
  const pad = { l: 8, r: 8, t: 12, b: 20 };
  const max = Math.max(...points.map((p) => p.maxLoad));
  const min = Math.min(...points.map((p) => p.maxLoad));
  const span = max - min || 1;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.maxLoad).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="evolucao-legenda">
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.maxLoad)} r={3.5} fill="var(--color-accent)" />
        ))}
        <text x={pad.l} y={H - 4} className="fill-[var(--color-muted)] text-[10px]">
          {formatDayMonth(first.date)}
        </text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className="fill-[var(--color-muted)] text-[10px]">
          {formatDayMonth(last.date)}
        </text>
      </svg>
      <figcaption id="evolucao-legenda" className="text-xs text-muted">
        Maior carga por dia: de {fmt(first.maxLoad)} kg ({formatDayMonth(first.date)}) para {fmt(last.maxLoad)} kg ({formatDayMonth(last.date)}),
        em {points.length} dias de treino.
      </figcaption>
    </figure>
  );
}
