import "server-only";
import { withUser, type Sql } from "@/lib/db";
import { estimateOneRm, type BlockKind, type WorkoutBlock } from "@/lib/domain/workouts";
import type { MuscleCode } from "@/lib/domain/exercises";

export type SheetSummary = {
  id: string;
  name: string;
  description: string | null;
  is_shared: boolean;
  is_template: boolean;
  template_group: string | null;
  owner_id: string | null;
  owner_name: string | null;
  block_count: number;
  exercise_count: number;
  weekdays: number[];
  updated_at: string;
};

export type SheetItem = WorkoutBlock["items"][number] & {
  id: string;
  exercise_name: string;
  exercise_slug: string;
  primary_muscle: MuscleCode;
  thumb_url: string | null;
};

export type SheetBlock = Omit<WorkoutBlock, "items"> & { id: string; kind: BlockKind; items: SheetItem[] };

export type SheetDetail = SheetSummary & { blocks: SheetBlock[]; copied_from: string | null };

const SUMMARY = `
  s.id, s.name, s.description, s.is_shared, s.is_template, s.template_group, s.owner_id,
  (select coalesce(nullif(btrim(p.nickname), ''), p.display_name) from profiles p where p.id = s.owner_id) as owner_name,
  (select count(*)::int from workout_blocks b where b.sheet_id = s.id) as block_count,
  (select count(*)::int from workout_block_items i join workout_blocks b on b.id = i.block_id where b.sheet_id = s.id) as exercise_count,
  coalesce((select array_agg(w.weekday order by w.weekday) from workout_schedule w
             where w.sheet_id = s.id and w.user_id = current_user_id()), '{}') as weekdays,
  s.updated_at::text`;

export async function listMySheets(userId: string): Promise<SheetSummary[]> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<SheetSummary>(
      `select ${SUMMARY} from workout_sheets s where s.owner_id = $1 order by s.position, s.created_at`,
      [userId],
    );
    return rows;
  });
}

/** Fichas que outras pessoas do desafio compartilharam (o RLS já filtra). */
export async function listSharedWithMe(userId: string): Promise<SheetSummary[]> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<SheetSummary>(
      `select ${SUMMARY} from workout_sheets s
        where not s.is_template and s.owner_id <> $1 and s.is_shared
        order by owner_name, s.position, s.created_at`,
      [userId],
    );
    return rows;
  });
}

export async function listTemplates(userId: string): Promise<SheetSummary[]> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<SheetSummary>(
      `select ${SUMMARY} from workout_sheets s where s.is_template
        order by array_position(array['ABC','ABCD','Upper/Lower','Full Body'], s.template_group), s.template_group, s.position`,
    );
    return rows;
  });
}

async function loadBlocks(sql: Sql, sheetId: string): Promise<SheetBlock[]> {
  const { rows: blocks } = await sql.query<Omit<SheetBlock, "items">>(
    `select id, kind, title, sets, rest_seconds, notes from workout_blocks where sheet_id = $1 order by position`,
    [sheetId],
  );
  const { rows: items } = await sql.query<SheetItem & { block_id: string }>(
    `select i.id, i.block_id, i.exercise_id, i.reps, i.reps_scheme, i.duration_seconds,
            i.load_kg::float8 as load_kg, i.rest_seconds, i.notes,
            e.name as exercise_name, e.slug as exercise_slug, e.primary_muscle,
            (select coalesce(m.poster_url, case when m.kind = 'image' then m.url end)
               from exercise_media m where m.exercise_id = e.id
              order by (m.origin = 'own') desc, m.is_primary desc, m.position, m.id limit 1) as thumb_url
       from workout_block_items i
       join workout_blocks b on b.id = i.block_id
       join exercises e on e.id = i.exercise_id
      where b.sheet_id = $1
      order by b.position, i.position`,
    [sheetId],
  );
  return blocks.map((b) => ({ ...b, items: items.filter((i) => i.block_id === b.id) }));
}

export async function getSheet(userId: string, sheetId: string): Promise<SheetDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sheetId)) return null;
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<SheetSummary & { copied_from: string | null }>(
      `select ${SUMMARY}, s.copied_from from workout_sheets s where s.id = $1`,
      [sheetId],
    );
    if (!rows[0]) return null;
    return { ...rows[0], blocks: await loadBlocks(sql, sheetId) };
  });
}

// ---------------------------------------------------------------------------
// Agenda e treino de hoje
// ---------------------------------------------------------------------------

export type ScheduleEntry = { weekday: number; sheet_id: string; name: string };

export async function getSchedule(userId: string): Promise<ScheduleEntry[]> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<ScheduleEntry>(
      `select w.weekday, w.sheet_id, s.name from workout_schedule w join workout_sheets s on s.id = w.sheet_id
        where w.user_id = $1 order by w.weekday, w.position, s.position`,
      [userId],
    );
    return rows;
  });
}

export type SessionRow = {
  id: string;
  sheet_id: string | null;
  sheet_name: string;
  local_date: string;
  started_at: string;
  finished_at: string | null;
  status: "in_progress" | "finished" | "abandoned";
  activity_id: string | null;
  sets_done: number;
};

const SESSION = `
  ws.id, ws.sheet_id, ws.sheet_name, ws.local_date, ws.started_at::text, ws.finished_at::text, ws.status, ws.activity_id,
  (select count(*)::int from workout_set_logs l where l.session_id = ws.id) as sets_done`;

