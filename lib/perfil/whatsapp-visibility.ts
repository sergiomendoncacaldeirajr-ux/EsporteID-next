import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Regras de exibição do WhatsApp no perfil público (visitante vendo outro atleta):
 * - próprio perfil: sempre pode ver o próprio contato (se cadastrado);
 * - existe match com status "Aceito" entre os dois;
 * - existem partidas de torneio (torneio_id preenchido) em que ambos aparecem como jogadores.
 */
export async function podeExibirWhatsappPerfilPublico(
  supabase: SupabaseClient,
  visitanteId: string,
  perfilId: string,
  isSelf: boolean
): Promise<boolean> {
  if (isSelf) return true;

  const { data: aceitoA } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "Aceito")
    .eq("usuario_id", visitanteId)
    .eq("adversario_id", perfilId)
    .limit(1);

  const { data: aceitoB } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "Aceito")
    .eq("usuario_id", perfilId)
    .eq("adversario_id", visitanteId)
    .limit(1);

  if ((aceitoA?.length ?? 0) > 0 || (aceitoB?.length ?? 0) > 0) return true;

  const { data: t1 } = await supabase
    .from("partidas")
    .select("id")
    .not("torneio_id", "is", null)
    .gt("torneio_id", 0)
    .eq("jogador1_id", visitanteId)
    .eq("jogador2_id", perfilId)
    .limit(1);

  if ((t1?.length ?? 0) > 0) return true;

  const { data: t2 } = await supabase
    .from("partidas")
    .select("id")
    .not("torneio_id", "is", null)
    .gt("torneio_id", 0)
    .eq("jogador1_id", perfilId)
    .eq("jogador2_id", visitanteId)
    .limit(1);

  return (t2?.length ?? 0) > 0;
}
