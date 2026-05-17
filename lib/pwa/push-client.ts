"use client";

import { Capacitor } from "@capacitor/core";

const EID_PUSH_OPT_OUT_KEY = "eid_push_opt_out";
const EID_ANDROID_FCM_TOKEN_KEY = "eid_android_fcm_token";
const EID_ANDROID_FCM_OPT_OUT_KEY = "eid_android_fcm_opt_out";
export const EID_NATIVE_APP_VERSION = "7.0.18";
let enablePushInFlight: Promise<PushSubscription> | null = null;

declare global {
  interface Window {
    eidNativeExplainPermission?: (payload: { kind: "camera" | "photos" | "notifications" | "calendar" | "files" | "location" }) => Promise<boolean>;
    eidNativeRegisterPush?: () => Promise<boolean>;
  }
}

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

function normalizeBase64Url(value: string) {
  return value.trim().replace(/=+$/g, "");
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function subscriptionMatchesVapidKey(sub: PushSubscription, vapidPublicKey: string) {
  const currentKey = sub.options?.applicationServerKey;
  if (!currentKey) return true;
  return arrayBufferToBase64Url(currentKey) === normalizeBase64Url(vapidPublicKey);
}

function getPushClientContext() {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return {
    displayMode: standalone ? "standalone" : "browser",
    notificationPermission: "Notification" in window ? Notification.permission : "unsupported",
    platform: navigator.platform || "",
    userAgentDataPlatform:
      "userAgentData" in navigator
        ? String((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? "")
        : "",
  };
}

export function isStandaloneAndroidApp() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && (getPushClientContext().displayMode === "standalone" || isNativeAndroidApp());
}

export function isNativeAndroidApp() {
  if (typeof navigator === "undefined") return false;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") return true;
  return /EsporteIDAndroidApp\//i.test(navigator.userAgent || "");
}

export function isNativeIosApp() {
  if (typeof navigator === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function rememberAndroidFcmToken(token: string): void {
  if (typeof window === "undefined") return;
  const cleanToken = token.trim();
  if (!cleanToken) return;
  try {
    window.localStorage.setItem(EID_ANDROID_FCM_TOKEN_KEY, cleanToken);
  } catch {
    /* ignore */
  }
}

export function getRememberedAndroidFcmToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(EID_ANDROID_FCM_TOKEN_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function syncAndroidNativePushToken(): Promise<boolean> {
  const token = getRememberedAndroidFcmToken();
  if (!token) return false;
  const resp = await fetch("/api/push/fcm/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      device: navigator.userAgent,
      appVersion: EID_NATIVE_APP_VERSION,
      active: !getAndroidNativePushOptOut(),
    }),
  });
  return resp.ok;
}

export function getAndroidNativePushOptOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EID_ANDROID_FCM_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function setAndroidNativePushOptOut(optOut: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (optOut) window.localStorage.setItem(EID_ANDROID_FCM_OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(EID_ANDROID_FCM_OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}

export async function hasAndroidNativePushEnabled(): Promise<boolean> {
  if (getAndroidNativePushOptOut()) return false;
  if (getRememberedAndroidFcmToken()) return true;

  const resp = await fetch("/api/push/fcm/preference", { cache: "no-store" });
  if (!resp.ok) return false;
  const data = (await resp.json().catch(() => ({}))) as { enabled?: boolean };
  return data.enabled === true;
}

export async function setAndroidNativePushEnabled(enabled: boolean): Promise<void> {
  setAndroidNativePushOptOut(!enabled);
  if (enabled && !getRememberedAndroidFcmToken()) {
    await window.eidNativeRegisterPush?.().catch(() => false);
  }
  const token = getRememberedAndroidFcmToken();
  const resp = token
    ? await fetch("/api/push/fcm/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          device: navigator.userAgent,
          appVersion: EID_NATIVE_APP_VERSION,
          active: enabled,
        }),
      })
    : await fetch("/api/push/fcm/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: enabled }),
      });
  const data = (await resp.json().catch(() => ({}))) as { message?: string };
  if (!resp.ok) {
    setAndroidNativePushOptOut(enabled);
    throw new Error(data.message || "Não foi possível alterar as notificações.");
  }
}

