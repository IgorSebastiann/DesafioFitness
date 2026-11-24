"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { fail, friendlyDbError, success, type ActionState } from "@/lib/action-state";
import { BLOCK_KINDS } from "@/lib/domain/workouts";

const uuid = z.uuid({ error: "Identificador inválido." });
const dbError = (error: unknown) => friendlyDbError(error as { code?: string; message?: string });

const nameSchema = z.string().trim().min(2, { error: "O nome precisa ter pelo menos 2 caracteres." }).max(60, { error: "Use até 60 caracteres no nome." });

// ---------------------------------------------------------------------------
// Fichas
// ---------------------------------------------------------------------------

export async function createSheet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return fail(name.error.issues[0].message, { name: name.error.issues[0].message });
  let id: string;
  try {
    id = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ id: string }>(
        `insert into workout_sheets (owner_id, name, position)
         values ($1, $2, coalesce((select max(position) + 1 from workout_sheets where owner_id = $1), 0)) returning id`,
        [viewer.userId, name.data],
      );
      return rows[0].id;
    });
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/treinos");
  redirect(`/treinos/${id}/editar`);
}

const num = (min: number, max: number, label: string) =>
  z
    .number({ error: `${label}: informe um número.` })
    .int({ error: `${label}: use um número inteiro.` })
    .min(min, { error: `${label}: mínimo ${min}.` })
    .max(max, { error: `${label}: máximo ${max}.` });

const itemSchema = z.object({
  exercise_id: uuid,
  reps: num(1, 300, "Repetições").nullable(),
  reps_scheme: z.array(num(1, 300, "Repetições")).min(2).max(6).nullable(),
  duration_seconds: num(5, 3600, "Tempo").nullable(),
  load_kg: z.number().min(0).max(1000, { error: "Carga: máximo 1000 kg." }).nullable(),
  rest_seconds: num(0, 900, "Descanso").nullable(),
  notes: z.string().trim().max(300, { error: "Observação: até 300 caracteres." }).nullable(),
});

const blockSchema = z.object({
  kind: z.enum(Object.keys(BLOCK_KINDS) as [keyof typeof BLOCK_KINDS, ...(keyof typeof BLOCK_KINDS)[]]),
  title: z.string().trim().max(120, { error: "Descrição do bloco: até 120 caracteres." }).nullable(),
  sets: num(1, 20, "Séries"),
  rest_seconds: num(0, 900, "Descanso").nullable(),
  notes: z.string().trim().max(300, { error: "Observação: até 300 caracteres." }).nullable(),
  items: z.array(itemSchema).max(12, { error: "Um bloco pode ter até 12 exercícios." }),
});

const sheetSchema = z.object({
  sheetId: uuid,
  name: nameSchema,
  description: z.string().trim().max(500, { error: "Descrição: até 500 caracteres." }).nullable(),
  blocks: z.array(blockSchema).max(30, { error: "Uma ficha pode ter até 30 blocos." }),
});

export type SheetInput = z.input<typeof sheetSchema>;

/** Salva nome, descrição e todos os blocos da ficha (o banco confere o formato de cada bloco). */
export async function saveSheet(input: SheetInput): Promise<ActionState> {
  const viewer = await getViewer();
  const parsed = sheetSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { sheetId, name, description, blocks } = parsed.data;
  try {
    await withUser(viewer.userId, async (sql) => {
      const { rowCount } = await sql.query(`update workout_sheets set name = $2, description = $3 where id = $1`, [
        sheetId,
        name,
        description || null,
      ]);
      if (!rowCount) throw Object.assign(new Error("Você não pode editar esta ficha."), { code: "42501" });
      await sql.query(`select replace_workout_blocks($1, $2::jsonb)`, [sheetId, JSON.stringify(blocks)]);
    });
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/treinos");
  revalidatePath(`/treinos/${sheetId}`);
  return success("Ficha salva.");
}

export async function deleteSheet(sheetId: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!uuid.safeParse(sheetId).success) return fail("Ficha inválida.");
  try {
    await withUser(viewer.userId, (sql) => sql.query(`delete from workout_sheets where id = $1 and owner_id = $2`, [sheetId, viewer.userId]));
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/treinos");
  redirect("/treinos");
}

export async function setSheetShared(sheetId: string, shared: boolean): Promise<ActionState> {
  const viewer = await getViewer();
  if (!uuid.safeParse(sheetId).success) return fail("Ficha inválida.");
  try {
    const { rowCount } = await withUser(viewer.userId, (sql) =>
      sql.query(`update workout_sheets set is_shared = $2 where id = $1 and owner_id = $3`, [sheetId, shared, viewer.userId]),
    );
    if (!rowCount) return fail("Você não pode alterar esta ficha.");
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath(`/treinos/${sheetId}`);
  revalidatePath("/treinos");
  return success(shared ? "Ficha compartilhada com o seu desafio." : "A ficha deixou de ser compartilhada.");
}

export async function copySheet(sheetId: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!uuid.safeParse(sheetId).success) return fail("Ficha inválida.");
  let id: string;
  try {
    id = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ id: string }>(`select copy_workout_sheet($1) as id`, [sheetId]);
      return rows[0].id;
    });
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/treinos");
  redirect(`/treinos/${id}?copiada=1`);
}

