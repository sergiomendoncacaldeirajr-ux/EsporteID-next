import type { SupabaseClient } from "@supabase/supabase-js";

/** Mensagem padrão quando o visitante não tem `usuario_eid` no esporte do confronto. */
export const MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER =
  "Para desafiar ou sugerir um confronto neste esporte, configure-o no seu perfil em Conta → Esportes e EID. Você ainda pode ver estatísticas e perfis públicos.";

export async function viewerTemUsuarioEidNoEsporte(
  supabase: SupabaseClient,
  viewerId: string,
  esporteId: number
): Promise<boolean> {
  if (!Number.isFinite(esporteId) || esporteId < 1) return false;
  const { data } = await supabase
    .from("usuario_eid")
    .select("esporte_id")
    .eq("usuario_id", viewerId)
    .eq("esporte_id", esporteId)
    .maybeSingle();
  return data != null;
}
