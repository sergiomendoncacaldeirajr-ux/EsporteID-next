/**
 * Cliente: mesmo fluxo do `RealtimePageRefresh.refresh` (revalida RSC da rota atual + evento global).
 * Use após mutations que precisam refletir na página aberta e nos widgets que escutam `eid:realtime-refresh`.
 */
export async function eidPostRevalidateCurrentAndBroadcast(path?: string): Promise<void> {
  if (typeof window === "undefined") return;
  const p = String(path?.trim() || window.location.pathname || "/");
  try {
    await fetch("/api/realtime/revalidate-current", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: p }),
    });
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("eid:realtime-refresh"));
}
