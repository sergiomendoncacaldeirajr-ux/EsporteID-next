import { notFound } from "next/navigation";
import { cache } from "react";
import {
  formacaoTemMatchAceitoEntre,
  podeExibirWhatsappPerfilFormacao,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import {
  computeLatestActiveRankingCooldownEndForTeamInSport,
  computeRankingBlockedUntilColetivo,
} from "@/lib/match/coletivo-ranking-cooldown";
import { fetchDashboardRankingCooldownBlocklists } from "@/lib/match/dashboard-ranking-cooldown-blocklists";
import {
  fetchPendingRankingOpponentTimeIdsForAlvo,
  filterFormacoesSemParPendenteComAlvo,
} from "@/lib/match/pending-ranking-opponents-of-alvo";
import { viewerTemUsuarioEidNoEsporte } from "@/lib/match/viewer-esporte-confronto";
import { buildFormacaoResultadosPerfil } from "@/lib/perfil/build-formacao-resultados-perfil";
import {
  carregarPartidasColetivasDoTime,
  mapDetalhesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";
import { podeExcluirFormacaoComoLider } from "@/lib/formacao/pode-excluir-formacao-lider";
import type { TeamPublicPendingInvite } from "@/components/times/team-public-invite-block";

async function loadPerfilTimeIdentityUncached(timeId: number, viewerId: string) {
  const id = timeId;
  if (!Number.isFinite(id) || id < 1) notFound();

  const supabase = await createClient();

  const { data: t } = await supabase
    .from("times")
    .select(
      "id, nome, username, bio, tipo, localizacao, escudo, pontos_ranking, eid_time, esporte_id, criador_id, interesse_rank_match, disponivel_amistoso, disponivel_amistoso_ate, vagas_abertas, aceita_pedidos, interesse_torneio, nivel_procurado, esportes(nome)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: criador }, { count: acima }, { data: membroViewer }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome, avatar_url, whatsapp")
      .eq("id", t.criador_id)
      .maybeSingle(),
    supabase
      .from("times")
      .select("id", { count: "exact", head: true })
      .eq("esporte_id", t.esporte_id)
      .eq("tipo", t.tipo ?? "time")
      .gt("pontos_ranking", t.pontos_ranking ?? 0),
    supabase
      .from("membros_time")
      .select("usuario_id")
      .eq("time_id", id)
      .eq("usuario_id", viewerId)
      .eq("status", "ativo")
      .maybeSingle(),
  ]);

  const posicao = (acima ?? 0) + 1;
  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
  const modalidade: "dupla" | "time" = (t.tipo ?? "time") === "dupla" ? "dupla" : "time";
  const isMember = Boolean(membroViewer);
  const isLeader = t.criador_id === viewerId;
  const canLeaveTeam = isMember && t.criador_id !== viewerId;
  const podeExcluirPerfilFormacao = isLeader && (await podeExcluirFormacaoComoLider(supabase, id, viewerId));
  const fromPublic = `/perfil-time/${id}`;
  const editarTimeHref = `/editar/time/${id}?from=${encodeURIComponent(fromPublic)}`;
  const excluirRedirectPara = `/editar/equipes?from=${encodeURIComponent(`/perfil/${viewerId}`)}`;

  return {
    id,
    viewerId,
    t,
    criador,
    posicao,
    esp,
    modalidade,
    isLeader,
    isMember,
    canLeaveTeam,
    podeExcluirPerfilFormacao,
    fromPublic,
    editarTimeHref,
    excluirRedirectPara,
  };
}

export const getPerfilTimeIdentity = cache(loadPerfilTimeIdentityUncached);

