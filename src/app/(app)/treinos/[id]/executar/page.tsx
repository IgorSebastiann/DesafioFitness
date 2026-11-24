import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WorkoutRunner } from "@/components/workout-runner";
import { PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getSession, getSheet, lastLoads } from "@/lib/data/workouts";

export const metadata: Metadata = { title: "Treino em andamento" };

export default async function RunWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessao?: string }>;
}) {
  const { id } = await params;
  const { sessao } = await searchParams;
  const viewer = await getViewer();
  if (!sessao) redirect(`/treinos/${id}`);

  const [sheet, data] = await Promise.all([getSheet(viewer.userId, id), getSession(viewer.userId, sessao)]);
  if (!sheet || !data || data.session.sheet_id !== sheet.id) notFound();
  if (data.session.status !== "in_progress") redirect(`/treinos/concluido?sessao=${data.session.id}`);

  const loads = await lastLoads(viewer.userId, [...new Set(sheet.blocks.flatMap((b) => b.items.map((i) => i.exercise_id)))]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader className="mb-0" title={sheet.name} subtitle="Marque cada série. O descanso começa sozinho." />
      <WorkoutRunner
        sessionId={data.session.id}
        sheetId={sheet.id}
        startedAt={data.session.started_at}
        blocks={sheet.blocks}
        logs={data.logs}
        lastLoads={loads}
      />
    </div>
  );
}
