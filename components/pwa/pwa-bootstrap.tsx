"use client";

import { useCallback, useEffect } from "react";
import { ensurePushReady, syncExistingPushSubscription } from "@/lib/pwa/push-client";

const PUSH_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const PUSH_SYNC_STORAGE_KEY = "eid:last-push-sync-at";

function runWhenPageIsIdle(task: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const requestIdle = window.requestIdleCallback;
  if (requestIdle) {
    const id = requestIdle(task, { timeout: 2500 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 1200);
  return () => window.clearTimeout(id);
}

export function PwaBootstrap() {
  const vapidPublicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();

  const shouldRunPushSync = useCallback(() => {
    if (typeof window === "undefined") return true;
    const now = Date.now();
    const raw = window.localStorage.getItem(PUSH_SYNC_STORAGE_KEY) ?? "";
    const last = Number(raw);
    if (Number.isFinite(last) && now - last < PUSH_SYNC_COOLDOWN_MS) return false;
    window.localStorage.setItem(PUSH_SYNC_STORAGE_KEY, String(now));
    return true;
  }, []);

  const runPushSync = useCallback(() => {
    if (!shouldRunPushSync()) return;
    void ensurePushReady(vapidPublicKey).catch(() => {
      // best-effort silencioso.
    });
    void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {
      // best-effort: falhas aqui não devem quebrar o bootstrap.
    });
  }, [shouldRunPushSync, vapidPublicKey]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    return runWhenPageIsIdle(() => {
      void navigator.serviceWorker.register("/sw.js").then(() => {
        void syncExistingPushSubscription().catch(() => {
          // best-effort silencioso: o usuário pode reativar no toggle se necessário.
        });
        runPushSync();
      });
    });
  }, [runPushSync]);

  useEffect(() => {
    const onFocus = () => {
      runPushSync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        runPushSync();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runPushSync]);

  return null;
}
