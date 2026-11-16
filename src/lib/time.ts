import { TIME_ZONE } from "./domain/rules";

/** Data de hoje (YYYY-MM-DD) no fuso do desafio. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Horário atual (HH:MM) no fuso do desafio. */
export function nowHourMinute(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function formatDatePtBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function formatMonthTitle(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const name = MONTHS_PT[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

export function formatTimeShort(time: string): string {
  return time.slice(0, 5);
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatPoints(n: number): string {
  return `${n} ${n === 1 ? "ponto" : "pontos"}`;
}

/** Mês (YYYY-MM) deslocado por n meses. */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isoToYearMonth(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Hora relativa para feeds ("agora", "há 5 min", "há 3 h", "ontem às 17:32", "12/11 às 08:05").
 * Dias contados no fuso do desafio; ano só aparece quando não é o atual.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;

  const day = todayIso(date);
  const today = todayIso(now);
  if (day === today) return `há ${Math.floor(diffMin / 60)} h`;

  const time = nowHourMinute(date);
  const yesterday = todayIso(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (day === yesterday) return `ontem às ${time}`;

  const [y, m, d] = day.split("-");
  return y === today.slice(0, 4) ? `${d}/${m} às ${time}` : `${d}/${m}/${y} às ${time}`;
}