/** Copia todas as fichas de um modelo (ex.: ABC → A, B e C). */
export async function copyTemplateGroup(group: string): Promise<ActionState> {
  const viewer = await getViewer();
  try {
    const copied = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ id: string }>(
        `select copy_workout_sheet(id) as id from (
           select id from workout_sheets where is_template and template_group = $1 order by position) t`,
        [group],
      );
      return rows.length;
    });
    if (!copied) return fail("Modelo não encontrado.");
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/treinos");
  redirect(`/treinos?copiado=${encodeURIComponent(group)}`);
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export async function saveSchedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const entries: Array<{ weekday: number; sheetId: string }> = [];
  for (let d = 0; d <= 6; d++) {
    for (const v of formData.getAll(`d${d}`)) {
      if (typeof v === "string" && uuid.safeParse(v).success) entries.push({ weekday: d, sheetId: v });
    }
  }
  try {
    await withUser(viewer.userId, async (sql) => {
      await sql.query(`delete from workout_schedule where user_id = $1`, [viewer.userId]);
      for (const [i, e] of entries.entries()) {
        await sql.query(`insert into workout_schedule (user_id, weekday, sheet_id, position) values ($1, $2, $3, $4)`, [
          viewer.userId,
          e.weekday,
          e.sheetId,
          i,
        ]);
      }
    });
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/treinos");
  revalidatePath("/dashboard");
  return success("Agenda salva.");
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

/** Começa (ou retoma, se já houver um em andamento hoje) o treino da ficha. */
export async function startWorkout(sheetId: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!uuid.safeParse(sheetId).success) return fail("Ficha inválida.");
  let sessionId: string;
  try {
    sessionId = await withUser(viewer.userId, async (sql) => {
      const open = await sql.query<{ id: string }>(
        `select id from workout_sessions
          where user_id = $1 and sheet_id = $2 and status = 'in_progress'
            and local_date = (now() at time zone 'America/Sao_Paulo')::date
          order by started_at desc limit 1`,
        [viewer.userId, sheetId],
      );
      if (open.rows[0]) return open.rows[0].id;
      const { rows } = await sql.query<{ id: string }>(
        `insert into workout_sessions (user_id, sheet_id, sheet_name)
         select $1, id, name from workout_sheets where id = $2 and owner_id = $1 returning id`,
        [viewer.userId, sheetId],
      );
      if (!rows[0]) throw Object.assign(new Error("Só dá para executar fichas da sua conta. Copie a ficha antes."), { code: "P0001" });
      return rows[0].id;
    });
  } catch (error) {
    return fail(dbError(error));
  }
  redirect(`/treinos/${sheetId}/executar?sessao=${sessionId}`);
}

const setSchema = z.object({
  sessionId: uuid,
  itemId: uuid,
  exerciseId: uuid,
  setNumber: z.number().int().min(1).max(50),
  step: z.number().int().min(1).max(6),
  reps: z.number().int().min(0).max(500).nullable(),
  loadKg: z.number().min(0).max(1000).nullable(),
  durationSeconds: z.number().int().min(0).max(3600).nullable(),
  done: z.boolean(),
});

/** Marca (ou desmarca) uma série. Gravada na hora: se o app fechar, o treino continua de onde parou. */
export async function logSet(input: z.input<typeof setSchema>): Promise<ActionState> {
  const viewer = await getViewer();
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const s = parsed.data;
  try {
    await withUser(viewer.userId, async (sql) => {
      if (!s.done) {
        await sql.query(`delete from workout_set_logs where session_id = $1 and item_id = $2 and set_number = $3 and step = $4`, [
          s.sessionId,
          s.itemId,
          s.setNumber,
          s.step,
        ]);
        return;
      }
      await sql.query(
        `insert into workout_set_logs (session_id, user_id, item_id, exercise_id, set_number, step, reps, load_kg, duration_seconds)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (session_id, item_id, set_number, step)
         do update set reps = excluded.reps, load_kg = excluded.load_kg, duration_seconds = excluded.duration_seconds, done_at = now()`,
        [s.sessionId, viewer.userId, s.itemId, s.exerciseId, s.setNumber, s.step, s.reps, s.loadKg, s.durationSeconds],
      );
    });
  } catch (error) {
    return fail(dbError(error));
  }
  return success();
}

export async function finishWorkout(sessionId: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!uuid.safeParse(sessionId).success) return fail("Treino inválido.");
  try {
    const { rowCount } = await withUser(viewer.userId, (sql) =>
      sql.query(`update workout_sessions set status = 'finished', finished_at = now() where id = $1 and status = 'in_progress'`, [sessionId]),
    );
    if (!rowCount) return fail("Este treino já foi encerrado.");
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  redirect(`/treinos/concluido?sessao=${sessionId}`);
}

export async function abandonWorkout(sessionId: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!uuid.safeParse(sessionId).success) return fail("Treino inválido.");
  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update workout_sessions set status = 'abandoned', finished_at = now() where id = $1 and status = 'in_progress'`, [sessionId]),
    );
  } catch (error) {
    return fail(dbError(error));
  }
  revalidatePath("/dashboard");
  redirect("/treinos");
}
