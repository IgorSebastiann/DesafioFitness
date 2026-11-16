import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AwardForm,
  AwardToggle,
  ClosePeriodForm,
  CreateChallengeForm,
  EditChallengeForm,
  InviteForm,
  LeaveChallengeButton,
  PendingInvitations,
} from "@/components/challenge-forms";
import { ChallengeProgress } from "@/components/challenge-progress";
import { AddCategoryForm, ChallengeCategoriesForm } from "@/components/challenge-categories-form";
import { Avatar, Card, EmptyState, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { avatarUrlFor, getChallengeCategoryRules, listAwards, listPendingInvitations } from "@/lib/data/queries";
import { SITE_URL } from "@/lib/env";
import { toneOf } from "@/lib/people";
import { displayName } from "@/lib/format";
import { formatDayMonth, todayIso } from "@/lib/time";

const MAX_PEOPLE = 4;

export const metadata: Metadata = { title: "Meu desafio" };

/** Desafio (2 a 4 pessoas): criar, convidar, regras, premiações e fechamento de período. */
export default async function ChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string; criado?: string }>;
}) {
  const { convite, criado } = await searchParams;

  // Colar o link (ou só o código) do convite recebido.
  if (convite) {
    const match = convite.match(/[0-9a-f]{48}/);
    if (match) redirect(`/convite/${match[0]}`);
  }

  const viewer = await getViewer();
  const today = todayIso();

  if (!viewer.challenge) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <PageHeader title="Meu desafio" subtitle="Crie o seu desafio e chame até 3 pessoas." />
        <Card>
          <h2 className="mb-4 font-semibold">Criar um desafio</h2>
          <CreateChallengeForm today={today} />
        </Card>
        <Card>
          <h2 className="font-semibold">Recebi um convite</h2>
          <p className="mt-1 text-sm text-muted">Cole o link do convite que você recebeu.</p>
          <form action="/desafio" method="get" className="mt-4 flex flex-col gap-3">
            <input
              name="convite"
              required
              placeholder="Cole o link do convite"
              className="h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-base focus:border-accent focus:outline-none"
            />
            <button className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
              Abrir convite
            </button>
          </form>
        </Card>
      </div>
    );
  }

  const challenge = viewer.challenge;
  const [awards, categoryRules, invitations] = await Promise.all([
    listAwards(viewer.userId, challenge.id),
    getChallengeCategoryRules(viewer.userId, challenge.id),
    listPendingInvitations(viewer.userId, challenge.id),
  ]);
  const count = viewer.participants.length;
  const isFull = count >= MAX_PEOPLE;
  const slotsLeft = MAX_PEOPLE - count - invitations.length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={challenge.name} subtitle="Gerencie o desafio." />

      {criado ? <Notice kind="success">Desafio criado! Agora convide quem vai participar (até 3 pessoas).</Notice> : null}

      <ChallengeProgress startsOn={challenge.starts_on} endsOn={challenge.ends_on} today={today} />

      <section aria-labelledby="participantes" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="participantes">Participantes ({count}/{MAX_PEOPLE})</span>
        </SectionTitle>
        <Card>
          <ul className="flex flex-col gap-3">
            {viewer.people.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar name={displayName(p)} src={avatarUrlFor(p)} size={36} tone={toneOf(viewer.tones, p.id)} />
                <span className="font-medium">{p.id === viewer.userId ? "Você" : displayName(p)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-border pt-4">
            <LeaveChallengeButton />
          </div>
        </Card>
      </section>

      <section aria-labelledby="convidar" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="convidar">Convidar pessoas</span>
        </SectionTitle>
        <Card className="flex flex-col gap-5">
          {isFull ? (
            <p className="text-sm text-muted">O desafio está completo: {MAX_PEOPLE} pessoas.</p>
          ) : slotsLeft <= 0 ? (
            <p className="text-sm text-muted">
              Todas as vagas estão com convite pendente. Cancele um convite para chamar outra pessoa.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                {slotsLeft === 1 ? "Resta 1 vaga." : `Restam ${slotsLeft} vagas.`} Cada convite gera um link que vale por 7 dias.
              </p>
              <InviteForm />
            </>
          )}
          <PendingInvitations
            items={invitations.map((i) => ({
              id: i.id,
              email: i.invited_email,
              link: `${SITE_URL}/convite/${i.token}`,
              expiresOn: formatDayMonth(i.expires_at.slice(0, 10)),
            }))}
          />
        </Card>
      </section>

      <section aria-labelledby="detalhes" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="detalhes">Regras</span>
        </SectionTitle>
        <Card>
          <EditChallengeForm challenge={challenge} />
        </Card>
      </section>

      <section aria-labelledby="modalidades" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="modalidades">Modalidades e tempo mínimo</span>
        </SectionTitle>
        <Card className="flex flex-col gap-4">
          <ChallengeCategoriesForm
            key={categoryRules.map((r) => `${r.id}:${r.enabled}:${r.min_duration_minutes}`).join("|")}
            rules={categoryRules}
          />
          <AddCategoryForm />
        </Card>
      </section>

      <section aria-labelledby="premios" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="premios">Premiações</span>
        </SectionTitle>
        <Card className="flex flex-col gap-4">
          {awards.length === 0 ? (
            <EmptyState title="Nenhum prêmio cadastrado" description="Defina o que está em jogo para cada semana ou mês." />
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {awards.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="font-medium">{a.title}</span>{" "}
                    <span className="text-muted">
                      · {a.period === "weekly" ? "semanal" : "mensal"}
                      {a.value_note ? ` · ${a.value_note}` : ""}
                    </span>
                  </span>
                  <AwardToggle id={a.id} active={a.is_active} />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border pt-4">
            <AwardForm />
          </div>
        </Card>
      </section>

      <section aria-labelledby="fechar" className="flex flex-col gap-4">
        <SectionTitle>
          <span id="fechar">Fechar um período</span>
        </SectionTitle>
        <Card>
          <p className="mb-4 text-sm text-muted">
            Os períodos encerrados são fechados automaticamente. Use isto só para registrar um período que ficou para trás.
          </p>
          <ClosePeriodForm today={today} />
        </Card>
      </section>
    </div>
  );
}
