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

/** Após aceite do agendamento: avisa capitães + elenco dos dois times (ranking). */
async function notificarElencoAgendamentoConfirmado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    match_id?: number | null;
    jogador1_id?: string | null;
    jogador2_id?: string | null;
    time1_id?: number | null;
    time2_id?: number | null;
    data_partida?: string | null;
    local_str?: string | null;
  },
  remetenteId: string
) {
  const matchId = Number(row.match_id ?? 0);
  if (!Number.isFinite(matchId) || matchId < 1) return;

  const recipients = new Set<string>();
  for (const uid of [row.jogador1_id, row.jogador2_id]) {
    const s = String(uid ?? "").trim();
    if (s) recipients.add(s);
  }
  const teamIds = [Number(row.time1_id ?? 0), Number(row.time2_id ?? 0)].filter((n) => Number.isFinite(n) && n > 0);
  if (teamIds.length) {
    const { data: mems } = await supabase
      .from("membros_time")
      .select("usuario_id")
      .in("time_id", teamIds)
      .in("status", ["ativo", "aceito", "aprovado"]);
    for (const m of mems ?? []) {
      const u = String((m as { usuario_id?: string | null }).usuario_id ?? "").trim();
      if (u) recipients.add(u);
    }
  }

  const when = row.data_partida
    ? new Date(String(row.data_partida)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "data a combinar";
  const where = String(row.local_str ?? "").trim() || "local a combinar";
  const msg = `Desafio agendado: ${when} · ${where}. Confira na Agenda e no Painel (Partidas e resultados).`;

  const rows = [...recipients].map((usuario_id) => ({
    usuario_id,
    mensagem: msg,
    tipo: "match" as const,
    referencia_id: matchId,
    lida: false,
    remetente_id: remetenteId,
    data_criacao: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { data: inserted } = await supabase.from("notificacoes").insert(rows).select("id");
  const ids = (inserted ?? [])
    .map((r) => Number((r as { id?: number }).id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length) {
    await triggerPushForNotificationIdsBestEffort(ids, { source: "agenda/actions.notificarElencoAgendamentoConfirmado" });
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
      "id, match_id, torneio_id, jogador1_id, jogador2_id, time1_id, time2_id, modalidade, status, agendamento_proposto_por, agendamento_aceite_deadline, data_partida, local_str"
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
    if (!p.torneio_id) {
      await notificarElencoAgendamentoConfirmado(supabase, p, user.id);
    }
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

