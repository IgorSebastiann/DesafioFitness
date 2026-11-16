/**
 * Retrospectiva do mês de uma pessoa (atividades aprovadas): números e curiosidades.
 */
import { parseIsoDate } from "./periods";

export type RecapActivity = {
  activity_date: string;
  activity_time: string;
  duration_minutes: number;
  distance_km: number | null;
  category_name: string;
};

export type Recap = {
  activities: number;
  minutes: number;
  km: number;
  activeDays: number;
  favorite: { name: string; count: number } | null;
  bestWeekday: { name: string; count: number } | null;
  earliest: { time: string; date: string } | null;
  longest: { minutes: number; name: string; date: string } | null;
};

export const WEEKDAYS_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Mais frequente; em empate fica o que apareceu primeiro. */
function mostFrequent(values: string[]): { name: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) if (!best || count > best.count) best = { name, count };
  return best;
}

export function computeRecap(items: RecapActivity[]): Recap {
  if (items.length === 0) {
    return { activities: 0, minutes: 0, km: 0, activeDays: 0, favorite: null, bestWeekday: null, earliest: null, longest: null };
  }
  const earliest = items.reduce((a, b) => (b.activity_time < a.activity_time ? b : a));
  const longest = items.reduce((a, b) => (b.duration_minutes > a.duration_minutes ? b : a));
  return {
    activities: items.length,
    minutes: items.reduce((n, a) => n + a.duration_minutes, 0),
    km: Math.round(items.reduce((n, a) => n + (a.distance_km ?? 0), 0) * 10) / 10,
    activeDays: new Set(items.map((a) => a.activity_date)).size,
    favorite: mostFrequent(items.map((a) => a.category_name)),
    bestWeekday: mostFrequent(items.map((a) => WEEKDAYS_PT[parseIsoDate(a.activity_date).getUTCDay()])),
    earliest: { time: earliest.activity_time.slice(0, 5), date: earliest.activity_date },
    longest: { minutes: longest.duration_minutes, name: longest.category_name, date: longest.activity_date },
  };
}
