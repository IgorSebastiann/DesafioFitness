import type { Metadata } from "next";
import { Award, CalendarDays, Crown, Dumbbell, Flame, Medal, Star, Trophy, Zap, Footprints } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { getAchievementsState } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/cn";
import { TONE, toneOf, type Tone } from "@/lib/people";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Conquistas" };

const ICONS: Record<string, LucideIcon> = {
  medal: Medal,
  trophy: Trophy,
  star: Star,
  flame: Flame,
  calendar: CalendarDays,
  crown: Crown,
  zap: Zap,
  dumbbell: Dumbbell,
  footprints: Footprints,
  award: Award,
};

export default async function AchievementsPage() {
  const viewer = await getViewer();
  if (!viewer.challenge) return <NoChallenge />;
  const { challenge, user, people, tones } = viewer;

  const { catalog, unlocked } = await getAchievementsState(user.id, challenge.id);

  const has = (userId: string | undefined, code: string) =>
    !!userId && unlocked.some((u) => u.user_id === userId && u.achievement_code === code);

  const countOf = (id: string) => catalog.filter((c) => has(id, c.code)).length;
  const label = (p: (typeof people)[number]) => (p.id === user.id ? "Você" : displayName(p));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conquistas" subtitle="Medalhas desbloqueadas por cada um." />

      <div className="grid grid-cols-2 gap-3">
        {people.map((p) => (
          <Card key={p.id} className="p-4 text-center">
            <p className={cn("text-3xl font-extrabold tabular-nums", TONE[toneOf(tones, p.id)].text)}>
              {countOf(p.id)}/{catalog.length}
            </p>
            <p className="truncate text-xs text-muted">{p.id === user.id ? "Suas conquistas" : displayName(p)}</p>
          </Card>
        ))}
      </div>

      {catalog.length === 0 ? (
        <EmptyState title="Catálogo de conquistas vazio" description="Execute o seed.sql para carregar as conquistas." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {catalog.map((c) => {
            const Icon = ICONS[c.icon] ?? Medal;
            const anyone = people.some((p) => has(p.id, c.code));
            return (
              <li key={c.code}>
                <Card className={cn("flex h-full gap-4 p-4", !anyone && "opacity-60")}>
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                      anyone ? "bg-accent/15 text-accent" : "bg-surface-3 text-muted",
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted">{c.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {people.map((p) => (
                        <Badge key={p.id} on={has(p.id, c.code)} label={label(p)} tone={toneOf(tones, p.id)} />
                      ))}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Badge({ on, label, tone }: { on: boolean; label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 font-medium",
        on ? cn(TONE[tone].soft, TONE[tone].text) : "bg-surface-3 text-muted",
      )}
    >
      {on ? "✓ " : ""}
      {label}
    </span>
  );
}
