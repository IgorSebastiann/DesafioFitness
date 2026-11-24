import Link from "next/link";
import { CheckCircle2, ClipboardList, Play } from "lucide-react";
import { ButtonLink, Card, SectionTitle } from "@/components/ui";
import { ActionButton } from "@/components/workout-actions";
import { startWorkout } from "@/app/actions/workouts";
import type { TodayWorkout } from "@/lib/data/workouts";
import { WEEKDAYS } from "@/lib/domain/workouts";

/** Card do Início: o que treinar hoje, pela agenda da semana. */
export function TodayWorkoutCard({ data }: { data: TodayWorkout }) {
  const doneSheets = new Set(data.sessions.filter((s) => s.status === "finished").map((s) => s.sheet_id));
  const running = data.sessions.find((s) => s.status === "in_progress");
  const pending = data.planned.filter((p) => !doneSheets.has(p.sheet_id));
  const unregistered = data.sessions.filter((s) => s.status === "finished" && !s.activity_id);

  return (
    <section aria-labelledby="treino-hoje">
      <SectionTitle
        action={
          <Link href="/treinos" className="inline-flex min-h-11 items-center text-xs font-semibold text-accent hover:underline">
            Ver treinos →
          </Link>
        }
      >
        <span id="treino-hoje">Treino de hoje · {WEEKDAYS[data.weekday].toLowerCase()}</span>
      </SectionTitle>
      <Card className="flex flex-col gap-4">
        {running ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-semibold">{running.sheet_name}</span> está em andamento ({running.sets_done}{" "}
              {running.sets_done === 1 ? "série feita" : "séries feitas"}).
            </p>
            <ButtonLink href={`/treinos/${running.sheet_id}/executar?sessao=${running.id}`}>
              <Play className="h-4 w-4" aria-hidden />
              Continuar
            </ButtonLink>
          </div>
        ) : pending.length ? (
          <ul className="flex flex-col gap-3">
            {data.planned.map((p) => {
              const finished = doneSheets.has(p.sheet_id);
              return (
              <li key={p.sheet_id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/treinos/${p.sheet_id}`} className="flex min-h-11 items-center gap-3 hover:text-accent">
                  {finished ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  ) : (
                    <ClipboardList className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  )}
                  <span className="flex flex-col">
                    <span className={finished ? "font-semibold text-muted line-through decoration-1" : "font-semibold"}>{p.name}</span>
                    <span className="text-xs text-muted">
                      {finished ? "Feito hoje" : p.exercise_count === 1 ? "1 exercício" : `${p.exercise_count} exercícios`}
                    </span>
                  </span>
                </Link>
                {p.exercise_count && !finished ? (
                  <ActionButton action={startWorkout.bind(null, p.sheet_id)}>
                    <Play className="h-4 w-4" aria-hidden />
                    Começar
                  </ActionButton>
                ) : null}
              </li>
              );
            })}
          </ul>
        ) : data.planned.length ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden />
            Treino do dia feito.
          </p>
        ) : (
          <p className="text-sm text-muted">
            {data.hasSchedule
              ? "Hoje é dia de descanso na sua agenda."
              : data.hasSheets
                ? "Monte a agenda da semana para ver aqui o treino de cada dia."
                : "Crie uma ficha ou copie um modelo pronto e monte a sua agenda."}
          </p>
        )}

        {unregistered.length && !running ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {unregistered.length === 1
                ? `${unregistered[0].sheet_name} ainda não virou atividade do desafio.`
                : `${unregistered.map((s) => s.sheet_name).join(" e ")} ainda não viraram atividade do desafio.`}
            </p>
            <ButtonLink href="/atividades/nova?treino=1" variant="secondary">
              Registrar atividade
            </ButtonLink>
          </div>
        ) : null}

        {!data.hasSchedule ? (
          <ButtonLink href={data.hasSheets ? "/treinos/agenda" : "/treinos"} variant="secondary" className="self-start">
            {data.hasSheets ? "Montar agenda" : "Ver modelos de treino"}
          </ButtonLink>
        ) : null}
      </Card>
    </section>
  );
}
