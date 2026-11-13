import { Avatar, Card } from "@/components/ui";
import { displayName } from "@/lib/format";
import { gap, rank } from "@/lib/domain/ranking";
import type { Profile, StandingRow } from "@/lib/types";
import { cn } from "@/lib/cn";

const ORDINAL = (n: number) => `${n}º`;

/** Placar lado a lado: pontuação do período, posição e diferença. */
export function ScoreBoard({
  me,
  partner,
  rows,
  periodLabel,
  avatarUrls,
}: {
  me: Profile;
  partner: Profile | null;
  rows: StandingRow[];
  periodLabel: string;
  avatarUrls: Record<string, string | null>;
}) {
  const ranked = rank(rows.map((r) => ({ userId: r.user_id, points: Number(r.points) })));
  const { diff, leaderId } = gap(rows.map((r) => ({ userId: r.user_id, points: Number(r.points) })));
  const pointsOf = (id: string) => Number(rows.find((r) => r.user_id === id)?.points ?? 0);
  const entryOf = (id: string) => ranked.find((e) => e.userId === id);

  const players = [
    { profile: me, tone: "accent" as const, label: "Você" },
    ...(partner ? [{ profile: partner, tone: "partner" as const, label: "Parceiro(a)" }] : []),
  ];

  return (
    <Card glow={!!leaderId && players.some((p) => p.profile.id === leaderId)}>
      <div className="grid grid-cols-2 gap-3">
        {players.map(({ profile, tone, label }) => {
          const isLeader = leaderId === profile.id;
          const entry = entryOf(profile.id);
          const pts = pointsOf(profile.id);
          return (
            <div
              key={profile.id}
              className={cn(
                "flex flex-col items-center rounded-2xl p-4 text-center transition",
                isLeader ? "bg-surface-2 ring-1 ring-accent/50" : "bg-surface-2/50",
              )}
            >
              <Avatar name={displayName(profile)} src={avatarUrls[profile.id] ?? null} size={56} tone={tone} ring={isLeader} />
              <p className="mt-2 max-w-full truncate font-semibold">{displayName(profile)}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
              <p
                key={`${profile.id}-${pts}`}
                className={cn(
                  "animate-score mt-3 text-5xl font-extrabold tabular-nums",
                  tone === "accent" ? "text-accent" : "text-partner",
                )}
              >
                {pts}
              </p>
              <p className="text-xs text-muted">{periodLabel}</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="rounded-full bg-surface-3 px-2 py-0.5 font-semibold text-foreground">
                  {entry ? ORDINAL(entry.position) : "—"}
                  {entry?.tiedWithOther ? " · empate" : ""}
                </span>
                {isLeader ? <span className="font-semibold text-accent">Liderando</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm">
        {!partner ? (
          <span className="text-muted">Aguardando o(a) parceiro(a) entrar no desafio.</span>
        ) : leaderId ? (
          <span>
            <strong className="text-accent">{displayName(players.find((p) => p.profile.id === leaderId)?.profile ?? null)}</strong>{" "}
            vence por <strong className="tabular-nums">{diff}</strong> {diff === 1 ? "ponto" : "pontos"}
          </span>
        ) : rows.some((r) => Number(r.points) > 0) ? (
          <span className="font-semibold">Empate no período</span>
        ) : (
          <span className="text-muted">Nenhuma atividade aprovada neste período ainda.</span>
        )}
      </div>
    </Card>
  );
}
