/**
 * Missão da semana: um desafio extra que muda toda segunda-feira (sem valer pontos).
 * A missão é escolhida pela própria semana, então os dois veem a mesma, sem guardar nada no banco.
 * Conta atividades aprovadas e pendentes (rejeitadas ficam de fora), como a meta semanal.
 */
import { addDays, parseIsoDate } from "./periods";

export type MissionActivity = {
  activity_date: string; // YYYY-MM-DD
  activity_time: string; // HH:MM[:SS]
  duration_minutes: number;
  distance_km: number | null;
  category_name: string;
};

export type Mission = {
  code: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  progress: (items: MissionActivity[]) => number;
};

const distinctDays = (items: MissionActivity[]) => new Set(items.map((a) => a.activity_date));

function longestRun(items: MissionActivity[]): number {
  const days = [...distinctDays(items)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export const MISSIONS: Mission[] = [
  {
    code: "variedade",
    title: "Variedade",
    description: "Treine em 3 modalidades diferentes.",
    target: 3,
    unit: "modalidades",
    progress: (items) => new Set(items.map((a) => a.category_name)).size,
  },
  {
    code: "minutos",
    title: "150 minutos",
    description: "Some 150 minutos de atividade na semana.",
    target: 150,
    unit: "min",
    progress: (items) => items.reduce((n, a) => n + a.duration_minutes, 0),
  },
  {
    code: "sequencia",
    title: "Três seguidos",
    description: "Treine 3 dias seguidos.",
    target: 3,
    unit: "dias seguidos",
    progress: longestRun,
  },
  {
    code: "madrugador",
    title: "Madrugador",
    description: "Treine 2 vezes antes das 8h.",
    target: 2,
    unit: "treinos cedo",
    progress: (items) => items.filter((a) => a.activity_time.slice(0, 5) < "08:00").length,
  },
  {
    code: "fim-de-semana",
    title: "Fim de semana ativo",
    description: "Treine no sábado e no domingo.",
    target: 2,
    unit: "dias",
    progress: (items) =>
      new Set(
        items
          .map((a) => parseIsoDate(a.activity_date).getUTCDay())
          .filter((dow) => dow === 0 || dow === 6),
      ).size,
  },
  {
    code: "distancia",
    title: "10 km",
    description: "Some 10 km de distância na semana.",
    target: 10,
    unit: "km",
    progress: (items) => Math.round(items.reduce((n, a) => n + (a.distance_km ?? 0), 0) * 10) / 10,
  },
  {
    code: "constancia",
    title: "Constância",
    description: "Treine em 5 dias diferentes.",
    target: 5,
    unit: "dias",
    progress: (items) => distinctDays(items).size,
  },
];

/** Missão da semana que começa em `weekStart` (segunda-feira, YYYY-MM-DD). */
export function missionForWeek(weekStart: string): Mission {
  const weekIndex = Math.floor(parseIsoDate(weekStart).getTime() / (7 * 24 * 60 * 60 * 1000));
  return MISSIONS[((weekIndex % MISSIONS.length) + MISSIONS.length) % MISSIONS.length];
}
