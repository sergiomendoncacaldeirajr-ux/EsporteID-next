const EID_STATIC_CACHE = "eid-static-2026-05-13-v2";
const EID_PAGE_CACHE = "eid-pages-2026-05-13-v2";
const EID_CACHE_NAMES = [EID_STATIC_CACHE, EID_PAGE_CACHE];
const EID_OFFLINE_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0b1d2e" />
  <title>EsporteID offline</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b1d2e; color: #f8fafc; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: #0b1d2e; }
    main { width: min(100%, 420px); }
    img { width: 76px; height: 76px; object-fit: contain; }
    h1 { margin: 24px 0 8px; font-size: 22px; line-height: 1.15; }
    p { margin: 0; color: #b8c4d2; font-size: 14px; line-height: 1.55; }
    button { min-height: 44px; margin-top: 20px; border: 0; border-radius: 8px; background: #f97316; color: #fff; padding: 0 16px; font: inherit; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <img src="/pwa-icon-192.png" alt="" />
    <h1>Sem conexão</h1>
    <p>Não encontramos uma versão salva desta tela. Volte quando a internet estabilizar ou tente abrir uma área visitada recentemente.</p>
    <button type="button" onclick="location.reload()">Tentar de novo</button>
  </main>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(EID_STATIC_CACHE);
      await cache.addAll(["/pwa-icon-192.png"]).catch(() => {});
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("eid-") && !EID_CACHE_NAMES.includes(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname === "/favicon.ico" || url.pathname.startsWith("/brand/")) return true;
  return ["style", "script", "font", "image"].includes(request.destination);
}

function isCacheableNavigation(request, url) {
  if (request.method !== "GET") return false;
  if (request.mode !== "navigate") return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  return true;
}

async function bestNavigationFallback(cache, request, url) {
  const exact = await cache.match(request);
  if (exact) return exact;

  const pathOnly = await cache.match(url.pathname);
  if (pathOnly) return pathOnly;

  const section = url.pathname.split("/").filter(Boolean)[0];
  if (section) {
    const keys = await cache.keys();
    for (const key of keys.reverse()) {
      let cachedUrl;
      try {
        cachedUrl = new URL(key.url);
      } catch {
        continue;
      }
      if (cachedUrl.origin === url.origin && cachedUrl.pathname.split("/").filter(Boolean)[0] === section) {
        const cached = await cache.match(key);
        if (cached) return cached;
      }
    }
  }

  const dashboard = await cache.match("/dashboard");
  if (dashboard) return dashboard;

  return new Response(EID_OFFLINE_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
    status: 200,
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (isCacheableStaticRequest(request, url)) {
    event.respondWith(
      caches.open(EID_STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
          return response;
        } catch {
          throw new Error("offline-static");
        }
      })
    );
    return;
  }

  if (isCacheableNavigation(request, url)) {
    event.respondWith(
      caches.open(EID_PAGE_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response && response.ok && response.type === "basic") {
            cache.put(request, response.clone()).catch(() => {});
            cache.put(url.pathname, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          return bestNavigationFallback(cache, request, url);
        }
      })
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "EID_CACHE_ROUTES" || !Array.isArray(data.routes)) return;
  event.waitUntil(
    caches.open(EID_PAGE_CACHE).then(async (cache) => {
      for (const route of data.routes.slice(0, 24)) {
        if (typeof route !== "string" || !route.startsWith("/") || route.startsWith("/api/")) continue;
        try {
          const response = await fetch(route, { credentials: "include", headers: { "X-EsporteID-Native-Cache": "1" } });
          if (response && response.ok && response.type === "basic") {
            cache.put(route, response.clone()).catch(() => {});
            const url = new URL(route, self.location.origin);
            cache.put(url.pathname, response.clone()).catch(() => {});
          }
        } catch {
          /* best-effort */
        }
      }
    })
  );
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
