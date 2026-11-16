/**
 * Períodos (semana: segunda→domingo; mês: dia 1→último dia), vencedor/empate e sequências.
 * Todas as datas são strings YYYY-MM-DD e a aritmética é feita em UTC para evitar
 * deslocamentos causados pelo fuso local do servidor ou do navegador.
 */

export type DateRange = { start: string; end: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(iso).getTime() + days * DAY_MS));
}

/** Semana ISO: começa na segunda-feira e termina no domingo. */
export function weekRange(iso: string): DateRange {
  const date = parseIsoDate(iso);
  const dow = date.getUTCDay(); // 0 = domingo
  const offsetToMonday = dow === 0 ? 6 : dow - 1;
  const start = addDays(iso, -offsetToMonday);
  return { start, end: addDays(start, 6) };
}

export function monthRange(iso: string): DateRange {
  const [y, m] = iso.split("-").map(Number);
  const start = toIsoDate(new Date(Date.UTC(y, m - 1, 1)));
  const end = toIsoDate(new Date(Date.UTC(y, m, 0)));
  return { start, end };
}

export type PeriodOutcome =
  | { kind: "none" }
  | { kind: "winner"; userId: string }
  | { kind: "tie"; userIds: string[] };

/**
 * Define o resultado de um período. Sem pontuação (0) não há vencedor nem empate.
 * Empate exige pontuação igual e positiva entre dois ou mais participantes.
 */
export function determineOutcome(rows: { userId: string; points: number }[]): PeriodOutcome {
  if (rows.length === 0) return { kind: "none" };
  const top = Math.max(...rows.map((r) => r.points));
  if (top <= 0) return { kind: "none" };
  const leaders = rows.filter((r) => r.points === top).map((r) => r.userId);
  if (leaders.length === 1) return { kind: "winner", userId: leaders[0] };
  return { kind: "tie", userIds: leaders };
}

/** Dias distintos (ordenados) com atividade aprovada. */
export function longestStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of unique) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function activeDays(dates: string[]): number {
  return new Set(dates).size;
}

/**
 * Sequência atual: dias seguidos com atividade (pela data da atividade, não da aprovação),
 * terminando hoje. Se hoje ainda não tem
 * atividade, conta até ontem (a sequência só "quebra" quando o dia termina em branco).
 */
export function currentStreak(dates: string[], today: string): number {
  const days = new Set(dates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let run = 0;
  while (days.has(cursor)) {
    run += 1;
    cursor = addDays(cursor, -1);
  }
  return run;
}

/** Dias corridos entre duas datas, contando as duas pontas (inclusivo). */
export function daysBetweenInclusive(start: string, end: string): number {
  return Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / DAY_MS) + 1;
}

export type ChallengeProgress = {
  /** Dia atual do desafio (1 = primeiro dia). 0 se ainda não começou. */
  day: number;
  /** Duração total em dias; null quando o desafio não tem data de fim. */
  totalDays: number | null;
  /** Dias que faltam depois de hoje; null sem data de fim. */
  daysLeft: number | null;
  notStarted: boolean;
  ended: boolean;
};

/** Em que ponto o desafio está hoje. */
export function challengeProgress(startsOn: string, endsOn: string | null, today: string): ChallengeProgress {
  const notStarted = today < startsOn;
  const ended = endsOn !== null && today > endsOn;
  const totalDays = endsOn ? daysBetweenInclusive(startsOn, endsOn) : null;
  const day = notStarted ? 0 : ended && totalDays !== null ? totalDays : daysBetweenInclusive(startsOn, today);
  const daysLeft = endsOn === null ? null : ended ? 0 : daysBetweenInclusive(notStarted ? startsOn : today, endsOn) - 1;
  return { day, totalDays, daysLeft, notStarted, ended };
}

/** Intervalo do desafio inteiro até agora (ou até o fim, se já acabou). */
export function challengeRange(startsOn: string, endsOn: string | null, today: string): DateRange {
  return { start: startsOn, end: endsOn !== null && endsOn < today ? endsOn : today };
}
