"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { getViewer } from "@/lib/data/viewer";
import { withUser, type Sql } from "@/lib/db";
import { safeDispatchPush } from "@/lib/push";
import { SITE_URL } from "@/lib/env";
import { addDays } from "@/lib/domain/periods";
import { fail, friendlyDbError, success, type ActionState } from "@/lib/action-state";

/**
 * Ações do desafio feitas por quem participa dele (qualquer pessoa cria o próprio desafio).
 * O banco confere tudo de novo (funções, RLS e triggers); aqui só validamos a entrada.
 */

function dbFail(error: unknown): ActionState {
  return fail(friendlyDbError(error as { code?: string; message?: string }));
}

async function run(uid: string, fn: (sql: Sql) => Promise<unknown>): Promise<ActionState | null> {
  try {
    await withUser(uid, fn);
    return null;
  } catch (error) {
    return dbFail(error);
  }
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z
  .object({
    name: z.string().trim().min(3, { error: "O nome precisa ter pelo menos 3 caracteres." }).max(80),
    dailyPointLimit: z.coerce.number().int().min(0).max(10),
    startsOn: z.string().regex(isoDate, { error: "Data de início inválida." }),
    duration: z.enum(["30", "60", "90", "180", "custom", "none"], { error: "Escolha a duração do desafio." }),
    endsOn: z.string().regex(isoDate, { error: "Data de fim inválida." }).optional(),
  })
  .transform(({ duration, endsOn, ...rest }, ctx) => {
    let end: string | null = null;
    if (duration === "custom") {
      if (!endsOn) {
        ctx.addIssue({ code: "custom", message: "Escolha o último dia do desafio." });
        return z.NEVER;
      }
      end = endsOn;
    } else if (duration !== "none") {
      end = addDays(rest.startsOn, Number(duration) - 1);
    }
    if (end !== null && end < rest.startsOn) {
      ctx.addIssue({ code: "custom", message: "A data de fim precisa ser depois do início." });
      return z.NEVER;
    }
    return { ...rest, endsOn: end };
  });

function readChallengeForm(formData: FormData) {
  return createSchema.safeParse({
    name: formData.get("name"),
    dailyPointLimit: formData.get("dailyPointLimit"),
    startsOn: formData.get("startsOn"),
    duration: formData.get("duration") ?? "none",
    endsOn: formData.get("endsOn") || undefined,
  });
}

export async function createChallenge(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const parsed = readChallengeForm(formData);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const err = await run(user.id, (sql) =>
    sql.query(`select create_challenge($1, $2, $3, $4)`, [
      parsed.data.name,
      parsed.data.dailyPointLimit,
      parsed.data.startsOn,
      parsed.data.endsOn,
    ]),
  );
  if (err) return err;
  revalidatePath("/desafio");
  revalidatePath("/dashboard");
  redirect("/desafio?criado=1");
}

export async function updateChallengeInfo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você ainda não tem desafio.");
  const parsed = readChallengeForm(formData);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const err = await run(viewer.userId, (sql) =>
    sql.query(
      `update challenges set name = $1, daily_point_limit = $2, starts_on = $3, ends_on = $4 where id = $5`,
      [parsed.data.name, parsed.data.dailyPointLimit, parsed.data.startsOn, parsed.data.endsOn, viewer.challenge!.id],
    ),
  );
  if (err) return err;
  revalidatePath("/desafio");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");
  return success("Desafio atualizado.");
}

const inviteSchema = z.object({ email: z.email({ error: "Informe um e-mail válido." }).trim() });

/** Cria o convite e devolve o link para enviar a quem vai entrar no desafio. */
export async function createInvitation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você ainda não tem desafio.");
  const parsed = inviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    const token = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ create_invitation: string }>(`select create_invitation($1, $2) as create_invitation`, [
        viewer.challenge!.id,
        parsed.data.email,
      ]);
      return rows[0].create_invitation;
    });
    revalidatePath("/desafio");
    return { ok: true, message: `${SITE_URL}/convite/${token}` };
  } catch (error) {
    return dbFail(error);
  }
}

/** Cancela um convite pendente (libera a vaga). */
export async function cancelInvitation(invitationId: string): Promise<ActionState> {
  const viewer = await getViewer();
  const id = z.uuid().safeParse(invitationId);
  if (!id.success) return fail("Convite inválido.");
  const err = await run(viewer.userId, (sql) => sql.query(`select cancel_invitation($1)`, [id.data]));
  if (err) return err;
  revalidatePath("/desafio");
  return success("Convite cancelado.");
}

const tokenSchema = z.string().regex(/^[0-9a-f]{48}$/, { error: "Link de convite inválido." });

/** Aceita um convite. O banco confere se o e-mail da conta é o convidado. */
export async function acceptInvitation(token: string): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/convite/${token}`)}`);
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return fail("Link de convite inválido.");

  try {
    await withUser(user.id, (sql) => sql.query(`select accept_invitation($1)`, [parsed.data]));
  } catch (error) {
    return dbFail(error);
  }
  after(() => safeDispatchPush());
  revalidatePath("/dashboard");
  revalidatePath("/desafio");
  redirect("/dashboard?convite=1");
}

