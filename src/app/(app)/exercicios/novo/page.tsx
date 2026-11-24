import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ExerciseForm } from "@/components/exercise-admin";
import { Card, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";

export const metadata: Metadata = { title: "Novo exercício" };

/** Cadastro de exercício (admin). Depois de salvar, abre a edição para enviar mídias. */
export default async function NewExercisePage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect("/exercicios");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/exercicios" className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Exercícios
      </Link>
      <PageHeader title="Novo exercício" subtitle="Depois de criar, você poderá enviar vídeos e fotos." />
      <Card>
        <ExerciseForm />
      </Card>
    </div>
  );
}
