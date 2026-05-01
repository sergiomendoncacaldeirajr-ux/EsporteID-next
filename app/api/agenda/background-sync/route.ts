import { NextResponse } from "next/server";
import { getAgendaTeamContext } from "@/lib/agenda/partidas-usuario";
import { processarPendenciasAgendamentoAceite } from "@/lib/agenda/processar-pendencias-agendamento";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const preferredRegion = ["gru1"];

export async function POST() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { teamClause } = await getAgendaTeamContext(supabase, user.id);
    await Promise.all([
      supabase.rpc("auto_aprovar_resultados_pendentes", { p_only_user: user.id }),
      supabase.rpc("processar_pendencias_cancelamento_match", { p_only_user: user.id }),
      supabase.rpc("limpar_notificacoes_match_cancelado", { p_only_user: user.id }),
      processarPendenciasAgendamentoAceite(supabase, user.id, teamClause),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

