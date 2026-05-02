"use server";

import { redirect } from "next/navigation";
import { resolveVariantFromRules, type ScoreRulesConfig } from "@/lib/desafio/score-rules";
import { buildSetFormatOptions, getMatchUIConfig, validateMatchScorePayload, type MatchScorePayload } from "@/lib/match-scoring";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { getIsPlatformAdmin } from "@/lib/auth/platform-admin";
import { hasMaliciousPayload } from "@/lib/security/request-guards";
import { sanitizeOptionalUserText, sanitizeUserText } from "@/lib/security/sanitize-input";
import { createClient } from "@/lib/supabase/server";
import { resolveOponenteLeaderUserIdForNotificacao } from "@/lib/agenda/partidas-usuario";
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
    await triggerPushForNotificationIdsBestEffort([notifId], { source: "registrar-placar/actions.notifyUser" });
  }
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

function isRankingStatus(value: string | null | undefined, expected: string): boolean {
  return String(value ?? "")
    .trim()
    .toLowerCase() === expected;
}

function isScorePayloadEffectivelyEmpty(payload: MatchScorePayload | null): boolean {
  if (!payload) return true;
  if (payload.type === "sets") {
    return (payload.sets ?? []).every((s) => {
      const a = Number(s?.a ?? 0);
      const b = Number(s?.b ?? 0);
      const ta = Number(s?.tiebreakA ?? 0);
      const tb = Number(s?.tiebreakB ?? 0);
      return a === 0 && b === 0 && ta === 0 && tb === 0;
    });
  }
  if (payload.type === "pontos") {
    return Number(payload.points?.a ?? 0) === 0 && Number(payload.points?.b ?? 0) === 0;
  }
  if (payload.type === "gols") {
    return (
      Number(payload.goals?.a ?? 0) === 0 &&
      Number(payload.goals?.b ?? 0) === 0 &&
      Number(payload.goals?.overtimeA ?? 0) === 0 &&
      Number(payload.goals?.overtimeB ?? 0) === 0 &&
      Number(payload.goals?.penaltiesA ?? 0) === 0 &&
      Number(payload.goals?.penaltiesB ?? 0) === 0
    );
  }
  if (payload.type === "rounds") {
    const items = payload.rounds?.items ?? [];
    if (!items.length) return true;
    return items.every((r) => Number(r?.a ?? 0) === 0 && Number(r?.b ?? 0) === 0);
  }
  return false;
}

