"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      void navigator.serviceWorker.register("/sw.js").then((reg) => {
        void reg.update().catch(() => {
          // best-effort: o navegador também atualiza sozinho.
        });
        void syncExistingPushSubscription(vapidPublicKey).catch(() => {
          // best-effort silencioso: o usuário pode reativar no toggle se necessário.
        });
        runPushSync();
      });
    });
  }, [runPushSync, vapidPublicKey]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    let lastResumeAt = 0;
    const recoverFromResume = (force = false) => {
      const now = Date.now();
      if (!force && now - lastResumeAt < 2500) return;
      lastResumeAt = now;
      runPushSync();
      window.dispatchEvent(new CustomEvent("eid:pwa-resume"));
      window.dispatchEvent(new CustomEvent("eid:realtime-refresh"));
      window.setTimeout(() => router.refresh(), 120);
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
