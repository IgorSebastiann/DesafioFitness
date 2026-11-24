import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Lightbulb, ListOrdered, Pencil, Video } from "lucide-react";
import { BodyMap } from "@/components/body-map";
import { ExerciseMediaPlayer } from "@/components/exercise-media-player";
import { ButtonLink, Card, SectionTitle } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getExercise } from "@/lib/data/exercises";
import { CATEGORIES, EQUIPMENT, LEVELS, MECHANICS, muscleName } from "@/lib/domain/exercises";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const viewer = await getViewer();
  const exercise = await getExercise(viewer.userId, slug);
  return { title: exercise?.name ?? "Exercício" };
}

/** Detalhe do exercício: mídia de execução, músculos no desenho do corpo, passo a passo e dicas. */
export default async function ExercisePage({ params }: Props) {
  const { slug } = await params;
  const viewer = await getViewer();
  const exercise = await getExercise(viewer.userId, slug);
  if (!exercise) notFound();

  const facts = [
    { label: "Equipamento", value: EQUIPMENT[exercise.equipment] },
    { label: "Nível", value: LEVELS[exercise.level] },
    { label: "Tipo", value: MECHANICS[exercise.mechanic] },
    { label: "Categoria", value: CATEGORIES[exercise.category] },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/exercicios"
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Exercícios
        </Link>
        {viewer.isAdmin ? (
          <ButtonLink href={`/exercicios/${exercise.slug}/editar`} variant="secondary">
            <Pencil className="h-4 w-4" aria-hidden />
            Editar
          </ButtonLink>
        ) : null}
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{exercise.name}</h1>
        <p className="text-sm text-muted">
          Principal: <span className="text-foreground">{muscleName(exercise.primary_muscle)}</span>
          {exercise.secondary_muscles.length ? (
            <> · Secundários: {exercise.secondary_muscles.map(muscleName).join(", ")}</>
          ) : null}
        </p>
        {!exercise.is_active ? (
          <p className="w-fit rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">
            Inativo: só o admin vê
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          {exercise.media.length > 0 ? (
            <Card>
              <ExerciseMediaPlayer media={exercise.media} exerciseName={exercise.name} />
            </Card>
          ) : (
            <Card className="flex items-center gap-3 text-sm text-muted">
              <Video className="h-5 w-5 shrink-0" aria-hidden />
              <p>Ainda não há vídeo ou foto deste exercício. Siga o passo a passo e o desenho dos músculos.</p>
            </Card>
          )}

          <Card>
            <SectionTitle>Músculos trabalhados</SectionTitle>
            <BodyMap
              mode="highlight"
              primary={exercise.primary_muscle}
              secondary={exercise.secondary_muscles}
              initialFigure={viewer.profile.body_figure ?? "male"}
              showBothOnWide
            />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="rounded-2xl border border-border bg-surface p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{f.label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>

          <Card>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <ListOrdered className="h-4 w-4" aria-hidden /> Como executar
              </span>
            </SectionTitle>
            <ol className="flex flex-col gap-3">
              {exercise.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          {exercise.common_mistakes.length > 0 ? (
            <Card>
              <SectionTitle>
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" aria-hidden /> Erros comuns
                </span>
              </SectionTitle>
              <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                {exercise.common_mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                    {m}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {exercise.tips.length > 0 ? (
            <Card>
              <SectionTitle>
                <span className="inline-flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" aria-hidden /> Postura e respiração
                </span>
              </SectionTitle>
              <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                {exercise.tips.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {exercise.text_source === "free-exercise-db" ? (
            <p className="text-xs text-muted">
              Texto adaptado do free-exercise-db (domínio público).{" "}
              <Link href="/creditos" className="underline underline-offset-2 hover:text-foreground">
                Créditos
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
