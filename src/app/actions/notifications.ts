"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { fail, success, type ActionState } from "@/lib/action-state";

export async function markAllNotificationsRead(): Promise<ActionState> {
  const viewer = await getViewer();
  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update notifications set read_at = now() where user_id = $1 and read_at is null`, [viewer.userId]),
    );
  } catch {
    return fail("Não foi possível atualizar as notificações.");
  }
  revalidatePath("/notificacoes");
  return success();
}
