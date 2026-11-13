import type { Metadata } from "next";
import { Gift, Trophy } from "lucide-react";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { NoChallenge } from "@/components/no-challenge";
import { getViewer } from "@/lib/data/viewer";
import { getClosedPeriods, listAwards } from "@/lib/data/queries";
import { displayName } from "@/lib/format";
import { formatDayMonth, formatMonthTitle } from "@/lib/time";

export const metadata: Metadata = { title: "Premiações" };

export default async function AwardsPage() {
  const viewer = await getViewer();
  if (!viewer.challenge) return <NoChallenge />;
  const { challenge, user, participants } = viewer;

  const [awards, weekly, monthly] = await Promise.all([
    listAwards(user.id, challenge.id),
    getClosedPeriods(user.id, challenge.id, "weekly"),
    getClosedPeriods(user.id, challenge.id, "monthly"),
  ]);

  const active = awards.filter((a) => a.is_active);
  const winners = [
    ...weekly.map((p) => ({ kind: "Semana", label: `${formatDayMonth(p.period_start)} a ${formatDayMonth(p.period_end)}`, period: p })),
    ...monthly.map((p) => ({ kind: "Mês", label: formatMonthTitle(p.period_start), period: p })),
  ]
    .map((w) => ({ ...w, winner: w.period.rows.find((r) => r.is_winner) ?? null }))
    .filter((w) => w.winner !== null);

  const nameOf = (id: string) => {
    if (id === user.id) return "Você";
    const p = participants.find((x) => x.id === id);
    return p ? displayName(p) : "Participante";
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Premiações" subtitle="O que está em jogo e quem já levou." />

      <section aria-labelledby="em-jogo">
        <SectionTitle>
          <span id="em-jogo">Em jogo</span>
        </SectionTitle>
        {active.length === 0 ? (
          <EmptyState
            title="Nenhuma premiação ativa"
            description="O administrador pode cadastrar prêmios semanais ou mensais na área de administração."
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {active.map((a) => (
              <li key={a.id}>
                <Card className="flex h-full gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <Gift className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-muted">
                      Prêmio {a.period === "weekly" ? "semanal" : "mensal"}
                    </p>
                    <p className="mt-0.5 font-semibold">{a.title}</p>
                    {a.description ? <p className="mt-1 text-sm text-muted">{a.description}</p> : null}
                    {a.value_note ? <p className="mt-2 text-sm font-medium text-accent">{a.value_note}</p> : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="vencedores">
        <SectionTitle>
          <span id="vencedores">Histórico de vencedores</span>
        </SectionTitle>
        {winners.length === 0 ? (
          <EmptyState title="Ainda sem vencedores" description="Os vencedores aparecem aqui ao fim de cada período." />
        ) : (
          <ul className="flex flex-col gap-3">
            {winners
              .sort((a, b) => (a.period.period_start < b.period.period_start ? 1 : -1))
              .map((w) => (
                <li key={`${w.kind}-${w.period.period_start}`}>
                  <Card className="flex items-center gap-4 p-4">
                    <Trophy className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wider text-muted">
                        {w.kind} · {w.label}
                      </p>
                      <p className="font-semibold">{nameOf(w.winner!.user_id)} <span className="font-normal text-muted">· {w.winner!.points} pts</span></p>
                      {w.winner!.award_title ? <p className="text-xs text-accent">{w.winner!.award_title}</p> : null}
                    </div>
                  </Card>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
