"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { safeDispatchPush } from "@/lib/push";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { z } from "zod";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { fail, friendlyDbError, type ActionState } from "@/lib/action-state";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const createSchema = z.object({
  categoryId: z.uuid({ error: "Escolha uma modalidade." }),
  activityDate: z.string().regex(DATE_RE, { error: "Data inválida." }),
  activityTime: z.string().regex(TIME_RE, { error: "Horário inválido." }),
  durationMinutes: z.coerce
    .number({ error: "Informe a duração em minutos." })
    .int({ error: "A duração deve ser um número inteiro." })
    .min(1, { error: "A duração deve ser de pelo menos 1 minuto." })
    .max(1440, { error: "A duração não pode passar de 24 horas." }),
  distanceKm: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v.replace(",", ".")) : null))
    .pipe(
      z
        .number()
        .min(0, { error: "A distância não pode ser negativa." })
        .max(999, { error: "Distância inválida." })
        .nullable(),
    ),
  description: z
    .string()
    .trim()
    .max(500, { error: "A descrição pode ter até 500 caracteres." })
    .optional(),
  proofPath: z.string().min(3).max(300),
  proofKind: z.enum(["image", "video"]),
});

/** Comprovações ficam em proofs/{user_id}/... no Blob privado. */
function ownProofPath(userId: string, value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.startsWith(`proofs/${userId}/`) ? value : null;
}

/** Remove a comprovação quando a atividade não é salva (evita arquivos órfãos). */
async function discardProof(path: string | null) {
  if (path) await del(path).catch(() => undefined);
}

/**
 * Registra uma atividade. O arquivo já foi enviado pelo navegador para o Blob
 * (proofs/{user_id}/...). Pontos e status NÃO vêm do cliente: o trigger calcula tudo.
 */
export async function createActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.challenge) return fail("Você ainda não faz parte de um desafio.");

  const orphan = ownProofPath(viewer.userId, formData.get("proofPath"));
  const parsed = createSchema.safeParse({
    categoryId: formData.get("categoryId"),
    activityDate: formData.get("activityDate"),
    activityTime: formData.get("activityTime"),
    durationMinutes: formData.get("durationMinutes"),
    distanceKm: formData.get("distanceKm") ?? undefined,
    description: formData.get("description") ?? undefined,
    proofPath: formData.get("proofPath"),
    proofKind: formData.get("proofKind"),
  });

  if (!parsed.success) {
    await discardProof(orphan);
    const issue = parsed.error.issues[0];
    return fail(issue.message, { [String(issue.path[0])]: issue.message });
  }
  const input = parsed.data;

  if (!ownProofPath(viewer.userId, input.proofPath)) {
    await discardProof(orphan);
    return fail("Comprovação inválida. Envie o arquivo novamente.");
  }

  let activityId: string;
  try {
    const rows = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ id: string }>(
        `insert into activities
           (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes,
            distance_km, description, proof_path, proof_kind)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id`,
        [
          viewer.challenge!.id,
          viewer.userId,
          input.categoryId,
          input.activityDate,
          input.activityTime,
          input.durationMinutes,
          input.distanceKm,
          input.description ? input.description : null,
          input.proofPath,
          input.proofKind,
        ],
      );
      return rows;
    });
    activityId = rows[0].id;
  } catch (error) {
    await discardProof(input.proofPath);
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/atividades");
  revalidatePath("/calendario");
  after(() => safeDispatchPush());
  redirect(`/atividades/${activityId}?criada=1`);
}

const decisionSchema = z.object({
  activityId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(300).optional(),
});

/** Aprova ou contesta (rejeita) uma atividade. Permissões são checadas no trigger e no RLS. */
export async function decideActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const parsed = decisionSchema.safeParse({
    activityId: formData.get("activityId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return fail("Decisão inválida.");

  try {
    const updated = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ id: string }>(
        `update activities set status = $1, review_note = $2 where id = $3 returning id`,
        [parsed.data.decision, parsed.data.note ? parsed.data.note : null, parsed.data.activityId],
      );
      return rows.length;
    });
    if (updated === 0) return fail("Atividade não encontrada ou sem permissão para avaliá-la.");
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/atividades");
  revalidatePath(`/atividades/${parsed.data.activityId}`);
  revalidatePath("/ranking");
  revalidatePath("/notificacoes");
  after(() => safeDispatchPush());
  return {
    ok: true,
    message: parsed.data.decision === "approved" ? "Atividade aprovada." : "Atividade contestada.",
  };
}

/** Dono exclui atividade ainda pendente (e a comprovação). */
export async function deleteOwnPendingActivity(activityId: string): Promise<ActionState> {
  const viewer = await getViewer();

  let proofPath: string | null;
  try {
    proofPath = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ proof_path: string }>(
        `delete from activities where id = $1 and user_id = $2 and status = 'pending' returning proof_path`,
        [activityId, viewer.userId],
      );
      return rows[0]?.proof_path ?? null;
    });
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  if (!proofPath) return fail("Só é possível excluir atividades pendentes suas.");
  await discardProof(proofPath);

  revalidatePath("/dashboard");
  revalidatePath("/atividades");
  revalidatePath("/calendario");
  redirect("/atividades");
}

/** Dono ajusta duração/descrição enquanto a atividade estiver pendente. */
export async function updateOwnPendingActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  const activityId = String(formData.get("activityId") ?? "");
  const duration = z.coerce.number().int().min(1).max(1440).safeParse(formData.get("durationMinutes"));
  if (!duration.success) return fail("Duração inválida.");
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);

  try {
    const updated = await withUser(viewer.userId, async (sql) => {
      const { rows } = await sql.query<{ id: string }>(
        `update activities set duration_minutes = $1, description = $2
          where id = $3 and user_id = $4 returning id`,
        [duration.data, description || null, activityId, viewer.userId],
      );
      return rows.length;
    });
    if (updated === 0) return fail("Atividade não encontrada.");
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }

  revalidatePath(`/atividades/${activityId}`);
  return { ok: true, message: "Atividade atualizada." };
}
