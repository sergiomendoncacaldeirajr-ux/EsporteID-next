/** Monta `/login?next=…` preservando query (ex.: `from` em páginas de perfil/formação). */

export function loginNextHref(pathWithOptionalQuery: string): string {
  return `/login?next=${encodeURIComponent(pathWithOptionalQuery)}`;
}

/** Inclui `?from=…` no destino pós-login quando a página foi aberta com esse parâmetro. */
export function loginNextWithOptionalFrom(basePath: string, sp: { from?: string }): string {
  const qs = new URLSearchParams();
  if (sp.from) qs.set("from", sp.from);
  const path = qs.size > 0 ? `${basePath}?${qs}` : basePath;
  return loginNextHref(path);
}
