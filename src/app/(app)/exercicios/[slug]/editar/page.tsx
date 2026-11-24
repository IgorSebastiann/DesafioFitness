import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ExerciseForm, MediaManager } from "@/components/exercise-admin";
import { Card, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getExercise } from "@/lib/data/exercises";

export const metadata: Metadata = { title: "Editar exercício" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ salvo?: string }> };

/** Edição do exercício e das mídias (admin). */
export default async function EditExercisePage({ params, searchParams }: Props) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/exercicios");
  const { slug } = await params;
  const { salvo } = await searchParams;
  const exercise = await getExercise(viewer.userId, slug);
  if (!exercise) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/exercicios/${exercise.slug}`}
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Ver exercício
      </Link>
      <PageHeader title={exercise.name} subtitle="Dados, execução e mídias do exercício." />
      {salvo ? <Notice kind="success">Exercício salvo.</Notice> : null}

      <Card>
        <SectionTitle>Vídeos e fotos</SectionTitle>
        <MediaManager exerciseId={exercise.id} slug={exercise.slug} media={exercise.media} />
      </Card>

      <Card>
        <SectionTitle>Dados do exercício</SectionTitle>
        <ExerciseForm key={exercise.id} exercise={exercise} />
      </Card>
    </div>
  );
}
