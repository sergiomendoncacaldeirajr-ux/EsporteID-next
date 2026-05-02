"use server";

import { revalidatePath } from "next/cache";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER } from "@/lib/match/viewer-esporte-confronto";
import { createClient } from "@/lib/supabase/server";
import { CONFRONTO_AGENDAMENTO_JANELA_HORAS } from "@/lib/agenda/confronto-agendamento-janela";

export type ResponderMatchState = { ok: true } | { ok: false; message: string };
export type ResponderConviteState = { ok: true } | { ok: false; message: string };
export type SugestaoMatchState = { ok: true; message?: string } | { ok: false; message: string };
export type ResponderSugestaoMatchState = { ok: true } | { ok: false; message: string };
export type LimparSugestaoEnviadaState = { ok: true } | { ok: false; message: string };
export type CancelarMatchState = { ok: true } | { ok: false; message: string };
export type GerenciarCancelamentoState = { ok: true; message: string } | { ok: false; message: string };
export type CancelarPedidoPendenteState = { ok: true } | { ok: false; message: string };

function normStatus(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

async function marcarNotificacoesPorAcao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  opts: {
    referenciaId?: number | null;
    tipos?: string[];
  }
) {
  let q = supabase.from("notificacoes").update({ lida: true }).eq("usuario_id", userId).eq("lida", false);
  if (Number.isFinite(opts.referenciaId ?? NaN) && Number(opts.referenciaId) > 0) {
    q = q.eq("referencia_id", Number(opts.referenciaId));
  }
  const tipos = (opts.tipos ?? [])
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean);
  if (tipos.length > 0) {
    q = q.in("tipo", tipos);
  }
  await q;
}

async function removerNotificacoesDoMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: number,
  userIds?: Array<string | null | undefined>
) {
  if (!Number.isFinite(matchId) || matchId < 1) return;
  const uniqUsers = [...new Set((userIds ?? []).map((v) => String(v ?? "").trim()).filter(Boolean))];
  let q = supabase
    .from("notificacoes")
    .delete()
    .eq("referencia_id", matchId)
    .in("tipo", ["match", "desafio", "agenda_status"]);
  if (uniqUsers.length > 0) {
    q = q.in("usuario_id", uniqUsers);
  }
  await q;
}

async function notify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: string | null | undefined,
  mensagem: string,
  referenciaId: number,
  remetenteId: string | null | undefined
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
      remetente_id: remetenteId ?? null,
      data_criacao: new Date().toISOString(),
    })
    .select("id")
    .limit(1);
  const notifId = Number((data?.[0] as { id?: number } | undefined)?.id ?? 0);
  if (Number.isFinite(notifId) && notifId > 0) {
    await triggerPushForNotificationIdsBestEffort([notifId], { source: "comunidade/actions.notify" });
  }
}

async function triggerPushForMatchNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: number,
  userIds: Array<string | null | undefined>,
  source: string
) {
  const uniqUsers = [...new Set(userIds.map((v) => String(v ?? "").trim()).filter(Boolean))];
  if (!Number.isFinite(matchId) || matchId < 1) return;
  let q = supabase
    .from("notificacoes")
    .select("id")
    .eq("referencia_id", matchId)
    .eq("lida", false)
    .in("tipo", ["match", "desafio", "agenda_status"])
    .order("id", { ascending: false })
    .limit(30);
  if (uniqUsers.length > 0) {
    q = q.in("usuario_id", uniqUsers);
  }
  const { data } = await q;
  const ids = (data ?? [])
    .map((row) => Number((row as { id?: number } | null)?.id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length) {
    await triggerPushForNotificationIdsBestEffort(ids, { source });
  }
}

async function triggerPushForSuggestionNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sugestaoId: number,
  userIds: Array<string | null | undefined>,
  source: string
) {
  const uniqUsers = [...new Set(userIds.map((v) => String(v ?? "").trim()).filter(Boolean))];
  if (!Number.isFinite(sugestaoId) || sugestaoId < 1) return;
  let q = supabase
    .from("notificacoes")
    .select("id")
    .eq("referencia_id", sugestaoId)
    .eq("lida", false)
    .in("tipo", ["match", "desafio", "time", "convite"])
    .order("id", { ascending: false })
    .limit(30);
  if (uniqUsers.length > 0) {
    q = q.in("usuario_id", uniqUsers);
  }
  const { data } = await q;
  const ids = (data ?? [])
    .map((row) => Number((row as { id?: number } | null)?.id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length) {
    await triggerPushForNotificationIdsBestEffort(ids, { source });
  }
}

async function getActiveTeamMemberIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamIds: Array<number | null | undefined>
): Promise<string[]> {
  const ids = [...new Set(teamIds.map((v) => Number(v ?? 0)).filter((v) => Number.isFinite(v) && v > 0))];
  if (!ids.length) return [];
  const { data } = await supabase
    .from("membros_time")
    .select("usuario_id")
    .in("time_id", ids)
    .in("status", ["ativo", "aceito", "aprovado"]);
  return [...new Set((data ?? []).map((r) => String((r as { usuario_id?: string | null }).usuario_id ?? "")).filter(Boolean))];
}

async function ensurePartidaAgendadaFromMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: number,
  actorUserId: string
) {
  const { data: matchRow } = await supabase
    .from("matches")
    .select("id, usuario_id, adversario_id, esporte_id, modalidade_confronto, tipo, finalidade, status, adversario_time_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!matchRow) return;
  if (normStatus(matchRow.status) !== "aceito") return;
  if (String(matchRow.finalidade ?? "ranking").trim().toLowerCase() !== "ranking") return;
  if (!matchRow.usuario_id || !matchRow.adversario_id || !matchRow.esporte_id) return;

  const modalidade = String(matchRow.modalidade_confronto ?? matchRow.tipo ?? "individual")
    .trim()
    .toLowerCase();
  const isColetivo = modalidade === "dupla" || modalidade === "time";

  let time1Id: number | null = null;
  let time2Id: number | null = isColetivo && matchRow.adversario_time_id ? Number(matchRow.adversario_time_id) : null;

  if (isColetivo) {
    const normTipo = (t: unknown) => String((t as { tipo?: string | null } | null)?.tipo ?? "").trim().toLowerCase();

    const { data: sugestaoPar } = await supabase
      .from("match_sugestoes")
      .select("sugeridor_time_id, alvo_time_id")
      .eq("match_id", matchId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sid = Number(sugestaoPar?.sugeridor_time_id ?? 0);
    const aid = Number(sugestaoPar?.alvo_time_id ?? 0);
    if (Number.isFinite(sid) && sid > 0 && Number.isFinite(aid) && aid > 0) {
      const { data: timesPar } = await supabase
        .from("times")
        .select("id, tipo, esporte_id, criador_id")
        .in("id", [sid, aid]);
      const tSug = (timesPar ?? []).find((r) => Number((r as { id?: number }).id) === sid) as
        | { id?: number; tipo?: string | null; esporte_id?: number | null; criador_id?: string | null }
        | undefined;
      const tAlvo = (timesPar ?? []).find((r) => Number((r as { id?: number }).id) === aid) as
        | { id?: number; tipo?: string | null; esporte_id?: number | null; criador_id?: string | null }
        | undefined;
      /* Partida veio de sugestão aprovada: confiamos no par da linha match_sugestoes (RPC já validou líderes). */
      if (
        tSug?.id &&
        tAlvo?.id &&
        normTipo(tSug) === modalidade &&
        normTipo(tAlvo) === modalidade &&
        Number(tSug.esporte_id) === Number(matchRow.esporte_id) &&
        Number(tAlvo.esporte_id) === Number(matchRow.esporte_id)
      ) {
        time1Id = sid;
        time2Id = aid;
      }
    }

    if (!time1Id || !time2Id) {
      const { data: sugestaoLigada } = await supabase
        .from("match_sugestoes")
        .select("sugeridor_time_id")
        .eq("match_id", matchId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      const suggestedTeamId = Number(sugestaoLigada?.sugeridor_time_id ?? 0);
      if (Number.isFinite(suggestedTeamId) && suggestedTeamId > 0) {
        const { data: suggestedTeam } = await supabase
          .from("times")
          .select("id, tipo, esporte_id, criador_id")
          .eq("id", suggestedTeamId)
          .maybeSingle();
        if (
          suggestedTeam?.id &&
          normTipo(suggestedTeam) === modalidade &&
          Number(suggestedTeam.esporte_id) === Number(matchRow.esporte_id) &&
          String(suggestedTeam.criador_id ?? "") === String(matchRow.usuario_id ?? "")
        ) {
          time1Id = Number(suggestedTeam.id);
        }
      }

      if (!time1Id) {
        const { data: challengerTeam } = await supabase
          .from("times")
          .select("id")
          .eq("criador_id", matchRow.usuario_id)
          .eq("esporte_id", Number(matchRow.esporte_id))
          .ilike("tipo", modalidade)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        time1Id = challengerTeam?.id ? Number(challengerTeam.id) : null;
      }

      if (!time2Id || !time1Id) {
        time1Id = null;
        time2Id = null;
      }
    }
  }

  if (isColetivo && (!time1Id || !time2Id)) {
    return;
  }

  const { data: abertaPorMatch } = await supabase
    .from("partidas")
    .select("id")
    .eq("match_id", matchId)
    .in("status", ["agendada", "aguardando_confirmacao"])
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (abertaPorMatch?.id) return;

  if (isColetivo && time1Id && time2Id) {
    const { data: abertaColetiva } = await supabase
      .from("partidas")
      .select("id")
      .eq("esporte_id", Number(matchRow.esporte_id))
      .is("torneio_id", null)
      .in("status", ["agendada", "aguardando_confirmacao"])
      .or(
        `and(time1_id.eq.${time1Id},time2_id.eq.${time2Id}),and(time1_id.eq.${time2Id},time2_id.eq.${time1Id})`
      )
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (abertaColetiva?.id) return;
  } else {
    const { data: aberta } = await supabase
      .from("partidas")
      .select("id")
      .eq("esporte_id", Number(matchRow.esporte_id))
      .is("torneio_id", null)
      .or(
        `and(jogador1_id.eq.${matchRow.usuario_id},jogador2_id.eq.${matchRow.adversario_id}),and(jogador1_id.eq.${matchRow.adversario_id},jogador2_id.eq.${matchRow.usuario_id})`
      )
      .in("status", ["agendada", "aguardando_confirmacao"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (aberta?.id) return;
  }

  const { data: novaPartida, error: insErr } = await supabase
    .from("partidas")
    .insert({
      esporte_id: Number(matchRow.esporte_id),
      modalidade,
      jogador1_id: matchRow.usuario_id,
      jogador2_id: matchRow.adversario_id,
      time1_id: time1Id,
      time2_id: time2Id,
      match_id: matchId,
      usuario_id: matchRow.usuario_id,
      desafiante_id: matchRow.usuario_id,
      desafiado_id: matchRow.adversario_id,
      tipo: "desafio",
      tipo_partida: "ranking",
      status: "agendada",
      status_ranking: "pendente",
      data_registro: new Date().toISOString(),
      data_aceito: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (insErr || !novaPartida?.id) return;

  const msg =
    "Desafio aceito e partida criada. Combine data e local na Agenda; lançamento do resultado no Painel (Partidas e resultados).";
  const partidaIdNum = Number(novaPartida.id);
  const capSet = new Set(
    [matchRow.usuario_id, matchRow.adversario_id].map((v) => String(v ?? "").trim()).filter(Boolean),
  );
  await Promise.all([
    notify(supabase, matchRow.usuario_id, msg, partidaIdNum, actorUserId),
    notify(supabase, matchRow.adversario_id, msg, partidaIdNum, actorUserId),
  ]);

  if (isColetivo && time1Id && time2Id) {
    const { data: membrosPartida } = await supabase
      .from("membros_time")
      .select("usuario_id")
      .in("time_id", [time1Id, time2Id])
      .in("status", ["ativo", "aceito", "aprovado"]);
    const extra = [...new Set((membrosPartida ?? []).map((r) => String((r as { usuario_id?: string | null }).usuario_id ?? "").trim()).filter(Boolean))].filter(
      (uid) => !capSet.has(uid),
    );
    await Promise.all(extra.map((uid) => notify(supabase, uid, msg, partidaIdNum, actorUserId)));
  }
}

export async function responderPedidoMatch(
  _prev: ResponderMatchState | undefined,
  formData: FormData
): Promise<ResponderMatchState> {
  const rawId = formData.get("match_id");
  const aceitarRaw = formData.get("aceitar");
  const matchId = Number(rawId);
  const aceitar = aceitarRaw === "true" || aceitarRaw === "1";

  if (!Number.isFinite(matchId) || matchId < 1) {
    return { ok: false, message: "Pedido inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { data: participantsRow } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id, adversario_time_id, desafiante_time_id")
    .eq("id", matchId)
    .maybeSingle();

  const { error } = await supabase.rpc("responder_pedido_match", {
    p_match_id: matchId,
    p_aceitar: aceitar,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (aceitar) {
    await ensurePartidaAgendadaFromMatch(supabase, matchId, user.id);
  }
  await marcarNotificacoesPorAcao(supabase, user.id, {
    referenciaId: matchId,
    tipos: ["match", "desafio"],
  });

  const pushUserIds: Array<string | null | undefined> = [
    participantsRow?.usuario_id,
    participantsRow?.adversario_id,
  ];
  const teamIdsPush = [participantsRow?.adversario_time_id, participantsRow?.desafiante_time_id]
    .map((v) => Number(v ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  const uniqTidsPush = [...new Set(teamIdsPush)];
  if (uniqTidsPush.length) {
    const { data: memsPush } = await supabase
      .from("membros_time")
      .select("usuario_id")
      .in("time_id", uniqTidsPush)
      .in("status", ["ativo", "aceito", "aprovado"]);
    for (const r of memsPush ?? []) {
      pushUserIds.push(String((r as { usuario_id?: string | null }).usuario_id ?? ""));
    }
  }

  await triggerPushForMatchNotifications(
    supabase,
    matchId,
    pushUserIds,
    "comunidade/actions.responderPedidoMatch"
  );

  revalidatePath("/comunidade");
  revalidatePath("/agenda");
  revalidatePath("/match");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelarMatchAceito(
  _prev: CancelarMatchState | undefined,
  formData: FormData
): Promise<CancelarMatchState> {
  const matchId = Number(formData.get("match_id"));
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!Number.isFinite(matchId) || matchId < 1) {
    return { ok: false, message: "Desafio inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase.rpc("solicitar_cancelamento_match_aceito", {
    p_match_id: matchId,
    p_motivo: motivo.length > 0 ? motivo.slice(0, 240) : null,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  await marcarNotificacoesPorAcao(supabase, user.id, {
    referenciaId: matchId,
    tipos: ["match", "desafio"],
  });
  const { data: participantsRow } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id")
    .eq("id", matchId)
    .maybeSingle();
  await triggerPushForMatchNotifications(
    supabase,
    matchId,
    [participantsRow?.usuario_id, participantsRow?.adversario_id],
    "comunidade/actions.cancelarMatchAceito"
  );

  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/match");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelarPedidoMatchPendente(
  _prev: CancelarPedidoPendenteState | undefined,
  formData: FormData
): Promise<CancelarPedidoPendenteState> {
  const matchId = Number(formData.get("match_id"));
  if (!Number.isFinite(matchId) || matchId < 1) {
    return { ok: false, message: "Pedido inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.rpc("cancelar_pedido_match_pendente", {
    p_match_id: matchId,
  });
  if (error) return { ok: false, message: error.message };

  await marcarNotificacoesPorAcao(supabase, user.id, {
    referenciaId: matchId,
    tipos: ["match", "desafio"],
  });
  const { data: participantsRow } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id")
    .eq("id", matchId)
    .maybeSingle();
  await triggerPushForMatchNotifications(
    supabase,
    matchId,
    [participantsRow?.usuario_id, participantsRow?.adversario_id],
    "comunidade/actions.cancelarPedidoMatchPendente"
  );

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
  revalidatePath("/match");
  return { ok: true };
}

function parseFutureIsoFromDatetimeLocal(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isPastDateTime(iso: string | null): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return t < Date.now();
}

function isBeyondAgendamentoJanelaDateTime(iso: string | null): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  const max = Date.now() + CONFRONTO_AGENDAMENTO_JANELA_HORAS * 60 * 60 * 1000;
  return t > max;
}

function hasDuplicateDateTimeOptions(values: Array<string | null>): boolean {
  const normalized = values
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  if (normalized.length !== values.length) return true;
  return new Set(normalized).size !== normalized.length;
}

export async function gerenciarCancelamentoMatch(
  _prev: GerenciarCancelamentoState | undefined,
  formData: FormData
): Promise<GerenciarCancelamentoState> {
  const intent = String(formData.get("intent") ?? "").trim();
  const matchId = Number(formData.get("match_id"));

  if (!Number.isFinite(matchId) || matchId < 1) {
    return { ok: false, message: "Desafio inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };
  const { data: participantsRow } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id, desafiante_time_id, adversario_time_id, modalidade_confronto")
    .eq("id", matchId)
    .maybeSingle();

  if (intent === "request_cancel") {
    const motivo = String(formData.get("motivo") ?? "").trim();
    const { error } = await supabase.rpc("solicitar_cancelamento_match_aceito", {
      p_match_id: matchId,
      p_motivo: motivo ? motivo.slice(0, 240) : null,
    });
    if (error) return { ok: false, message: error.message };
    await marcarNotificacoesPorAcao(supabase, user.id, {
      referenciaId: matchId,
      tipos: ["match", "desafio"],
    });
    const mod = String(participantsRow?.modalidade_confronto ?? "").trim().toLowerCase();
    const pushTargets = new Set<string>(
      [participantsRow?.usuario_id, participantsRow?.adversario_id].map((v) => String(v ?? "").trim()).filter(Boolean),
    );
    if (mod === "dupla" || mod === "time") {
      for (const uid of await getActiveTeamMemberIds(supabase, [
        participantsRow?.desafiante_time_id,
        participantsRow?.adversario_time_id,
      ])) {
        if (uid) pushTargets.add(uid);
      }
    }
    pushTargets.delete(user.id);
    await triggerPushForMatchNotifications(
      supabase,
      matchId,
      [...pushTargets],
      "comunidade/actions.gerenciarCancelamentoMatch.request_cancel"
    );
    revalidatePath("/agenda");
    revalidatePath("/comunidade");
    revalidatePath("/dashboard");
    return { ok: true, message: "Solicitação de cancelamento enviada. O oponente tem 24h para responder." };
  }

  if (intent === "respond_cancel") {
    const aceitar = String(formData.get("aceitar_cancelamento") ?? "") === "1";
    const op1 = parseFutureIsoFromDatetimeLocal(String(formData.get("opcao_1") ?? ""));
    const op2 = parseFutureIsoFromDatetimeLocal(String(formData.get("opcao_2") ?? ""));
    const op3 = parseFutureIsoFromDatetimeLocal(String(formData.get("opcao_3") ?? ""));
    const local = String(formData.get("local_reagendamento") ?? "").trim();
    if (!aceitar) {
      if (isPastDateTime(op1) || isPastDateTime(op2) || isPastDateTime(op3)) {
        return { ok: false, message: "As opções de data e hora devem ser de agora em diante." };
      }
      if (
        isBeyondAgendamentoJanelaDateTime(op1) ||
        isBeyondAgendamentoJanelaDateTime(op2) ||
        isBeyondAgendamentoJanelaDateTime(op3)
      ) {
        return {
          ok: false,
          message: `As opções de data e hora devem estar dentro de ${CONFRONTO_AGENDAMENTO_JANELA_HORAS} horas.`,
        };
      }
      if (hasDuplicateDateTimeOptions([op1, op2, op3])) {
        return { ok: false, message: "As 3 opções precisam ser diferentes entre si." };
      }
    }
    const { error } = await supabase.rpc("responder_cancelamento_match", {
      p_match_id: matchId,
      p_aceitar_cancelamento: aceitar,
      p_opcao_1: aceitar ? null : op1,
      p_opcao_2: aceitar ? null : op2,
      p_opcao_3: aceitar ? null : op3,
      p_local: aceitar ? null : (local || null),
    });
    if (error) return { ok: false, message: error.message };
    if (aceitar) {
      // Fallback defensivo: se a RPC não persistir o cancelamento por alguma condição de corrida,
      // garante que o match não volte para "Lançar resultado".
      await supabase
        .from("matches")
        .update({
          status: "Cancelado",
          cancel_requested_by: null,
          cancel_requested_at: null,
          cancel_response_deadline_at: null,
          data_confirmacao: new Date().toISOString(),
        })
        .eq("id", matchId)
        .in("status", ["Aceito", "CancelamentoPendente"]);
      // A RPC já substitui notificações do match e insere aviso ao elenco (keep_after_match_cancelled).
    }
    await marcarNotificacoesPorAcao(supabase, user.id, {
      referenciaId: matchId,
      tipos: ["match", "desafio", "agenda_status"],
    });
    await triggerPushForMatchNotifications(
      supabase,
      matchId,
      aceitar ? [] : [participantsRow?.usuario_id, participantsRow?.adversario_id],
      "comunidade/actions.gerenciarCancelamentoMatch.respond_cancel"
    );
    revalidatePath("/agenda");
    revalidatePath("/comunidade");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: aceitar
        ? "Cancelamento aceito. O desafio foi cancelado."
        : `Cancelamento recusado com opções de data/hora. A outra parte deve escolher em até ${CONFRONTO_AGENDAMENTO_JANELA_HORAS}h.`,
    };
  }

  if (intent === "respond_option") {
    const optionIdx = Number(formData.get("option_idx"));
    const aceitar = String(formData.get("aceitar_opcao") ?? "") === "1";
    if (!Number.isInteger(optionIdx) || optionIdx < 1 || optionIdx > 3) {
      return { ok: false, message: "Opção inválida." };
    }
    const { error } = await supabase.rpc("responder_opcao_reagendamento_match", {
      p_match_id: matchId,
      p_option_idx: optionIdx,
      p_aceitar: aceitar,
    });
    if (error) return { ok: false, message: error.message };
    const { data: statusRow } = await supabase.from("matches").select("status").eq("id", matchId).maybeSingle();
    const canceladoPorRecusas = String(statusRow?.status ?? "") === "Cancelado";
    await marcarNotificacoesPorAcao(supabase, user.id, {
      referenciaId: matchId,
      tipos: ["match", "desafio", "agenda_status"],
    });
    await triggerPushForMatchNotifications(
      supabase,
      matchId,
      canceladoPorRecusas ? [] : [participantsRow?.usuario_id, participantsRow?.adversario_id],
      "comunidade/actions.gerenciarCancelamentoMatch.respond_option"
    );
    revalidatePath("/agenda");
    revalidatePath("/comunidade");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: aceitar
        ? "Opção aceita. O confronto segue agendado no sistema."
        : "Opção recusada.",
    };
  }

  if (intent === "denunciar_cancelamento") {
    const alvoId = String(formData.get("alvo_usuario_id") ?? "").trim();
    if (!alvoId) return { ok: false, message: "Não foi possível identificar o oponente para denúncia." };
    const detalhe = String(formData.get("detalhe") ?? "").trim();
    const texto = `Tentativa indevida de cancelamento de desafio para evitar derrota. Desafio #${matchId}.${detalhe ? ` Detalhe: ${detalhe.slice(0, 300)}` : ""}`;
    const { error } = await supabase.rpc("registrar_denuncia_usuario", {
      p_alvo_usuario_id: alvoId,
      p_codigo_motivo: "abuso",
      p_texto: texto,
    });
    if (error) return { ok: false, message: error.message };
    revalidatePath("/agenda");
    revalidatePath("/admin/denuncias");
    return { ok: true, message: "Denúncia registrada para análise da moderação." };
  }

  if (intent === "desist_match") {
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id, usuario_id, adversario_id, esporte_id, status, reschedule_selected_option")
      .eq("id", matchId)
      .maybeSingle();
    if (!matchRow) return { ok: false, message: "Desafio não encontrado." };
    if (user.id !== matchRow.usuario_id && user.id !== matchRow.adversario_id) {
      return { ok: false, message: "Sem permissão para desistir deste desafio." };
    }
    if (String(matchRow.status ?? "") !== "Aceito") {
      return { ok: false, message: "Este desafio não está ativo para desistência." };
    }
    if (!Number.isFinite(Number(matchRow.reschedule_selected_option ?? NaN)) || Number(matchRow.reschedule_selected_option) < 1) {
      return { ok: false, message: "Desistência disponível apenas após reagendamento aceito." };
    }
    const winnerId = user.id === matchRow.usuario_id ? matchRow.adversario_id : matchRow.usuario_id;
    if (!winnerId) return { ok: false, message: "Não foi possível identificar o vencedor." };

    const { data: partidaRow } = await supabase
      .from("partidas")
      .select("id, jogador1_id, jogador2_id")
      .eq("torneio_id", null)
      .eq("esporte_id", Number(matchRow.esporte_id ?? 0))
      .or(
        `and(jogador1_id.eq.${matchRow.usuario_id},jogador2_id.eq.${matchRow.adversario_id}),and(jogador1_id.eq.${matchRow.adversario_id},jogador2_id.eq.${matchRow.usuario_id})`
      )
      .in("status", ["agendada", "aguardando_confirmacao"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (partidaRow?.id) {
      const p1Winner = partidaRow.jogador1_id === winnerId;
      const p2Winner = partidaRow.jogador2_id === winnerId;
      await supabase
        .from("partidas")
        .update({
          status: "concluida",
          status_ranking: "validado",
          placar_1: p1Winner ? 1 : p2Winner ? 0 : 0,
          placar_2: p2Winner ? 1 : p1Winner ? 0 : 0,
          mensagem: "Encerrado por desistência informada após reagendamento aceito.",
          data_resultado: new Date().toISOString(),
          data_validacao: new Date().toISOString(),
        })
        .eq("id", Number(partidaRow.id));
    }

    const { error: mErr } = await supabase
      .from("matches")
      .update({
        status: "Concluido",
        data_confirmacao: new Date().toISOString(),
        wo_auto_if_no_result: false,
        cancel_requested_by: null,
      })
      .eq("id", matchId);
    if (mErr) return { ok: false, message: mErr.message };

    await Promise.all([
      notify(
        supabase,
        matchRow.usuario_id,
        user.id === matchRow.usuario_id
          ? "Você desistiu do desafio. Resultado encerrado com vitória do oponente."
          : "O oponente desistiu do desafio. Vitória atribuída para você.",
        matchId,
        user.id
      ),
      notify(
        supabase,
        matchRow.adversario_id,
        user.id === matchRow.adversario_id
          ? "Você desistiu do desafio. Resultado encerrado com vitória do oponente."
          : "O oponente desistiu do desafio. Vitória atribuída para você.",
        matchId,
        user.id
      ),
    ]);

    await marcarNotificacoesPorAcao(supabase, user.id, {
      referenciaId: matchId,
      tipos: ["match", "desafio", "agenda_status"],
    });
    await triggerPushForMatchNotifications(
      supabase,
      matchId,
      [participantsRow?.usuario_id, participantsRow?.adversario_id],
      "comunidade/actions.gerenciarCancelamentoMatch.desist_match"
    );
    revalidatePath("/agenda");
    revalidatePath("/comunidade");
    revalidatePath("/dashboard");
    revalidatePath("/match");
    return { ok: true, message: "Desistência registrada. Vitória do oponente confirmada." };
  }

  return { ok: false, message: "Ação de cancelamento inválida." };
}

export async function sugerirMatchParaLider(
  _prev: SugestaoMatchState | undefined,
  formData: FormData
): Promise<SugestaoMatchState> {
  const alvo = Number(formData.get("alvo_time_id"));
  const sug = Number(formData.get("sugeridor_time_id"));

  if (!Number.isInteger(alvo) || alvo < 1 || !Number.isInteger(sug) || sug < 1) {
    return { ok: false, message: "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const [{ data: alvoTimeMeta }, { data: sugTimeMeta }] = await Promise.all([
    supabase.from("times").select("esporte_id").eq("id", alvo).maybeSingle(),
    supabase.from("times").select("esporte_id").eq("id", sug).maybeSingle(),
  ]);
  const espAlvo = Number((alvoTimeMeta as { esporte_id?: number | null } | null)?.esporte_id ?? 0);
  const espSug = Number((sugTimeMeta as { esporte_id?: number | null } | null)?.esporte_id ?? 0);
  if (!Number.isFinite(espAlvo) || espAlvo < 1 || espAlvo !== espSug) {
    return { ok: false, message: "Formações inválidas ou esportes diferentes entre si." };
  }
  const { data: viewerEidSug } = await supabase
    .from("usuario_eid")
    .select("esporte_id")
    .eq("usuario_id", user.id)
    .eq("esporte_id", espAlvo)
    .maybeSingle();
  if (!viewerEidSug) {
    return { ok: false, message: MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER };
  }

  const { data: existentePar } = await supabase
    .from("match_sugestoes")
    .select("id")
    .eq("alvo_time_id", alvo)
    .eq("sugeridor_time_id", sug)
    .eq("status", "pendente")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existentePar?.id) {
    return {
      ok: false,
      message:
        "Já existe uma sugestão pendente para este confronto de dupla/time. Aguarde o líder aprovar ou recusar.",
    };
  }

  const { data: sugestaoIdRaw, error } = await supabase.rpc("sugerir_match_para_lider", {
    p_alvo_time_id: alvo,
    p_sugeridor_time_id: sug,
    p_mensagem: null,
  });

  if (error) return { ok: false, message: error.message };
  const sugestaoId = Number(sugestaoIdRaw ?? 0);
  if (Number.isFinite(sugestaoId) && sugestaoId > 0) {
    const { data: sugRow } = await supabase
      .from("match_sugestoes")
      .select("alvo_dono_id")
      .eq("id", sugestaoId)
      .maybeSingle();
    await triggerPushForSuggestionNotifications(
      supabase,
      sugestaoId,
      [String((sugRow as { alvo_dono_id?: string | null } | null)?.alvo_dono_id ?? "")],
      "comunidade/actions.sugerirMatchParaLider"
    );
  }

  revalidatePath("/comunidade");
  revalidatePath(`/perfil-time/${alvo}`);
  revalidatePath(`/perfil-time/${sug}`);
  return { ok: true, message: "Sugestão enviada ao líder. Ele pode aprovar em Social." };
}

export async function responderSugestaoMatch(
  _prev: ResponderSugestaoMatchState | undefined,
  formData: FormData
): Promise<ResponderSugestaoMatchState> {
  const rawId = formData.get("sugestao_id");
  const aceitarRaw = formData.get("aceitar");
  const sugestaoId = Number(rawId);
  const aceitar = aceitarRaw === "true" || aceitarRaw === "1";

  if (!Number.isFinite(sugestaoId) || sugestaoId < 1) {
    return { ok: false, message: "Sugestão inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: sugAntes } = await supabase
    .from("match_sugestoes")
    .select("id, sugeridor_id, sugeridor_time_id, alvo_time_id")
    .eq("id", sugestaoId)
    .maybeSingle();

  const { error } = await supabase.rpc("responder_sugestao_match", {
    p_sugestao_id: sugestaoId,
    p_aceitar: aceitar,
  });

  if (error) return { ok: false, message: error.message };
  await marcarNotificacoesPorAcao(supabase, user.id, {
    referenciaId: sugestaoId,
    tipos: ["match", "desafio", "time", "convite"],
  });

  if (aceitar) {
    const { data: sug } = await supabase
      .from("match_sugestoes")
      .select("match_id, sugeridor_id, sugeridor_time_id, alvo_time_id")
      .eq("id", sugestaoId)
      .maybeSingle();
    const maybeMatchId = Number(sug?.match_id);
    if (Number.isFinite(maybeMatchId) && maybeMatchId > 0) {
      await ensurePartidaAgendadaFromMatch(supabase, maybeMatchId, user.id);
      const memberIds = await getActiveTeamMemberIds(supabase, [
        Number((sug as { sugeridor_time_id?: number | null } | null)?.sugeridor_time_id ?? 0),
        Number((sug as { alvo_time_id?: number | null } | null)?.alvo_time_id ?? 0),
      ]);
      await triggerPushForMatchNotifications(
        supabase,
        maybeMatchId,
        [
          String((sug as { sugeridor_id?: string | null } | null)?.sugeridor_id ?? ""),
          ...memberIds,
        ],
        "comunidade/actions.responderSugestaoMatch.aprovado"
      );
    } else {
      await triggerPushForSuggestionNotifications(
        supabase,
        sugestaoId,
        [String((sug as { sugeridor_id?: string | null } | null)?.sugeridor_id ?? "")],
        "comunidade/actions.responderSugestaoMatch.aprovado.fallback"
      );
    }
  } else {
    const sugSugeridorId = String((sugAntes as { sugeridor_id?: string | null } | null)?.sugeridor_id ?? "");
    const sugTeamId = Number((sugAntes as { sugeridor_time_id?: number | null } | null)?.sugeridor_time_id ?? 0);
    const targetTeamId = Number((sugAntes as { alvo_time_id?: number | null } | null)?.alvo_time_id ?? 0);
    const [sugTeam, targetTeam] = await Promise.all([
      Number.isFinite(sugTeamId) && sugTeamId > 0
        ? supabase.from("times").select("nome").eq("id", sugTeamId).maybeSingle()
        : Promise.resolve({ data: null } as { data: { nome?: string | null } | null }),
      Number.isFinite(targetTeamId) && targetTeamId > 0
        ? supabase.from("times").select("nome").eq("id", targetTeamId).maybeSingle()
        : Promise.resolve({ data: null } as { data: { nome?: string | null } | null }),
    ]);
    const memberIds = await getActiveTeamMemberIds(supabase, [sugTeamId]);
    const extraRecipients = memberIds.filter((uid) => uid && uid !== sugSugeridorId);
    if (extraRecipients.length > 0) {
      const mensagem =
        `Sugestão recusada: o líder de ${String(targetTeam.data?.nome ?? "uma formação")} ` +
        `recusou o desafio sugerido para ${String(sugTeam.data?.nome ?? "sua formação")}.`;
      const { data: inserted } = await supabase
        .from("notificacoes")
        .insert(
          extraRecipients.map((uid) => ({
            usuario_id: uid,
            mensagem,
            tipo: "desafio",
            referencia_id: sugestaoId,
            lida: false,
            remetente_id: user.id,
            data_criacao: new Date().toISOString(),
          }))
        )
        .select("id");
      const notifIds = (inserted ?? [])
        .map((row) => Number((row as { id?: number } | null)?.id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0);
      if (notifIds.length) {
        await triggerPushForNotificationIdsBestEffort(notifIds, {
          source: "comunidade/actions.responderSugestaoMatch.recusado.extras",
        });
      }
    }
    await triggerPushForSuggestionNotifications(
      supabase,
      sugestaoId,
      [sugSugeridorId, ...memberIds],
      "comunidade/actions.responderSugestaoMatch.recusado"
    );
  }

  revalidatePath("/comunidade");
  revalidatePath("/agenda");
  revalidatePath("/match");
  revalidatePath("/dashboard");
  revalidatePath("/times");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true };
}

export async function limparSugestaoEnviadaNotificacao(
  _prev: LimparSugestaoEnviadaState | undefined,
  formData: FormData
): Promise<LimparSugestaoEnviadaState> {
  const sugestaoId = Number(formData.get("sugestao_id"));
  if (!Number.isFinite(sugestaoId) || sugestaoId < 1) {
    return { ok: false, message: "Sugestão inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { data: sug } = await supabase
    .from("match_sugestoes")
    .select("id, sugeridor_id, match_id")
    .eq("id", sugestaoId)
    .maybeSingle();
  if (!sug || String((sug as { sugeridor_id?: string | null }).sugeridor_id ?? "") !== user.id) {
    return { ok: false, message: "Sem permissão para limpar esta sugestão." };
  }

  const { error: hideErr } = await supabase.rpc("ocultar_sugestao_match_sugeridor", {
    p_sugestao_id: sugestaoId,
  });
  if (hideErr) {
    return { ok: false, message: hideErr.message };
  }

  const refs = [
    sugestaoId,
    Number((sug as { match_id?: number | null }).match_id ?? 0),
  ].filter((v) => Number.isFinite(v) && v > 0);
  if (refs.length > 0) {
    await supabase
      .from("notificacoes")
      .delete()
      .eq("usuario_id", user.id)
      .in("referencia_id", refs)
      .in("tipo", ["match", "desafio", "time", "convite"]);
  }

  revalidatePath("/comunidade");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function marcarNotificacaoLida(formData: FormData) {
  const raw = formData.get("notif_id");
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").update({ lida: true }).eq("id", id).eq("usuario_id", user.id);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

export async function apagarNotificacao(formData: FormData) {
  const raw = formData.get("notif_id");
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").delete().eq("id", id).eq("usuario_id", user.id);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

export async function marcarTodasNotificacoesLidas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").update({ lida: true }).eq("usuario_id", user.id).eq("lida", false);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

/** Remove notificações do bloco “desafio” na comunidade (tipos/mensagens alinhados ao filtro da página). */
export async function limparNotificacoesDesafio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").delete().eq("usuario_id", user.id);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

/** Remove notificações do bloco “equipe” (time / convite). */
export async function limparNotificacoesEquipe() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").delete().eq("usuario_id", user.id);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

/** Apaga todas as notificações do usuário (ex.: ação no sininho). */
export async function limparTodasNotificacoes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").delete().eq("usuario_id", user.id);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

export async function responderConviteEquipe(
  _prev: ResponderConviteState | undefined,
  formData: FormData
): Promise<ResponderConviteState> {
  const conviteId = Number(formData.get("convite_id"));
  const aceitarRaw = formData.get("aceitar");
  const aceitar = aceitarRaw === "true" || aceitarRaw === "1";
  if (!Number.isFinite(conviteId) || conviteId < 1) {
    return { ok: false, message: "Convite inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { error } = await supabase.rpc("responder_convite_time", {
    p_convite_id: conviteId,
    p_aceitar: aceitar,
  });
  if (error) return { ok: false, message: error.message };
  await marcarNotificacoesPorAcao(supabase, user.id, {
    referenciaId: conviteId,
    tipos: ["time", "convite"],
  });

  revalidatePath("/comunidade");
  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/times");
  return { ok: true };
}
