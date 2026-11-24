import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Calculator, ChevronRight, Share2 } from "lucide-react";
import { ButtonLink, Card, EmptyState, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { ActionButton, NewSheetForm } from "@/components/workout-actions";
import { copyTemplateGroup } from "@/app/actions/workouts";
import { getViewer } from "@/lib/data/viewer";
import { getSchedule, listMySheets, listSharedWithMe, listTemplates, type SheetSummary } from "@/lib/data/workouts";
import { WEEKDAYS_SHORT, WEEK_ORDER, weekdayList } from "@/lib/domain/workouts";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Treinos" };

const TEMPLATE_ABOUT: Record<string, string> = {
  ABC: "3 treinos: peito/ombro/tríceps, costas/bíceps e pernas.",
  ABCD: "4 treinos: peito, costas, pernas e ombros.",
  "Upper/Lower": "Superiores e inferiores alternados, 4× por semana.",
  "Full Body": "Corpo inteiro, 2 a 3× por semana.",
};

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ copiado?: string }> }) {
  const viewer = await getViewer();
  const { copiado } = await searchParams;
  const [mine, shared, templates, schedule] = await Promise.all([
    listMySheets(viewer.userId),
    listSharedWithMe(viewer.userId),
    listTemplates(viewer.userId),
    getSchedule(viewer.userId),
  ]);
  const groups = [...new Set(templates.map((t) => t.template_group!))];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader className="mb-0"
        title="Treinos"
        subtitle="Suas fichas de musculação, a agenda da semana e os modelos prontos."
        action={
          <ButtonLink href="/treinos/1rm" variant="secondary" className="hidden sm:inline-flex">
            <Calculator className="h-4 w-4" aria-hidden />
            Calculadora de 1RM
          </ButtonLink>
        }
      />

      {copiado ? <Notice kind="success">Modelo {copiado} copiado para a sua conta. Agora é só ajustar e montar a agenda.</Notice> : null}

      <section aria-labelledby="agenda">
        <SectionTitle
          action={
            mine.length ? (
              <Link href="/treinos/agenda" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
                Editar agenda
              </Link>
            ) : null
          }
        >
          <span id="agenda">Agenda da semana</span>
        </SectionTitle>
        {schedule.length ? (
          <>
          {/* Celular: um dia por linha, com o nome inteiro da ficha. */}
          <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface sm:hidden">
            {WEEK_ORDER.map((day) => {
              const items = schedule.filter((s) => s.weekday === day);
              return (
                <li key={day} className="flex min-h-12 items-center gap-3 px-4 py-1">
                  <span className="w-10 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">{WEEKDAYS_SHORT[day]}</span>
                  {items.length ? (
                    <span className="flex min-w-0 flex-1 flex-col">
                      {items.map((s) => (
                        <Link key={s.sheet_id} href={`/treinos/${s.sheet_id}`} className="flex min-h-11 items-center text-sm font-medium hover:text-accent">
                          {s.name}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    <span className="text-sm text-muted">Descanso</span>
                  )}
                </li>
              );
            })}
          </ol>
          <ol className="hidden grid-cols-7 gap-2 sm:grid">
            {WEEK_ORDER.map((day) => {
              const items = schedule.filter((s) => s.weekday === day);
              return (
                <li
                  key={day}
                  className={cn(
                    "flex min-h-20 flex-col gap-1 rounded-2xl border p-1.5 text-center sm:p-2",
                    items.length ? "border-accent/30 bg-accent/5" : "border-border bg-surface",
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{WEEKDAYS_SHORT[day]}</span>
                  {items.map((s) => (
                    <Link
                      key={s.sheet_id}
                      href={`/treinos/${s.sheet_id}`}
                      className="line-clamp-3 break-words rounded-lg text-[11px] leading-tight font-medium hover:text-accent sm:text-xs"
                    >
                      {s.name}
                    </Link>
                  ))}
                </li>
              );
            })}
          </ol>
          </>
        ) : (
          <EmptyState
            title="Nenhum treino na agenda"
            description={
              mine.length
                ? "Escolha em quais dias você faz cada ficha. O Início passa a mostrar o treino do dia."
                : "Crie uma ficha ou copie um modelo; depois escolha os dias da semana."
            }
          >
            {mine.length ? (
              <ButtonLink href="/treinos/agenda">
                <CalendarDays className="h-4 w-4" aria-hidden />
                Montar agenda
              </ButtonLink>
            ) : null}
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="minhas">
        <SectionTitle>
          <span id="minhas">Minhas fichas</span>
        </SectionTitle>
        <div className="flex flex-col gap-3">
          {mine.length ? <SheetList sheets={mine} /> : null}
          <Card>
            <NewSheetForm />
          </Card>
          <ButtonLink href="/treinos/1rm" variant="secondary" className="sm:hidden">
            <Calculator className="h-4 w-4" aria-hidden />
            Calculadora de 1RM
          </ButtonLink>
        </div>
      </section>

      {shared.length ? (
        <section aria-labelledby="compartilhadas">
          <SectionTitle>
            <span id="compartilhadas">Compartilhadas com você</span>
          </SectionTitle>
          <SheetList sheets={shared} showOwner />
        </section>
      ) : null}

      <section aria-labelledby="modelos">
        <SectionTitle>
          <span id="modelos">Modelos prontos</span>
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((group) => {
            const sheets = templates.filter((t) => t.template_group === group);
            return (
              <Card key={group} className="flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{group}</h3>
                  <p className="text-sm text-muted">{TEMPLATE_ABOUT[group] ?? `${sheets.length} fichas.`}</p>
                </div>
                <ul className="flex flex-col gap-1 text-sm">
                  {sheets.map((s) => (
                    <li key={s.id}>
                      <Link href={`/treinos/${s.id}`} className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2 -mx-2 hover:bg-surface-2">
                        <span>{s.name}</span>
                        <span className="text-xs text-muted">{s.exercise_count} exercícios</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <ActionButton action={copyTemplateGroup.bind(null, group)} variant="secondary" className="mt-auto">
                  Copiar para minha conta
                </ActionButton>
              </Card>
            );
          })}
        </div>
      </section>

    </div>
  );
}

function SheetList({ sheets, showOwner = false }: { sheets: SheetSummary[]; showOwner?: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
      {sheets.map((s) => (
        <li key={s.id}>
          <Link href={`/treinos/${s.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 font-medium">
                <span className="truncate">{s.name}</span>
                {s.is_shared && !showOwner ? <Share2 className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Compartilhada" /> : null}
              </span>
              <span className="text-xs text-muted">
                {showOwner && s.owner_name ? `De ${s.owner_name} · ` : ""}
                {s.exercise_count === 1 ? "1 exercício" : `${s.exercise_count} exercícios`}
                {s.weekdays.length ? ` · ${weekdayList(s.weekdays)}` : ""}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