async function loadPerfilTimePartidasBundleUncached(timeId: number, viewerId: string) {
  const { id, t } = await getPerfilTimeIdentity(timeId, viewerId);
  const supabase = await createClient();
  const esporteIdNum = t.esporte_id != null ? Number(t.esporte_id) : 0;
  const partidasColetivas =
    esporteIdNum > 0 ? await carregarPartidasColetivasDoTime(supabase, id, esporteIdNum, viewerId) : [];
  const torneioNomeMap = await mapTorneioNomes(supabase, partidasColetivas);
  const oponenteDetalhes = await mapDetalhesTimesAdversarios(supabase, id, partidasColetivas);
  const tipoFmt = String(t.tipo ?? "time").trim().toLowerCase();
  const formacaoTipoFallback =
    tipoFmt === "dupla" ? "Dupla" : tipoFmt === "time" ? "Time" : "Equipe";
  const bundleResultados = buildFormacaoResultadosPerfil(
    partidasColetivas,
    id,
    oponenteDetalhes,
    torneioNomeMap,
    formacaoTipoFallback
  );
  const vitoriasTime = Number(bundleResultados.totais.vitorias ?? 0);
  const derrotasTime = Number(bundleResultados.totais.derrotas ?? 0);
  const jogosTime = vitoriasTime + derrotasTime;
  const winRateTime = jogosTime > 0 ? Math.round((vitoriasTime / jogosTime) * 100) : null;

  return {
    partidasColetivas,
    bundleResultados,
    vitoriasTime,
    derrotasTime,
    jogosTime,
    winRateTime,
  };
}

export const getPerfilTimePartidasBundle = cache(loadPerfilTimePartidasBundleUncached);

