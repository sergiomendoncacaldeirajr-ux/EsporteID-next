"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sanitizeOptionalUserText, sanitizeUserText } from "@/lib/security/sanitize-input";
import { createClient } from "@/lib/supabase/server";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";

function toInt(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function go(partidaId: number, kind: "ok" | "erro", message: string): never {
  redirect(`/registrar-placar/${partidaId}?${kind}=${encodeURIComponent(message)}`);
}

function salvarAgendaRedirect(partidaId: number, kind: "ok" | "erro", message: string, modoAgenda: boolean): never {
  const q = new URLSearchParams();
  q.set(kind, message);
  if (modoAgenda) q.set("modo", "agenda");
  redirect(`/registrar-placar/${partidaId}?${q.toString()}`);
}

function normStatus(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

type PartidaCtx = {
  id: number;
  match_id: number | null;
  esporte_id: number | null;
  torneio_id: number | null;
  jogador1_id: string | null;
  jogador2_id: string | null;
  usuario_id: string | null;
  desafiante_id: string | null;
  desafiado_id: string | null;
  status: string | null;
  status_ranking: string | null;
  lancado_por: string | null;
  placar_1: number | null;
  placar_2: number | null;
  time1_id: number | null;
  time2_id: number | null;
  modalidade: string | null;
};

type ActorScope = {
  isColetivo: boolean;
  isParticipant: boolean;
  isTeamOwner: boolean;
  isTeamMember: boolean;
};

async function getActorScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partida: PartidaCtx,
  userId: string
): Promise<ActorScope> {
  const modalidade = String(partida.modalidade ?? "")
    .trim()
    .toLowerCase();
  const isColetivo = modalidade === "dupla" || modalidade === "time" || Boolean(partida.time1_id || partida.time2_id);
  const isParticipant = partida.jogador1_id === userId || partida.jogador2_id === userId;
  if (!isColetivo) return { isColetivo, isParticipant, isTeamOwner: false, isTeamMember: false };

  const timeIds = [partida.time1_id, partida.time2_id].filter((v): v is number => typeof v === "number" && v > 0);
  if (!timeIds.length) return { isColetivo, isParticipant, isTeamOwner: false, isTeamMember: false };

  const [{ data: ownerRows }, { data: memberRows }] = await Promise.all([
    supabase.from("times").select("id, criador_id").in("id", timeIds),
    supabase
      .from("membros_time")
      .select("time_id, usuario_id, status")
      .in("time_id", timeIds)
      .eq("usuario_id", userId)
      .in("status", ["ativo", "aceito", "aprovado"]),
  ]);
  const isTeamOwner = (ownerRows ?? []).some((t) => t.criador_id === userId);
  const isTeamMember = (memberRows ?? []).length > 0;
  return { isColetivo, isParticipant, isTeamOwner, isTeamMember };
}

async function loadPartidaContext(partidaId: number, userId: string) {
  const supabase = await createClient();
  const { data: partida } = await supabase
    .from("partidas")
    .select(
      "id, match_id, esporte_id, torneio_id, jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, status, status_ranking, lancado_por, placar_1, placar_2, time1_id, time2_id, modalidade"
    )
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) {
    return {
      supabase,
      partida: null,
      podeRegistrarTorneio: false,
      scope: { isColetivo: false, isParticipant: false, isTeamOwner: false, isTeamMember: false } as ActorScope,
    };
  }
  const scope = await getActorScope(supabase, partida as PartidaCtx, userId);
  const torneioAccess = partida.torneio_id
    ? await getTorneioStaffAccess(supabase, Number(partida.torneio_id), userId)
    : null;
  const podeRegistrarTorneio = torneioAccess ? canLaunchTorneioScore(torneioAccess) : false;
  return { supabase, partida: partida as PartidaCtx, scope, podeRegistrarTorneio };
}

async function notifyUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: string | null | undefined,
  remetenteId: string,
  referenciaId: number,
  mensagem: string
) {
  if (!usuarioId) return;
  await supabase.from("notificacoes").insert({
    usuario_id: usuarioId,
    mensagem,
    tipo: "desafio",
    referencia_id: referenciaId,
    lida: false,
    remetente_id: remetenteId,
    data_criacao: new Date().toISOString(),
  });
}

function toOptionalFiniteNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toOptionalBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const n = v.trim().toLowerCase();
    if (n === "true") return true;
    if (n === "false") return false;
  }
  return null;
}

export async function submitPlacarAction(formData: FormData) {
  const partidaId = Number(formData.get("partida_id"));
  if (!Number.isFinite(partidaId) || partidaId < 1) redirect("/agenda");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/registrar-placar/${partidaId}`);

  const placar1 = toInt(formData.get("placar_1"));
  const placar2 = toInt(formData.get("placar_2"));
  const observacao = sanitizeUserText(formData.get("observacao"), 500);
  const woAtivo = String(formData.get("wo_ativo") ?? "") === "1";
  const woVencedor = String(formData.get("wo_vencedor") ?? "").trim();
  if (!woAtivo && (placar1 == null || placar2 == null)) go(partidaId, "erro", "Informe placares válidos.");

  const ctx = await loadPartidaContext(partidaId, user.id);
  if (!ctx.partida) go(partidaId, "erro", "Partida não encontrada.");
  const p = ctx.partida;
  const esporteRegrasRaw = p.esporte_id
    ? await ctx.supabase
        .from("esportes")
        .select("desafio_modo_lancamento, desafio_regras_placar_json")
        .eq("id", p.esporte_id)
        .maybeSingle()
    : null;
  const regrasPlacar =
    esporteRegrasRaw?.data?.desafio_regras_placar_json &&
    typeof esporteRegrasRaw.data.desafio_regras_placar_json === "object" &&
    !Array.isArray(esporteRegrasRaw.data.desafio_regras_placar_json)
      ? (esporteRegrasRaw.data.desafio_regras_placar_json as Record<string, unknown>)
      : {};
  const minPlacar = toOptionalFiniteNumber(regrasPlacar.minPlacar);
  const maxPlacar = toOptionalFiniteNumber(regrasPlacar.maxPlacar);
  const permitirEmpate = toOptionalBoolean(regrasPlacar.permitirEmpate);
  const permitirWO = toOptionalBoolean(regrasPlacar.permitirWO);
  const status = normStatus(p.status);
  const canActRegular = p.torneio_id
    ? ctx.podeRegistrarTorneio
    : ctx.scope.isColetivo
      ? ctx.scope.isTeamOwner && (status === "agendada" || (status === "aguardando_confirmacao" && p.lancado_por === user.id))
      : ctx.scope.isParticipant && (status === "agendada" || (status === "aguardando_confirmacao" && p.lancado_por === user.id));
  if (!canActRegular) go(partidaId, "erro", "Sem permissão para lançar resultado nesta partida.");
  if (woAtivo && permitirWO === false) go(partidaId, "erro", "Este esporte não permite W.O. por configuração.");
  if (!woAtivo && permitirEmpate === false && placar1 === placar2) go(partidaId, "erro", "Empate não é permitido neste esporte.");
  if (!woAtivo && minPlacar != null && ((placar1 as number) < minPlacar || (placar2 as number) < minPlacar)) {
    go(partidaId, "erro", `Placar mínimo permitido: ${minPlacar}.`);
  }
  if (!woAtivo && maxPlacar != null && ((placar1 as number) > maxPlacar || (placar2 as number) > maxPlacar)) {
    go(partidaId, "erro", `Placar máximo permitido: ${maxPlacar}.`);
  }

  const finalPlacar1 = woAtivo ? (woVencedor === "j2" ? 0 : 1) : (placar1 as number);
  const finalPlacar2 = woAtivo ? (woVencedor === "j2" ? 1 : 0) : (placar2 as number);
  if (woAtivo && woVencedor !== "j1" && woVencedor !== "j2") go(partidaId, "erro", "Selecione o vencedor por W.O.");
  const woMsg = woAtivo ? "Vitória por W.O. (adversário não compareceu)." : "";
  const mensagemFinal = [woMsg, observacao].filter(Boolean).join(" ").trim();

  const placarDesafiante =
    p.desafiante_id && p.desafiante_id === p.jogador1_id
      ? finalPlacar1
      : p.desafiante_id && p.desafiante_id === p.jogador2_id
        ? finalPlacar2
        : null;
  const placarDesafiado =
    p.desafiado_id && p.desafiado_id === p.jogador1_id
      ? finalPlacar1
      : p.desafiado_id && p.desafiado_id === p.jogador2_id
        ? finalPlacar2
        : null;

  const now = new Date().toISOString();
  const isTorneio = Boolean(p.torneio_id);
  const updatePayload = {
    placar_1: finalPlacar1,
    placar_2: finalPlacar2,
    placar_desafiante: placarDesafiante,
    placar_desafiado: placarDesafiado,
    placar: `${finalPlacar1} x ${finalPlacar2}`,
    mensagem: mensagemFinal || null,
    tipo_partida: woAtivo ? "wo" : "ranking",
    data_resultado: now,
    lancado_por: user.id,
    status: isTorneio ? "concluida" : "aguardando_confirmacao",
    status_ranking: isTorneio ? "validado" : "pendente_confirmacao",
    data_validacao: isTorneio ? now : null,
  };
  const { error } = await ctx.supabase.from("partidas").update(updatePayload).eq("id", partidaId);
  if (error) go(partidaId, "erro", "Não foi possível salvar o placar.");

  if (!isTorneio) {
    const oponenteId = p.jogador1_id === user.id ? p.jogador2_id : p.jogador1_id;
    await notifyUser(
      ctx.supabase,
      oponenteId,
      user.id,
      partidaId,
      `Seu oponente lançou o resultado (${finalPlacar1} x ${finalPlacar2}). Acesse a Agenda para confirmar ou contestar.`
    );
  }

  revalidatePath(`/registrar-placar/${partidaId}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/comunidade");
  go(partidaId, "ok", isTorneio ? "Resultado lançado e validado." : "Resultado enviado para confirmação do oponente.");
}

