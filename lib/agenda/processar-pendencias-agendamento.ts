import type { SupabaseClient } from "@supabase/supabase-js";

export async function processarPendenciasAgendamentoAceite(
  supabase: SupabaseClient,
  userId: string,
  teamClause = ""
) {
  const nowIso = new Date().toISOString();
  await supabase
    .from("partidas")
    .update({
      status: "agendada",
      data_partida: null,
      local_str: null,
      agendamento_proposto_por: null,
      agendamento_aceite_deadline: null,
      agendamento_aceito_por: null,
      mensagem: "Prazo de 24h expirado. Defina novo agendamento.",
    })
    .eq("status", "aguardando_aceite_agendamento")
    .not("agendamento_aceite_deadline", "is", null)
    .lte("agendamento_aceite_deadline", nowIso)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}${teamClause}`);
}

