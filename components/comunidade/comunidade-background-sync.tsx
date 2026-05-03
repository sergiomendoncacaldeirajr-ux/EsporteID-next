"use client";

import { useEffect } from "react";

function runComunidadeSyncWhenIdle(task: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const requestIdle = window.requestIdleCallback;
  if (requestIdle) {
    const id = requestIdle(task, { timeout: 5000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 2500);
  return () => window.clearTimeout(id);
}

export function ComunidadeBackgroundSync() {
  useEffect(() => {
    const ctrl = new AbortController();
    const cancelIdle = runComunidadeSyncWhenIdle(() => {
      void fetch("/api/comunidade/background-sync", {
        method: "POST",
        signal: ctrl.signal,
        keepalive: true,
      }).catch(() => {
        // Melhor esforço: não bloqueia a renderização da página.
      });
    });
    return () => {
      cancelIdle();
      ctrl.abort();
    };
  }, []);

  return null;
}

