"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { z } from "zod";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { fail, friendlyDbError, success, type ActionState } from "@/lib/action-state";

const profileSchema = z.object({
  displayName: z.string().trim().min(2, { error: "O nome precisa ter pelo menos 2 caracteres." }).max(40),
  nickname: z.string().trim().max(20, { error: "O apelido pode ter até 20 caracteres." }).optional(),
});

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname") ?? undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update profiles set display_name = $1, nickname = $2 where id = $3`, [
        parsed.data.displayName,
        parsed.data.nickname ? parsed.data.nickname : null,
        viewer.userId,
      ]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return success("Perfil atualizado.");
}

/** Recebe o caminho de uma foto já enviada para avatars/{user_id}/... no Blob. */
export async function updateAvatar(path: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!path.startsWith(`avatars/${viewer.userId}/`)) return fail("Arquivo inválido.");

  const previous = viewer.profile.avatar_path;
  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update profiles set avatar_path = $1 where id = $2`, [path, viewer.userId]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }

  if (previous && previous !== path) await del(previous).catch(() => undefined);
  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return success("Foto atualizada.");
}
