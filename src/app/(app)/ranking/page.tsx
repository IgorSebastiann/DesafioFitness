import type { Metadata } from "next";
import Link from "next/link";
import { Crown } from "lucide-react";
import { CumulativeChart, RankingChart, type ChartPoint } from "@/components/ranking-chart";
import { ChallengeProgress } from "@/components/challenge-progress";
import { Avatar, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { avatarUrlFor, getClosedPeriods, getStandings, getWeeklyPoints, getWinCounts } from "@/lib/data/queries";
import { addDays, challengeProgress, challengeRange, monthRange, weekRange } from "@/lib/domain/periods";
import { rank } from "@/lib/domain/ranking";
import { displayName } from "@/lib/format";
import { TONE, toneOf } from "@/lib/people";
import { formatDayMonth, formatMonthTitle, todayIso } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Ranking" };

type Kind = "weekly" | "monthly" | "total";

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.challenge) return <NoChallenge />;

  const { periodo } = await searchParams;
  const kind: Kind = periodo === "mes" ? "monthly" : periodo === "geral" ? "total" : "weekly";
  const today = todayIso();
  const { challenge, user, participants, tones } = viewer;
  const range =
    kind === "weekly" ? weekRange(today) : kind === "monthly" ? monthRange(today) : challengeRange(challenge.starts_on, challenge.ends_on, today);

  const nameOf = (id: string) => {
    const p = participants.find((x) => x.id === id);
    return p ? displayName(p) : "Participante";
  };
  const series = viewer.people.map((p) => ({ key: p.id, name: p.id === user.id ? "Você" : displayName(p), color: TONE[toneOf(tones, p.id)].hex }));

  const subtitle =
    kind === "weekly"
      ? `Semana de ${formatDayMonth(range.start)} a ${formatDayMonth(range.end)}`
      : kind === "monthly"
        ? formatMonthTitle(range.start)
        : `Desafio inteiro, desde ${formatDayMonth(challenge.starts_on)}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ranking" subtitle={subtitle} />

      <nav aria-label="Período" className="inline-flex w-fit rounded-full bg-surface-2 p-1">
        {[
          { value: "semana", label: "Semanal", active: kind === "weekly" },
          { value: "mes", label: "Mensal", active: kind === "monthly" },
          { value: "geral", label: "Geral", active: kind === "total" },
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

      {kind === "total" ? (
        <TotalView viewer={viewer} range={range} today={today} nameOf={nameOf} series={series} />
      ) : (
        <PeriodView kind={kind} viewer={viewer} range={range} nameOf={nameOf} series={series} />
      )}
    </div>
  );
}

type ViewProps = {
  viewer: Awaited<ReturnType<typeof getViewer>>;
  range: { start: string; end: string };
  nameOf: (id: string) => string;
  series: { key: string; name: string; color: string }[];
};

/** Lista de classificação (posição, avatar, nome, detalhe e pontos). */
function Standings({
  viewer,
  rows,
  nameOf,
  detail,
}: {
  viewer: ViewProps["viewer"];
  rows: { user_id: string; points: number }[];
  nameOf: (id: string) => string;
  detail: (userId: string) => string;
}) {
  const positions = rank(rows.map((r) => ({ userId: r.user_id, points: Number(r.points) })));
  const sorted = [...rows].sort((a, b) => Number(b.points) - Number(a.points));
  return (
    <Card className="p-2">
      <ol className="divide-y divide-border">
        {sorted.map((row) => {
          const pos = positions.find((p) => p.userId === row.user_id);
          const mine = row.user_id === viewer.user.id;
          const tone = toneOf(viewer.tones, row.user_id);
          const profile = viewer.participants.find((p) => p.id === row.user_id);
          return (
            <li key={row.user_id} className="flex items-center gap-3 p-3">
              <span className="w-7 shrink-0 text-center text-lg font-bold tabular-nums text-muted">{pos?.position ?? "—"}º</span>
              <Avatar name={nameOf(row.user_id)} src={profile ? avatarUrlFor(profile) : null} size={40} tone={tone} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {mine ? "Você" : nameOf(row.user_id)}
                  {pos?.tiedWithOther ? <span className="ml-2 text-xs font-normal text-muted">empate</span> : null}
                </p>
                <p className="truncate text-xs text-muted">{detail(row.user_id)}</p>
              </div>
              <span className={cn("text-2xl font-extrabold tabular-nums", TONE[tone].text)}>{Number(row.points)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

async function TotalView({ viewer, range, today, nameOf, series }: ViewProps & { today: string }) {
  const { challenge, user } = viewer;
  const c = challenge!;
  const [live, weekly, wins] = await Promise.all([
    getStandings(user.id, c.id, range.start, range.end),
    getWeeklyPoints(user.id, c.id, range),
    getWinCounts(user.id, c.id),
  ]);
  const progress = challengeProgress(c.starts_on, c.ends_on, today);

  // Evolução: pontos acumulados ao fim de cada semana do desafio.
  const weeks: string[] = [];
  for (let w = weekRange(range.start).start; w <= range.end; w = addDays(w, 7)) weeks.push(w);
  const running: Record<string, number> = {};
  const chartData: ChartPoint[] = weeks.map((w) => {
    const point: ChartPoint = { label: formatDayMonth(w) };
    for (const p of viewer.people) {
      running[p.id] = (running[p.id] ?? 0) + (weekly.find((x) => x.user_id === p.id && x.week_start === w)?.points ?? 0);
      point[p.id] = running[p.id];
    }
    return point;
  });

  const top = Math.max(0, ...live.map((r) => Number(r.points)));
  const leaders = live.filter((r) => top > 0 && Number(r.points) === top);
  const verdict =
    leaders.length === 0
      ? "Ninguém pontuou ainda."
      : leaders.length > 1
        ? `Empate na liderança com ${top} pontos.`
        : progress.ended
          ? `${leaders[0].user_id === user.id ? "Você venceu" : `${nameOf(leaders[0].user_id)} venceu`} o desafio com ${top} pontos!`
          : `${leaders[0].user_id === user.id ? "Você lidera" : `${nameOf(leaders[0].user_id)} lidera`} com ${top} pontos.`;

  const winsOf = (id: string) => wins.find((w) => w.user_id === id);
  const detail = (id: string) => {
    const r = live.find((x) => x.user_id === id);
    const w = winsOf(id);
    const parts = [`${Number(r?.activity_count ?? 0)} atividades`];
    if (w?.weeks) parts.push(`${w.weeks} ${w.weeks === 1 ? "semana vencida" : "semanas vencidas"}`);
    if (w?.months) parts.push(`${w.months} ${w.months === 1 ? "mês vencido" : "meses vencidos"}`);
    return parts.join(" · ");
  };

  return (
    <>
      <ChallengeProgress startsOn={c.starts_on} endsOn={c.ends_on} today={today} compact />

      <Card className={cn("flex items-center gap-4", progress.ended ? "border-warning/40 bg-warning/10" : "")}>
        <Crown className={cn("h-8 w-8 shrink-0", progress.ended ? "text-warning" : "text-accent")} aria-hidden />
        <p className="text-lg font-bold">{verdict}</p>
      </Card>

      <section aria-labelledby="geral">
        <SectionTitle>
          <span id="geral">{progress.ended ? "Classificação final" : "Classificação geral"}</span>
        </SectionTitle>
        <Standings viewer={viewer} rows={live} nameOf={nameOf} detail={detail} />
      </section>

      {chartData.length > 1 ? (
        <section aria-labelledby="evolucao">
          <SectionTitle>
            <span id="evolucao">Evolução dos pontos</span>
          </SectionTitle>
          <Card>
            <CumulativeChart data={chartData} series={series} />
            <p className="mt-2 text-xs text-muted">Pontos acumulados ao fim de cada semana.</p>
          </Card>
        </section>
      ) : null}
    </>
  );
}

async function PeriodView({ kind, viewer, range, nameOf, series }: ViewProps & { kind: "weekly" | "monthly" }) {
  const { challenge, user, participants } = viewer;
  const [live, closed] = await Promise.all([
    getStandings(user.id, challenge!.id, range.start, range.end),
    getClosedPeriods(user.id, challenge!.id, kind),
  ]);

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
    <>
      <section aria-labelledby="atual">
        <SectionTitle>
          <span id="atual">Em andamento</span>
        </SectionTitle>
        <Standings
          viewer={viewer}
          rows={live}
          nameOf={nameOf}
          detail={(id) => `${Number(live.find((r) => r.user_id === id)?.activity_count ?? 0)} atividades aprovadas`}
        />
      </section>

      {chartData.length > 0 ? (
        <section aria-labelledby="grafico">
          <SectionTitle>
            <span id="grafico">Últimos períodos encerrados</span>
          </SectionTitle>
          <Card>
            <RankingChart data={chartData} series={series} />
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
              const rows = [...period.rows].sort((a, b) => b.points - a.points);
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
                        {winner?.award_title ? <p className="mt-1 text-xs text-accent">Prêmio: {winner.award_title}</p> : null}
                      </div>
                      <span className="text-xs text-muted tabular-nums">{total} atividades</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {rows.map((r) => (
                        <div key={r.user_id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                          <span className="min-w-0 truncate text-muted">{r.user_id === user.id ? "Você" : nameOf(r.user_id)}</span>
                          <span className="shrink-0 font-bold tabular-nums">{r.points} pts</span>
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
    </>
  );
}
