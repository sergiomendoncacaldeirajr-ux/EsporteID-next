/**
 * Política única de tempo e escopo para atualização ao vivo no app logado
 * (`RealtimePageRefresh`, footer, sininho). Ajuste aqui para mudar o comportamento global.
 */

/** Mínimo entre dois `router.refresh()` disparados pelo bridge Realtime (anti-tremor). */
export const EID_REALTIME_REFRESH_THROTTLE_MS = 1500;

const AUTH_PATH_PREFIXES = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha",
  "/verificar-codigo",
  "/auth/",
] as const;

export function eidPathIsAuthSurface(pathname: string): boolean {
  const p = pathname || "";
  return AUTH_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? p.startsWith(prefix) : p === prefix || p.startsWith(`${prefix}/`),
  );
}

/**
 * Formulário de placar / iframe: não disparamos refresh automático (evita perder estado no meio do fluxo).
 */
export function eidShouldPauseAutoRefreshFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  const path = String(window.location.pathname ?? "");
  if (path.startsWith("/registrar-placar/")) return true;
  const frame = document.querySelector('iframe[src*="/registrar-placar/"]');
  return Boolean(frame);
}

/**
 * Onde rodamos o poll de assinatura + alinhamento com `router.refresh`:
 * todo o app com shell autenticado, exceto superfícies públicas de login, admin, onboarding e pausas.
 */
export function eidShouldRunGlobalInteractionPoll(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "");
  if (!p) return false;
  if (eidPathIsAuthSurface(p)) return false;
  if (p.startsWith("/admin")) return false;
  if (p.startsWith("/onboarding")) return false;
  if (eidShouldPauseAutoRefreshFromLocation()) return false;
  return true;
}
