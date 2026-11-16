/**
 * Cores de cada pessoa do desafio (até 4). Você é sempre "accent"; os demais seguem a ordem
 * de entrada no desafio. As classes ficam escritas por extenso para o Tailwind encontrá-las.
 */
export type Tone = "accent" | "partner" | "person-3" | "person-4";

const ORDER: Tone[] = ["partner", "person-3", "person-4"];

export const TONE = {
  accent: {
    text: "text-accent", bg: "bg-accent", soft: "bg-accent/15", border: "border-accent/30", ring: "ring-accent",
    heat: ["bg-accent/45", "bg-accent/75", "bg-accent"], hex: "#c6ff3d",
  },
  partner: {
    text: "text-partner", bg: "bg-partner", soft: "bg-partner/15", border: "border-partner/30", ring: "ring-partner",
    heat: ["bg-partner/45", "bg-partner/75", "bg-partner"], hex: "#ff7a3d",
  },
  "person-3": {
    text: "text-person-3", bg: "bg-person-3", soft: "bg-person-3/15", border: "border-person-3/30", ring: "ring-person-3",
    heat: ["bg-person-3/45", "bg-person-3/75", "bg-person-3"], hex: "#b48cff",
  },
  "person-4": {
    text: "text-person-4", bg: "bg-person-4", soft: "bg-person-4/15", border: "border-person-4/30", ring: "ring-person-4",
    heat: ["bg-person-4/45", "bg-person-4/75", "bg-person-4"], hex: "#3dcfff",
  },
} as const satisfies Record<Tone, { text: string; bg: string; soft: string; border: string; ring: string; heat: readonly string[]; hex: string }>;

/** Mapa id → cor. `participants` deve vir na ordem de entrada no desafio. */
export function toneMap(participants: { id: string }[], meId: string): Record<string, Tone> {
  const map: Record<string, Tone> = { [meId]: "accent" };
  let i = 0;
  for (const p of participants) {
    if (p.id === meId) continue;
    map[p.id] = ORDER[Math.min(i, ORDER.length - 1)];
    i += 1;
  }
  return map;
}

export function toneOf(tones: Record<string, Tone>, id: string): Tone {
  return tones[id] ?? "partner";
}

/** Você primeiro, depois os demais na ordem de entrada. */
export function meFirst<T extends { id: string }>(participants: T[], meId: string): T[] {
  return [...participants.filter((p) => p.id === meId), ...participants.filter((p) => p.id !== meId)];
}

/** "Ana", "Ana e Bia", "Ana, Bia e Cris". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}
