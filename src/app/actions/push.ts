"use server";

import { after } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/data/viewer";
import { withUser } from "@/lib/db";
import { safeDispatchPush } from "@/lib/push";
import { fail, friendlyDbError, success, type ActionState } from "@/lib/action-state";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(5).max(100) }),
});

/** Grava a assinatura do aparelho para a conta logada (a função do banco valida o endereço). */
export async function subscribePush(input: unknown): Promise<ActionState> {
  const viewer = await getViewer();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("Assinatura de notificação inválida.");

  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`select save_push_subscription($1, $2, $3)`, [
        parsed.data.endpoint,
        parsed.data.keys.p256dh,
        parsed.data.keys.auth,
      ]),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  return success("Notificações ativadas neste aparelho.");
}

/** Remove a assinatura deste aparelho (logout ou desativação). */
export async function unsubscribePush(endpoint: string): Promise<ActionState> {
  const viewer = await getViewer();
  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(`delete from push_subscriptions where endpoint = $1`, [endpoint]),
    );
  } catch {
    return fail("Não foi possível desativar neste aparelho.");
  }
  return success();
}

/** Gera uma notificação de teste para a própria conta e envia agora. */
export async function sendTestPush(): Promise<ActionState> {
  const viewer = await getViewer();
  try {
    await withUser(viewer.userId, (sql) =>
      sql.query(
        `insert into notifications (user_id, kind, title, body, link)
         values ($1, 'teste', 'Notificações funcionando', 'Se você recebeu este aviso, o celular está pronto.', '/notificacoes')`,
        [viewer.userId],
      ),
    );
  } catch (error) {
    return fail(friendlyDbError(error as { code?: string; message?: string }));
  }
  after(() => safeDispatchPush());
  return success("Enviamos uma notificação de teste.");
}
