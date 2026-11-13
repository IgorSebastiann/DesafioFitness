import "server-only";
import webpush from "web-push";
import { queryAsOwner } from "@/lib/db";

/**
 * Envio de notificações push (Web Push). As notificações ficam na tabela `notifications`
 * e são enviadas aqui: cada uma sai uma vez (push_sent_at). Chamado após as ações que
 * geram avisos (e pelo cron). Falhas nunca interrompem a ação do usuário.
 */
let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "https://desafio-fitness-brown.vercel.app",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

type Pending = { id: string; user_id: string; title: string; body: string | null; link: string | null };
type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Envia as notificações pendentes. Devolve quantas foram processadas. */
export async function dispatchPendingPush(limit = 50): Promise<number> {
  if (!configure()) return 0;

  const pending = await queryAsOwner<Pending>(
    `select id, user_id, title, body, link from notifications
      where push_sent_at is null order by created_at limit $1`,
    [limit],
  );

  for (const note of pending) {
    const subs = await queryAsOwner<Sub>(
      `select id, endpoint, p256dh, auth from push_subscriptions where user_id = $1`,
      [note.user_id],
    );
    const payload = JSON.stringify({
      title: note.title,
      body: note.body ?? "",
      url: note.link ?? "/dashboard",
      tag: note.id,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24 },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410: a assinatura expirou (o usuário desinstalou ou revogou). Remove.
        if (status === 404 || status === 410) {
          await queryAsOwner(`delete from push_subscriptions where id = $1`, [sub.id]);
        }
      }
    }

    await queryAsOwner(`update notifications set push_sent_at = now() where id = $1`, [note.id]);
  }
  return pending.length;
}

/** Versão segura para chamar após uma ação: registra o erro e segue. */
export async function safeDispatchPush(): Promise<void> {
  try {
    await dispatchPendingPush();
  } catch (error) {
    console.error("[push] falha ao enviar notificações:", (error as Error).message);
  }
}
