import Link from "next/link";
import { notFound } from "next/navigation";
import { EidBadge } from "@/components/eid/eid-badge";
import { ProfileAchievementsShelf, ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { FormacaoCidadeAvisoLider } from "@/components/perfil/formacao-cidade-aviso-lider";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
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
import { formatCooldownRemaining } from "@/lib/match/cooldown-remaining";
import {
  MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER,
  viewerTemUsuarioEidNoEsporte,
} from "@/lib/match/viewer-esporte-confronto";
import { ProfileFormacaoResultados } from "@/components/perfil/profile-formacao-resultados";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { buildFormacaoResultadosPerfil } from "@/lib/perfil/build-formacao-resultados-perfil";
import {
  carregarPartidasColetivasDoTime,
  mapNomesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { EidCityState } from "@/components/ui/eid-city-state";
import { createClient } from "@/lib/supabase/server";
import { ExcluirFormacaoButton } from "@/components/times/excluir-formacao-button";
import { TeamPublicInviteBlock, type TeamPublicPendingInvite } from "@/components/times/team-public-invite-block";
import { FormacaoTransferirLiderancaForm } from "@/components/times/formacao-transferir-lideranca-form";
import { podeExcluirFormacaoComoLider } from "@/lib/formacao/pode-excluir-formacao-lider";
import { BarChart3, ChevronRight } from "lucide-react";

export type PerfilDuplaStreamProps = {
  duplaId: number;
  viewerId: string;
};

export async function PerfilDuplaStream({ duplaId, viewerId }: PerfilDuplaStreamProps) {
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
    d.esporte_id
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

  const espIdNum = d.esporte_id != null ? Number(d.esporte_id) : 0;
  const viewerPodeConfrontarNesteEsporteDupla =
    espIdNum > 0 ? await viewerTemUsuarioEidNoEsporte(supabase, viewerId, espIdNum) : false;
  const partidasColetivasDupla =
    timeResolvidoId && espIdNum > 0
      ? await carregarPartidasColetivasDoTime(supabase, timeResolvidoId, espIdNum, viewerId)
      : [];
  const torneioNomeDupla = timeResolvidoId ? await mapTorneioNomes(supabase, partidasColetivasDupla) : new Map();
  const nomeOponenteDupla = timeResolvidoId
    ? await mapNomesTimesAdversarios(supabase, timeResolvidoId, partidasColetivasDupla)
    : new Map();
  const bundleResultadosDupla = timeResolvidoId
    ? buildFormacaoResultadosPerfil(partidasColetivasDupla, timeResolvidoId, nomeOponenteDupla, torneioNomeDupla)
    : { items: [], totais: { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 } };
  const vitoriasDupla = Number(bundleResultadosDupla.totais.vitorias ?? 0);
  const derrotasDupla = Number(bundleResultadosDupla.totais.derrotas ?? 0);
  const jogosDupla = vitoriasDupla + derrotasDupla;
  const winRateDupla = jogosDupla > 0 ? Math.round((vitoriasDupla / jogosDupla) * 100) : null;

  const { data: eidLogsDupla } = timeResolvidoId
    ? await supabase
        .from("eid_logs")
        .select("change_amount, reason, created_at, esportes(nome)")
        .eq("entity_kind", "time")
        .eq("entity_time_id", timeResolvidoId)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const { data: histDupla } = timeResolvidoId
    ? await supabase
        .from("historico_eid_coletivo")
        .select("nota_nova, data_alteracao")
        .eq("time_id", timeResolvidoId)
        .order("data_alteracao", { ascending: false })
        .limit(12)
    : { data: [] };

  const { data: liderDupla } = timeResolvido?.criador_id
    ? await supabase.from("profiles").select("id, nome, whatsapp, avatar_url").eq("id", timeResolvido.criador_id).maybeSingle()
    : { data: null };

  const isMembroDupla = viewerId === d.player1_id || viewerId === d.player2_id;
  const donoDuplaId = d.criador_id ?? d.player1_id;
  const isDonoDupla = viewerId === donoDuplaId;
  /** Líder do time de dupla no radar (gestão / transferência de liderança). */
  const isLiderTimeDupla =
    Boolean(timeResolvidoId) && timeResolvido != null && timeResolvido.criador_id === viewerId;

  let convitesPendentesDupla: TeamPublicPendingInvite[] = [];
  const idsExcluirConviteDupla = [
    ...new Set(
      [d.player1_id, d.player2_id, viewerId].map((x) => String(x ?? "").trim()).filter(Boolean)
    ),
  ];
  if (isDonoDupla && timeResolvidoId) {
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
    pendentesComDuplaAlvo
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
      meuTimeIdDupla
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
      "dupla"
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

  const [{ data: eid1 }, { data: eid2 }] = await Promise.all([
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

  const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
  const conquistas: string[] = [];
  if ((Number(timeResolvido?.eid_time ?? 0) ?? 0) >= 7) conquistas.push("Dupla Elite");
  if (Number(timeResolvido?.pontos_ranking ?? 0) >= 1200) conquistas.push("Rank Forte");
  if ((p1?.id ? 1 : 0) + (p2?.id ? 1 : 0) === 2) conquistas.push("Dupla Completa");

  const fromPublicDupla = `/perfil-dupla/${id}`;
  const editarDuplaHref = `/editar/dupla/${id}?from=${encodeURIComponent(fromPublicDupla)}`;

  const podeExcluirPerfilDuplaTime =
    isLiderTimeDupla &&
    timeResolvidoId != null &&
    (await podeExcluirFormacaoComoLider(supabase, timeResolvidoId, viewerId));
  const excluirDuplaRedirectPara = `/editar/equipes?from=${encodeURIComponent(`/perfil/${viewerId}`)}`;

  const nomeExibicao = timeResolvido?.nome ?? `Dupla registrada #${id}`;
  const localExibicao =
    timeResolvido?.localizacao?.trim() ||
    [p1?.localizacao, p2?.localizacao]
      .map((x) => (x ? String(x).trim() : ""))
      .filter(Boolean)
      .join(" · ") ||
    null;

  return (
    <main data-eid-formacao-page className={PROFILE_PUBLIC_MAIN_CLASS}>
        <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2 p-3 sm:p-4`}>
          {podeExcluirPerfilDuplaTime && timeResolvidoId ? (
            <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
              <ExcluirFormacaoButton
                timeId={timeResolvidoId}
                formationName={nomeExibicao}
                formacaoTipo="dupla"
                redirectAfter={excluirDuplaRedirectPara}
                variant="compact"
              />
            </div>
          ) : null}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="flex shrink-0 flex-col items-center sm:items-start">
              {timeResolvido?.escudo ? (
                <img
                  src={timeResolvido.escudo}
                  alt=""
                  className="h-24 w-24 rounded-2xl border-2 border-eid-action-500/50 object-cover shadow-lg sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-sm font-black text-eid-primary-300 sm:h-28 sm:w-28">
                  D
                </div>
              )}
            </div>
            <div className="flex w-full min-w-0 flex-1 flex-col items-center space-y-2 text-center sm:items-start sm:text-left">
              <span className="inline-block rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <ModalidadeGlyphIcon modalidade="dupla" />
                    <span>DUPLA</span>
                  </span>
                  <span aria-hidden className="opacity-70">|</span>
                  <span className="inline-flex items-center gap-1">
                    <SportGlyphIcon sportName={esp?.nome} />
                    <span>{esp?.nome ?? "Esporte"}</span>
                  </span>
                </span>
              </span>
              <h1 className="text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{nomeExibicao}</h1>
              <div className="flex w-full justify-center sm:hidden">
                <EidCityState location={localExibicao} align="center" />
              </div>
              <div className="hidden w-full sm:block">
                <EidCityState location={localExibicao} align="start" />
              </div>
            </div>
          </div>
          {isDonoDupla && timeResolvidoId ? <FormacaoCidadeAvisoLider timeId={timeResolvidoId} /> : null}
          {d.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary sm:mt-3">{d.bio}</p> : null}
          <div className="mt-4 grid grid-cols-4 divide-x divide-transparent rounded-xl border border-transparent bg-eid-surface/40 text-center shadow-none">
            <div className="py-2">
              <p className="text-sm font-black text-eid-fg">{vitoriasDupla}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-black text-eid-fg">{derrotasDupla}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-black text-eid-action-500">{winRateDupla != null ? `${winRateDupla}%` : "—"}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Win Rate</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-black text-eid-primary-400">{jogosDupla}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Jogos</p>
            </div>
          </div>
          {liderDupla ? (
            <div className="mt-4 flex w-full min-w-0 justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2.5">
              <Link
                href={`/perfil/${liderDupla.id}?from=/perfil-dupla/${id}`}
                className="inline-flex max-w-full min-w-0 items-center gap-3 rounded-lg text-left transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-eid-card"
                aria-label={`Abrir perfil de ${liderDupla.nome ?? "líder"}`}
              >
                {liderDupla.avatar_url ? (
                  <img
                    src={liderDupla.avatar_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover sm:h-10 sm:w-10"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 sm:h-10 sm:w-10">
                    {(liderDupla.nome ?? "L").trim().slice(0, 1).toUpperCase() || "L"}
                  </span>
                )}
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary/90">Líder</span>
                  <span className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">{liderDupla.nome ?? "—"}</span>
                </div>
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6">
          {/* Dono da dupla: evita cartão “Ação principal” vazio ou só com texto redundante. */}
          {!isDonoDupla ? (
          <section className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55 p-3">
            <h2 className="sr-only">Ação principal</h2>
            <div className="mb-2 flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ação principal</p>
              <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                Match
              </span>
            </div>
            {!isMembroDupla ? (
              <div className="grid gap-3">
                {mostrarAvisoSemEidNoEsporteDupla ? (
                  <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
                    {MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER}{" "}
                    <Link
                      href="/conta/esportes-eid"
                      className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline"
                    >
                      Abrir Esportes e EID
                    </Link>
                    .
                  </p>
                ) : null}
                {linkWpp ? (
                  <a
                    href={linkWpp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-black uppercase tracking-[0.1em] text-white shadow-[0_0_18px_rgba(37,211,102,0.45)] transition hover:bg-[#1da851]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.534 5.853L.054 23.25a.75.75 0 0 0 .916.916l5.396-1.479A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.986 0-3.84-.552-5.418-1.51l-.388-.232-4.021 1.1 1.1-4.022-.232-.388A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                    Chamar no WhatsApp
                  </a>
                ) : null}
                {canChallengeDupla &&
                viewerPodeConfrontarNesteEsporteDupla &&
                !hasAceitoRankDupla &&
                timeResolvidoId &&
                !rankingBlockedUntilDupla ? (
                  <ProfilePrimaryCta
                    href={`/desafio?id=${timeResolvidoId}&tipo=dupla&esporte=${d.esporte_id}`}
                    label={linkWpp ? "⚡ Desafio no ranking" : undefined}
                  />
                ) : hasAceitoRankDupla && timeResolvidoId ? (
                  <p className="text-xs text-eid-text-secondary">
                    Desafio aceito nesta dupla. Registre o resultado na agenda quando jogarem.
                  </p>
                ) : !canChallengeDupla || isMembroDupla ? (
                  <ProfilePrimaryCta
                    href={`/match?tipo=dupla&esporte=${d.esporte_id}`}
                    label="Duplas no radar"
                  />
                ) : null}
                {canChallengeDupla &&
                viewerPodeConfrontarNesteEsporteDupla &&
                !hasAceitoRankDupla &&
                rankingBlockedUntilDupla ? (
                  <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-[11px] text-eid-text-secondary">
                    Carência ativa para novo desafio de ranking nesta dupla até{" "}
                    <span className="font-semibold text-eid-fg">
                      {new Date(rankingBlockedUntilDupla).toLocaleDateString("pt-BR")}
                    </span>
                    .{" "}
                    <span className="font-semibold text-eid-fg">{formatCooldownRemaining(rankingBlockedUntilDupla)}</span>
                  </p>
                ) : null}
                {canSugerirMatchDupla && viewerPodeConfrontarNesteEsporteDupla && timeResolvidoId ? (
                  <SugerirMatchLiderForm
                    alvoTimeId={timeResolvidoId}
                    alvoNome={timeResolvido?.nome ?? "Dupla no radar"}
                    modalidadeLabel="dupla"
                    formacoesMinhas={formacoesMembroNaoLiderDupla}
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-eid-text-secondary">Você faz parte desta dupla registrada.</p>
            )}
          </section>
          ) : null}

          <ProfileSection
            title="EID e estatísticas"
            info="Nota e métricas da dupla neste esporte: ranking, jogos e desempenho conjunto."
          >
            {timeResolvido ? (
              <>
                <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-3 sm:rounded-2xl sm:p-4`}>
                  <p className="text-[11px] font-semibold leading-snug sm:text-[12px]">
                    <span className="text-eid-text-secondary">Esporte: </span>
                    <span className="font-bold text-eid-primary-300">{esp?.nome ?? "Esporte não definido"}</span>
                  </p>
                  <div className="mt-2">
                  <div className="flex justify-center">
                    <EidBadge
                      score={Number(timeResolvido.eid_time ?? 0)}
                      history={eidLogsDupla ?? []}
                      label={`EID · ${(esp?.nome ?? "DUPLA").toUpperCase()}`}
                      className="px-3 py-1.5 text-[11px] shadow-[0_8px_20px_-14px_rgba(249,115,22,0.45)]"
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-3">
                    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                      <p className="text-base font-bold tabular-nums text-eid-action-500 sm:text-lg">
                        {Number(timeResolvido.eid_time ?? 0).toFixed(1)}
                      </p>
                      <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Nota EID</p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                      <p className="text-base font-bold tabular-nums text-eid-fg sm:text-lg">
                        {timeResolvido.pontos_ranking ?? 0}
                      </p>
                      <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Pontos</p>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                      <p className="text-base font-bold tabular-nums text-eid-primary-300 sm:text-lg">
                        {posicaoDupla != null ? `#${posicaoDupla}` : "—"}
                      </p>
                      <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Posição</p>
                    </div>
                  </div>
                  {d.esporte_id ? (
                    <ProfileEditDrawerTrigger
                      href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(fromPublicDupla)}`}
                      title={`Estatísticas · ${esp?.nome ?? "Esporte"}`}
                      fullscreen
                      topMode="backOnly"
                      className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/45 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                    >
                      <BarChart3 className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                      <span className="min-w-0 flex-1 text-center leading-tight">
                        Estatísticas completas · {(esp?.nome ?? "este esporte").toUpperCase()}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2.5} aria-hidden />
                    </ProfileEditDrawerTrigger>
                  ) : null}
                  <ProfileSportsMetricsCard
                    sportName={esp?.nome ?? "Esporte"}
                    eidValue={Number(timeResolvido.eid_time ?? 0)}
                    rankValue={Number(timeResolvido.pontos_ranking ?? 0)}
                    trendLabel="Evolução EID"
                    trendPoints={
                      (histDupla ?? []).length >= 3
                        ? ([
                            Number((histDupla ?? [])[2]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                            Number((histDupla ?? [])[1]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                            Number((histDupla ?? [])[0]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                          ] as [number, number, number])
                        : [
                            Number(timeResolvido.eid_time ?? 0),
                            Number(timeResolvido.eid_time ?? 0),
                            Number(timeResolvido.eid_time ?? 0),
                          ]
                    }
                    showScoreTiles={false}
                  />
                  </div>
                </div>
                <ProfileCompactTimeline
                  title="Histórico de notas EID"
                  emptyText="Sem histórico recente de EID."
                  items={[...(histDupla ?? [])]
                    .reverse()
                    .map((h, i) => ({
                      id: `${h.data_alteracao ?? "sem-data"}-${i}`,
                      label: `${Number(h.nota_nova).toFixed(1)} ${h.data_alteracao ? new Date(h.data_alteracao).toLocaleDateString("pt-BR") : ""}`.trim(),
                      tone: "neutral" as const,
                    }))}
                />
              </>
            ) : (
              <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-3`}>
                <div>
                <p className="text-xs text-eid-text-secondary">
                  Ainda não há <strong className="text-eid-fg">time de dupla ativo</strong> no ranking com estes dois atletas. O EID de equipe aparece quando a formação existir no radar.
                </p>
                {d.esporte_id ? (
                  <ProfileEditDrawerTrigger
                    href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(fromPublicDupla)}`}
                    title={`Estatísticas · ${esp?.nome ?? "Esporte"}`}
                    fullscreen
                    topMode="backOnly"
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/45 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                  >
                    <BarChart3 className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                    <span className="min-w-0 flex-1 text-center leading-tight">
                      Abrir estatísticas · {(esp?.nome ?? "este esporte").toUpperCase()}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2.5} aria-hidden />
                  </ProfileEditDrawerTrigger>
                ) : null}
                </div>
              </div>
            )}
          </ProfileSection>

          <ProfileSection
            title="Histórico de confrontos"
            info="Mesmo padrão do perfil de atleta: totais de vitórias/derrotas/empates e lista dos confrontos da formação."
          >
            {timeResolvidoId ? (
              <ProfileFormacaoResultados
                totais={bundleResultadosDupla.totais}
                items={bundleResultadosDupla.items}
                emptyText="Nenhuma partida em dupla concluída listada ainda."
              />
            ) : (
              <p className="mt-2 text-xs text-eid-text-secondary">
                Resultados de ranking e torneio aparecem quando houver time de dupla ativo no radar.
              </p>
            )}
            <p className="mt-3 text-[10px] text-eid-text-secondary">
              Para desafiar outra dupla no radar:{" "}
              <Link href="/match?tipo=dupla" className="font-semibold text-eid-primary-300 underline">
                Desafio → Duplas
              </Link>
              .
            </p>
          </ProfileSection>

          <ProfileSection
            title="Participantes"
            info="Atletas que compõem esta dupla, com acesso ao perfil individual de cada um."
          >
            {isDonoDupla && timeResolvidoId ? (
              <div className="mt-2 space-y-3">
                <p className="text-[11px] leading-relaxed text-eid-text-secondary">
                  Convidar integrante por nome ou <span className="font-semibold text-eid-fg">@usuário</span>. Com três
                  letras aparecem sugestões; convites pendentes podem ser cancelados a qualquer momento.
                </p>
                <TeamPublicInviteBlock
                  timeId={timeResolvidoId}
                  excludeUserIds={idsExcluirConviteDupla}
                  pendingInvites={convitesPendentesDupla}
                  collapsibleTrigger
                />
              </div>
            ) : null}
            <div className="mt-4 flex flex-col gap-2.5">
              {[p1, p2].map((p, i) =>
                p ? (
                  <ProfileMemberCard
                    key={p.id}
                    href={`/perfil/${p.id}?from=/perfil-dupla/${id}`}
                    name={p.nome ?? "Atleta"}
                    subtitle={p.localizacao?.trim() ? p.localizacao : "Integrante da dupla"}
                    avatarUrl={p.avatar_url}
                    fallbackLabel={`${i + 1}o`}
                    layout="list"
                    avatarSize="sm"
                    trailing={
                      <div className="flex flex-col gap-2">
                        <p className="text-[11px] font-semibold text-eid-primary-300 eid-light:text-sky-900">
                          EID individual{" "}
                          {i === 0 ? Number(eid1?.nota_eid ?? 0).toFixed(1) : Number(eid2?.nota_eid ?? 0).toFixed(1)}
                        </p>
                        {isLiderTimeDupla && timeResolvidoId && p.id !== viewerId ? (
                          <FormacaoTransferirLiderancaForm
                            timeId={timeResolvidoId}
                            novoLiderUsuarioId={p.id}
                            novoLiderNome={p.nome ?? "Atleta"}
                            novoLiderAvatarUrl={p.avatar_url}
                            formacaoTipo="dupla"
                            className="flex h-9 min-h-9 w-full min-w-0 items-center justify-center rounded-lg border border-eid-primary-500/45 px-1.5 py-0 text-center text-[10px] font-semibold leading-snug text-eid-primary-300 transition hover:bg-eid-primary-500/10 disabled:opacity-60 eid-light:border-sky-700/40 eid-light:bg-sky-50 eid-light:text-sky-950 eid-light:hover:bg-sky-100 sm:px-2 sm:text-[11px]"
                          />
                        ) : null}
                      </div>
                    }
                  />
                ) : null
              )}
            </div>
          </ProfileSection>

          {isMembroDupla ? (
            <div className="eid-list-item overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
              <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Gestão da dupla</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                  Conta
                </span>
              </div>
              <div className="p-3">
              {isDonoDupla ? (
                <div className="space-y-2">
                  <ProfileEditDrawerTrigger
                    href={editarDuplaHref}
                    title="Editar dupla"
                    fullscreen
                    topMode="backOnly"
                    className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
                  >
                    <span>Editar dupla registrada</span>
                  </ProfileEditDrawerTrigger>
                  <Link
                    href={editarDuplaHref}
                    className="flex min-h-[40px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg"
                  >
                    Abrir em página cheia (sem painel)
                  </Link>
                </div>
              ) : null}
              <div className={`grid gap-2 ${isDonoDupla ? "mt-3" : ""}`}>
                <ProfileEditDrawerTrigger
                  href={`/editar/perfil?from=${encodeURIComponent(fromPublicDupla)}`}
                  title="Editar perfil"
                  fullscreen
                  topMode="backOnly"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
                >
                  <span>Editar perfil pessoal</span>
                </ProfileEditDrawerTrigger>
                <ProfileEditDrawerTrigger
                  href={`/editar/performance-eid?from=${encodeURIComponent(fromPublicDupla)}`}
                  title="Esportes e EID"
                  fullscreen
                  topMode="backOnly"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-black uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
                >
                  <span>Esportes e ranking (EID)</span>
                </ProfileEditDrawerTrigger>
              </div>
              </div>
            </div>
          ) : null}

          <ProfileSection
            title="Conquistas"
            info="Selos e marcos da dupla na plataforma (quando houver)."
          >
            <ProfileAchievementsShelf achievements={conquistas} emptyText="Conquistas aparecerão conforme evolução da dupla." />
          </ProfileSection>
        </div>
      </main>
  );
}
