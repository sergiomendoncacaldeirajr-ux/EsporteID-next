"use client";

import { useEffect } from "react";

export function AgendaBackgroundSync() {
  useEffect(() => {
    const ctrl = new AbortController();
    void fetch("/api/agenda/background-sync", {
      method: "POST",
      signal: ctrl.signal,
      keepalive: true,
    }).catch(() => {
      // best effort: não bloqueia abertura da tela
    });
    return () => ctrl.abort();
  }, []);

  return null;
}

