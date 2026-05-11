self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function postPushReceipt(payload, status, error) {
  const notifId = Number(payload && payload.notifId ? payload.notifId : 0);
  if (!Number.isFinite(notifId) || notifId < 1) return;
  try {
    const sub = await self.registration.pushManager.getSubscription();
    const endpoint = sub && sub.endpoint;
    if (!endpoint) return;
    await fetch("/api/push/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint,
        notificationId: notifId,
        status,
        error: error ? String(error && error.message ? error.message : error).slice(0, 600) : null,
      }),
    });
  } catch {
    /* Diagnóstico best-effort. */
  }
}

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
  const tag = payload.tag || `eid-notificacao-${Date.now()}`;

  const options = {
    body: payload.body || "Você tem uma atualização no app.",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag,
    renotify: true,
    requireInteraction: Boolean(payload.requireInteraction),
    silent: false,
    timestamp: Date.now(),
    vibrate: [120, 80, 120],
    data: {
      url: destUrl,
      tipo,
      notifId: payload.notifId || null,
    },
  };

  event.waitUntil(
    (async () => {
      await postPushReceipt(payload, "received", null);
      try {
        await self.registration.showNotification(title, options);
        await postPushReceipt(payload, "shown", null);
      } catch (error) {
        console.error("[eid-sw] showNotification failed", error);
        try {
          await self.registration.showNotification(title, {
            body: options.body,
            icon: "/pwa-icon-192.png",
            tag,
            data: options.data,
          });
          await postPushReceipt(payload, "shown", null);
        } catch (fallbackError) {
          console.error("[eid-sw] showNotification fallback failed", fallbackError);
          await postPushReceipt(payload, "failed", fallbackError);
        }
      }
    })()
  );
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
