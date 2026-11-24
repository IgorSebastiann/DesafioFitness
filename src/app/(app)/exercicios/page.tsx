import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ChevronDown, Dumbbell, Plus, Search, X } from "lucide-react";
import { BodyMap } from "@/components/body-map";
import { ButtonLink, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { countByMuscle, listExercises, type ExerciseSummary } from "@/lib/data/exercises";
import {
  EQUIPMENT,
  LEVELS,
  MUSCLES,
  isEquipment,
  isLevel,
  isMuscleCode,
  muscleName,
  type MuscleCode,
} from "@/lib/domain/exercises";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Exercícios" };

type Params = { q?: string; musculo?: string; equipamento?: string; nivel?: string; "sem-midia"?: string; mostrar?: string };

/** Quantos exercícios aparecem antes do "Mostrar todos". */
const PAGE_SIZE = 40;

/** Monta o link da própria página trocando só os filtros informados. */
function hrefWith(current: Params, changes: Partial<Record<keyof Params, string | null>>, anchor = false): string {
  const next = new URLSearchParams();
  const merged = { ...current, ...changes };
  for (const key of ["q", "musculo", "equipamento", "nivel", "sem-midia", "mostrar"] as const) {
    const value = merged[key];
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return (qs ? `/exercicios?${qs}` : "/exercicios") + (anchor ? "#resultados" : "");
}

/** Biblioteca de exercícios: mapa corporal, busca e filtros por músculo, equipamento e nível. */
export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const viewer = await getViewer();
  const params = await searchParams;
  const muscle = isMuscleCode(params.musculo) ? params.musculo : null;
  const equipment = isEquipment(params.equipamento) ? params.equipamento : null;
  const level = isLevel(params.nivel) ? params.nivel : null;
  const withoutMedia = viewer.isAdmin && params["sem-midia"] === "1";
  const q = (params.q ?? "").slice(0, 60);
  const current: Params = {
    q: q || undefined,
    musculo: muscle ?? undefined,
    equipamento: equipment ?? undefined,
    nivel: level ?? undefined,
    "sem-midia": withoutMedia ? "1" : undefined,
  };

  const [exercises, counts] = await Promise.all([
    listExercises(viewer.userId, { q, muscle, equipment, level, withoutMedia }),
    countByMuscle(viewer.userId),
  ]);

  const hrefs = Object.fromEntries(
    MUSCLES.map((m) => [m.code, hrefWith(current, { musculo: muscle === m.code ? null : m.code }, true)]),
  ) as Record<MuscleCode, string>;
  const hasFilters = Boolean(q || muscle || equipment || level || withoutMedia);
  const showAll = params.mostrar === "todos";
  const visible = showAll ? exercises : exercises.slice(0, PAGE_SIZE);
  const countLabel = `${exercises.length} ${exercises.length === 1 ? "exercício" : "exercícios"}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exercícios"
        subtitle="Toque num músculo para ver os exercícios daquela região."
        action={
          viewer.isAdmin ? (
            <ButtonLink href="/exercicios/novo" variant="secondary">
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Novo exercício</span>
              <span className="sm:hidden">Novo</span>
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        <Card className="lg:sticky lg:top-6">
          <BodyMap
            mode="select"
            hrefs={hrefs}
            selected={muscle}
            counts={counts}
            initialFigure={viewer.profile.body_figure ?? "male"}
            showBothOnWide
          />
          {muscle ? (
            <a
              href="#resultados"
              className="mt-4 flex min-h-11 items-center justify-between gap-2 rounded-xl bg-accent/10 px-4 text-sm lg:hidden"
            >
              <span>
                {countLabel} para <span className="font-semibold text-accent">{muscleName(muscle)}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-accent">
                Ver lista <ArrowDown className="h-4 w-4" aria-hidden />
              </span>
            </a>
          ) : null}
          <details className="group mt-3 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl px-1 text-sm text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
              Escolher pela lista de músculos
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
            </summary>
            <MuscleChips hrefs={hrefs} muscle={muscle} counts={counts} />
          </details>
          <div className="mt-5 hidden lg:block">
            <MuscleChips hrefs={hrefs} muscle={muscle} counts={counts} />
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <form action="/exercicios" className="relative" role="search">
            <label htmlFor="busca-exercicio" className="sr-only">
              Buscar exercício
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="busca-exercicio"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Buscar por nome (ex.: supino, remada)"
              className={cn(inputClass, "pl-11")}
              autoComplete="off"
              enterKeyHint="search"
            />
            {muscle ? <input type="hidden" name="musculo" value={muscle} /> : null}
            {equipment ? <input type="hidden" name="equipamento" value={equipment} /> : null}
            {level ? <input type="hidden" name="nivel" value={level} /> : null}
            {withoutMedia ? <input type="hidden" name="sem-midia" value="1" /> : null}
          </form>

          <FilterRow label="Nível">
            {(Object.keys(LEVELS) as Array<keyof typeof LEVELS>).map((key) => (
              <Chip key={key} href={hrefWith(current, { nivel: level === key ? null : key })} active={level === key}>
                {LEVELS[key]}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Equipamento">
            {(Object.keys(EQUIPMENT) as Array<keyof typeof EQUIPMENT>).map((key) => (
              <Chip
                key={key}
                href={hrefWith(current, { equipamento: equipment === key ? null : key })}
                active={equipment === key}
              >
                {EQUIPMENT[key]}
              </Chip>
            ))}
          </FilterRow>
          {viewer.isAdmin ? (
            <FilterRow label="Admin">
              <Chip href={hrefWith(current, { "sem-midia": withoutMedia ? null : "1" })} active={withoutMedia}>
                Sem mídia (falta gravar)
              </Chip>
            </FilterRow>
          ) : null}

          <div id="resultados" className="flex scroll-mt-4 items-center justify-between gap-3" aria-live="polite">
            <p className="text-sm text-muted">
              {countLabel}
              {muscle ? (
                <>
                  {" "}
                  para <span className="font-semibold text-foreground">{muscleName(muscle)}</span>
                </>
              ) : null}
            </p>
            {hasFilters ? (
              <Link href="/exercicios" scroll={false} className="inline-flex min-h-9 items-center gap-1 text-sm text-muted hover:text-foreground">
                <X className="h-4 w-4" aria-hidden />
                Limpar filtros
              </Link>
            ) : null}
          </div>

          {exercises.length === 0 ? (
            <EmptyState
              title="Nenhum exercício encontrado"
              description="Tente outro nome ou tire algum filtro."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((e) => (
                <li key={e.id}>
                  <ExerciseRow exercise={e} muscle={muscle} isAdmin={viewer.isAdmin} hideMissingBadge={withoutMedia} />
                </li>
              ))}
            </ul>
          )}
          {!showAll && exercises.length > PAGE_SIZE ? (
            <Link
              href={hrefWith(current, { mostrar: "todos" })}
              scroll={false}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-semibold hover:bg-surface-3"
            >
              Mostrar todos ({exercises.length})
            </Link>
          ) : null}

          <p className="text-xs text-muted">
            Imagens e vídeos de terceiros são usados sob licenças abertas.{" "}
            <Link href="/creditos" className="underline underline-offset-2 hover:text-foreground">
              Ver créditos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function MuscleChips({
  hrefs,
  muscle,
  counts,
}: {
  hrefs: Record<MuscleCode, string>;
  muscle: MuscleCode | null;
  counts: Partial<Record<MuscleCode, number>>;
}) {
  return (
    <nav aria-label="Músculos" className="pt-2">
      <ul className="flex flex-wrap gap-1.5">
        {MUSCLES.map((m) => (
          <li key={m.code}>
            <Link
              href={hrefs[m.code]}
              aria-current={muscle === m.code ? "true" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-xs transition",
                muscle === m.code
                  ? "border-accent bg-accent text-accent-ink font-semibold"
                  : "border-border bg-surface-2 text-muted hover:text-foreground",
              )}
            >
              {m.name}
              <span className="sr-only">, {counts[m.code] ?? 0} exercícios</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex min-h-9 w-28 shrink-0 items-center text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <ul
        role="list"
        aria-label={label}
        className="no-scrollbar -mr-4 flex min-w-0 gap-1.5 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,black_80%,transparent)] lg:mr-0 lg:flex-wrap lg:pr-0 lg:[mask-image:none]"
      >
        {children}
      </ul>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={cn(
          "inline-flex min-h-9 items-center whitespace-nowrap rounded-full border px-3 text-xs transition",
          active
            ? "border-accent bg-accent/15 font-semibold text-accent"
            : "border-border bg-surface-2 text-muted hover:text-foreground",
        )}
      >
        {children}
      </Link>
    </li>
  );
}

function ExerciseRow({
  exercise: e,
  muscle,
  isAdmin,
  hideMissingBadge,
}: {
  exercise: ExerciseSummary;
  muscle: MuscleCode | null;
  isAdmin: boolean;
  hideMissingBadge: boolean;
}) {
  const missing = e.media_count === 0 && !hideMissingBadge;
  const secondaryMatch = muscle && e.primary_muscle !== muscle;
  return (
    <Link
      href={`/exercicios/${e.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-accent/40 hover:bg-surface-2"
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
        {e.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.thumb_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Dumbbell className="h-6 w-6 text-muted" aria-hidden />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold leading-snug">{e.name}</span>
        <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className={cn(!secondaryMatch && muscle ? "text-accent" : undefined)}>{muscleName(e.primary_muscle)}</span>
          {secondaryMatch ? <span className="text-accent/80">secundário: {muscleName(muscle)}</span> : null}
          <span aria-hidden>·</span>
          <span>{EQUIPMENT[e.equipment]}</span>
          <span aria-hidden>·</span>
          <span>{LEVELS[e.level]}</span>
        </span>
        {isAdmin && (missing || !e.is_active) ? (
          <span className="flex gap-1.5">
            {missing ? (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">Falta mídia</span>
            ) : null}
            {!e.is_active ? (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">Inativo</span>
            ) : null}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