export async function confirmarPlacarAction(formData: FormData) {
  const partidaId = Number(formData.get("partida_id"));
  if (!Number.isFinite(partidaId) || partidaId < 1) redirect("/agenda");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/registrar-placar/${partidaId}`);

  const ctx = await loadPartidaContext(partidaId, user.id);
  if (!ctx.partida) go(partidaId, "erro", "Partida não encontrada.");
  const p = ctx.partida;
  const canConfirm = ctx.scope.isColetivo ? ctx.scope.isTeamOwner : ctx.scope.isParticipant;
  if (!canConfirm || p.lancado_por === user.id || normStatus(p.status) !== "aguardando_confirmacao") {
    go(partidaId, "erro", "Esta partida não está disponível para confirmação por este usuário.");
  }

  const now = new Date().toISOString();
  const { error } = await ctx.supabase
    .from("partidas")
    .update({
      status: "concluida",
      status_ranking: "validado",
      data_validacao: now,
      data_resultado: now,
    })
    .eq("id", partidaId);
  if (error) go(partidaId, "erro", "Não foi possível confirmar o placar.");

  const p1 = p.desafiante_id ?? p.jogador1_id ?? p.usuario_id;
  const p2 = p.desafiado_id ?? p.jogador2_id;
  if (p.match_id) {
    await ctx.supabase.from("matches").update({ status: "Concluido", data_confirmacao: now }).eq("id", p.match_id);
  } else if (p.esporte_id && p1 && p2) {
    const { data: matchRow } = await ctx.supabase
      .from("matches")
      .select("id")
      .eq("status", "Aceito")
      .eq("finalidade", "ranking")
      .eq("esporte_id", p.esporte_id)
      .or(`and(usuario_id.eq.${p1},adversario_id.eq.${p2}),and(usuario_id.eq.${p2},adversario_id.eq.${p1})`)
      .order("data_confirmacao", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (matchRow?.id) {
      await ctx.supabase
        .from("matches")
        .update({ status: "Concluido", data_confirmacao: now })
        .eq("id", Number(matchRow.id));
    }
  }

  await notifyUser(ctx.supabase, p.lancado_por, user.id, partidaId, "Seu resultado foi confirmado e a partida foi concluída.");

  revalidatePath(`/registrar-placar/${partidaId}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/comunidade");
  go(partidaId, "ok", "Resultado confirmado com sucesso.");
}

