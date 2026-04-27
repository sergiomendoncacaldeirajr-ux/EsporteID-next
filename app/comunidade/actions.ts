"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResponderMatchState = { ok: true } | { ok: false; message: string };
export type ResponderConviteState = { ok: true } | { ok: false; message: string };
export type SugestaoMatchState = { ok: true; message?: string } | { ok: false; message: string };
export type ResponderSugestaoMatchState = { ok: true } | { ok: false; message: string };
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

async function notify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: string | null | undefined,
  mensagem: string,
  referenciaId: number,
  remetenteId: string | null | undefined
) {
  if (!usuarioId) return;
  await supabase.from("notificacoes").insert({
    usuario_id: usuarioId,
    mensagem,
    tipo: "desafio",
    referencia_id: referenciaId,
    lida: false,
    remetente_id: remetenteId ?? null,
    data_criacao: new Date().toISOString(),
  });
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

  const modalidade = String(matchRow.modalidade_confronto ?? matchRow.tipo ?? "individual")
    .trim()
    .toLowerCase();
  const isColetivo = modalidade === "dupla" || modalidade === "time";

  let time1Id: number | null = null;
  let time2Id: number | null = isColetivo && matchRow.adversario_time_id ? Number(matchRow.adversario_time_id) : null;
  if (isColetivo) {
    // Quando o match veio de sugestão para líder, priorizamos a formação sugerida.
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
        String(suggestedTeam.tipo ?? "").trim().toLowerCase() === modalidade &&
        Number(suggestedTeam.esporte_id) === Number(matchRow.esporte_id) &&
        suggestedTeam.criador_id === matchRow.usuario_id
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
      .eq("tipo", modalidade)
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

  const { data: novaPartida, error: insErr } = await supabase
    .from("partidas")
    .insert({
      esporte_id: Number(matchRow.esporte_id),
      modalidade,
      jogador1_id: matchRow.usuario_id,
      jogador2_id: matchRow.adversario_id,
      time1_id: time1Id,
      time2_id: time2Id,
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
  await Promise.all([
    notify(supabase, matchRow.usuario_id, msg, Number(novaPartida.id), actorUserId),
    notify(supabase, matchRow.adversario_id, msg, Number(novaPartida.id), actorUserId),
  ]);
}

async function getRankPendingLimit(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data: cfg } = await supabase
    .from("app_config")
    .select("value_json")
    .eq("key", "match_rank_pending_result_limit")
    .maybeSingle();
  const raw = cfg?.value_json as unknown;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.min(20, Math.trunc(raw)));
  if (raw && typeof raw === "object") {
    const v = Number((raw as { limite?: unknown }).limite);
    if (Number.isFinite(v)) return Math.max(1, Math.min(20, Math.trunc(v)));
  }
  return 2;
}

async function countRankingPendencias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("finalidade", "ranking")
    .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .or(`usuario_id.eq.${userId},adversario_id.eq.${userId}`);
  return Number(count ?? 0);
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

  if (aceitar) {
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id, usuario_id, adversario_id, finalidade, status")
      .eq("id", matchId)
      .maybeSingle();
    const fin = String(matchRow?.finalidade ?? "ranking").trim().toLowerCase();
    if (matchRow && fin === "ranking" && String(matchRow.status ?? "").trim() === "Pendente") {
      const limite = await getRankPendingLimit(supabase);
      const [minhas, doDesafiante] = await Promise.all([
        countRankingPendencias(supabase, user.id),
        countRankingPendencias(supabase, String(matchRow.usuario_id ?? "")),
      ]);
      // No aceite, este pedido já está na contagem como "Pendente" e continuará na contagem como "Aceito".
      // Portanto, só bloqueamos quando já estiver acima do limite.
      if (minhas > limite) {
        return { ok: false, message: `Você atingiu o limite de ${limite} pendências de desafio/ranking.` };
      }
      if (doDesafiante > limite) {
        return { ok: false, message: "O desafiante atingiu o limite de pendências de desafio/ranking." };
      }
    }
  }

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

function isBeyond72hDateTime(iso: string | null): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  const max = Date.now() + 72 * 60 * 60 * 1000;
  return t > max;
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
      if (isBeyond72hDateTime(op1) || isBeyond72hDateTime(op2) || isBeyond72hDateTime(op3)) {
        return { ok: false, message: "As opções de data e hora devem estar dentro de 72 horas." };
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
    await marcarNotificacoesPorAcao(supabase, user.id, {
      referenciaId: matchId,
      tipos: ["match", "desafio"],
    });
    revalidatePath("/agenda");
    revalidatePath("/comunidade");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: aceitar
        ? "Cancelamento aceito. O desafio foi cancelado."
        : "Cancelamento recusado com opções de data/hora. A outra parte deve escolher em até 72h.",
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
    await marcarNotificacoesPorAcao(supabase, user.id, {
      referenciaId: matchId,
      tipos: ["match", "desafio"],
    });
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

  return { ok: false, message: "Ação de cancelamento inválida." };
}

export async function sugerirMatchParaLider(
  _prev: SugestaoMatchState | undefined,
  formData: FormData
): Promise<SugestaoMatchState> {
  const alvo = Number(formData.get("alvo_time_id"));
  const sug = Number(formData.get("sugeridor_time_id"));
  const msg = String(formData.get("mensagem") ?? "").trim();

  if (!Number.isInteger(alvo) || alvo < 1 || !Number.isInteger(sug) || sug < 1) {
    return { ok: false, message: "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { error } = await supabase.rpc("sugerir_match_para_lider", {
    p_alvo_time_id: alvo,
    p_sugeridor_time_id: sug,
    p_mensagem: msg.length > 0 ? msg.slice(0, 500) : null,
  });

  if (error) return { ok: false, message: error.message };

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
    const { data: sug } = await supabase.from("match_sugestoes").select("match_id").eq("id", sugestaoId).maybeSingle();
    const maybeMatchId = Number(sug?.match_id);
    if (Number.isFinite(maybeMatchId) && maybeMatchId > 0) {
      await ensurePartidaAgendadaFromMatch(supabase, maybeMatchId, user.id);
    }
  }

  revalidatePath("/comunidade");
  revalidatePath("/agenda");
  revalidatePath("/match");
  revalidatePath("/dashboard");
  revalidatePath(`/perfil/${user.id}`);
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
