import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Play, Trash2 } from "lucide-react";
import { ButtonLink, EmptyState, Notice, PageHeader } from "@/components/ui";
import { ActionButton, ShareToggle } from "@/components/workout-actions";
import { WorkoutSheetView } from "@/components/workout-sheet-view";
import { copySheet, copyTemplateGroup, deleteSheet, startWorkout } from "@/app/actions/workouts";
import { getViewer } from "@/lib/data/viewer";
import { getSheet } from "@/lib/data/workouts";
import { weekdayList } from "@/lib/domain/workouts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewer();
  const sheet = await getSheet(viewer.userId, id);
  return { title: sheet?.name ?? "Ficha" };
}

export default async function SheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copiada?: string }>;
}) {
  const { id } = await params;
  const { copiada } = await searchParams;
  const viewer = await getViewer();
  const sheet = await getSheet(viewer.userId, id);
  if (!sheet) notFound();

  const isOwner = sheet.owner_id === viewer.userId;
  const canEdit = isOwner || (sheet.is_template && viewer.isAdmin);
  const empty = sheet.blocks.length === 0;
  const subtitle = sheet.is_template
    ? `Modelo ${sheet.template_group}`
    : isOwner
      ? sheet.weekdays.length
        ? `Na agenda: ${weekdayList(sheet.weekdays)}`
        : "Fora da agenda"
      : `Compartilhada por ${sheet.owner_name ?? "alguém do desafio"}`;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <Link
          href="/treinos"
          className="-mb-4 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Treinos
        </Link>
        <PageHeader className="mb-0" title={sheet.name} subtitle={subtitle} />
        {copiada ? <Notice kind="success">Ficha copiada para a sua conta. Ajuste o que quiser e coloque na agenda.</Notice> : null}
        {sheet.description ? <p className="text-sm leading-relaxed text-muted">{sheet.description}</p> : null}

        {empty ? (
          <EmptyState title="Ficha vazia" description={canEdit ? "Monte os blocos com os exercícios da biblioteca." : "Ainda não há exercícios nesta ficha."}>
            {canEdit ? <ButtonLink href={`/treinos/${sheet.id}/editar`}>Montar ficha</ButtonLink> : null}
          </EmptyState>
        ) : (
          <WorkoutSheetView blocks={sheet.blocks} />
        )}
      </div>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
        {isOwner ? (
          <>
            {!empty ? (
              <ActionButton action={startWorkout.bind(null, sheet.id)} size="lg" block>
                <Play className="h-5 w-5" aria-hidden />
                Começar treino
              </ActionButton>
            ) : null}
            <ButtonLink href={`/treinos/${sheet.id}/editar`} variant="secondary">
              <Pencil className="h-4 w-4" aria-hidden />
              Editar ficha
            </ButtonLink>
            <ShareToggle sheetId={sheet.id} shared={sheet.is_shared} />
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <ActionButton action={deleteSheet.bind(null, sheet.id)} variant="danger" confirm="Excluir de vez" block>
                <Trash2 className="h-4 w-4" aria-hidden />
                Excluir ficha
              </ActionButton>
              <p className="text-xs text-muted">O histórico de séries e cargas continua salvo.</p>
            </div>
          </>
        ) : sheet.is_template ? (
          <>
            <ActionButton action={copyTemplateGroup.bind(null, sheet.template_group!)} size="lg" block>
              Copiar modelo {sheet.template_group}
            </ActionButton>
            <p className="text-xs text-muted">Copia todas as fichas do modelo para a sua conta, onde você pode editar.</p>
            {canEdit ? (
              <ButtonLink href={`/treinos/${sheet.id}/editar`} variant="secondary">
                <Pencil className="h-4 w-4" aria-hidden />
                Editar modelo (admin)
              </ButtonLink>
            ) : null}
          </>
        ) : (
          <>
            <ActionButton action={copySheet.bind(null, sheet.id)} size="lg" block>
              Copiar para minha conta
            </ActionButton>
            <p className="text-xs text-muted">A cópia é sua: dá para editar, pôr na agenda e executar.</p>
          </>
        )}
      </aside>
    </div>
  );
}
