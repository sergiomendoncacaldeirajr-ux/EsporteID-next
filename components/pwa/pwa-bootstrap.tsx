"use client";

import { useEffect } from "react";
import { ensurePushReady, syncExistingPushSubscription } from "@/lib/pwa/push-client";

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

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    return runWhenPageIsIdle(() => {
      void navigator.serviceWorker.register("/sw.js").then(() => {
        void syncExistingPushSubscription().catch(() => {
          // best-effort silencioso: o usuário pode reativar no toggle se necessário.
        });
        void ensurePushReady(vapidPublicKey).catch(() => {
          // best-effort silencioso.
        });
        void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {
          // best-effort: falhas aqui não devem quebrar o bootstrap.
        });
      });
    });
  }, [vapidPublicKey]);

  useEffect(() => {
    const onFocus = () => {
      void ensurePushReady(vapidPublicKey).catch(() => {});
      void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void ensurePushReady(vapidPublicKey).catch(() => {});
        void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {});
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [vapidPublicKey]);

  return null;
}
