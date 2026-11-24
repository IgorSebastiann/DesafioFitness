/**
 * Regras de apresentação e cálculo das fichas de musculação (sem acesso a banco).
 * O formato dos blocos é conferido no banco (migration 0015); aqui ficam rótulos, texto da
 * prescrição, 1RM e a lista de séries que a tela de execução percorre.
 */

export type BlockKind = "warmup" | "straight" | "biset" | "alternating" | "circuit";

export const BLOCK_KINDS: Record<BlockKind, { label: string; hint: string }> = {
  warmup: { label: "Aquecimento", hint: "Mobilidade ou aquecimento, descrito em texto." },
  straight: { label: "Meta de repetição", hint: "Um exercício: séries × repetições (ou tempo)." },
  biset: { label: "Bi-set", hint: "Dois exercícios seguidos, sem descanso entre eles." },
  alternating: { label: "Carga alternada", hint: "Cada série alterna repetições e carga, ex.: 6 pesada / 12 leve." },
  circuit: { label: "Circuito por tempo", hint: "Exercícios por tempo, um atrás do outro; as séries são voltas." },
};

export const isBlockKind = (v: unknown): v is BlockKind => typeof v === "string" && v in BLOCK_KINDS;

export type WorkoutItem = {
  id?: string;
  exercise_id: string;
  exercise_name?: string;
  exercise_slug?: string;
  reps: number | null;
  reps_scheme: number[] | null;
  duration_seconds: number | null;
  load_kg: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

export type WorkoutBlock = {
  id?: string;
  kind: BlockKind;
  title: string | null;
  sets: number;
  rest_seconds: number | null;
  notes: string | null;
  items: WorkoutItem[];
};

/** "3 × 15", "3 × 6/12", "3 × 30 s", "20 s". */
export function prescription(block: Pick<WorkoutBlock, "kind" | "sets">, item: Pick<WorkoutItem, "reps" | "reps_scheme" | "duration_seconds">): string {
  const target = item.reps_scheme?.length
    ? item.reps_scheme.join("/")
    : item.duration_seconds
      ? formatSeconds(item.duration_seconds)
      : item.reps
        ? String(item.reps)
        : "—";
  if (block.kind === "circuit") return target;
  return `${block.sets} × ${target}`;
}

/** 45 → "45 s"; 90 → "1 min 30 s"; 120 → "2 min". */
export function formatSeconds(total: number): string {
  if (total < 60) return `${total} s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** Cronômetro: 75 → "1:15". */
export function clock(total: number): string {
  const t = Math.max(0, Math.round(total));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** Descanso efetivo de um exercício: o do exercício ou, se vazio, o do bloco. */
export function restFor(block: Pick<WorkoutBlock, "rest_seconds">, item?: Pick<WorkoutItem, "rest_seconds">): number {
  return item?.rest_seconds ?? block.rest_seconds ?? 0;
}

// ---------------------------------------------------------------------------
// 1RM
// ---------------------------------------------------------------------------

/** Epley: carga × (1 + reps/30). */
export function epley(load: number, reps: number): number {
  if (!(load > 0) || !(reps > 0)) return 0;
  return reps === 1 ? load : load * (1 + reps / 30);
}

/** Brzycki: carga × 36 / (37 − reps). Só faz sentido até ~12 repetições. */
export function brzycki(load: number, reps: number): number {
  if (!(load > 0) || !(reps > 0) || reps >= 37) return 0;
  return reps === 1 ? load : (load * 36) / (37 - reps);
}

/** Até quantas repetições a estimativa faz a média de Epley e Brzycki (acima disso, só Epley). */
export const ONE_RM_AVERAGE_MAX_REPS = 10;

/** Estimativa usada no histórico e na calculadora. */
export function estimateOneRm(load: number, reps: number): number {
  if (!(load > 0) || !(reps > 0)) return 0;
  if (reps > ONE_RM_AVERAGE_MAX_REPS) return epley(load, reps);
  return (epley(load, reps) + brzycki(load, reps)) / 2;
}

/** Texto que explica qual fórmula a estimativa usou. */
export function oneRmMethod(reps: number): string {
  if (reps === 1) return "Carga feita em 1 repetição";
  return reps > ONE_RM_AVERAGE_MAX_REPS
    ? `Epley (acima de ${ONE_RM_AVERAGE_MAX_REPS} repetições)`
    : "Média de Epley e Brzycki";
}

/** Carga para fazer N repetições, a partir do 1RM (Epley invertida). */
export function loadForReps(oneRm: number, reps: number): number {
  if (!(oneRm > 0) || !(reps > 0)) return 0;
  return reps === 1 ? oneRm : oneRm / (1 + reps / 30);
}

/** Arredonda para a anilha mais próxima (padrão 1 kg; 2,5 para barra). */
export function roundLoad(kg: number, step = 1): number {
  return Math.round(kg / step) * step;
}

export const REP_RANGES = [
  { reps: 1, goal: "Força máxima" },
  { reps: 3, goal: "Força" },
  { reps: 5, goal: "Força" },
  { reps: 8, goal: "Hipertrofia" },
  { reps: 10, goal: "Hipertrofia" },
  { reps: 12, goal: "Hipertrofia" },
  { reps: 15, goal: "Resistência" },
  { reps: 20, goal: "Resistência" },
] as const;

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
/** Ordem de exibição: semana começando na segunda. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Dia da semana (0 = domingo) de uma data YYYY-MM-DD. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "segunda, quarta e sexta" a partir de [1, 3, 5]. */
export function weekdayList(days: number[]): string {
  const names = [...days]
    .sort((a, b) => WEEK_ORDER.indexOf(a as 0) - WEEK_ORDER.indexOf(b as 0))
    .map((d) => WEEKDAYS[d].toLowerCase());
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

// ---------------------------------------------------------------------------
// Execução: a ficha vira uma lista de passos (uma linha por série de cada exercício)
// ---------------------------------------------------------------------------

export type Step = {
  key: string;
  blockIndex: number;
  itemId: string;
  exerciseId: string;
  setNumber: number;
  /** Posição dentro da série na carga alternada (1, 2…); 1 nos demais. */
  step: number;
  targetReps: number | null;
  targetSeconds: number | null;
  /** Descanso depois deste passo (0 = segue direto). */
  restAfter: number;
};

/**
 * Ordem real de execução:
 *  - meta de repetição: série 1, descanso, série 2…
 *  - bi-set: A1, B1, descanso, A2, B2…
 *  - carga alternada: 6 (pesada), 12 (leve), descanso, 6, 12…
 *  - circuito: cada exercício pelo tempo, sem descanso entre eles; descanso entre voltas.
 *  - aquecimento: sem séries registradas.
 */
export function buildSteps(blocks: WorkoutBlock[]): Step[] {
  const steps: Step[] = [];
  blocks.forEach((block, blockIndex) => {
    if (block.kind === "warmup") return;
    const items = block.items.filter((i) => i.id);
    for (let set = 1; set <= block.sets; set++) {
      const lastSet = set === block.sets;
      const round: Step[] = [];
      for (const item of items) {
        const parts = block.kind === "alternating" && item.reps_scheme?.length ? item.reps_scheme : [item.reps];
        parts.forEach((reps, i) => {
          round.push({
            key: `${item.id}:${set}:${i + 1}`,
            blockIndex,
            itemId: item.id!,
            exerciseId: item.exercise_id,
            setNumber: set,
            step: i + 1,
            targetReps: block.kind === "circuit" ? null : (reps ?? null),
            targetSeconds: item.duration_seconds,
            restAfter: block.kind === "circuit" ? (item.rest_seconds ?? 0) : 0,
          });
        });
      }
      // Descanso ao fim da série/volta (o último passo do bloco não descansa).
      if (round.length) {
        const last = round[round.length - 1];
        const lastItem = items[items.length - 1];
        last.restAfter = lastSet ? 0 : block.kind === "straight" || block.kind === "alternating" ? restFor(block, lastItem) : (block.rest_seconds ?? 0);
      }
      steps.push(...round);
    }
  });
  return steps;
}

/** Minutos de treino a partir do início e do fim (mínimo 1). */
export function sessionMinutes(startedAt: string | Date, finishedAt: string | Date): number {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}
