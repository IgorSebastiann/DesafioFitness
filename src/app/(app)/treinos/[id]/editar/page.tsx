import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { WorkoutEditor } from "@/components/workout-editor";
import { getViewer } from "@/lib/data/viewer";
import { exerciseOptions, getSheet } from "@/lib/data/workouts";

export const metadata: Metadata = { title: "Editar ficha" };

export default async function EditSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const [sheet, exercises] = await Promise.all([getSheet(viewer.userId, id), exerciseOptions(viewer.userId)]);
  if (!sheet) notFound();
  const canEdit = sheet.owner_id === viewer.userId || (sheet.is_template && viewer.isAdmin);
  if (!canEdit) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href={`/treinos/${sheet.id}`}
        className="-mb-4 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {sheet.name}
      </Link>
      <PageHeader className="mb-0" title="Editar ficha" subtitle="Monte os blocos na ordem em que você treina." />
      <WorkoutEditor
        exercises={exercises}
        initial={{
          sheetId: sheet.id,
          name: sheet.name,
          description: sheet.description,
          blocks: sheet.blocks.map((b) => ({
            kind: b.kind,
            title: b.title,
            sets: b.sets,
            rest_seconds: b.rest_seconds,
            notes: b.notes,
            items: b.items.map((i) => ({
              exercise_id: i.exercise_id,
              reps: i.reps,
              reps_scheme: i.reps_scheme,
              duration_seconds: i.duration_seconds,
              load_kg: i.load_kg,
              rest_seconds: i.rest_seconds,
              notes: i.notes,
            })),
          })),
        }}
      />
    </div>
  );
}
