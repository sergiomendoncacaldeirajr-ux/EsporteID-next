import { notFound } from "next/navigation";
import { cache } from "react";
import {
  formacaoTemMatchAceitoEntre,
  podeExibirWhatsappPerfilFormacao,
  podeExibirWhatsappPerfilPublico,
  resolverTimeIdParaDuplaRegistrada,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { computeRankingBlockedUntilColetivo } from "@/lib/match/coletivo-ranking-cooldown";
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

async function loadPerfilDuplaIdentityUncached(duplaId: number, viewerId: string) {
  const id = duplaId;
  if (!Number.isFinite(id) || id < 1) notFound();

  const supabase = await createClient();

  const { data: d } = await supabase
    .from("duplas")
    .select("id, username, bio, player1_id, player2_id, criador_id, esporte_id, esportes(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const [{ data: p1 }, { data: p2 }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome, avatar_url, localizacao, whatsapp")
      .eq("id", d.player1_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, nome, avatar_url, localizacao, whatsapp")
      .eq("id", d.player2_id)
      .maybeSingle(),
  ]);

  const timeResolvidoId = await resolverTimeIdParaDuplaRegistrada(
    supabase,
    d.player1_id,
    d.player2_id,
    d.esporte_id,
  );

  const { data: timeResolvido } = timeResolvidoId
    ? await supabase
        .from("times")
        .select("id, criador_id, nome, username, escudo, localizacao, eid_time, pontos_ranking")
        .eq("id", timeResolvidoId)
        .maybeSingle()
    : { data: null };

  let posicaoDupla: number | null = null;
  if (timeResolvidoId && timeResolvido && d.esporte_id) {
    const { count: acimaD } = await supabase
      .from("times")
      .select("id", { count: "exact", head: true })
      .eq("esporte_id", d.esporte_id)
      .eq("tipo", "dupla")
      .gt("pontos_ranking", timeResolvido.pontos_ranking ?? 0);
    posicaoDupla = (acimaD ?? 0) + 1;
  }

  const { data: liderDupla } = timeResolvido?.criador_id
    ? await supabase.from("profiles").select("id, nome, whatsapp, avatar_url").eq("id", timeResolvido.criador_id).maybeSingle()
    : { data: null };

  const isMembroDupla = viewerId === d.player1_id || viewerId === d.player2_id;
  const donoDuplaId = d.criador_id ?? d.player1_id;
  const isDonoDupla = viewerId === donoDuplaId;
  const isLiderTimeDupla =
    Boolean(timeResolvidoId) && timeResolvido != null && timeResolvido.criador_id === viewerId;

  const idsExcluirConviteDupla = [
    ...new Set([d.player1_id, d.player2_id, viewerId].map((x) => String(x ?? "").trim()).filter(Boolean)),
  ];

  const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
  const espIdNum = d.esporte_id != null ? Number(d.esporte_id) : 0;

  const conquistas: string[] = [];
  if ((Number(timeResolvido?.eid_time ?? 0) ?? 0) >= 7) conquistas.push("Dupla Elite");
  if (Number(timeResolvido?.pontos_ranking ?? 0) >= 1200) conquistas.push("Rank Forte");
  if ((p1?.id ? 1 : 0) + (p2?.id ? 1 : 0) === 2) conquistas.push("Dupla Completa");

  const fromPublicDupla = `/perfil-dupla/${id}`;
  const editarDuplaHref = `/editar/dupla/${id}?from=${encodeURIComponent(fromPublicDupla)}`;
  const excluirDuplaRedirectPara = `/editar/equipes?from=${encodeURIComponent(`/perfil/${viewerId}`)}`;

  const podeExcluirPerfilDuplaTime =
    isLiderTimeDupla &&
    timeResolvidoId != null &&
    (await podeExcluirFormacaoComoLider(supabase, timeResolvidoId, viewerId));

  const nomeExibicao = timeResolvido?.nome ?? `Dupla registrada #${id}`;
  const localExibicao =
    timeResolvido?.localizacao?.trim() ||
    [p1?.localizacao, p2?.localizacao]
      .map((x) => (x ? String(x).trim() : ""))
      .filter(Boolean)
      .join(" · ") ||
    null;

  return {
    id,
    viewerId,
    d,
    p1,
    p2,
    timeResolvidoId,
    timeResolvido,
    posicaoDupla,
    espIdNum,
    esp,
    nomeExibicao,
    localExibicao,
    isMembroDupla,
    isDonoDupla,
    isLiderTimeDupla,
    liderDupla,
    idsExcluirConviteDupla,
    conquistas,
    fromPublicDupla,
    editarDuplaHref,
    excluirDuplaRedirectPara,
    podeExcluirPerfilDuplaTime,
  };
}