export async function submitPlacarAction(formData: FormData) {
  const partidaId = Number(formData.get("partida_id"));
  if (!Number.isFinite(partidaId) || partidaId < 1) redirect("/agenda");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/registrar-placar/${partidaId}`);
  const isPlatformAdmin = await getIsPlatformAdmin();

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
        .select("nome, desafio_modo_lancamento, desafio_regras_placar_json")
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
  const sportName =
    (sportObj as { name?: string } | null)?.name ??
    partidaSportObj?.nome ??
    (esporteRegrasRaw?.data as { nome?: string } | null)?.nome ??
    null;
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
  const emAnaliseAdmin = isRankingStatus(p.status_ranking, "em_analise_admin");
  const emFluxoContestado =
    isRankingStatus(p.status_ranking, "contestado") ||
    isRankingStatus(p.status_ranking, "resultado_contestado") ||
    isRankingStatus(p.status_ranking, "pendente_confirmacao_revisao");
  const actorCanRegular = ctx.scope.isColetivo ? ctx.scope.isTeamLeader : ctx.scope.isParticipant;
  const canActRegular = p.torneio_id
    ? ctx.podeRegistrarTorneio
    : emFluxoContestado
      ? actorCanRegular &&
        p.lancado_por === user.id &&
        (status === "aguardando_confirmacao" || status === "agendada")
      : actorCanRegular && (status === "agendada" || (status === "aguardando_confirmacao" && p.lancado_por === user.id));
  if (emAnaliseAdmin) go(partidaId, "erro", "Esta partida está em análise do admin.");
  if (!canActRegular && !isPlatformAdmin) go(partidaId, "erro", "Sem permissão para lançar resultado nesta partida.");
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
  if (!woAtivo && !payloadFromUI) {
    go(partidaId, "erro", "Preencha o placar antes de enviar o resultado.");
  }
  if (!woAtivo && payloadFromUI) {
    const dynamicValidation = validateMatchScorePayload(dynamicConfig, payloadFromUI);
    if (!dynamicValidation.valid || dynamicValidation.placar1 == null || dynamicValidation.placar2 == null) {
      go(partidaId, "erro", dynamicValidation.message ?? "Placar inválido para este formato.");
    }
    if (isScorePayloadEffectivelyEmpty(payloadFromUI) || (dynamicValidation.placar1 === 0 && dynamicValidation.placar2 === 0)) {
      go(partidaId, "erro", "Preencha o placar antes de enviar o resultado.");
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
  const revisaoAposContestacao = isRankingStatus(p.status_ranking, "resultado_contestado");
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
    status_ranking: isTorneio ? "validado" : revisaoAposContestacao ? "pendente_confirmacao_revisao" : "pendente_confirmacao",
    data_validacao: isTorneio ? now : null,
  };
  const { error } = await ctx.supabase.from("partidas").update(updatePayload).eq("id", partidaId);
  if (error) go(partidaId, "erro", "Não foi possível salvar o placar.");

  if (!isTorneio) {
    const oponenteId = await resolveOponenteLeaderUserIdForNotificacao(ctx.supabase, p, user.id);
    await notifyUser(
      ctx.supabase,
      oponenteId,
      user.id,
      partidaId,
      `Seu oponente lançou o resultado (${finalPlacar1} x ${finalPlacar2}). Acesse o Painel (Partidas e resultados) ou a Agenda para confirmar ou contestar.`
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
  const canConfirm = ctx.scope.isColetivo ? ctx.scope.isTeamLeader : ctx.scope.isParticipant;
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
  const canContest = ctx.scope.isColetivo ? ctx.scope.isTeamLeader : ctx.scope.isParticipant;
  if (!canContest || p.lancado_por === user.id || normStatus(p.status) !== "aguardando_confirmacao") {
    go(partidaId, "erro", "Esta partida não está disponível para contestação por este usuário.");
  }

  const segundaContestacaoSemAcordo = isRankingStatus(p.status_ranking, "pendente_confirmacao_revisao");

  if (segundaContestacaoSemAcordo) {
    const alvoUsuarioId = p.lancado_por;
    if (alvoUsuarioId) {
      const texto = `Sem acordo no placar da partida #${partidaId}. O segundo resultado reenviado também foi contestado. Solicita-se mediação administrativa para decisão (W.O. ou cancelamento).`;
      await ctx.supabase.rpc("registrar_denuncia_usuario", {
        p_alvo_usuario_id: alvoUsuarioId,
        p_codigo_motivo: "outro",
        p_texto: texto,
      });
    }

    const { error: reviewError } = await ctx.supabase
      .from("partidas")
      .update({
        status: "aguardando_confirmacao",
        status_ranking: "em_analise_admin",
        data_validacao: null,
      })
      .eq("id", partidaId);
    if (reviewError) go(partidaId, "erro", "Não foi possível enviar o caso para análise administrativa.");

    const oponenteId = p.lancado_por;
    await notifyUser(
      ctx.supabase,
      oponenteId,
      user.id,
      partidaId,
      "Seu resultado foi novamente contestado e o caso foi enviado ao admin para mediação."
    );
    await notifyUser(
      ctx.supabase,
      user.id,
      user.id,
      partidaId,
      "Resultado novamente contestado. Caso enviado ao admin para mediação via contato no WhatsApp."
    );

    revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
    go(partidaId, "ok", "Resultado contestado novamente. Caso enviado ao admin para mediação.");
  }

  const { error } = await ctx.supabase
    .from("partidas")
    .update({
      status: "aguardando_confirmacao",
      status_ranking: "resultado_contestado",
      data_validacao: null,
      data_resultado: null,
      placar_1: null,
      placar_2: null,
      placar_desafiante: null,
      placar_desafiado: null,
      placar: null,
      lancado_por: user.id,
      mensagem: "Resultado contestado. Quem contestou deve enviar o novo resultado para aprovação.",
    })
    .eq("id", partidaId);
  if (error) go(partidaId, "erro", "Não foi possível contestar o placar.");

  await notifyUser(
    ctx.supabase,
    p.lancado_por,
    user.id,
    partidaId,
    "O resultado informado foi contestado. Envie um novo resultado para o oponente revisar."
  );

  revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
  go(partidaId, "ok", "Resultado contestado. Envie um novo resultado para aprovação do oponente.");
}

