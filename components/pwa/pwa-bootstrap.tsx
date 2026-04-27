"use client";

import { useEffect } from "react";
import { syncExistingPushSubscription } from "@/lib/pwa/push-client";

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").then(() => {
      void syncExistingPushSubscription().catch(() => {
        // best-effort silencioso: o usuário pode reativar no toggle se necessário.
      });
      void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {
        // best-effort: falhas aqui não devem quebrar o bootstrap.
      });
    });
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetch("/api/push/flush-user", { method: "POST" }).catch(() => {});
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
