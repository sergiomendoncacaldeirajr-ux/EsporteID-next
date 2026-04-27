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
    });
  }, []);

  return null;
}
