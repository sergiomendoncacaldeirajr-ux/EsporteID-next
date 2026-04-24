"use client";

import { useEffect } from "react";

/**
 * Hotfix de estabilidade:
 * - desativa registro do SW temporariamente
 * - remove SW/caches existentes para evitar mistura de bundle antigo/novo em produção
 */
const ENABLE_PWA_SW = false;

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function bootstrap() {
      if (ENABLE_PWA_SW) {
        await navigator.serviceWorker.register("/sw.js");
        return;
      }

      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));

      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    }

    void bootstrap();
  }, []);

  return null;
}
