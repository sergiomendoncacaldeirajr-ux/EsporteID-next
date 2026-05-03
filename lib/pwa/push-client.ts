"use client";

const EID_PUSH_OPT_OUT_KEY = "eid_push_opt_out";

export function getPushClientOptOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EID_PUSH_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function setPushClientOptOut(optOut: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (optOut) window.localStorage.setItem(EID_PUSH_OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(EID_PUSH_OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function enablePushNotifications(vapidPublicKey: string) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Seu navegador não suporta notificações push.");
  }
  if (!vapidPublicKey) {
    throw new Error("Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
  }
  setPushClientOptOut(false);

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificação não concedida.");
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const resp = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!resp.ok) throw new Error("Falha ao salvar assinatura push.");

  return sub;
}

export async function disablePushNotifications() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}

export async function hasActivePushSubscription() {
  if (!("serviceWorker" in navigator)) return false;
  if (getPushClientOptOut()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return Boolean(sub);
}

export async function syncExistingPushSubscription() {
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (getPushClientOptOut()) return false;
  if (Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  const resp = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return resp.ok;
}

export async function ensurePushReady(vapidPublicKey: string) {
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (!vapidPublicKey) return false;
  if (getPushClientOptOut()) return false;
  if (Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  /** Não recriar assinatura aqui: o usuário desativa pelo sininho e `ensurePushReady` não pode re-inscrever sozinho. */
  if (!sub) return false;
  const resp = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return resp.ok;
}