export const getPerfilDuplaIdentity = cache(loadPerfilDuplaIdentityUncached);

async function loadPerfilDuplaPartidasBundleUncached(duplaId: number, viewerId: string) {
  const { timeResolvidoId, espIdNum } = await getPerfilDuplaIdentity(duplaId, viewerId);
  const supabase = await createClient();

  const partidasColetivasDupla =
    timeResolvidoId && espIdNum > 0
      ? await carregarPartidasColetivasDoTime(supabase, timeResolvidoId, espIdNum, viewerId)
      : [];
  const torneioNomeDupla = timeResolvidoId ? await mapTorneioNomes(supabase, partidasColetivasDupla) : new Map();
  const oponenteDetalhesDupla = timeResolvidoId
    ? await mapDetalhesTimesAdversarios(supabase, timeResolvidoId, partidasColetivasDupla)
    : new Map();
  const bundleResultadosDupla = timeResolvidoId
    ? buildFormacaoResultadosPerfil(
        partidasColetivasDupla,
        timeResolvidoId,
        oponenteDetalhesDupla,
        torneioNomeDupla,
        "Dupla"
      )
    : { items: [], totais: { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 } };
  const vitoriasDupla = Number(bundleResultadosDupla.totais.vitorias ?? 0);
  const derrotasDupla = Number(bundleResultadosDupla.totais.derrotas ?? 0);
  const jogosDupla = vitoriasDupla + derrotasDupla;
  const winRateDupla = jogosDupla > 0 ? Math.round((vitoriasDupla / jogosDupla) * 100) : null;

  return {
    partidasColetivasDupla,
    bundleResultadosDupla,
    vitoriasDupla,
    derrotasDupla,
    jogosDupla,
    winRateDupla,
  };
}

export const getPerfilDuplaPartidasBundle = cache(loadPerfilDuplaPartidasBundleUncached);

async function loadPerfilDuplaHistEidPlayersUncached(duplaId: number, viewerId: string) {
  const { timeResolvidoId, d } = await getPerfilDuplaIdentity(duplaId, viewerId);
  const supabase = await createClient();

  const [{ data: eidLogsDupla }, { data: histDupla }, { data: eid1 }, { data: eid2 }] = await Promise.all([
    timeResolvidoId
      ? supabase
          .from("eid_logs")
          .select("change_amount, reason, created_at, esportes(nome)")
          .eq("entity_kind", "time")
          .eq("entity_time_id", timeResolvidoId)
          .order("created_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: null }),
    timeResolvidoId
      ? supabase
          .from("historico_eid_coletivo")
          .select("nota_nova, data_alteracao")
          .eq("time_id", timeResolvidoId)
          .order("data_alteracao", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: null }),
    supabase
      .from("usuario_eid")
      .select("nota_eid, pontos_ranking")
      .eq("usuario_id", d.player1_id)
      .eq("esporte_id", d.esporte_id)
      .maybeSingle(),
    supabase
      .from("usuario_eid")
      .select("nota_eid, pontos_ranking")
      .eq("usuario_id", d.player2_id)
      .eq("esporte_id", d.esporte_id)
      .maybeSingle(),
  ]);

  return { eidLogsDupla, histDupla, eid1, eid2 };
}

