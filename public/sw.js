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
  const tipo = String(payload.tipo || "").toLowerCase();
  const destUrl = payload.url || "/comunidade";

  // Type-aware action buttons
  let actions;
  if (tipo === "match") {
    actions = [
      { action: "open_url", title: "Ver Desafio" },
      { action: "open_agenda", title: "Minha Agenda" },
    ];
  } else if (tipo === "desafio") {
    actions = [
      { action: "open_url", title: "Ver Placar" },
      { action: "open_social", title: "Social" },
    ];
  } else if (tipo === "agenda_status") {
    actions = [
      { action: "open_url", title: "Ver Agenda" },
      { action: "open_social", title: "Social" },
    ];
  } else if (tipo.includes("convite") || tipo.includes("candidatura") || tipo.includes("time")) {
    actions = [
      { action: "open_url", title: "Ver Equipe" },
      { action: "open_agenda", title: "Agenda" },
    ];
  } else {
    actions = [
      { action: "open_url", title: "Abrir" },
      { action: "open_agenda", title: "Agenda" },
    ];
  }

  const options = {
    body: payload.body || "Você tem uma atualização no app.",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: payload.tag || "eid-notificacao",
    renotify: true,
    requireInteraction: payload.requireInteraction === true,
    vibrate: [100, 40, 100, 40, 80],
    actions,
    data: {
      url: destUrl,
      tipo,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  const notifData = (event.notification && event.notification.data) || {};
  const notifUrl = notifData.url || "/comunidade";
  // "open_url" uses the notification-specific URL; shortcuts go to fixed paths
  const url =
    action === "open_agenda" ? "/agenda" :
    action === "open_social" ? "/comunidade" :
    notifUrl;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      // Prefer a client already on our origin
      const origin = self.location.origin;
      const sameOrigin = clients.filter((c) => c.url.startsWith(origin));
      for (const client of sameOrigin) {
        try {
          if ("navigate" in client && typeof client.navigate === "function") {
            await client.navigate(url);
          }
          if ("focus" in client) return client.focus();
        } catch {
          /* tenta próximo client */
        }
      }
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
