"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { fail, friendlyDbError, success, type ActionState } from "@/lib/action-state";

/**
 * Administração global (só o papel admin): modalidades, pontuação e correções auditadas.
 * Desafios são de quem participa deles (ver actions/challenge.ts).
 */
const ADMIN_ONLY = fail("Acesso restrito a administradores.");

async function requireAdmin() {
  const viewer = await getViewer();
  return viewer.isAdmin ? viewer : null;
}

const categorySchema = z.object({
  points: z.coerce.number().int().min(0).max(10),
  minDurationMinutes: z.coerce.number().int().min(0).max(1440),
});

export async function updateCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  if (!viewer) return ADMIN_ONLY;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Modalidade inválida.");
  const parsed = categorySchema.safeParse({
    points: formData.get("points"),
    minDurationMinutes: formData.get("minDurationMinutes"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(
        `update activity_categories set points = $1, min_duration_minutes = $2, is_active = $3 where id = $4`,
        [parsed.data.points, parsed.data.minDurationMinutes, formData.get("isActive") === "on", id.data],
      ),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath("/admin");
  revalidatePath("/atividades/nova");
  return success("Modalidade atualizada.");
}

export async function updateProfileAsAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  if (!viewer) return ADMIN_ONLY;
  const userId = z.uuid().safeParse(formData.get("userId"));
  if (!userId.success) return fail("Participante inválido.");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const role = formData.get("role") === "admin" ? "admin" : "member";
  if (displayName.length < 2) return fail("Nome com pelo menos 2 caracteres.");

  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update profiles set display_name = $1, nickname = $2, role = $3 where id = $4`, [
        displayName,
        nickname || null,
        role,
        userId.data,
      ]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath("/admin");
  revalidatePath("/perfil");
  return success("Participante atualizado.");
}

export async function updateActivityAsAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  if (!viewer) return ADMIN_ONLY;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Registro inválido.");
  const duration = z.coerce.number().int().min(1).max(1440).safeParse(formData.get("durationMinutes"));
  if (!duration.success) return fail("Duração inválida.");
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);

  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`update activities set duration_minutes = $1, description = $2 where id = $3`, [
        duration.data,
        description || null,
        id.data,
      ]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  revalidatePath("/admin");
  revalidatePath(`/atividades/${id.data}`);
  return success("Registro corrigido. A alteração foi auditada.");
}