export const getPerfilDuplaHistEidPlayers = cache(loadPerfilDuplaHistEidPlayersUncached);

async function loadPerfilDuplaVisitorMatchPackUncached(duplaId: number, viewerId: string) {
  const idn = await getPerfilDuplaIdentity(duplaId, viewerId);
  const { d, p1, p2, timeResolvidoId, timeResolvido, espIdNum, isMembroDupla, isDonoDupla, liderDupla } = idn;
  const supabase = await createClient();

  const viewerPodeConfrontarNesteEsporteDupla =
    espIdNum > 0 ? await viewerTemUsuarioEidNoEsporte(supabase, viewerId, espIdNum) : false;

  let convitesPendentesDupla: TeamPublicPendingInvite[] = [];
  if (idn.isDonoDupla && timeResolvidoId) {
    const { data: pendRowsDupla } = await supabase
      .from("time_convites")
      .select("id, convidado_usuario_id")
      .eq("time_id", timeResolvidoId)
      .eq("status", "pendente")
      .order("id", { ascending: false });
    const pidsD = [...new Set((pendRowsDupla ?? []).map((r) => String(r.convidado_usuario_id ?? "")).filter(Boolean))];
    if (pidsD.length > 0) {
      const { data: profsPendD } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url, localizacao")
        .in("id", pidsD);
      const pmapD = new Map((profsPendD ?? []).map((p) => [String(p.id), p]));
      convitesPendentesDupla = (pendRowsDupla ?? [])
        .map((r) => {
          const pid = String(r.convidado_usuario_id ?? "");
          const pr = pmapD.get(pid);
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

  const formacoesMembroNaoLiderDuplaRaw: { id: number; nome: string }[] = [];
  if (!isMembroDupla && timeResolvidoId && d.esporte_id) {
    const { data: membroRowsDupla } = await supabase
      .from("membros_time")
      .select("time_id, times!inner(id, nome, criador_id, esporte_id, tipo)")
      .eq("usuario_id", viewerId)
      .eq("status", "ativo");
    const espD = Number(d.esporte_id);
    for (const row of membroRowsDupla ?? []) {
      const tm = Array.isArray(row.times) ? row.times[0] : row.times;
      if (!tm || tm.criador_id === viewerId) continue;
      if (Number(tm.esporte_id) !== espD) continue;
      if (String(tm.tipo ?? "").trim().toLowerCase() !== "dupla") continue;
      if (Number(tm.id) === timeResolvidoId) continue;
      formacoesMembroNaoLiderDuplaRaw.push({ id: Number(tm.id), nome: tm.nome ?? "Dupla" });
    }
  }
  const pendentesComDuplaAlvo =
    timeResolvidoId && d.esporte_id
      ? await fetchPendingRankingOpponentTimeIdsForAlvo(supabase, timeResolvidoId, Number(d.esporte_id))
      : new Set<number>();
  const formacoesMembroNaoLiderDupla = filterFormacoesSemParPendenteComAlvo(
    formacoesMembroNaoLiderDuplaRaw,
    timeResolvidoId ?? 0,
    pendentesComDuplaAlvo,
  );

  const { data: minhaFormacaoDupla } = await supabase
    .from("times")
    .select("id")
    .eq("criador_id", viewerId)
    .eq("tipo", "dupla")
    .eq("esporte_id", d.esporte_id)
    .limit(1);

  const meuTimeIdDupla = minhaFormacaoDupla?.[0]?.id ?? null;
  const canChallengeDupla =
    meuTimeIdDupla != null &&
    !isMembroDupla &&
    timeResolvidoId != null &&
    timeResolvido?.criador_id != null &&
    timeResolvido.criador_id !== viewerId;

  const canSugerirMatchDupla =
    !isMembroDupla &&
    formacoesMembroNaoLiderDupla.length > 0 &&
    timeResolvidoId != null &&
    !canChallengeDupla;

  const mostrarAvisoSemEidNoEsporteDupla =
    !isDonoDupla &&
    !isMembroDupla &&
    espIdNum > 0 &&
    !viewerPodeConfrontarNesteEsporteDupla &&
    (canChallengeDupla || canSugerirMatchDupla);

  let linkWpp: string | null = null;
  if (!isMembroDupla && timeResolvidoId && timeResolvido?.criador_id && liderDupla) {
    const podeWa = await podeExibirWhatsappPerfilFormacao(
      supabase,
      viewerId,
      timeResolvido.criador_id,
      timeResolvidoId,
      meuTimeIdDupla,
    );
    linkWpp = podeWa ? waMeHref(liderDupla.whatsapp) : null;
  } else if (!isMembroDupla && p1?.id && p2?.id) {
    const v1 = await podeExibirWhatsappPerfilPublico(supabase, viewerId, p1.id, false);
    const v2 = await podeExibirWhatsappPerfilPublico(supabase, viewerId, p2.id, false);
    if (v1) linkWpp = waMeHref(p1.whatsapp);
    else if (v2) linkWpp = waMeHref(p2.whatsapp);
  }

  const hasAceitoRankDupla =
    canChallengeDupla &&
    meuTimeIdDupla != null &&
    timeResolvidoId != null &&
    timeResolvido?.criador_id != null &&
    (await formacaoTemMatchAceitoEntre(
      supabase,
      viewerId,
      meuTimeIdDupla,
      timeResolvidoId,
      timeResolvido.criador_id,
      Number(d.esporte_id),
      "dupla",
    ));

  const cooldownMeses = await getMatchRankCooldownMeses(supabase);
  let rankingBlockedUntilDupla: string | null = null;
  if (
    canChallengeDupla &&
    timeResolvido?.criador_id &&
    d.esporte_id != null &&
    meuTimeIdDupla != null &&
    timeResolvidoId != null
  ) {
    rankingBlockedUntilDupla = await computeRankingBlockedUntilColetivo(supabase, {
      esporteId: Number(d.esporte_id),
      modalidade: "dupla",
      meuTimeId: meuTimeIdDupla,
      alvoTimeId: Number(timeResolvidoId),
      cooldownMeses,
      fallbackViewerId: viewerId,
      fallbackOpponentLeaderId: timeResolvido.criador_id,
    });
  }

  return {
    viewerPodeConfrontarNesteEsporteDupla,
    convitesPendentesDupla,
    formacoesMembroNaoLiderDupla,
    meuTimeIdDupla,
    canChallengeDupla,
    canSugerirMatchDupla,
    mostrarAvisoSemEidNoEsporteDupla,
    linkWpp,
    hasAceitoRankDupla,
    cooldownMeses,
    rankingBlockedUntilDupla,
  };
}

export const getPerfilDuplaVisitorMatchPack = cache(loadPerfilDuplaVisitorMatchPackUncached);

export type PerfilDuplaPayload = Awaited<ReturnType<typeof loadPerfilDuplaPayloadMerged>>;

async function loadPerfilDuplaPayloadMerged(duplaId: number, viewerId: string) {
  const identity = await getPerfilDuplaIdentity(duplaId, viewerId);
  const partidas = await getPerfilDuplaPartidasBundle(duplaId, viewerId);
  const histEid = await getPerfilDuplaHistEidPlayers(duplaId, viewerId);
  const visitor = await getPerfilDuplaVisitorMatchPack(duplaId, viewerId);
  return { ...identity, ...partidas, ...histEid, ...visitor };
}

export const getPerfilDuplaPayload = cache(async (duplaId: number, viewerId: string) =>
  loadPerfilDuplaPayloadMerged(duplaId, viewerId),
);
