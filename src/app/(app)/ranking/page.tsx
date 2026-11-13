import type { Metadata } from "next";
import Link from "next/link";
import { RankingChart, type ChartPoint } from "@/components/ranking-chart";
import { Avatar, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { getClosedPeriods, getStandings } from "@/lib/data/queries";
import { monthRange, weekRange } from "@/lib/domain/periods";
import { rank } from "@/lib/domain/ranking";
import { displayName } from "@/lib/format";
import { formatDayMonth, formatMonthTitle, todayIso } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Ranking" };

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.challenge) return <NoChallenge />;

  const { periodo } = await searchParams;
  const kind = periodo === "mes" ? "monthly" : "weekly";
  const today = todayIso();
  const range = kind === "weekly" ? weekRange(today) : monthRange(today);
  const { challenge, user, participants } = viewer;

  const [live, closed] = await Promise.all([
    getStandings(user.id, challenge.id, range.start, range.end),
    getClosedPeriods(user.id, challenge.id, kind),
  ]);

  const nameOf = (id: string) => {
    const p = participants.find((x) => x.id === id);
    return p ? displayName(p) : "Participante";
  };
  const positions = rank(live.map((r) => ({ userId: r.user_id, points: Number(r.points) })));
  const sorted = [...live].sort((a, b) => Number(b.points) - Number(a.points));

  const chartSeries = participants.map((p, i) => ({
    key: p.id,
    name: displayName(p),
    color: i === 0 ? "#c6ff3d" : "#ff7a3d",
  }));
  const chartData: ChartPoint[] = [...closed]
    .slice(0, 8)
    .reverse()
    .map((period) => {
      const point: ChartPoint = {
        label: kind === "weekly" ? formatDayMonth(period.period_start) : formatMonthTitle(period.period_start).slice(0, 3),
      };
      for (const p of participants) {
        point[p.id] = Number(period.rows.find((r) => r.user_id === p.id)?.points ?? 0);
      }
      return point;
    });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ranking"
        subtitle={
          kind === "weekly"
            ? `Semana de ${formatDayMonth(range.start)} a ${formatDayMonth(range.end)}`
            : formatMonthTitle(range.start)
        }
      />

      <nav aria-label="Período" className="inline-flex w-fit rounded-full bg-surface-2 p-1">
        {[
          { value: "semana", label: "Semanal", active: kind === "weekly" },
          { value: "mes", label: "Mensal", active: kind === "monthly" },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/ranking?periodo=${t.value}`}
            aria-current={t.active ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              t.active ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="atual">
        <SectionTitle>
          <span id="atual">Em andamento</span>
        </SectionTitle>
        <Card className="p-2">
          <ol className="divide-y divide-border">
            {sorted.map((row) => {
              const pos = positions.find((p) => p.userId === row.user_id);
              const mine = row.user_id === user.id;
              return (
                <li key={row.user_id} className="flex items-center gap-4 p-3">
                  <span className="w-8 text-center text-lg font-bold tabular-nums text-muted">
                    {pos?.position ?? "—"}º
                  </span>
                  <Avatar name={nameOf(row.user_id)} size={40} tone={mine ? "accent" : "partner"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {mine ? "Você" : nameOf(row.user_id)}
                      {pos?.tiedWithOther ? <span className="ml-2 text-xs font-normal text-muted">empate</span> : null}
                    </p>
                    <p className="text-xs text-muted">{Number(row.activity_count)} atividades aprovadas</p>
                  </div>
                  <span className={cn("text-2xl font-extrabold tabular-nums", mine ? "text-accent" : "text-partner")}>
                    {Number(row.points)}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>

      {chartData.length > 0 ? (
        <section aria-labelledby="grafico">
          <SectionTitle>
            <span id="grafico">Últimos períodos encerrados</span>
          </SectionTitle>
          <Card>
            <RankingChart data={chartData} series={chartSeries} />
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="historico">
        <SectionTitle>
          <span id="historico">Histórico</span>
        </SectionTitle>
        {closed.length === 0 ? (
          <EmptyState
            title="Nenhum período encerrado ainda"
            description="Ao fim de cada semana (ou mês), o vencedor aparece aqui automaticamente."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {closed.map((period) => {
              const winner = period.rows.find((r) => r.is_winner);
              const tie = period.rows.some((r) => r.is_tie);
              const total = period.rows.reduce((s, r) => s + r.activity_count, 0);
              const noPoints = period.rows.every((r) => r.points === 0);
              return (
                <li key={period.period_start}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted">
                          {kind === "weekly"
                            ? `${formatDayMonth(period.period_start)} a ${formatDayMonth(period.period_end)}`
                            : formatMonthTitle(period.period_start)}
                        </p>
                        <p className="mt-1 font-semibold">
                          {winner
                            ? `Vencedor: ${winner.user_id === user.id ? "Você" : nameOf(winner.user_id)}`
                            : tie
                              ? "Empate"
                              : noPoints
                                ? "Sem atividades aprovadas"
                                : "Sem vencedor"}
                        </p>
                        {winner?.award_title ? (
                          <p className="mt-1 text-xs text-accent">Prêmio: {winner.award_title}</p>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted tabular-nums">{total} atividades</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {period.rows.map((r) => (
                        <div key={r.user_id} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                          <span className="text-muted">{r.user_id === user.id ? "Você" : nameOf(r.user_id)}</span>
                          <span className="float-right font-bold tabular-nums">{r.points} pts</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
