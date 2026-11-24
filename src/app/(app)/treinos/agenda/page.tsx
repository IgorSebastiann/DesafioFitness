import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { WorkoutScheduleForm } from "@/components/workout-schedule-form";
import { getViewer } from "@/lib/data/viewer";
import { getSchedule, listMySheets } from "@/lib/data/workouts";

export const metadata: Metadata = { title: "Agenda de treinos" };

export default async function SchedulePage() {
  const viewer = await getViewer();
  const [sheets, schedule] = await Promise.all([listMySheets(viewer.userId), getSchedule(viewer.userId)]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/treinos"
        className="-mb-4 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Treinos
      </Link>
      <PageHeader className="mb-0" title="Agenda da semana" subtitle="Marque as fichas de cada dia. Dia sem ficha é descanso." />
      {sheets.length ? (
        <WorkoutScheduleForm sheets={sheets.map((s) => ({ id: s.id, name: s.name }))} selected={schedule} />
      ) : (
        <EmptyState title="Você ainda não tem fichas" description="Crie uma ficha ou copie um modelo antes de montar a agenda.">
          <ButtonLink href="/treinos">Ir para Treinos</ButtonLink>
        </EmptyState>
      )}
    </div>
  );
}