function subscribeWithVapidKey(reg: ServiceWorkerRegistration, vapidPublicKey: string) {
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

async function savePushSubscription(sub: PushSubscription) {
  const resp = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), clientContext: getPushClientContext() }),
  });
  const data = (await resp.json().catch(() => ({}))) as { recreate?: boolean; message?: string };
  if (resp.status === 409 && data.recreate) return { recreate: true };
  if (!resp.ok) throw new Error(data.message || "Falha ao salvar assinatura push.");
  return { recreate: false };
}

async function saveOrRecreatePushSubscription(sub: PushSubscription, vapidPublicKey: string) {
  const saved = await savePushSubscription(sub);
  if (!saved.recreate) return sub;

  const reg = await navigator.serviceWorker.ready;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }

  const freshSub = await subscribeWithVapidKey(reg, vapidPublicKey);
  const freshSaved = await savePushSubscription(freshSub);
  if (freshSaved.recreate) {
    throw new Error("Assinatura push expirada. Remova e instale o app novamente para liberar uma nova inscrição.");
  }
  return freshSub;
}

async function getOrCreatePushSubscription(vapidPublicKey: string, createIfMissing: boolean) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !subscriptionMatchesVapidKey(sub, vapidPublicKey)) {
    try {
      await sub.unsubscribe();
    } catch {
      /* ignore */
    }
    sub = null;
  }
  if (!sub && createIfMissing) {
    sub = await subscribeWithVapidKey(reg, vapidPublicKey);
  }
  return sub;
}

export async function enablePushNotifications(vapidPublicKey: string) {
  if (enablePushInFlight) return enablePushInFlight;
  enablePushInFlight = enablePushNotificationsOnce(vapidPublicKey).finally(() => {
    enablePushInFlight = null;
  });
  return enablePushInFlight;
}

async function enablePushNotificationsOnce(vapidPublicKey: string) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Seu navegador não suporta notificações push.");
  }
  if (!vapidPublicKey) {
    throw new Error("Não foi possível ativar as notificações agora.");
  }
  setPushClientOptOut(false);

  if (Notification.permission === "default") {
    const allowed = await window.eidNativeExplainPermission?.({ kind: "notifications" });
    if (allowed === false) throw new Error("Permissão de notificação não concedida.");
  }

  const permission =
    Notification.permission === "default" && !isStandaloneAndroidApp()
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== "granted") {
    if (!(permission === "default" && isStandaloneAndroidApp())) {
      throw new Error("Permissão de notificação não concedida.");
    }
  }

  const sub = await getOrCreatePushSubscription(vapidPublicKey, true);
  if (!sub) throw new Error("Não foi possível criar assinatura push.");
  const activeSub = await saveOrRecreatePushSubscription(sub, vapidPublicKey);

  return activeSub;
}

export async function disablePushNotifications() {
  /** Impede que `ensurePushReady` / `syncExistingPushSubscription` voltem a registrar no servidor antes do unsubscribe terminar. */
  setPushClientOptOut(true);
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    /* ignore */
  }
}

export async function hasActivePushSubscription() {
  if (!("serviceWorker" in navigator)) return false;
  if (getPushClientOptOut()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return Boolean(sub);
}

export async function syncExistingPushSubscription(vapidPublicKey = "") {
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (isStandaloneAndroidApp()) return false;
  if (getPushClientOptOut()) return false;
  if (!vapidPublicKey) return false;
  if (Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  await saveOrRecreatePushSubscription(sub, vapidPublicKey);
  return true;
}

export async function ensurePushReady(vapidPublicKey: string) {
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (isStandaloneAndroidApp()) return false;
  if (!vapidPublicKey) return false;
  if (getPushClientOptOut()) return false;
  if (Notification.permission !== "granted") return false;
  const sub = await getOrCreatePushSubscription(vapidPublicKey, true);
  if (!sub) return false;
  await saveOrRecreatePushSubscription(sub, vapidPublicKey);
  return true;
}