/** Sai do desafio atual (remove só a própria participação). */
export async function leaveChallenge(): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você não está em um desafio.");
  const err = await run(viewer.userId, (sql) =>
    sql.query(`delete from challenge_participants where challenge_id = $1 and user_id = $2`, [
      viewer.challenge!.id,
      viewer.userId,
    ]),
  );
  if (err) return err;
  revalidatePath("/desafio");
  revalidatePath("/dashboard");
  redirect("/desafio");
}

const awardSchema = z.object({
  period: z.enum(["weekly", "monthly"]),
  title: z.string().trim().min(2, { error: "Dê um nome ao prêmio." }).max(80),
  description: z.string().trim().max(300).optional(),
  valueNote: z.string().trim().max(120).optional(),
});

export async function createAward(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você ainda não tem desafio.");
  const parsed = awardSchema.safeParse({
    period: formData.get("period"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    valueNote: formData.get("valueNote") ?? undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const err = await run(viewer.userId, (sql) =>
    sql.query(
      `insert into awards (challenge_id, period, title, description, value_note) values ($1, $2, $3, $4, $5)`,
      [
        viewer.challenge!.id,
        parsed.data.period,
        parsed.data.title,
        parsed.data.description || null,
        parsed.data.valueNote || null,
      ],
    ),
  );
  if (err) return err;
  revalidatePath("/desafio");
  revalidatePath("/premiacoes");
  return success("Prêmio cadastrado.");
}

export async function toggleAward(awardId: string, active: boolean): Promise<ActionState> {
  const viewer = await getViewer();
  const id = z.uuid().safeParse(awardId);
  if (!id.success) return fail("Prêmio inválido.");
  const err = await run(viewer.userId, (sql) =>
    sql.query(`update awards set is_active = $1 where id = $2`, [active, id.data]),
  );
  if (err) return err;
  revalidatePath("/desafio");
  revalidatePath("/premiacoes");
  return success();
}

const closeSchema = z.object({
  period: z.enum(["weekly", "monthly"]),
  anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Fecha um período já encerrado (qualquer participante). Idempotente. */
export async function closePeriodManually(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você ainda não tem desafio.");
  const parsed = closeSchema.safeParse({ period: formData.get("period"), anchor: formData.get("anchor") });
  if (!parsed.success) return fail("Dados do período inválidos.");

  let closed = false;
  try {
    await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ close_period: boolean }>(`select close_period($1, $2, $3)`, [
        viewer.challenge!.id,
        parsed.data.period,
        parsed.data.anchor,
      ]);
      closed = rows[0]?.close_period ?? false;
    });
  } catch (error) {
    return dbFail(error);
  }
  after(() => safeDispatchPush());
  revalidatePath("/ranking");
  revalidatePath("/premiacoes");
  revalidatePath("/conquistas");
  return success(closed ? "Período fechado e vencedor registrado." : "Este período já estava fechado.");
}

const categoryRulesSchema = z
  .array(
    z.object({
      category_id: z.uuid(),
      min_duration_minutes: z.coerce
        .number({ error: "Informe o tempo mínimo em minutos." })
        .int({ error: "O tempo mínimo precisa ser um número inteiro." })
        .min(0, { error: "O tempo mínimo não pode ser negativo." })
        .max(600, { error: "O tempo mínimo vai até 600 minutos." }),
    }),
  )
  .min(1, { error: "Escolha pelo menos uma modalidade." })
  .max(60);

/** Salva quais modalidades valem no desafio e o tempo mínimo de cada uma. */
export async function saveChallengeCategories(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você ainda não tem desafio.");

  const items = formData.getAll("enabled").map((id) => ({
    category_id: String(id),
    min_duration_minutes: formData.get(`min_${String(id)}`),
  }));
  const parsed = categoryRulesSchema.safeParse(items);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const err = await run(viewer.userId, (sql) =>
    sql.query(`select save_challenge_categories($1, $2::jsonb)`, [viewer.challenge!.id, JSON.stringify(parsed.data)]),
  );
  if (err) return err;
  revalidatePath("/desafio");
  revalidatePath("/atividades/nova");
  after(() => safeDispatchPush());
  return success("Modalidades salvas.");
}

const newCategorySchema = z.object({
  name: z.string().trim().min(2, { error: "O nome precisa ter pelo menos 2 caracteres." }).max(40, { error: "Use até 40 caracteres." }),
  points: z.coerce.number().int().min(1, { error: "Os pontos vão de 1 a 10." }).max(10, { error: "Os pontos vão de 1 a 10." }),
  minDuration: z.coerce
    .number({ error: "Informe o tempo mínimo em minutos." })
    .int()
    .min(0, { error: "O tempo mínimo não pode ser negativo." })
    .max(600, { error: "O tempo mínimo vai até 600 minutos." }),
});

/** Cria uma modalidade própria do desafio (já entra valendo). */
export async function addChallengeCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você ainda não tem desafio.");
  const parsed = newCategorySchema.safeParse({
    name: formData.get("name"),
    points: formData.get("points"),
    minDuration: formData.get("minDuration"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const err = await run(viewer.userId, (sql) =>
    sql.query(`select add_challenge_category($1, $2, $3, $4)`, [
      viewer.challenge!.id,
      parsed.data.name,
      parsed.data.points,
      parsed.data.minDuration,
    ]),
  );
  if (err) return err;
  revalidatePath("/desafio");
  revalidatePath("/atividades/nova");
  after(() => safeDispatchPush());
  return success(`Modalidade ${parsed.data.name} criada.`);
}