export async function abrirMediacaoAdminAction(formData: FormData) {
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
  const canMediate = ctx.scope.isColetivo ? ctx.scope.isTeamLeader : ctx.scope.isParticipant;
  const status = normStatus(p.status);
  const emFluxoContestado =
    isRankingStatus(p.status_ranking, "contestado") ||
    isRankingStatus(p.status_ranking, "resultado_contestado") ||
    isRankingStatus(p.status_ranking, "pendente_confirmacao_revisao");
  const aguardando = status === "aguardando_confirmacao" || (status === "agendada" && emFluxoContestado);
  if (!canMediate || !aguardando) {
    go(partidaId, "erro", "Esta partida não está disponível para mediação.");
  }
  if (!emFluxoContestado) {
    go(partidaId, "erro", "A mediação só pode ser aberta em fluxo de resultado contestado.");
  }
  if (p.lancado_por === user.id) {
    go(partidaId, "erro", "A mediação deve ser aberta pelo oponente que recebeu o resultado contestado.");
  }

  const alvoUsuarioId = p.lancado_por;
  if (alvoUsuarioId) {
    const texto = `Divergência de placar na partida #${partidaId}. O oponente abriu mediação administrativa para decisão (W.O. ou cancelamento).`;
    await ctx.supabase.rpc("registrar_denuncia_usuario", {
      p_alvo_usuario_id: alvoUsuarioId,
      p_codigo_motivo: "outro",
      p_texto: texto,
    });
  }

  const { error } = await ctx.supabase
    .from("partidas")
    .update({
      status: "aguardando_confirmacao",
      status_ranking: "em_analise_admin",
      data_validacao: null,
      mensagem: "Divergência de resultado em mediação administrativa.",
    })
    .eq("id", partidaId);
  if (error) go(partidaId, "erro", "Não foi possível abrir mediação com o admin.");

  await notifyUser(
    ctx.supabase,
    p.lancado_por,
    user.id,
    partidaId,
    "O oponente abriu mediação administrativa para resolver a divergência de placar."
  );
  await notifyUser(
    ctx.supabase,
    user.id,
    user.id,
    partidaId,
    "Mediação administrativa aberta. O admin vai analisar e decidir o desfecho."
  );

  revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
  go(partidaId, "ok", "Mediação com o admin aberta com sucesso.");
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
      ? ctx.scope.isTeamLeader
      : ctx.scope.isParticipant;
  if (!canSchedule) {
    salvarAgendaRedirect(partidaId, "erro", "Sem permissão para editar o agendamento desta partida.", modoAgenda);
  }

  const payload: {
    data_partida?: string | null;
    local_str?: string | null;
    status?: string;
    agendamento_proposto_por?: string | null;
    agendamento_aceite_deadline?: string | null;
    agendamento_aceito_por?: string | null;
    mensagem?: string | null;
  } = {
    local_str: sanitizeOptionalUserText(localStr, 180),
  };
  if (dataPartida) {
    const dt = new Date(dataPartida);
    if (Number.isNaN(dt.getTime())) {
      salvarAgendaRedirect(partidaId, "erro", "Data/hora de agendamento inválida.", modoAgenda);
    }
    payload.data_partida = dt.toISOString();
  }

  const agendamentoPendenteAceite = !p.torneio_id && Boolean(payload.data_partida && payload.local_str);
  if (agendamentoPendenteAceite) {
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    payload.status = "aguardando_aceite_agendamento";
    payload.agendamento_proposto_por = user.id;
    payload.agendamento_aceite_deadline = deadline;
    payload.agendamento_aceito_por = null;
    payload.mensagem = "Agendamento proposto. Aguardando aceite do oponente (24h).";
  }

  const { error } = await ctx.supabase.from("partidas").update(payload).eq("id", partidaId);
  if (error) salvarAgendaRedirect(partidaId, "erro", "Não foi possível salvar o agendamento.", modoAgenda);

  if (!p.torneio_id) {
    const oponenteId = await resolveOponenteLeaderUserIdForNotificacao(ctx.supabase, p, user.id);
    const when = payload.data_partida ? new Date(payload.data_partida).toLocaleString("pt-BR") : "data a combinar";
    const where = payload.local_str ? String(payload.local_str) : "local a combinar";
    await notifyUser(
      ctx.supabase,
      oponenteId,
      user.id,
      partidaId,
      `Seu oponente propôs agendamento: ${when} • ${where}. Acesse a Agenda para aceitar em até 24h.`
    );
  }

  revalidateAfterPartidaPlacarChange(partidaId, p.torneio_id);
  const okMsg = agendamentoPendenteAceite
    ? "Agendamento enviado para aceite do oponente (prazo de 24h)."
    : modoAgenda
      ? "Agendamento salvo. Lançamento do resultado: Painel de controle."
      : "Agendamento salvo. Você pode lançar o resultado quando quiser.";
  salvarAgendaRedirect(partidaId, "ok", okMsg, modoAgenda);
}
