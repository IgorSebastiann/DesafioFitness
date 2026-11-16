import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityList } from "@/components/activity-list";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { getMonthActivities } from "@/lib/data/queries";
import { monthRange, parseIsoDate, addDays } from "@/lib/domain/periods";
import { displayName } from "@/lib/format";
import { formatDatePtBr, formatMonthTitle, isoToYearMonth, shiftMonth, todayIso } from "@/lib/time";
import { cn } from "@/lib/cn";
import { TONE, toneOf } from "@/lib/people";

export const metadata: Metadata = { title: "Calendário" };

const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer.challenge) return <NoChallenge />;

  const params = await searchParams;
  const today = todayIso();
  const yearMonth = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? (params.mes as string) : isoToYearMonth(today);
  const range = monthRange(`${yearMonth}-01`);
  const selectedDay = params.dia && params.dia >= range.start && params.dia <= range.end ? params.dia : null;

  const { user, challenge, people, tones } = viewer;
  const activities = await getMonthActivities(user.id, challenge.id, range.start, range.end);

  // Mapa dia → quem treinou (um pontinho por pessoa, na cor dela).
  const byDay = new Map<string, Set<string>>();
  for (const a of activities) {
    const entry = byDay.get(a.activity_date) ?? new Set<string>();
    entry.add(a.user_id);
    byDay.set(a.activity_date, entry);
  }

  // Grade começando na segunda-feira.
  const firstDow = parseIsoDate(range.start).getUTCDay();
  const leading = (firstDow + 6) % 7;
  const daysInMonth = Number(range.end.slice(8));
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(range.start, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Dias já decorridos do mês (até hoje) e quantos deles ficaram sem atividade.
  const elapsedDays = today < range.start ? 0 : today > range.end ? daysInMonth : Number(today.slice(8));
  const daysWithActivity = [...byDay.keys()].filter((d) => d <= today).length;
  const emptyPastDays = Math.max(0, elapsedDays - daysWithActivity);

  const dayActivities = selectedDay ? activities.filter((a) => a.activity_date === selectedDay) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Calendário" subtitle="Dias em que cada um treinou." />

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <NavMonth href={`/calendario?mes=${shiftMonth(yearMonth, -1)}`} label="Mês anterior" icon="prev" />
          <h2 className="font-semibold capitalize">{formatMonthTitle(range.start)}</h2>
          <NavMonth href={`/calendario?mes=${shiftMonth(yearMonth, 1)}`} label="Próximo mês" icon="next" />
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-muted">
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1">{d}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <span key={`b-${idx}`} />;
            const entry = byDay.get(day);
            const isFuture = day > today;
            const isToday = day === today;
            const selected = day === selectedDay;
            const dayNum = Number(day.slice(8));
            return (
              <Link
                key={day}
                href={`/calendario?mes=${yearMonth}&dia=${day}`}
                aria-label={`${formatDatePtBr(day)}${entry ? "" : " sem atividade"}`}
                aria-current={selected ? "date" : undefined}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition",
                  selected ? "bg-accent text-accent-ink" : "hover:bg-surface-2",
                  isFuture && !selected && "text-muted/40",
                  isToday && !selected && "ring-1 ring-accent/60",
                )}
              >
                <span className="font-medium tabular-nums">{dayNum}</span>
                <span className="flex gap-0.5">
                  {people
                    .filter((p) => entry?.has(p.id))
                    .map((p) => (
                      <span key={p.id} className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-accent-ink" : TONE[toneOf(tones, p.id)].bg)} />
                    ))}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted">
          {people.map((p) => (
            <span key={p.id} className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", TONE[toneOf(tones, p.id)].bg)} /> {p.id === user.id ? "Você" : displayName(p)}
            </span>
          ))}
          <span className="ml-auto">{emptyPastDays} {emptyPastDays === 1 ? "dia sem atividade" : "dias sem atividade"}</span>
        </div>
      </Card>

      <section aria-live="polite" className="flex flex-col gap-3">
        {selectedDay ? (
          <>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              {formatDatePtBr(selectedDay)}
            </h2>
            {dayActivities.length === 0 ? (
              <EmptyState title="Sem atividade neste dia" description="Ninguém registrou treino." />
            ) : (
              <>
                <p className="text-sm text-muted">
                  Pontos aprovados no dia:{" "}
                  <strong className="text-accent tabular-nums">
                    {dayActivities.reduce((s, a) => s + a.points_awarded, 0)}
                  </strong>
                </p>
                <ActivityList items={dayActivities} myId={user.id} tones={tones} />
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Toque em um dia para ver horários, pontos e comprovações.</p>
        )}
      </section>
    </div>
  );
}

function NavMonth({ href, label, icon }: { href: string; label: string; icon: "prev" | "next" }) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Link href={href} aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-foreground">
      <Icon className="h-5 w-5" aria-hidden />
    </Link>
  );
}
