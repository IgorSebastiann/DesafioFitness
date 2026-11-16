import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { avatarUrlFor, getActivityFacts, getModalityStats, getPersonalRecords, type ModalityStat } from "@/lib/data/queries";
import { RecordsCard } from "@/components/personal-records";
import { TrainingHeatmap } from "@/components/training-heatmap";
import { addDays, monthRange, weekRange } from "@/lib/domain/periods";
import { displayName } from "@/lib/format";
import { formatDurationMinutes, todayIso } from "@/lib/time";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Estatísticas" };

type Period = "semana" | "mes" | "tudo";
const PERIOD_LABEL: Record<Period, string> = { semana: "Semana", mes: "Mês", tudo: "Tudo" };

/** Comparativo do casal: totais e cada modalidade (somente atividades aprovadas). */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const viewer = await getViewer();
  const { challenge, user, participants } = viewer;
  if (!challenge) return <NoChallenge />;

  const { periodo } = await searchParams;
  const period: Period = periodo === "semana" || periodo === "tudo" ? periodo : "mes";
  const today = todayIso();
  const range = period === "semana" ? weekRange(today) : period === "mes" ? monthRange(today) : undefined;
  const HEATMAP_WEEKS = 16;
  const heatmapStart = addDays(weekRange(today).start, -7 * (HEATMAP_WEEKS - 1));
  const [stats, records, facts] = await Promise.all([
    getModalityStats(user.id, challenge.id, range),
    getPersonalRecords(user.id, challenge.id),
    getActivityFacts(user.id, challenge.id, { start: heatmapStart, end: today }),
  ]);
  const countsFor = (id: string) =>
    facts.filter((f) => f.user_id === id).reduce<Record<string, number>>((acc, f) => {
      acc[f.activity_date] = (acc[f.activity_date] ?? 0) + 1;
      return acc;
    }, {});

  // Você primeiro, depois o parceiro.
  const people = [...participants].sort((a, b) => Number(b.id === user.id) - Number(a.id === user.id));
  const totals = people.map((p) => {
    const mine = stats.filter((s) => s.user_id === p.id);
    return {
      person: p,
      isMe: p.id === user.id,
      activities: mine.reduce((n, s) => n + s.activities, 0),
      minutes: mine.reduce((n, s) => n + s.minutes, 0),
      km: mine.reduce((n, s) => n + s.km, 0),
      favorite: mine[0]?.category_name ?? null,
    };
  });

  const modalities = [...new Set(stats.map((s) => s.category_name))]
    .map((name) => ({
      name,
      byUser: people.map((p) => stats.find((s) => s.user_id === p.id && s.category_name === name) ?? null),
    }))
    .sort((a, b) => sum(b.byUser) - sum(a.byUser));
  const maxCount = Math.max(1, ...stats.map((s) => s.activities));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Estatísticas" subtitle="Atividades aprovadas, lado a lado." />

      <nav aria-label="Período" className="inline-flex w-fit rounded-full bg-surface-2 p-1">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
          <Link
            key={key}
            href={`/estatisticas?periodo=${key}`}
            aria-current={period === key ? "true" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition",
              period === key ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground",
            )}
          >
            {PERIOD_LABEL[key]}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="totais" className="grid gap-3 sm:grid-cols-2">
        <h2 id="totais" className="sr-only">Totais</h2>
        {totals.map((t) => (
          <Card key={t.person.id} className={cn("flex flex-col gap-4", t.isMe ? "border-accent/30" : "border-partner/30")}>
            <div className="flex items-center gap-3">
              <Avatar name={displayName(t.person)} src={avatarUrlFor(t.person)} size={40} tone={t.isMe ? "accent" : "partner"} ring />
              <div className="min-w-0">
                <p className="truncate font-semibold">{t.isMe ? "Você" : displayName(t.person)}</p>
                <p className="truncate text-xs text-muted">
                  {t.favorite ? `Favorita: ${t.favorite}` : "Nenhuma atividade aprovada"}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Atividades" value={String(t.activities)} />
              <Metric label="Tempo" value={t.minutes ? formatDurationMinutes(t.minutes) : "0"} />
              <Metric label="Distância" value={`${t.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`} />
            </dl>
          </Card>
        ))}
      </section>

      <section aria-labelledby="mapa">
        <SectionTitle
          action={
            <Link href="/retrospectiva" className="text-xs font-semibold text-accent hover:underline">
              Retrospectiva do mês →
            </Link>
          }
        >
          <span id="mapa">Mapa de treinos</span>
        </SectionTitle>
        <Card className="flex flex-col gap-6">
          {people.map((p) => (
            <TrainingHeatmap
              key={p.id}
              title={p.id === user.id ? "Você" : displayName(p)}
              counts={countsFor(p.id)}
              today={today}
              weeks={HEATMAP_WEEKS}
              tone={p.id === user.id ? "accent" : "partner"}
            />
          ))}
          <p className="text-xs text-muted">Cada quadrado é um dia; quanto mais forte, mais atividades. Inclui as que aguardam aprovação.</p>
        </Card>
      </section>

      <section aria-labelledby="recordes">
        <SectionTitle>
          <span id="recordes">Recordes pessoais</span>
        </SectionTitle>
        <p className="-mt-2 mb-3 text-xs text-muted">Desde o início do desafio, por modalidade.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <RecordsCard
              key={p.id}
              title={p.id === user.id ? "Você" : displayName(p)}
              isMe={p.id === user.id}
              records={records.filter((r) => r.user_id === p.id)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="por-modalidade">
        <SectionTitle>
          <span id="por-modalidade">Por modalidade</span>
        </SectionTitle>
        {modalities.length === 0 ? (
          <EmptyState title="Sem dados neste período" description="As atividades aprovadas aparecem aqui." />
        ) : (
          <Card className="flex flex-col gap-5">
            {modalities.map((m) => (
              <div key={m.name}>
                <p className="mb-2 text-sm font-semibold">{m.name}</p>
                <div className="flex flex-col gap-1.5">
                  {m.byUser.map((s, i) => (
                    <Bar key={people[i].id} stat={s} max={maxCount} isMe={people[i].id === user.id} name={displayName(people[i])} />
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function sum(rows: (ModalityStat | null)[]) {
  return rows.reduce((n, s) => n + (s?.activities ?? 0), 0);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-1 py-3">
      <dd className="text-base font-bold tabular-nums leading-tight">{value}</dd>
      <dt className="mt-1 text-[11px] text-muted">{label}</dt>
    </div>
  );
}

function Bar({ stat, max, isMe, name }: { stat: ModalityStat | null; max: number; isMe: boolean; name: string }) {
  const count = stat?.activities ?? 0;
  const detail = stat
    ? [formatDurationMinutes(stat.minutes), stat.km > 0 ? `${stat.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km` : null]
        .filter(Boolean)
        .join(" · ")
    : "";
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={cn("w-12 shrink-0 truncate font-semibold", isMe ? "text-accent" : "text-partner")}>
        {isMe ? "Você" : name}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <div
          className={cn("h-full rounded-full", isMe ? "bg-accent" : "bg-partner")}
          style={{ width: `${(count / max) * 100}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right tabular-nums text-muted">
        <span className="font-semibold text-foreground">{count}</span>
        {detail ? <span className="block text-[11px]">{detail}</span> : null}
      </span>
    </div>
  );
}
