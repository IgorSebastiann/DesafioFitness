/**
 * Regras e rótulos da biblioteca de exercícios (puros, sem banco).
 * A verdade continua no banco (migration 0013); isto serve à tela e aos testes.
 */

export const MUSCLES = [
  { code: "chest", name: "Peitoral" },
  { code: "front_delts", name: "Ombro anterior" },
  { code: "side_delts", name: "Ombro lateral" },
  { code: "rear_delts", name: "Ombro posterior" },
  { code: "biceps", name: "Bíceps" },
  { code: "triceps", name: "Tríceps" },
  { code: "forearms", name: "Antebraço" },
  { code: "abs", name: "Abdômen" },
  { code: "obliques", name: "Oblíquos" },
  { code: "traps", name: "Trapézio" },
  { code: "lats", name: "Dorsais" },
  { code: "middle_back", name: "Meio das costas" },
  { code: "lower_back", name: "Lombar" },
  { code: "glutes", name: "Glúteos" },
  { code: "quadriceps", name: "Quadríceps" },
  { code: "hamstrings", name: "Posteriores de coxa" },
  { code: "adductors", name: "Adutores" },
  { code: "abductors", name: "Abdutores" },
  { code: "calves", name: "Panturrilhas" },
] as const;

export type MuscleCode = (typeof MUSCLES)[number]["code"];

const MUSCLE_NAME = new Map<string, string>(MUSCLES.map((m) => [m.code, m.name]));

export function isMuscleCode(value: unknown): value is MuscleCode {
  return typeof value === "string" && MUSCLE_NAME.has(value);
}

export function muscleName(code: string): string {
  return MUSCLE_NAME.get(code) ?? code;
}

/**
 * Músculos do free-exercise-db → grupos do mapa. "shoulders" é genérico na fonte: a porção
 * (anterior, lateral, posterior) foi escolhida exercício a exercício na curadoria; aqui vale o padrão.
 */
export const SOURCE_MUSCLE_MAP: Record<string, MuscleCode> = {
  abdominals: "abs",
  abductors: "abductors",
  adductors: "adductors",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: "forearms",
  glutes: "glutes",
  hamstrings: "hamstrings",
  lats: "lats",
  "lower back": "lower_back",
  "middle back": "middle_back",
  neck: "traps",
  quadriceps: "quadriceps",
  shoulders: "front_delts",
  traps: "traps",
  triceps: "triceps",
};

