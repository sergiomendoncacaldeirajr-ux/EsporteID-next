/** Resolve link "voltar" a partir de ?from= ou fallback. */
export function resolveBackHref(from: string | undefined | null, fallback = "/dashboard"): string {
  const f = (from ?? "").trim();
  if (!f.startsWith("/") || f.startsWith("//")) return fallback;
  return f;
}
