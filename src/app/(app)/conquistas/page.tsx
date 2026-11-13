import type { Metadata } from "next";
import { Award, CalendarDays, Crown, Dumbbell, Flame, Medal, Star, Trophy, Zap, Footprints } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { getAchievementsState } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/cn";
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
  const { challenge, user, partner } = viewer;

  const { catalog, unlocked } = await getAchievementsState(user.id, challenge.id);

  const has = (userId: string | undefined, code: string) =>
    !!userId && unlocked.some((u) => u.user_id === userId && u.achievement_code === code);

  const mineCount = catalog.filter((c) => has(user.id, c.code)).length;
  const partnerCount = partner ? catalog.filter((c) => has(partner.id, c.code)).length : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conquistas" subtitle="Medalhas desbloqueadas pelo casal." />

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-extrabold text-accent tabular-nums">{mineCount}/{catalog.length}</p>
          <p className="text-xs text-muted">Suas conquistas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-extrabold text-partner tabular-nums">
            {partner ? `${partnerCount}/${catalog.length}` : "—"}
          </p>
          <p className="text-xs text-muted">{partner ? displayName(partner) : "Parceiro(a)"}</p>
        </Card>
      </div>

      {catalog.length === 0 ? (
        <EmptyState title="Catálogo de conquistas vazio" description="Execute o seed.sql para carregar as conquistas." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {catalog.map((c) => {
            const Icon = ICONS[c.icon] ?? Medal;
            const mine = has(user.id, c.code);
            const theirs = has(partner?.id, c.code);
            return (
              <li key={c.code}>
                <Card className={cn("flex h-full gap-4 p-4", !mine && !theirs && "opacity-60")}>
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                      mine || theirs ? "bg-accent/15 text-accent" : "bg-surface-3 text-muted",
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted">{c.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge on={mine} label="Você" tone="accent" />
                      {partner ? <Badge on={theirs} label={displayName(partner)} tone="partner" /> : null}
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

function Badge({ on, label, tone }: { on: boolean; label: string; tone: "accent" | "partner" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 font-medium",
        on ? (tone === "accent" ? "bg-accent/15 text-accent" : "bg-partner/15 text-partner") : "bg-surface-3 text-muted",
      )}
    >
      {on ? "✓ " : ""}
      {label}
    </span>
  );
}
