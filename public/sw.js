// Service worker: recebe push e abre o app ao tocar no aviso.
self.addEventListener("push", (event) => {
  let payload = { title: "Desafio Fitness", body: "", url: "/dashboard", tag: undefined };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  // Todo push precisa mostrar uma notificação (exigido pelo iOS).
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      // PNG: o Android não exibe SVG em notificação.
      // icon: imagem colorida ao lado do texto. badge: silhueta branca da barra de status do Android.
      icon: "/icon",
      badge: "/icon-badge",
      tag: payload.tag,
      timestamp: Date.now(),
      vibrate: [80, 40, 80],
      data: { url: payload.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