export async function contestarPlacarAction(formData: FormData) {
  const partidaId = Number(formData.get("partida_id"));
  if (!Number.isFinite(partidaId) || partidaId < 1) redirect("/agenda");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/registrar-placar/${partidaId}`);

  const ctx = await loadPartidaContext(partidaId, user.id);
  if (!ctx.partida) go(partidaId, "erro", "Partida não encontrada.");
  const p = ctx.partida;
  const canContest = ctx.scope.isColetivo ? ctx.scope.isTeamOwner : ctx.scope.isParticipant;
  if (!canContest || p.lancado_por === user.id || normStatus(p.status) !== "aguardando_confirmacao") {
    go(partidaId, "erro", "Esta partida não está disponível para contestação por este usuário.");
  }

  const { error } = await ctx.supabase
    .from("partidas")
    .update({
      status: "agendada",
      status_ranking: "contestado",
      data_validacao: null,
      data_resultado: null,
      placar_1: null,
      placar_2: null,
      placar_desafiante: null,
      placar_desafiado: null,
      placar: null,
      lancado_por: null,
    })
    .eq("id", partidaId);
  if (error) go(partidaId, "erro", "Não foi possível contestar o placar.");

  await notifyUser(
    ctx.supabase,
    p.lancado_por,
    user.id,
    partidaId,
    "O resultado informado foi contestado pelo oponente. Registre novamente o resultado."
  );

  revalidatePath(`/registrar-placar/${partidaId}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/comunidade");
  go(partidaId, "ok", "Resultado contestado. A partida voltou para agendada.");
}

export async function salvarAgendamentoAction(formData: FormData) {
  const partidaId = Number(formData.get("partida_id"));
  if (!Number.isFinite(partidaId) || partidaId < 1) redirect("/agenda");
  const modoAgenda = String(formData.get("modo_agenda") ?? "") === "1";
  const dataPartida = String(formData.get("data_partida") ?? "").trim();
  const localStr = sanitizeUserText(formData.get("local_str"), 180);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/registrar-placar/${partidaId}${modoAgenda ? "?modo=agenda" : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const ctx = await loadPartidaContext(partidaId, user.id);
  if (!ctx.partida) salvarAgendaRedirect(partidaId, "erro", "Partida não encontrada.", modoAgenda);
  const p = ctx.partida;
  const canSchedule = p.torneio_id
    ? ctx.podeRegistrarTorneio
    : ctx.scope.isColetivo
      ? ctx.scope.isTeamOwner
      : ctx.scope.isParticipant;
  if (!canSchedule) {
    salvarAgendaRedirect(partidaId, "erro", "Sem permissão para editar o agendamento desta partida.", modoAgenda);
  }

  const payload: { data_partida?: string | null; local_str?: string | null } = {
    local_str: sanitizeOptionalUserText(localStr, 180),
  };
  if (dataPartida) {
    const dt = new Date(dataPartida);
    if (Number.isNaN(dt.getTime())) {
      salvarAgendaRedirect(partidaId, "erro", "Data/hora de agendamento inválida.", modoAgenda);
    }
    payload.data_partida = dt.toISOString();
  }

  const { error } = await ctx.supabase.from("partidas").update(payload).eq("id", partidaId);
  if (error) salvarAgendaRedirect(partidaId, "erro", "Não foi possível salvar o agendamento.", modoAgenda);

  revalidatePath(`/registrar-placar/${partidaId}`);
  revalidatePath("/agenda");
  revalidatePath("/comunidade");
  const okMsg = modoAgenda
    ? "Agendamento salvo. Lançamento do resultado: Painel de controle."
    : "Agendamento salvo. Você pode lançar o resultado quando quiser.";
  salvarAgendaRedirect(partidaId, "ok", okMsg, modoAgenda);
}
