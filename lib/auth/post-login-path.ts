/** Caminho após login/cadastro/aceite de termos: termos, onboarding ou destino solicitado. */

export type ProfileGate = {
  termosAceitos: boolean;
  perfilCompleto: boolean;
};

export function getPostAuthRedirect(
  profile: ProfileGate,
  next?: string | null
): string {
  if (!profile.termosAceitos) {
    return "/conta/aceitar-termos";
  }
  if (!profile.perfilCompleto) {
    return "/onboarding";
  }
  const n = next?.trim();
  if (n && n.startsWith("/") && !n.startsWith("//")) {
    return n;
  }
  return "/dashboard";
}
