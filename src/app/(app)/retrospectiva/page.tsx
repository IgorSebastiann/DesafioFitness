import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { PersonRecap } from "@/components/person-recap";
import { Card, PageHeader } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { avatarUrlFor, getActivityFacts, getStandings } from "@/lib/data/queries";
import { monthRange } from "@/lib/domain/periods";
import { computeRecap } from "@/lib/domain/recap";
import { displayName } from "@/lib/format";
import { formatMonthTitle, isoToYearMonth, shiftMonth, todayIso } from "@/lib/time";
import { cn } from "@/lib/cn";
import { toneOf } from "@/lib/people";

export const metadata: Metadata = { title: "Retrospectiva" };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Retrospectiva do mês (estilo "Wrapped"): números e curiosidades de cada um, só com aprovadas. */
export default async function RecapPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const viewer = await getViewer();
  const { challenge, user } = viewer;
  if (!challenge) return <NoChallenge />;

  const current = isoToYearMonth(todayIso());
  const first = isoToYearMonth(challenge.starts_on);
  const { mes } = await searchParams;
  const month = mes && MONTH_RE.test(mes) && mes <= current && mes >= first ? mes : current;
  const range = monthRange(`${month}-01`);

  const [facts, standings] = await Promise.all([
    getActivityFacts(user.id, challenge.id, range, true),
    getStandings(user.id, challenge.id, range.start, range.end),
  ]);

  const people = viewer.people;
  const points = (id: string) => Number(standings.find((s) => s.user_id === id)?.points ?? 0);
  const scores = people.map((p) => points(p.id));
  const top = Math.max(0, ...scores);
  const leaders = people.filter((p) => top > 0 && points(p.id) === top);
  const inProgress = month === current;

  const verdict =
    leaders.length === 0
      ? "Ninguém pontuou neste mês."
      : leaders.length > 1
        ? `Empate com ${top} pontos.`
        : `${leaders[0].id === user.id ? "Você" : displayName(leaders[0])} ${inProgress ? "está na frente" : "venceu o mês"} com ${top} pontos.`;

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Retrospectiva" subtitle={inProgress ? "Mês em andamento: os números ainda mudam." : "O mês que passou, em números."} />

      <nav aria-label="Mês" className="flex items-center justify-between gap-3 rounded-full bg-surface-2 p-1">
        <MonthLink month={prev} disabled={prev < first} label="Mês anterior" icon="prev" />
        <span className="font-semibold">{formatMonthTitle(range.start)}</span>
        <MonthLink month={next} disabled={next > current} label="Próximo mês" icon="next" />
      </nav>

      <Card className="flex items-center gap-4 border-warning/40 bg-warning/10">
        <Crown className="h-8 w-8 shrink-0 text-warning" aria-hidden />
        <p className="text-lg font-bold">{verdict}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {people.map((p) => (
          <PersonRecap
            key={p.id}
            name={p.id === user.id ? "Você" : displayName(p)}
            avatarUrl={avatarUrlFor(p)}
            tone={toneOf(viewer.tones, p.id)}
            points={points(p.id)}
            recap={computeRecap(facts.filter((f) => f.user_id === p.id))}
          />
        ))}
      </div>
    </div>
  );
}

function MonthLink({ month, disabled, label, icon }: { month: string; disabled: boolean; label: string; icon: "prev" | "next" }) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  const cls = "flex h-10 w-10 items-center justify-center rounded-full transition";
  if (disabled) {
    return (
      <span className={cn(cls, "text-muted/40")} aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
    );
  }
  return (
    <Link href={`/retrospectiva?mes=${month}`} aria-label={label} className={cn(cls, "text-foreground hover:bg-surface-3")}>
      <Icon className="h-5 w-5" aria-hidden />
    </Link>
  );
}
