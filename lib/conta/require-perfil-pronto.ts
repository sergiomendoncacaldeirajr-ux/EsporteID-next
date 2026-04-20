import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Monta URL de retorno pós-termos, preservando `from` quando seguro (path relativo). */
export function contaNextPath(pathname: string, sp?: { from?: string } | null): string {
  const from = sp?.from;
  if (typeof from === "string" && from.startsWith("/")) {
    return `${pathname}?from=${encodeURIComponent(from)}`;
  }
  return pathname;
}

/**
 * Mesmas regras de `/conta/perfil` e `/conta/esportes-eid`: termos aceitos e onboarding concluído.
 * `nextPath` deve ser o caminho completo (com query) para onde voltar após aceitar termos.
 */
export async function requireContaPerfilPronto(
  supabase: SupabaseClient,
  userId: string,
  nextPath: string
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("perfil_completo, termos_aceitos_em")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.termos_aceitos_em) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent(nextPath)}`);
  }
  if (!profile.perfil_completo) {
    redirect("/onboarding");
  }
}
