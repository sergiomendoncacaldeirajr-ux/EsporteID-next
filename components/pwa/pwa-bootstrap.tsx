"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import {
  ensurePushReady,
  rememberAndroidFcmToken,
  isNativeAndroidApp,
  syncAndroidNativePushToken,
  syncExistingPushSubscription,
} from "@/lib/pwa/push-client";

const PUSH_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const PUSH_SYNC_STORAGE_KEY = "eid:last-push-sync-at";
const EID_SW_VERSION = "2026-05-12-native-fast-cache-v2";

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function runWhenPageIsIdle(task: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  let cancelIdle: (() => void) | null = null;
  const schedule = () => {
    const requestIdle = window.requestIdleCallback;
    if (requestIdle) {
      const id = requestIdle(task, { timeout: isNativeAndroidApp() ? 6000 : 2500 });
      cancelIdle = () => window.cancelIdleCallback?.(id);
      return;
    }
    const id = window.setTimeout(task, isNativeAndroidApp() ? 3200 : 1200);
    cancelIdle = () => window.clearTimeout(id);
  };
  const delay = isNativeAndroidApp() ? window.setTimeout(schedule, 1800) : 0;
  if (!delay) schedule();
  return () => {
    if (delay) window.clearTimeout(delay);
    cancelIdle?.();
  };
}

async function registerAndroidFcmTokenFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const token = url.searchParams.get("eid_fcm_token");
  if (!token) return;

  url.searchParams.delete("eid_fcm_token");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  rememberAndroidFcmToken(token);
  await syncAndroidNativePushToken();
}

export function PwaBootstrap() {
  const router = useRouter();
  const vapidPublicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();

  const shouldRunPushSync = useCallback((force = false) => {
    if (typeof window === "undefined") return true;
    if (force) {
      window.localStorage.setItem(PUSH_SYNC_STORAGE_KEY, String(Date.now()));
      return true;
    }
    const now = Date.now();
    const raw = window.localStorage.getItem(PUSH_SYNC_STORAGE_KEY) ?? "";
    const last = Number(raw);
    if (Number.isFinite(last) && now - last < PUSH_SYNC_COOLDOWN_MS) return false;
    window.localStorage.setItem(PUSH_SYNC_STORAGE_KEY, String(now));
    return true;
  }, []);

  const runPushSync = useCallback((force = false) => {
    if (!shouldRunPushSync(force)) return;
    void ensurePushReady(vapidPublicKey).catch(() => {
      // best-effort silencioso.
    });
    void syncAndroidNativePushToken().catch(() => {
      // best-effort: se o login ainda nao estiver pronto, tentamos de novo na proxima retomada.
    });
    void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {
      // best-effort: falhas aqui não devem quebrar o bootstrap.
    });
  }, [shouldRunPushSync, vapidPublicKey]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    return runWhenPageIsIdle(() => {
      void registerAndroidFcmTokenFromUrl().catch(() => {
        // O token sera reenviado pelo app em uma proxima abertura.
      });
      void navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(EID_SW_VERSION)}`).then((reg) => {
        if (!isNativeAndroidApp()) {
          void reg.update().catch(() => {
            // best-effort: o navegador também atualiza sozinho.
          });
        }
        void syncExistingPushSubscription(vapidPublicKey).catch(() => {
          // best-effort silencioso: o usuário pode reativar no toggle se necessário.
        });
        runPushSync(isStandaloneDisplayMode());
      });
    });
  }, [runPushSync, vapidPublicKey]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    let lastResumeAt = 0;
    let lastRouteRefreshAt = 0;
    const recoverFromResume = (force = false) => {
      const now = Date.now();
      const nativeAndroidApp = isNativeAndroidApp();
      const minResumeGap = nativeAndroidApp ? 30_000 : 2500;
      if (!force && now - lastResumeAt < minResumeGap) return;
      lastResumeAt = now;
      runPushSync(force || isStandaloneDisplayMode());
      window.dispatchEvent(new CustomEvent("eid:pwa-resume"));
      window.dispatchEvent(new CustomEvent("eid:realtime-refresh"));
      const shouldRefreshRoute =
        force || !nativeAndroidApp || now - lastRouteRefreshAt > 90_000;
      if (shouldRefreshRoute) {
        lastRouteRefreshAt = now;
        window.setTimeout(() => router.refresh(), nativeAndroidApp ? 900 : 120);
      }
    };
    const onFocus = () => {
      recoverFromResume();
    };
    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (document.visibilityState === "visible") {
        recoverFromResume(Boolean(hiddenAt && Date.now() - hiddenAt > 8000));
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      recoverFromResume(event.persisted);
    };
    const onOnline = () => {
      recoverFromResume(true);
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, runPushSync]);

  return null;
}
