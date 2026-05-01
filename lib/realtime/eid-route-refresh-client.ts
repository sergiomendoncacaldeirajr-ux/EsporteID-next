/**
 * Cliente: mesmo fluxo do `RealtimePageRefresh.refresh` (revalida RSC da rota atual + evento global).
 * Use após mutations que precisam refletir na página aberta e nos widgets que escutam `eid:realtime-refresh`.
 * `extraPaths`: invalida caches de outras rotas (ex.: `/times` quando a gestão roda em iframe `/editar/time/...`).
 * Dispara o evento também em `window.parent` quando for iframe same-origin, para o shell pai atualizar badges/listas.
 */
export async function eidPostRevalidateCurrentAndBroadcast(
  path?: string,
  extraPaths?: readonly string[]
): Promise<void> {
  if (typeof window === "undefined") return;
  const p = String(path?.trim() || window.location.pathname || "/");
  const extras = (extraPaths ?? []).filter((x) => typeof x === "string" && x.trim());
  try {
    await fetch("/api/realtime/revalidate-current", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: p, extraPaths: extras }),
    });
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent("eid:realtime-refresh"));
    if (window.parent && window.parent !== window) {
      window.parent.dispatchEvent(new CustomEvent("eid:realtime-refresh"));
    }
  } catch {
    /* cross-origin parent */
  }
}
