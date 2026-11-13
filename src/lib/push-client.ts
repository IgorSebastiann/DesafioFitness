import { subscribePush, unsubscribePush } from "@/app/actions/push";

/**
 * Notificações no navegador (Web Push). Funciona no Chrome do Android e no Safari do iPhone
 * (iOS 16.4+), desde que o iPhone tenha o app na tela de início. O pedido de permissão
 * precisa vir de um toque do usuário.
 */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Evita duas inscrições ao mesmo tempo (duas chamadas criariam duas assinaturas).
let pending: Promise<boolean> | null = null;

async function subscribeDevice(): Promise<boolean> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // O service worker precisa estar ativo antes de inscrever (senão falha na primeira vez).
  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    }));

  const json = subscription.toJSON();
  const result = await subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  });
  return result?.ok === true;
}

export const push = {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      Boolean(VAPID_PUBLIC_KEY)
    );
  },

  /** iPhone e iPad (o iPadOS se apresenta como Mac, mas tem tela de toque). */
  isIos(): boolean {
    return (
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    );
  },

  /** Aberto pelo ícone da tela de início (app instalado), não numa aba do navegador. */
  isStandalone(): boolean {
    return (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true)
    );
  },

  /** No iPhone, push só funciona com o app na tela de início. */
  needsHomeScreenInstall(): boolean {
    return push.isIos() && !push.isStandalone();
  },

  permission(): NotificationPermission {
    return typeof Notification !== "undefined" ? Notification.permission : "denied";
  },

  /** Pede permissão (se ainda não decidida) e inscreve este aparelho para a conta logada. */
  subscribe(): Promise<boolean> {
    if (!push.isSupported()) return Promise.resolve(false);
    pending ??= subscribeDevice().finally(() => {
      pending = null;
    });
    return pending;
  },

  /** Tira este aparelho da conta e cancela a inscrição (usado ao sair). */
  async unsubscribe(): Promise<void> {
    if (!push.isSupported()) return;
    const run = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
    };
    // Não segura o logout se o navegador demorar.
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await Promise.race([run().catch(() => undefined), timeout]);
  },
};
