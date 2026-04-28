"use server";

import { revalidatePath } from "next/cache";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { userMayRespondPropostaAgendamento } from "@/lib/agenda/partidas-usuario";
import { createClient } from "@/lib/supabase/server";

export type ResponderAgendamentoState = { ok: true; message: string } | { ok: false; message: string };

async function notify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: string | null | undefined,
  remetenteId: string,
  referenciaId: number,
  mensagem: string
) {
  if (!usuarioId) return;
  const { data } = await supabase
    .from("notificacoes")
    .insert({
      usuario_id: usuarioId,
      mensagem,
      tipo: "desafio",
      referencia_id: referenciaId,
      lida: false,
      remetente_id: remetenteId,
      data_criacao: new Date().toISOString(),
    })
    .select("id")
    .limit(1);
  const notifId = Number((data?.[0] as { id?: number } | undefined)?.id ?? 0);
  if (Number.isFinite(notifId) && notifId > 0) {
    await triggerPushForNotificationIdsBestEffort([notifId], { source: "agenda/actions.responderAgendamentoPartidaAction" });
  }
}

export async function responderAgendamentoPartidaAction(
  _prev: ResponderAgendamentoState | undefined,
  formData: FormData
): Promise<ResponderAgendamentoState> {
  const partidaId = Number(formData.get("partida_id"));
  const accept = String(formData.get("accept") ?? "") === "1";
  if (!Number.isFinite(partidaId) || partidaId < 1) return { ok: false, message: "Partida inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const { data: p } = await supabase
    .from("partidas")
    .select(
      "id, match_id, torneio_id, jogador1_id, jogador2_id, time1_id, time2_id, modalidade, status, agendamento_proposto_por, agendamento_aceite_deadline"
    )
    .eq("id", partidaId)
    .maybeSingle();
  if (!p) return { ok: false, message: "Partida não encontrada." };
  if (String(p.status ?? "") !== "aguardando_aceite_agendamento") {
    return { ok: false, message: "Este agendamento não está pendente de aceite." };
  }
  const podeResponder = await userMayRespondPropostaAgendamento(supabase, p, user.id);
  if (!podeResponder) {
    return { ok: false, message: "Sem permissão para responder este agendamento." };
  }
  const deadlineMs = p.agendamento_aceite_deadline ? new Date(String(p.agendamento_aceite_deadline)).getTime() : Number.NaN;
  if (Number.isFinite(deadlineMs) && deadlineMs < Date.now()) {
    return { ok: false, message: "Prazo de aceite expirado. O agendamento voltou para pendente." };
  }

  if (accept) {
    const { error } = await supabase
      .from("partidas")
      .update({
        status: "agendada",
        agendamento_aceite_deadline: null,
        agendamento_aceito_por: user.id,
        mensagem: "Agendamento aceito pelo oponente.",
      })
      .eq("id", partidaId);
    if (error) return { ok: false, message: error.message };
    await notify(
      supabase,
      p.agendamento_proposto_por,
      user.id,
      partidaId,
      "Seu agendamento foi aceito pelo oponente."
    );
  } else {
    const { error } = await supabase
      .from("partidas")
      .update({
        status: "agendada",
        data_partida: null,
        local_str: null,
        agendamento_proposto_por: null,
        agendamento_aceite_deadline: null,
        agendamento_aceito_por: null,
        mensagem: "Agendamento recusado. Defina uma nova data e local.",
      })
      .eq("id", partidaId);
    if (error) return { ok: false, message: error.message };
    await notify(
      supabase,
      p.agendamento_proposto_por,
      user.id,
      partidaId,
      "Seu agendamento foi recusado. Proponha uma nova data e local."
    );
  }

  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
  revalidatePath(`/registrar-placar/${partidaId}`);
  if (p.torneio_id) {
    revalidatePath(`/torneios/${p.torneio_id}`);
    revalidatePath(`/torneios/${p.torneio_id}/operacao`);
  }
  return { ok: true, message: accept ? "Agendamento aceito com sucesso." : "Agendamento recusado. Defina um novo horário." };
}