export type TodayWorkout = {
  weekday: number;
  planned: Array<{ sheet_id: string; name: string; exercise_count: number }>;
  sessions: SessionRow[];
  hasSchedule: boolean;
  hasSheets: boolean;
};

export async function getTodayWorkout(userId: string, today: string, weekday: number): Promise<TodayWorkout> {
  return withUser(userId, async (sql) => {
    const planned = await sql.query<TodayWorkout["planned"][number]>(
      `select w.sheet_id, s.name,
              (select count(*)::int from workout_block_items i join workout_blocks b on b.id = i.block_id where b.sheet_id = s.id) as exercise_count
         from workout_schedule w join workout_sheets s on s.id = w.sheet_id
        where w.user_id = $1 and w.weekday = $2 order by w.position, s.position`,
      [userId, weekday],
    );
    const sessions = await sql.query<SessionRow>(
      `select ${SESSION} from workout_sessions ws where ws.user_id = $1 and ws.local_date = $2 and ws.status <> 'abandoned'
        order by ws.started_at`,
      [userId, today],
    );
    const counts = await sql.query<{ sched: number; sheets: number }>(
      `select (select count(*)::int from workout_schedule where user_id = $1) as sched,
              (select count(*)::int from workout_sheets where owner_id = $1) as sheets`,
      [userId],
    );
    return {
      weekday,
      planned: planned.rows,
      sessions: sessions.rows,
      hasSchedule: counts.rows[0].sched > 0,
      hasSheets: counts.rows[0].sheets > 0,
    };
  });
}

export async function getSession(userId: string, sessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<SessionRow>(`select ${SESSION} from workout_sessions ws where ws.id = $1`, [sessionId]);
    if (!rows[0]) return null;
    const logs = await sql.query<SetLog>(
      `select item_id, set_number, step, reps, load_kg::float8 as load_kg, duration_seconds
         from workout_set_logs where session_id = $1`,
      [sessionId],
    );
    return { session: rows[0], logs: logs.rows };
  });
}

export type SetLog = {
  item_id: string | null;
  set_number: number;
  step: number;
  reps: number | null;
  load_kg: number | null;
  duration_seconds: number | null;
};

/** Última carga usada em cada exercício (para sugerir na execução). */
export async function lastLoads(userId: string, exerciseIds: string[]): Promise<Record<string, number>> {
  if (exerciseIds.length === 0) return {};
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<{ exercise_id: string; load_kg: number }>(
      `select distinct on (exercise_id) exercise_id, load_kg::float8 as load_kg
         from workout_set_logs where user_id = $1 and exercise_id = any($2::uuid[]) and load_kg is not null
        order by exercise_id, done_at desc`,
      [userId, exerciseIds],
    );
    return Object.fromEntries(rows.map((r) => [r.exercise_id, r.load_kg]));
  });
}

/** Sessões terminadas de hoje que ainda não viraram atividade do desafio. */
export async function unlinkedSessions(userId: string, today: string): Promise<SessionRow[]> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<SessionRow>(
      `select ${SESSION} from workout_sessions ws
        where ws.user_id = $1 and ws.local_date = $2 and ws.status = 'finished' and ws.activity_id is null
        order by ws.started_at`,
      [userId, today],
    );
    return rows;
  });
}

// ---------------------------------------------------------------------------
// Evolução por exercício
// ---------------------------------------------------------------------------

export type ExerciseProgress = {
  points: Array<{ date: string; maxLoad: number; bestOneRm: number }>;
  best: { load: number; reps: number; date: string } | null;
  bestOneRm: number;
  /** Repetições da série que deu o melhor 1RM (para explicar a fórmula usada). */
  bestOneRmReps: number;
  totalSets: number;
};

export async function getExerciseProgress(userId: string, exerciseId: string): Promise<ExerciseProgress> {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<{ date: string; load_kg: number | null; reps: number | null }>(
      `select (l.done_at at time zone 'America/Sao_Paulo')::date::text as date, l.load_kg::float8 as load_kg, l.reps
         from workout_set_logs l where l.user_id = $1 and l.exercise_id = $2
        order by l.done_at`,
      [userId, exerciseId],
    );
    const byDate = new Map<string, { maxLoad: number; bestOneRm: number }>();
    let best: ExerciseProgress["best"] = null;
    let bestOneRm = 0;
    let bestOneRmReps = 0;
    for (const r of rows) {
      if (r.load_kg == null || !r.reps) continue;
      const orm = estimateOneRm(r.load_kg, r.reps);
      const day = byDate.get(r.date) ?? { maxLoad: 0, bestOneRm: 0 };
      day.maxLoad = Math.max(day.maxLoad, r.load_kg);
      day.bestOneRm = Math.max(day.bestOneRm, orm);
      byDate.set(r.date, day);
      if (!best || r.load_kg > best.load || (r.load_kg === best.load && r.reps > best.reps)) best = { load: r.load_kg, reps: r.reps, date: r.date };
      if (orm > bestOneRm) {
        bestOneRm = orm;
        bestOneRmReps = r.reps;
      }
    }
    return {
      points: [...byDate].map(([date, v]) => ({ date, ...v })),
      best,
      bestOneRm,
      bestOneRmReps,
      totalSets: rows.length,
    };
  });
}

/** Exercícios do catálogo para o seletor do editor. */
export async function exerciseOptions(userId: string) {
  return withUser(userId, async (sql) => {
    const { rows } = await sql.query<{ id: string; name: string; slug: string; primary_muscle: MuscleCode }>(
      `select id, name, slug, primary_muscle from exercises where is_active order by name`,
    );
    return rows;
  });
}
