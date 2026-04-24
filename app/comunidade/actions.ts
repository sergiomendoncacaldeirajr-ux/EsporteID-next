"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResponderMatchState = { ok: true } | { ok: false; message: string };
export type ResponderConviteState = { ok: true } | { ok: false; message: string };
export type SugestaoMatchState = { ok: true; message?: string } | { ok: false; message: string };
export type ResponderSugestaoMatchState = { ok: true } | { ok: false; message: string };
export type CancelarMatchState = { ok: true } | { ok: false; message: string };

function normStatus(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
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

  const msg = "Desafio aceito e partida criada na Agenda. Combine data/local e depois registre o resultado.";
  await Promise.all([
    notify(supabase, matchRow.usuario_id, msg, Number(novaPartida.id), actorUserId),
    notify(supabase, matchRow.adversario_id, msg, Number(novaPartida.id), actorUserId),
  ]);
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

  const { error } = await supabase.rpc("cancelar_match_aceito", {
    p_match_id: matchId,
    p_motivo: motivo.length > 0 ? motivo.slice(0, 240) : null,
  });
  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  revalidatePath("/match");
  revalidatePath("/dashboard");
  return { ok: true };
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

  revalidatePath("/comunidade");
  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/times");
  return { ok: true };
}
