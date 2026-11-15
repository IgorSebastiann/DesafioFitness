"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { safeDispatchPush } from "@/lib/push";
import { REACTIONS } from "@/lib/reactions";
import { fail, friendlyDbError, success, type ActionState } from "@/lib/action-state";

const reactionSchema = z.object({
  activityId: z.uuid(),
  emoji: z.enum(REACTIONS),
});

/** Liga/desliga uma reação. A permissão (só quem participa do desafio) fica no banco. */
export async function toggleReaction(activityId: string, emoji: string): Promise<ActionState> {
  const viewer = await getViewer();
  const parsed = reactionSchema.safeParse({ activityId, emoji });
  if (!parsed.success) return fail("Reação inválida.");

  try {
    await withUser(viewer.userId, async (sql) => {
      const removed = await sql.query(
        `delete from activity_reactions where activity_id = $1 and user_id = $2 and emoji = $3 returning 1`,
        [parsed.data.activityId, viewer.userId, parsed.data.emoji],
      );
      if (removed.rows.length === 0) {
        await sql.query(
          `insert into activity_reactions (activity_id, user_id, emoji) values ($1, $2, $3) on conflict do nothing`,
          [parsed.data.activityId, viewer.userId, parsed.data.emoji],
        );
      }
    });
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath(`/atividades/${parsed.data.activityId}`);
  after(() => safeDispatchPush());
  return success();
}

const commentSchema = z.object({
  activityId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, { error: "Escreva alguma coisa." })
    .max(300, { error: "O comentário pode ter até 300 caracteres." }),
});

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const parsed = commentSchema.safeParse({ activityId: formData.get("activityId"), body: formData.get("body") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`insert into activity_comments (activity_id, user_id, body) values ($1, $2, $3)`, [
        parsed.data.activityId,
        viewer.userId,
        parsed.data.body,
      ]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath(`/atividades/${parsed.data.activityId}`);
  after(() => safeDispatchPush());
  return success();
}

export async function deleteComment(commentId: string, activityId: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!z.uuid().safeParse(commentId).success) return fail("Comentário inválido.");
  try {
    await withUser(viewer.userId, (sql) => sql.query(`delete from activity_comments where id = $1`, [commentId]));
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath(`/atividades/${activityId}`);
  return success();
}

/** Liga/desliga o lembrete diário das 19h. */
export async function setDailyReminder(enabled: boolean): Promise<ActionState> {
  const viewer = await getViewer();
  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update profiles set daily_reminder = $1 where id = $2`, [enabled === true, viewer.userId]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath("/notificacoes");
  return success(enabled ? "Lembrete diário ligado." : "Lembrete diário desligado.");
}
