import "server-only";
import { withUser } from "@/lib/db";
import {
  foldText,
  type Category,
  type Equipment,
  type Level,
  type MediaAngle,
  type MediaKind,
  type MediaLicense,
  type MediaOrigin,
  type Mechanic,
  type MuscleCode,
} from "@/lib/domain/exercises";

export type ExerciseSummary = {
  id: string;
  slug: string;
  name: string;
  primary_muscle: MuscleCode;
  secondary_muscles: MuscleCode[];
  equipment: Equipment;
  level: Level;
  is_active: boolean;
  thumb_url: string | null;
  media_count: number;
};

export type ExerciseMedia = {
  id: string;
  kind: MediaKind;
  angle: MediaAngle;
  position: number;
  url: string;
  poster_url: string | null;
  origin: MediaOrigin;
  author: string | null;
  license: MediaLicense;
  license_version: string | null;
  source_url: string | null;
  is_edited: boolean;
  is_primary: boolean;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
};

export type ExerciseDetail = Omit<ExerciseSummary, "thumb_url" | "media_count"> & {
  name_en: string | null;
  mechanic: Mechanic;
  category: Category;
  steps: string[];
  common_mistakes: string[];
  tips: string[];
  text_source: "free-exercise-db" | "own";
  media: ExerciseMedia[];
};

export type ExerciseFilters = {
  q?: string;
  muscle?: MuscleCode | null;
  equipment?: Equipment | null;
  level?: Level | null;
  /** Só exercícios sem nenhuma mídia (lista "falta gravar" do admin). */
  withoutMedia?: boolean;
};

const SUMMARY_SELECT = `
  e.id, e.slug, e.name, e.primary_muscle, e.equipment, e.level, e.is_active,
  coalesce((select array_agg(s.muscle order by mg.sort_order)
              from exercise_secondary_muscles s join muscle_groups mg on mg.code = s.muscle
             where s.exercise_id = e.id), '{}') as secondary_muscles,
  (select coalesce(m.poster_url, case when m.kind = 'image' then m.url end)
     from exercise_media m where m.exercise_id = e.id
    order by (m.origin = 'own') desc, m.is_primary desc, m.position, m.id limit 1) as thumb_url,
  (select count(*) from exercise_media m where m.exercise_id = e.id)::int as media_count`;

/** Lista filtrada. Filtro por músculo inclui exercícios em que ele é principal ou secundário. */
export async function listExercises(userId: string, filters: ExerciseFilters = {}): Promise<ExerciseSummary[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replaceAll("$?", `$${params.length}`));
  };
  const q = filters.q?.trim();
  if (q) add(`e.search_text like '%' || $? || '%'`, foldText(q).replace(/[%_\\]/g, ""));
  if (filters.muscle)
    add(
      `(e.primary_muscle = $? or exists (select 1 from exercise_secondary_muscles s where s.exercise_id = e.id and s.muscle = $?))`,
      filters.muscle,
    );
  if (filters.equipment) add(`e.equipment = $?`, filters.equipment);
  if (filters.level) add(`e.level = $?`, filters.level);
  if (filters.withoutMedia) where.push(`not exists (select 1 from exercise_media m where m.exercise_id = e.id)`);

  const muscleOrder = filters.muscle ? `(e.primary_muscle = $${params.indexOf(filters.muscle) + 1}) desc,` : "";
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<ExerciseSummary>(
      `select ${SUMMARY_SELECT}
         from exercises e
        ${where.length ? `where ${where.join(" and ")}` : ""}
        order by ${muscleOrder} e.is_active desc, e.search_text`,
      params,
    );
    return rows;
  });
}

/** Quantos exercícios cada músculo tem (principal ou secundário), para o mapa. */
export async function countByMuscle(userId: string): Promise<Partial<Record<MuscleCode, number>>> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<{ code: MuscleCode; n: number }>(
      `select mg.code, count(distinct e.id)::int as n
         from muscle_groups mg
         left join exercise_secondary_muscles s on s.muscle = mg.code
         left join exercises e on e.is_active and (e.primary_muscle = mg.code or e.id = s.exercise_id)
        group by mg.code`,
    );
    return Object.fromEntries(rows.map((r) => [r.code, r.n]));
  });
}

export async function getExercise(userId: string, slug: string): Promise<ExerciseDetail | null> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<Omit<ExerciseDetail, "media">>(
      `select ${SUMMARY_SELECT}, e.name_en, e.mechanic, e.category, e.steps, e.common_mistakes, e.tips, e.text_source
         from exercises e where e.slug = $1`,
      [slug],
    );
    const exercise = rows[0];
    if (!exercise) return null;
    const media = await sql.query<ExerciseMedia>(
      `select id, kind, angle, position, url, poster_url, origin, author, license, license_version, source_url,
              is_edited, is_primary, width, height, duration_ms
         from exercise_media where exercise_id = $1 order by position, created_at`,
      [exercise.id],
    );
    return { ...exercise, media: media.rows };
  });
}

export type CreditRow = {
  origin: MediaOrigin;
  license: MediaLicense;
  license_version: string | null;
  author: string | null;
  source_url: string | null;
  is_edited: boolean;
  exercise_slug: string;
  exercise_name: string;
  kind: MediaKind;
};

/** Todas as mídias de terceiros, para a página de créditos. */
export async function listCredits(userId: string): Promise<CreditRow[]> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<CreditRow>(
      `select m.origin, m.license, m.license_version, m.author, m.source_url, m.is_edited, m.kind,
              e.slug as exercise_slug, e.name as exercise_name
         from exercise_media m join exercises e on e.id = m.exercise_id
        where m.origin <> 'own'
        order by m.origin, e.search_text, m.position`,
    );
    return rows;
  });
}