export const EQUIPMENT = {
  barbell: "Barra",
  dumbbell: "Halter",
  machine: "Máquina",
  cable: "Polia",
  body_weight: "Peso do corpo",
  band: "Elástico",
  kettlebell: "Kettlebell",
  ez_bar: "Barra W",
  smith: "Smith",
  bench: "Banco",
  medicine_ball: "Medicine ball",
  exercise_ball: "Bola suíça",
  foam_roll: "Rolo de espuma",
  other: "Outro",
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export const LEVELS = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" } as const;
export type Level = keyof typeof LEVELS;

export const MECHANICS = { compound: "Composto", isolation: "Isolado" } as const;
export type Mechanic = keyof typeof MECHANICS;

export const CATEGORIES = {
  strength: "Força",
  stretching: "Alongamento",
  cardio: "Cardio",
  plyometrics: "Pliometria",
  mobility: "Mobilidade",
} as const;
export type Category = keyof typeof CATEGORIES;

export const isEquipment = (v: unknown): v is Equipment => typeof v === "string" && v in EQUIPMENT;
export const isLevel = (v: unknown): v is Level => typeof v === "string" && v in LEVELS;

/** Mesma normalização de `public.fold_text` no banco: minúsculas e sem acento. */
export function foldText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Slug a partir do nome (para o cadastro pelo admin). */
export function slugify(name: string): string {
  return foldText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// ---------------------------------------------------------------------------
// Mídias e créditos
// ---------------------------------------------------------------------------
export type MediaKind = "video" | "gif" | "image";
export type MediaAngle = "front" | "side" | "back";
export type MediaOrigin = "wger" | "everkinetic" | "wikimedia" | "own";
export type MediaLicense = "cc0" | "cc_by" | "cc_by_sa" | "own";

export type MediaLike = {
  id: string;
  kind: MediaKind;
  angle: MediaAngle;
  position: number;
  origin: MediaOrigin;
  is_primary: boolean;
};

export const ANGLES: Record<MediaAngle, string> = { front: "Frente", side: "Lado", back: "Costas" };

export const ORIGINS: Record<MediaOrigin, string> = {
  wger: "wger",
  everkinetic: "Everkinetic",
  wikimedia: "Wikimedia Commons",
  own: "Desafio Fitness",
};

const LICENSE_URL: Record<string, string> = {
  "cc0:1.0": "https://creativecommons.org/publicdomain/zero/1.0/deed.pt-br",
  "cc_by:3.0": "https://creativecommons.org/licenses/by/3.0/deed.pt-br",
  "cc_by:4.0": "https://creativecommons.org/licenses/by/4.0/deed.pt-br",
  "cc_by_sa:3.0": "https://creativecommons.org/licenses/by-sa/3.0/deed.pt-br",
  "cc_by_sa:4.0": "https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br",
};

export function licenseLabel(license: MediaLicense, version?: string | null): string {
  const v = version ? ` ${version}` : "";
  switch (license) {
    case "cc0":
      return `CC0${v}`;
    case "cc_by":
      return `CC BY${v}`;
    case "cc_by_sa":
      return `CC BY-SA${v}`;
    case "own":
      return "Própria";
  }
}

export function licenseUrl(license: MediaLicense, version?: string | null): string | null {
  if (license === "own") return null;
  const fallback = license === "cc0" ? "1.0" : "4.0";
  return LICENSE_URL[`${license}:${version ?? fallback}`] ?? null;
}

/** Texto do crédito exibido abaixo da mídia: "Autor · Licença · Fonte". */
export function creditParts(m: {
  origin: MediaOrigin;
  author: string | null;
  license: MediaLicense;
  license_version: string | null;
  is_edited: boolean;
}): { author: string; license: string; source: string; edited: string | null } {
  const author = m.author ?? (m.origin === "own" ? "Desafio Fitness" : `Contribuidores do ${ORIGINS[m.origin]}`);
  const edited =
    m.is_edited && m.license === "cc_by_sa"
      ? `Imagem adaptada; a versão editada continua sob ${licenseLabel(m.license, m.license_version)}.`
      : m.is_edited
        ? "Imagem adaptada do original."
        : null;
  return { author, license: licenseLabel(m.license, m.license_version), source: ORIGINS[m.origin], edited };
}

/**
 * Ordem de exibição: mídias próprias primeiro, depois a principal, depois vídeo/GIF antes
 * de imagem e, por fim, a ordem definida pelo admin.
 */
export function sortMedia<T extends MediaLike>(media: readonly T[]): T[] {
  const kindRank: Record<MediaKind, number> = { video: 0, gif: 1, image: 2 };
  return [...media].sort(
    (a, b) =>
      Number(b.origin === "own") - Number(a.origin === "own") ||
      Number(b.is_primary) - Number(a.is_primary) ||
      kindRank[a.kind] - kindRank[b.kind] ||
      a.position - b.position ||
      a.id.localeCompare(b.id),
  );
}

/** Ângulos disponíveis, na ordem frente → lado → costas, e a primeira mídia de cada um. */
export function mediaByAngle<T extends MediaLike>(media: readonly T[]): Array<{ angle: MediaAngle; media: T }> {
  const sorted = sortMedia(media);
  return (["front", "side", "back"] as const)
    .map((angle) => ({ angle, media: sorted.find((m) => m.angle === angle) }))
    .filter((x): x is { angle: MediaAngle; media: T } => x.media !== undefined)
    .sort((a, b) => sorted.indexOf(a.media) - sorted.indexOf(b.media));
}
