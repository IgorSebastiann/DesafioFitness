import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bike, Dumbbell, Flame, Footprints, Trophy, Zap } from "lucide-react";
import { ActivityList } from "@/components/activity-list";
import { ChallengeProgress } from "@/components/challenge-progress";
import { Card, ButtonLink, PageHeader, SectionTitle } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { ScoreBoard } from "@/components/score-board";
import { ShareCardButton } from "@/components/share-card-dialog";
import { StreakBanner } from "@/components/streak-banner";
import { WeeklyGoals, type GoalRow } from "@/components/weekly-goals";
import { getViewer } from "@/lib/data/viewer";
import { avatarUrlFor, getActivityFacts, getDashboard } from "@/lib/data/queries";
import { missionForWeek } from "@/lib/domain/missions";
import { WeeklyMission, type MissionRow } from "@/components/weekly-mission";
import { displayName } from "@/lib/format";
import { toneOf } from "@/lib/people";
import { formatDayMonth, formatMonthTitle } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const viewer = await getViewer();
  const { challenge, user, profile } = viewer;
  if (!challenge) return <NoChallenge />;

  const { periodo } = await searchParams;
  const period: Period = periodo === "mes" || periodo === "geral" ? periodo : "semana";
  const data = await getDashboard(user.id, challenge);
  const weekFacts = await getActivityFacts(user.id, challenge.id, data.week);
  const mission = missionForWeek(data.week.start);
  const missionRows: MissionRow[] = viewer.people.map((p) => ({
    userId: p.id,
    name: displayName(p),
    isMe: p.id === user.id,
    tone: toneOf(viewer.tones, p.id),
    progress: mission.progress(weekFacts.filter((f) => f.user_id === p.id)),
  }));
  const rows = period === "mes" ? data.monthRows : period === "geral" ? data.totalRows : data.weekRows;
  const periodLabel =
    period === "mes"
      ? formatMonthTitle(data.month.start)
      : period === "geral"
        ? `desde ${formatDayMonth(data.total.start)}`
        : `${formatDayMonth(data.week.start)} a ${formatDayMonth(data.week.end)}`;
  const players = viewer.people.map((p) => ({ profile: p, tone: toneOf(viewer.tones, p.id), isMe: p.id === user.id }));

  const avatarUrls = Object.fromEntries(
    viewer.participants.map((p) => [p.id, avatarUrlFor(p)]),
  );

  const goalRows: GoalRow[] = data.goals
    .map((g) => {
      const p = viewer.participants.find((x) => x.id === g.user_id);
      return {
        userId: g.user_id,
        name: p ? displayName(p) : "Participante",
        avatarUrl: p ? avatarUrlFor(p) : null,
        goal: g.weekly_goal,
        days: g.days,
        trainedToday: g.trained_today,
        isMe: g.user_id === user.id,
        tone: toneOf(viewer.tones, g.user_id),
      };
    })
    .sort((a, b) => viewer.people.findIndex((p) => p.id === a.userId) - viewer.people.findIndex((p) => p.id === b.userId));

  const stats = [
    { label: "Atividades", value: data.stats.totalActivities, icon: Activity },
    { label: "Pontos", value: data.stats.totalPoints, icon: Zap },
    { label: "Corridas", value: data.stats.runs, icon: Footprints },
    { label: "Musculação", value: data.stats.strength, icon: Dumbbell },
    { label: "Dias ativos", value: data.stats.activeDays, icon: Bike },
    { label: "Maior sequência", value: `${data.stats.longestStreak}d`, icon: Flame },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Olá, ${displayName(profile)}`}
        subtitle={challenge.name}
        action={
          <ButtonLink href="/atividades/nova" size="md" className="hidden lg:inline-flex">
            Registrar atividade
          </ButtonLink>
        }
      />

      <StreakBanner streak={data.stats.currentStreak} trainedToday={data.stats.trainedToday} />

      {challenge.ends_on || data.today < challenge.starts_on ? (
        <ChallengeProgress startsOn={challenge.starts_on} endsOn={challenge.ends_on} today={data.today} compact />
      ) : null}

      <section aria-labelledby="placar">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="placar" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Placar</h2>
          <PeriodSwitch active={period} />
        </div>
        <ScoreBoard
          players={players}
          rows={rows}
          periodLabel={periodLabel}
          avatarUrls={avatarUrls}
        />
        <div className="mt-2 flex items-start justify-between gap-3 text-xs">
          <ShareCardButton defaultPeriod={period === "mes" ? "mes" : period === "geral" ? "geral" : "semana"} />
          <Link href="/ranking" className="font-semibold text-accent hover:underline">Ver ranking e histórico →</Link>
        </div>
      </section>

      <WeeklyGoals rows={goalRows} weekStart={data.week.start} />

      <WeeklyMission mission={mission} rows={missionRows} />

      <section aria-labelledby="estatisticas">
        <SectionTitle>
          <span id="estatisticas">Suas estatísticas</span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="ultimas">
        <SectionTitle
          action={
            <Link href="/atividades" className="text-xs font-semibold text-accent hover:underline">
              Ver todas
            </Link>
          }
        >
          <span id="ultimas">Últimas atividades</span>
        </SectionTitle>
        {data.recent.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nenhuma atividade registrada ainda. Que tal começar hoje?</p>
            <div className="mt-4">
              <ButtonLink href="/atividades/nova">
                <Trophy className="h-4 w-4" aria-hidden /> Registrar a primeira
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <ActivityList items={data.recent} myId={user.id} tones={viewer.tones} />
        )}
      </section>
    </div>
  );
}

type Period = "semana" | "mes" | "geral";

function PeriodSwitch({ active }: { active: Period }) {
  const tab = (value: Period, label: string) => (
    <Link
      href={`/dashboard?periodo=${value}`}
      aria-current={active === value ? "true" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active === value ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Período" className="inline-flex rounded-full bg-surface-2 p-1">
      {tab("semana", "Semana")}
      {tab("mes", "Mês")}
      {tab("geral", "Geral")}
    </nav>
  );
}

