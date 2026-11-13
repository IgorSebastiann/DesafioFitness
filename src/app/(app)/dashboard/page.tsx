import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bike, Dumbbell, Flame, Footprints, Trophy, Zap } from "lucide-react";
import { ActivityList } from "@/components/activity-list";
import { Card, ButtonLink, PageHeader, SectionTitle } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { ScoreBoard } from "@/components/score-board";
import { getViewer } from "@/lib/data/viewer";
import { avatarUrlFor, getDashboard } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { formatDayMonth, formatMonthTitle } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const viewer = await getViewer();
  const { challenge, user, profile, partner } = viewer;
  if (!challenge) return <NoChallenge />;

  const { periodo } = await searchParams;
  const isMonth = periodo === "mes";
  const data = await getDashboard(user.id, challenge);
  const rows = isMonth ? data.monthRows : data.weekRows;
  const periodLabel = isMonth
    ? formatMonthTitle(data.month.start)
    : `${formatDayMonth(data.week.start)} a ${formatDayMonth(data.week.end)}`;

  const avatarUrls = Object.fromEntries(
    viewer.participants.map((p) => [p.id, avatarUrlFor(p)]),
  );

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

      <section aria-labelledby="placar">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="placar" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Placar</h2>
          <PeriodSwitch active={isMonth ? "mes" : "semana"} />
        </div>
        <ScoreBoard
          me={profile}
          partner={partner}
          rows={rows}
          periodLabel={periodLabel}
          avatarUrls={avatarUrls}
        />
        <p className="mt-2 text-right text-xs">
          <Link href="/ranking" className="text-accent hover:underline">Ver ranking e histórico →</Link>
        </p>
      </section>

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
          <ActivityList items={data.recent} myId={user.id} />
        )}
      </section>
    </div>
  );
}

function PeriodSwitch({ active }: { active: "semana" | "mes" }) {
  const tab = (value: "semana" | "mes", label: string) => (
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
    </nav>
  );
}