async function loadPerfilTimeMembrosHistPackUncached(timeId: number, viewerId: string) {
  const { id, t, modalidade } = await getPerfilTimeIdentity(timeId, viewerId);
  const supabase = await createClient();

  const [{ data: hist }, { data: eidLogs }, { data: membros }, { data: minhaCandidaturaPendente }] =
    await Promise.all([
      supabase
        .from("historico_eid_coletivo")
        .select("nota_nova, data_alteracao")
        .eq("time_id", id)
        .order("data_alteracao", { ascending: false })
        .limit(12),
      supabase
        .from("eid_logs")
        .select("change_amount, reason, created_at, esportes(nome)")
        .eq("entity_kind", "time")
        .eq("entity_time_id", id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("membros_time")
        .select("usuario_id, cargo, status, profiles(id, nome, avatar_url)")
        .eq("time_id", id)
        .eq("status", "ativo")
        .order("data_criacao", { ascending: true })
        .limit(40),
      supabase
        .from("time_candidaturas")
        .select("id")
        .eq("time_id", id)
        .eq("candidato_usuario_id", viewerId)
        .eq("status", "pendente")
        .maybeSingle(),
    ]);

  const rosterCap = modalidade === "dupla" ? 2 : 18;
  const { data: rosterHeadRaw, error: rosterHeadErr } = await supabase.rpc("time_roster_headcount", { p_time_id: id });
  const rosterHeadCount =
    !rosterHeadErr && rosterHeadRaw != null && Number.isFinite(Number(rosterHeadRaw)) ? Math.max(0, Number(rosterHeadRaw)) : 1;
  const vagasDisponiveis = Math.max(0, rosterCap - rosterHeadCount);

  const idsExcluirConvite = [
    ...new Set(
      [...(membros ?? []).map((m) => String(m.usuario_id)), String(t.criador_id ?? "")]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];

  return {
    hist,
    eidLogs,
    membros,
    minhaCandidaturaPendente,
    vagasDisponiveis,
    idsExcluirConvite,
  };
}

export const getPerfilTimeMembrosHistPack = cache(loadPerfilTimeMembrosHistPackUncached);

async function loadPerfilTimeVisitorMatchPackUncached(timeId: number, viewerId: string) {
  const { id, t, criador, modalidade, isLeader, isMember } = await getPerfilTimeIdentity(timeId, viewerId);
  const supabase = await createClient();

  const { data: minhaFormacao } = await supabase
    .from("times")
    .select("id")
    .eq("criador_id", viewerId)
    .eq("tipo", t.tipo ?? "time")
    .eq("esporte_id", t.esporte_id)
    .limit(1);

  const canChallenge = (minhaFormacao?.length ?? 0) > 0 && t.criador_id !== viewerId;
  const meuTimeId = minhaFormacao?.[0]?.id ?? null;

  const { data: membroOutrosTimes } = await supabase
    .from("membros_time")
    .select("time_id, times!inner(id, nome, criador_id, esporte_id, tipo)")
    .eq("usuario_id", viewerId)
    .eq("status", "ativo");

  const tipoAlvoNorm = (t.tipo ?? "time").trim().toLowerCase();
  const espAlvo = t.esporte_id != null ? Number(t.esporte_id) : null;
  const viewerPodeConfrontarNesteEsporte =
    espAlvo != null && Number.isFinite(espAlvo) && espAlvo > 0
      ? await viewerTemUsuarioEidNoEsporte(supabase, viewerId, espAlvo)
      : false;

  const formacoesMembroNaoLiderRaw: { id: number; nome: string }[] = [];
  for (const row of membroOutrosTimes ?? []) {
    const tm = Array.isArray(row.times) ? row.times[0] : row.times;
    if (!tm || tm.criador_id === viewerId) continue;
    if (espAlvo == null || Number(tm.esporte_id) !== espAlvo) continue;
    if (String(tm.tipo ?? "").trim().toLowerCase() !== tipoAlvoNorm) continue;
    if (Number(tm.id) === id) continue;
    formacoesMembroNaoLiderRaw.push({ id: Number(tm.id), nome: tm.nome ?? "Formação" });
  }

  const pendentesComEsteAlvo =
    espAlvo != null ? await fetchPendingRankingOpponentTimeIdsForAlvo(supabase, id, espAlvo) : new Set<number>();
  const semCarenciaVsAlvo: { id: number; nome: string }[] = [];
  if (espAlvo != null && formacoesMembroNaoLiderRaw.length > 0) {
    const blocos = await Promise.all(
      formacoesMembroNaoLiderRaw.map(async (f) => {
        const { blockedTeamIds } = await fetchDashboardRankingCooldownBlocklists(supabase, {
          viewerId,
          esporteId: espAlvo,
          viewerTeamIds: [f.id],
        });
        return { f, bloqueado: blockedTeamIds.has(id) };
      })
    );
    for (const { f, bloqueado } of blocos) {
      if (!bloqueado) semCarenciaVsAlvo.push(f);
    }
  }
  const candidatosSugerir =
    espAlvo != null && formacoesMembroNaoLiderRaw.length > 0 ? semCarenciaVsAlvo : formacoesMembroNaoLiderRaw;
  const formacoesMembroNaoLider = filterFormacoesSemParPendenteComAlvo(candidatosSugerir, id, pendentesComEsteAlvo);

  const canSugerirMatch =
    !isMember &&
    t.criador_id !== viewerId &&
    formacoesMembroNaoLider.length > 0 &&
    espAlvo != null &&
    !canChallenge;

  const podeVerWhatsappFormacao =
    !isLeader &&
    (await podeExibirWhatsappPerfilFormacao(supabase, viewerId, t.criador_id, id, meuTimeId));
  const linkWpp = podeVerWhatsappFormacao ? waMeHref(criador?.whatsapp) : null;

  const hasAceitoRank =
    canChallenge &&
    meuTimeId != null &&
    t.esporte_id != null &&
    (await formacaoTemMatchAceitoEntre(
      supabase,
      viewerId,
      meuTimeId,
      id,
      t.criador_id,
      Number(t.esporte_id),
      modalidade,
    ));

  const cooldownMeses = await getMatchRankCooldownMeses(supabase);
  let rankingBlockedUntilTime: string | null = null;
  if (canChallenge && t.esporte_id != null && meuTimeId != null) {
    rankingBlockedUntilTime = await computeRankingBlockedUntilColetivo(supabase, {
      esporteId: Number(t.esporte_id),
      modalidade,
      meuTimeId,
      alvoTimeId: id,
      cooldownMeses,
      fallbackViewerId: viewerId,
      fallbackOpponentLeaderId: t.criador_id ?? undefined,
    });
  }

  const temBlocoAcaoVisitante =
    linkWpp || (canChallenge && viewerPodeConfrontarNesteEsporte && !hasAceitoRank && Boolean(t.esporte_id));
  const mostrarAvisoSemEidNoEsporte =
    !isLeader && espAlvo != null && !viewerPodeConfrontarNesteEsporte && (canChallenge || canSugerirMatch);

  let convitesPendentesPublic: TeamPublicPendingInvite[] = [];
  if (isLeader) {
    const { data: pendRows } = await supabase
      .from("time_convites")
      .select("id, convidado_usuario_id")
      .eq("time_id", id)
      .eq("status", "pendente")
      .order("id", { ascending: false });
    const pids = [...new Set((pendRows ?? []).map((r) => String(r.convidado_usuario_id ?? "")).filter(Boolean))];
    if (pids.length > 0) {
      const { data: profsPend } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url, localizacao")
        .in("id", pids);
      const pmap = new Map((profsPend ?? []).map((p) => [String(p.id), p]));
      convitesPendentesPublic = (pendRows ?? [])
        .map((r) => {
          const pid = String(r.convidado_usuario_id ?? "");
          const pr = pmap.get(pid);
          return {
            conviteId: Number(r.id),
            nome: pr?.nome ?? "Atleta",
            avatarUrl: pr?.avatar_url ?? null,
            localizacao: pr?.localizacao ?? null,
          };
        })
        .filter((x) => Number.isFinite(x.conviteId) && x.conviteId > 0);
    }
  }

  return {
    canChallenge,
    meuTimeId,
    viewerPodeConfrontarNesteEsporte,
    formacoesMembroNaoLider,
    canSugerirMatch,
    linkWpp,
    hasAceitoRank,
    rankingBlockedUntilTime,
    temBlocoAcaoVisitante,
    mostrarAvisoSemEidNoEsporte,
    convitesPendentesPublic,
  };
}

export const getPerfilTimeVisitorMatchPack = cache(loadPerfilTimeVisitorMatchPackUncached);

/** Carência de ranking vigente para a formação (líder e membros veem no perfil). */
export const getPerfilTimeColetivoCooldownBanner = cache(async (timeId: number, viewerId: string) => {
  const identity = await getPerfilTimeIdentity(timeId, viewerId);
  if (!(identity.isMember || identity.isLeader) || !identity.t.esporte_id) {
    return { coletivoCooldownBannerUntilIso: null as string | null };
  }
  const supabase = await createClient();
  const cooldownMeses = await getMatchRankCooldownMeses(supabase);
  const coletivoCooldownBannerUntilIso = await computeLatestActiveRankingCooldownEndForTeamInSport(supabase, {
    teamId: identity.id,
    esporteId: Number(identity.t.esporte_id),
    modalidade: identity.modalidade,
    cooldownMeses,
  });
  return { coletivoCooldownBannerUntilIso };
});

export type PerfilTimePayload = Awaited<ReturnType<typeof loadPerfilTimePayloadMerged>>;

async function loadPerfilTimePayloadMerged(timeId: number, viewerId: string) {
  const identity = await getPerfilTimeIdentity(timeId, viewerId);
  const bundle = await getPerfilTimePartidasBundle(timeId, viewerId);
  const pack = await getPerfilTimeMembrosHistPack(timeId, viewerId);
  const visitor = await getPerfilTimeVisitorMatchPack(timeId, viewerId);
  return { ...identity, ...bundle, ...pack, ...visitor };
}

export const getPerfilTimePayload = cache(async (timeId: number, viewerId: string) =>
  loadPerfilTimePayloadMerged(timeId, viewerId),
);
