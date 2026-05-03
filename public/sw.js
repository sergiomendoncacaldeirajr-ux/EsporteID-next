self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "EsporteID", body: event.data ? event.data.text() : "Você tem uma nova notificação." };
  }

  const title = payload.title || "EsporteID";
  const options = {
    body: payload.body || "Você tem uma atualização no app.",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    image: payload.image || undefined,
    tag: payload.tag || "eid-notificacao",
    renotify: true,
    vibrate: [120, 40, 120],
    actions: [
      { action: "open_social", title: "Abrir Social" },
      { action: "open_agenda", title: "Abrir Agenda" },
    ],
    data: {
      url: payload.url || "/comunidade",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  const fallback = (event.notification && event.notification.data && event.notification.data.url) || "/comunidade";
  const url = action === "open_agenda" ? "/agenda" : action === "open_social" ? "/comunidade" : fallback;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        try {
          if ("navigate" in client && typeof client.navigate === "function") {
            await client.navigate(url);
          }
          if ("focus" in client) return client.focus();
        } catch {
          /* tenta próximo client */
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return null;
    })
  );
});
