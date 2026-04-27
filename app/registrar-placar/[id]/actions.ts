"use server";

import { redirect } from "next/navigation";
import { resolveVariantFromRules, type ScoreRulesConfig } from "@/lib/desafio/score-rules";
import { buildSetFormatOptions, getMatchUIConfig, validateMatchScorePayload, type MatchScorePayload } from "@/lib/match-scoring";
import { hasMaliciousPayload } from "@/lib/security/request-guards";
import { sanitizeOptionalUserText, sanitizeUserText } from "@/lib/security/sanitize-input";
import { createClient } from "@/lib/supabase/server";
import { loadPartidaContext, revalidateAfterPartidaPlacarChange } from "@/lib/torneios/lancar-resultado-partida";

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

function toRulesConfig(v: unknown): ScoreRulesConfig {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as ScoreRulesConfig;
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
  const scoreFormatKey = String(formData.get("score_format_key") ?? "").trim();
  const scorePayloadRaw = String(formData.get("score_payload") ?? "").trim();
  const observacao = sanitizeUserText(formData.get("observacao"), 500);
  const placarVariante = String(formData.get("placar_variante") ?? "").trim();
  const woAtivo = String(formData.get("wo_ativo") ?? "") === "1";
  const woVencedor = String(formData.get("wo_vencedor") ?? "").trim();
  if (!woAtivo && (placar1 == null || placar2 == null)) go(partidaId, "erro", "Informe placares válidos.");
  if (hasMaliciousPayload(observacao)) go(partidaId, "erro", "Observação inválida.");

  const ctx = await loadPartidaContext(partidaId, user.id);
  if (!ctx.partida) go(partidaId, "erro", "Partida não encontrada.");
  const p = ctx.partida;
  let payloadFromUI: MatchScorePayload | null = null;
  if (scorePayloadRaw) {
    try {
      payloadFromUI = JSON.parse(scorePayloadRaw) as MatchScorePayload;
    } catch {
      go(partidaId, "erro", "Formato de placar inválido.");
    }
  }
  const esporteRegrasRaw = p.esporte_id
    ? await ctx.supabase
        .from("esportes")
        .select("desafio_modo_lancamento, desafio_regras_placar_json")
        .eq("id", p.esporte_id)
        .maybeSingle()
    : null;
  const regrasPlacar = toRulesConfig(esporteRegrasRaw?.data?.desafio_regras_placar_json);
  const [{ data: sportConfigRow }, { data: formatConfigRow }] = p.match_id
    ? await Promise.all([
        ctx.supabase.from("matches").select("sport_id, sports(name, scoring_type)").eq("id", p.match_id).maybeSingle(),
        ctx.supabase
          .from("matches")
          .select(
            "format_id, sport_formats(sets_to_win,games_per_set,tiebreak,tiebreak_points,final_set_super_tiebreak,points_limit,win_by_two,has_overtime,has_penalties,max_rounds)"
          )
          .eq("id", p.match_id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const sportObj = Array.isArray((sportConfigRow as { sports?: unknown[] } | null)?.sports)
    ? (sportConfigRow as { sports?: unknown[] }).sports?.[0]
    : (sportConfigRow as { sports?: unknown } | null)?.sports;
  const partidaSportObj = Array.isArray((p as { esportes?: unknown[] } | null)?.esportes)
    ? ((p as { esportes?: unknown[] }).esportes?.[0] as { nome?: string } | undefined)
    : ((p as { esportes?: unknown } | null)?.esportes as { nome?: string } | null | undefined);
  const sportName = (sportObj as { name?: string } | null)?.name ?? partidaSportObj?.nome ?? null;
  const formatObj = Array.isArray((formatConfigRow as { sport_formats?: unknown[] } | null)?.sport_formats)
    ? (formatConfigRow as { sport_formats?: unknown[] }).sport_formats?.[0]
    : (formatConfigRow as { sport_formats?: unknown } | null)?.sport_formats;
  let dynamicConfig = getMatchUIConfig({
    sport: {
      name: sportName,
      scoring_type: (sportObj as { scoring_type?: string } | null)?.scoring_type ?? "sets",
    },
    format: (formatObj as Record<string, unknown> | null) ?? {},
  });
  if (dynamicConfig.type === "sets") {
    const setFormatOptions = buildSetFormatOptions({
      sportName,
      baseConfig: dynamicConfig,
      rules: regrasPlacar,
    });
    if (setFormatOptions.length === 1) {
      const uniqueOption = setFormatOptions[0];
      if (!scoreFormatKey || scoreFormatKey === uniqueOption.key) {
        dynamicConfig = uniqueOption.config;
      } else {
        go(partidaId, "erro", "Formato disputado inválido para este esporte.");
      }
    } else if (setFormatOptions.length > 1) {
      if (!scoreFormatKey) {
        go(partidaId, "erro", "Selecione o formato disputado antes de salvar o resultado.");
      }
      const selected = setFormatOptions.find((opt) => opt.key === scoreFormatKey);
      if (!selected) {
        go(partidaId, "erro", "Formato disputado inválido para este esporte.");
      }
      dynamicConfig = selected.config;
    }
  }
  const selectedVariant = resolveVariantFromRules(regrasPlacar, placarVariante);
  const minPlacar = toOptionalFiniteNumber(selectedVariant?.minPlacar ?? regrasPlacar.minPlacar);
  const maxPlacar = toOptionalFiniteNumber(selectedVariant?.maxPlacar ?? regrasPlacar.maxPlacar);
  const permitirEmpate = toOptionalBoolean(selectedVariant?.permitirEmpate ?? regrasPlacar.permitirEmpate);
  const permitirWO = toOptionalBoolean(selectedVariant?.permitirWO ?? regrasPlacar.permitirWO);
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

  let finalPlacar1 = woAtivo ? (woVencedor === "j2" ? 0 : 1) : (placar1 as number);
  let finalPlacar2 = woAtivo ? (woVencedor === "j2" ? 1 : 0) : (placar2 as number);
  if (!woAtivo && payloadFromUI) {
    const dynamicValidation = validateMatchScorePayload(dynamicConfig, payloadFromUI);
    if (!dynamicValidation.valid || dynamicValidation.placar1 == null || dynamicValidation.placar2 == null) {
      go(partidaId, "erro", dynamicValidation.message ?? "Placar inválido para este formato.");
    }
    finalPlacar1 = dynamicValidation.placar1;
    finalPlacar2 = dynamicValidation.placar2;
  }
  if (woAtivo && woVencedor !== "j1" && woVencedor !== "j2") go(partidaId, "erro", "Selecione o vencedor por W.O.");
  const woMsg = woAtivo ? "Vitória por W.O. (adversário não compareceu)." : "";
  const payloadMsg = payloadFromUI ? `| score_payload:${JSON.stringify(payloadFromUI)}` : "";
  const mensagemFinal = [woMsg, observacao, payloadMsg].filter(Boolean).join(" ").trim();

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

  revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
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

  revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
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

  revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
  go(partidaId, "ok", "Resultado contestado. A partida voltou para agendada.");
}

export async function salvarAgendamentoAction(formData: FormData) {
  const partidaId = Number(formData.get("partida_id"));
  if (!Number.isFinite(partidaId) || partidaId < 1) redirect("/agenda");
  const modoAgenda = String(formData.get("modo_agenda") ?? "") === "1";
  const dataPartida = String(formData.get("data_partida") ?? "").trim();
  const localStr = sanitizeUserText(formData.get("local_str"), 180);
  if (hasMaliciousPayload(localStr)) salvarAgendaRedirect(partidaId, "erro", "Local inválido.", modoAgenda);

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

  revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
  const okMsg = modoAgenda
    ? "Agendamento salvo. Lançamento do resultado: Painel de controle."
    : "Agendamento salvo. Você pode lançar o resultado quando quiser.";
  salvarAgendaRedirect(partidaId, "ok", okMsg, modoAgenda);
}
