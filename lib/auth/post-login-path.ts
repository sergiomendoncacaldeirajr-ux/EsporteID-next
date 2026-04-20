/** Caminho após login/cadastro/aceite de termos: termos, onboarding ou destino solicitado. */

export type ProfileGate = {
  termosAceitos: boolean;
  perfilCompleto: boolean;
};

export function getPostAuthRedirect(
  profile: ProfileGate,
  next?: string | null
): string {
  const n = next?.trim();
  const safeNext =
    n && n.startsWith("/") && !n.startsWith("//") ? n : null;

  if (!profile.termosAceitos) {
    if (safeNext) {
      return `/conta/aceitar-termos?next=${encodeURIComponent(safeNext)}`;
    }
    return "/conta/aceitar-termos";
  }
  if (!profile.perfilCompleto) {
    return "/onboarding";
  }
  if (safeNext) {
    return safeNext;
  }
  return "/dashboard";
}
