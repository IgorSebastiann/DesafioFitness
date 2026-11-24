import type { Metadata } from "next";
import { ActivityForm } from "@/components/activity-form";
import { NoChallenge } from "@/components/no-challenge";
import { ButtonLink, EmptyState, Notice, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getChallengeCategories, pointsUsedByDate } from "@/lib/data/queries";
import { formatDatePtBr, nowHourMinute, todayIso } from "@/lib/time";
import { unlinkedSessions } from "@/lib/data/workouts";
import { sessionMinutes } from "@/lib/domain/workouts";

export const metadata: Metadata = { title: "Registrar atividade" };

export default async function NewActivityPage({ searchParams }: { searchParams: Promise<{ treino?: string }> }) {
  const viewer = await getViewer();
  const { treino } = await searchParams;
  if (!viewer.challenge) return <NoChallenge />;

  const today = todayIso();
  const endsOn = viewer.challenge.ends_on;
  if (endsOn && today > endsOn) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <PageHeader title="Registrar atividade" />
        <EmptyState
          title="O desafio terminou"
          description={`Ele acabou em ${formatDatePtBr(endsOn)}, então não dá para registrar atividades novas. Atividades pendentes ainda podem ser aprovadas.`}
        >
          <ButtonLink href="/ranking?periodo=geral">Ver o resultado final</ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const [categories, used] = await Promise.all([
    getChallengeCategories(viewer.userId, viewer.challenge.id),
    pointsUsedByDate(viewer.userId, viewer.challenge.id, viewer.userId, viewer.challenge.starts_on, today),
  ]);

  // Vindo do fim de um treino: junta os treinos de hoje que ainda não viraram atividade.
  const sessions = treino ? await unlinkedSessions(viewer.userId, today) : [];
  const prefill = sessions.length
    ? {
        categoryId: categories.find((c) => c.name === "Musculação")?.id,
        time: new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(
          new Date(sessions[0].started_at),
        ),
        durationMinutes: sessions.reduce((sum, s) => sum + sessionMinutes(s.started_at, s.finished_at!), 0),
        description: `Treino: ${sessions.map((s) => s.sheet_name).join(" + ")}`.slice(0, 500),
        sessionIds: sessions.map((s) => s.id),
      }
    : undefined;
  const prefillCategory = prefill ? categories.find((c) => c.id === prefill.categoryId) : undefined;
  const belowMinimum = prefill && prefillCategory && prefill.durationMinutes < prefillCategory.min_duration_minutes;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader
        title="Registrar atividade"
        subtitle={
          prefill
            ? "Modalidade, horário e duração vieram do treino. Confira, anexe a foto e envie."
            : "Envie a comprovação para alguém do desafio validar."
        }
      />
      {belowMinimum ? (
        <Notice kind="info">
          O treino somou {prefill.durationMinutes} min, e {prefillCategory.name} pede pelo menos {prefillCategory.min_duration_minutes} min para
          contar no desafio. Se você treinou mais tempo do que o registrado (por exemplo, aquecimento ou outro treino do dia), ajuste a duração.
        </Notice>
      ) : null}
      <ActivityForm
        categories={categories}
        userId={viewer.user.id}
        today={today}
        minDate={viewer.challenge.starts_on}
        nowTime={nowHourMinute()}
        dailyLimit={viewer.challenge.daily_point_limit}
        pointsUsedByDate={used}
        prefill={prefill}
      />
    </div>
  );
}
