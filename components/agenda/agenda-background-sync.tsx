"use client";

import { useEffect } from "react";

function runAgendaSyncWhenIdle(task: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const requestIdle = window.requestIdleCallback;
  if (requestIdle) {
    const id = requestIdle(task, { timeout: 5000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 2500);
  return () => window.clearTimeout(id);
}

export function AgendaBackgroundSync() {
  useEffect(() => {
    const ctrl = new AbortController();
    const cancelIdle = runAgendaSyncWhenIdle(() => {
      void fetch("/api/agenda/background-sync", {
        method: "POST",
        signal: ctrl.signal,
        keepalive: true,
      }).catch(() => {
        // best effort: não bloqueia abertura da tela
      });
    });
    return () => {
      cancelIdle();
      ctrl.abort();
    };
  }, []);

  return null;
}

