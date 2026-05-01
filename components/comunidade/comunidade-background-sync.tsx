"use client";

import { useEffect } from "react";

export function ComunidadeBackgroundSync() {
  useEffect(() => {
    const ctrl = new AbortController();
    void fetch("/api/comunidade/background-sync", {
      method: "POST",
      signal: ctrl.signal,
      keepalive: true,
    }).catch(() => {
      // Melhor esforço: não bloqueia a renderização da página.
    });
    return () => ctrl.abort();
  }, []);

  return null;
}

