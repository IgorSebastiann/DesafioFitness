import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getSession, unlinkedSessions } from "@/lib/data/workouts";
import { sessionMinutes } from "@/lib/domain/workouts";
import { formatDurationMinutes, todayIso } from "@/lib/time";

export const metadata: Metadata = { title: "Treino concluído" };

export default async function WorkoutDonePage({ searchParams }: { searchParams: Promise<{ sessao?: string }> }) {
  const { sessao } = await searchParams;
  const viewer = await getViewer();
  const data = sessao ? await getSession(viewer.userId, sessao) : null;
  if (!data || data.session.status === "in_progress") notFound();
  const { session } = data;
  const minutes = sessionMinutes(session.started_at, session.finished_at!);
  const today = todayIso();
  const pending = session.local_date === today && !session.activity_id ? await unlinkedSessions(viewer.userId, today) : [];
  const totalMinutes = pending.reduce((sum, s) => sum + sessionMinutes(s.started_at, s.finished_at!), 0);
  const loads = data.logs.filter((l) => l.load_kg != null && l.reps);
  const volume = loads.reduce((sum, l) => sum + l.load_kg! * l.reps!, 0);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader className="mb-0"
        title={session.status === "finished" ? "Treino concluído" : "Treino encerrado"}
        subtitle={session.sheet_name}
      />
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-accent" aria-hidden />
          <p className="text-sm text-muted">
            {session.status === "finished" ? "Bom trabalho! Tudo ficou salvo no seu histórico." : "Este treino foi abandonado e não gera atividade."}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Duração</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{formatDurationMinutes(minutes)}</dd>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Séries</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{session.sets_done}</dd>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <dt className="text-xs text-muted">Volume</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{volume ? `${Math.round(volume).toLocaleString("pt-BR")} kg` : <span className="whitespace-nowrap font-sans text-sm font-normal text-muted">sem carga</span>}</dd>
          </div>
        </dl>
      </Card>

      {session.activity_id ? (
        <Notice kind="success">Este treino já virou atividade do desafio.</Notice>
      ) : session.status === "finished" && pending.length && viewer.challenge ? (
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Registrar no desafio</h2>
          <p className="text-sm text-muted">
            {pending.length > 1
              ? `Os ${pending.length} treinos de hoje (${pending.map((s) => s.sheet_name).join(" + ")}) somam ${formatDurationMinutes(totalMinutes)} e entram como uma atividade.`
              : "Modalidade, horário e duração já vêm preenchidos."}{" "}
            Você só anexa a foto. As regras de pontuação do desafio continuam valendo.
          </p>
          <ButtonLink href="/atividades/nova?treino=1" size="lg">
            Registrar atividade
          </ButtonLink>
        </Card>
      ) : null}

      <ButtonLink href="/treinos" variant="secondary">
        Voltar para Treinos
      </ButtonLink>
    </div>
  );
}
