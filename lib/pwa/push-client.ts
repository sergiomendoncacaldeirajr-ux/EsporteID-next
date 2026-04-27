"use client";

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
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return Boolean(sub);
}

export async function syncExistingPushSubscription() {
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
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
