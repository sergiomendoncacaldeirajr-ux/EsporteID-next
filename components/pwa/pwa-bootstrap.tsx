"use client";

import { useEffect } from "react";
import { ensurePushReady, syncExistingPushSubscription } from "@/lib/pwa/push-client";

export function PwaBootstrap() {
  const vapidPublicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
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

  useEffect(() => {
    if (!vapidPublicKey) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void ensurePushReady(vapidPublicKey).catch(() => {});
      void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {});
    }, 20000);
    return () => window.clearInterval(timer);
  }, [vapidPublicKey]);

  return null;
}
