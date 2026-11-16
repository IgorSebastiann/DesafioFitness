import { Avatar, Card } from "@/components/ui";
import { displayName } from "@/lib/format";
import { gap, rank } from "@/lib/domain/ranking";
import { TONE, type Tone } from "@/lib/people";
import type { Profile, StandingRow } from "@/lib/types";
import { cn } from "@/lib/cn";

const ORDINAL = (n: number) => `${n}º`;

export type ScorePlayer = { profile: Profile; tone: Tone; isMe: boolean };

/**
 * Placar do período: um cartão por pessoa (2 a 4), com posição e diferença do líder.
 * Com 2 pessoas fica "você x parceiro(a)"; com mais, os cartões seguem a classificação.
 */
export function ScoreBoard({
  players,
  rows,
  periodLabel,
  avatarUrls,
}: {
  players: ScorePlayer[];
  rows: StandingRow[];
  periodLabel: string;
  avatarUrls: Record<string, string | null>;
}) {
  const input = rows.map((r) => ({ userId: r.user_id, points: Number(r.points) }));
  const ranked = rank(input);
  const { diff, leaderId } = gap(input);
  const pointsOf = (id: string) => Number(rows.find((r) => r.user_id === id)?.points ?? 0);
  const entryOf = (id: string) => ranked.find((e) => e.userId === id);
  const group = players.length > 2;
  const ordered = group
    ? [...players].sort((a, b) => (entryOf(a.profile.id)?.position ?? 99) - (entryOf(b.profile.id)?.position ?? 99) || Number(b.isMe) - Number(a.isMe))
    : players;
  const leader = players.find((p) => p.profile.id === leaderId);

  return (
    <Card glow={!!leader}>
      <div className="grid grid-cols-2 gap-3">
        {ordered.map(({ profile, tone, isMe }) => {
          const isLeader = leaderId === profile.id;
          const entry = entryOf(profile.id);
          const pts = pointsOf(profile.id);
          return (
            <div
              key={profile.id}
              className={cn(
                "flex min-w-0 flex-col items-center rounded-2xl text-center transition",
                group ? "p-3" : "p-4",
                isLeader ? "bg-surface-2 ring-1 ring-accent/50" : "bg-surface-2/50",
              )}
            >
              <Avatar name={displayName(profile)} src={avatarUrls[profile.id] ?? null} size={group ? 44 : 56} tone={tone} ring={isLeader} />
              <p className="mt-2 max-w-full truncate font-semibold">{isMe && group ? "Você" : displayName(profile)}</p>
              {group ? null : (
                <p className="text-[11px] uppercase tracking-wider text-muted">{isMe ? "Você" : "Parceiro(a)"}</p>
              )}
              <p
                key={`${profile.id}-${pts}`}
                className={cn("animate-score font-extrabold tabular-nums", group ? "mt-2 text-4xl" : "mt-3 text-5xl", TONE[tone].text)}
              >
                {pts}
              </p>
              <p className="text-xs text-muted">{group ? (pts === 1 ? "ponto" : "pontos") : periodLabel}</p>
              <div className={cn("flex items-center gap-2 text-xs", group ? "mt-2" : "mt-3")}>
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
        {players.length < 2 ? (
          <span className="text-muted">Aguardando alguém entrar no desafio.</span>
        ) : leader ? (
          <span>
            <strong className={TONE[leader.tone].text}>{leader.isMe ? "Você" : displayName(leader.profile)}</strong>{" "}
            lidera por <strong className="tabular-nums">{diff}</strong> {diff === 1 ? "ponto" : "pontos"}
            {group ? <span className="text-muted"> · {periodLabel}</span> : null}
          </span>
        ) : rows.some((r) => Number(r.points) > 0) ? (
          <span className="font-semibold">Empate na liderança</span>
        ) : (
          <span className="text-muted">Nenhuma atividade aprovada neste período ainda.</span>
        )}
      </div>
    </Card>
  );
}
