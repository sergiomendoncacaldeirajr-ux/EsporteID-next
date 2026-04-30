import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import {
  type ComunidadeProfessorProfileRow,
} from "@/components/comunidade/comunidade-aulas-section";
import { ComunidadeConvitesTime, type ConviteTimeItem } from "@/components/comunidade/comunidade-convites-time";
import { ComunidadeConvitesEnviadosTime, type ConviteTimeEnviadoItem } from "@/components/comunidade/comunidade-convites-enviados-time";
import { ComunidadePedidosEnviados } from "@/components/comunidade/comunidade-pedidos-enviados";
import { ComunidadePedidosMatch } from "@/components/comunidade/comunidade-pedidos-match";
import {
  ComunidadeSugestoesEnviadasMatch,
  type SugestaoEnviadaMatchItem,
} from "@/components/comunidade/comunidade-sugestoes-enviadas-match";
import { ComunidadeSugestoesMatch, type SugestaoMatchItem } from "@/components/comunidade/comunidade-sugestoes-match";
import { ComunidadeSetorNotificacoes } from "@/components/comunidade/comunidade-setor-notificacoes";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidAcceptedBadge } from "@/components/ui/eid-accepted-badge";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidRejectedBadge } from "@/components/ui/eid-rejected-badge";
import { CancelarCandidaturaForm, ResponderCandidaturaForm } from "@/components/vagas/vagas-actions";
import { PushToggleCard } from "@/components/pwa/push-toggle-card";
import { fetchPedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { PEDIDO_MATCH_RECEBIDO_FORM_CLASS, PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS } from "@/lib/desafio/flow-ui";
import {
  EID_SOCIAL_CARD_FOOTER,
  EID_SOCIAL_GRID_3,
  getSocialStatusCardShell,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import {
  type AgendaPartidaCardRow,
  fetchPartidasAgendadasUsuario,
  fetchPlacarAguardandoConfirmacao,
  firstOfRelation,
  getAgendaTeamContext,
} from "@/lib/agenda/partidas-usuario";
import { processarPendenciasAgendamentoAceite } from "@/lib/agenda/processar-pendencias-agendamento";
import { distanciaKm } from "@/lib/geo/distance-km";
import { splitCityState } from "@/lib/geo/split-city-state";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { getSystemFeatureConfig, SYSTEM_FEATURE_LABEL, type SystemFeatureKey } from "@/lib/system-features";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { createClient } from "@/lib/supabase/server";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { Calendar, Clock, Clock3, LayoutGrid, MapPin, Shield, User, UserPlus } from "lucide-react";
import { marcarTodasNotificacoesLidas } from "./actions";
import type { ReactNode } from "react";

function ModuloIcon({ moduleKey }: { moduleKey: SystemFeatureKey }) {
  const cls = "h-[15px] w-[15px]";
  if (moduleKey === "marketplace") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" aria-hidden>
        <path d="M6 8h12l-1 11H7L6 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (moduleKey === "locais") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" aria-hidden>
        <path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2" fill="currentColor" />
      </svg>
    );
  }
  if (moduleKey === "torneios") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" aria-hidden>
        <path d="M8 5h8v3a4 4 0 01-8 0V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 8H5a2 2 0 002 2M17 8h2a2 2 0 01-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 12v4M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (moduleKey === "professores") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" aria-hidden>
        <path d="M3 9l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 11v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" aria-hidden>
      <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 19c0-2.5 2.3-4.5 5-4.5M21 19c0-2.5-2.3-4.5-5-4.5M8 19c0-2.8 1.8-5 4-5s4 2.2 4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export const metadata = {
  title: "Painel de controle",
  description: "Painel de controle do EsporteID: acompanhe notificações, convites e pedidos com clareza.",
};

function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

/** Localização nos cards de pedido ao elenco (tema claro / escuro via tokens). */
function PedidoElencoLocationLight({
  location,
  align,
}: {
  location: string | null;
  align: "start" | "end" | "center";
}) {
  const { cidade, estado } = splitCityState(location);
  const end = align === "end";
  const center = align === "center";
  return (
    <div
      className={`mt-1.5 flex flex-col gap-0.5 ${end ? "items-end text-right" : center ? "items-center text-center" : "items-start text-left"}`}
    >
      <div
        className={`flex max-w-[11rem] items-center gap-1 text-[11px] font-normal leading-tight text-eid-text-secondary ${end ? "justify-end" : center ? "justify-center" : "justify-start"}`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
        <span className="min-w-0 truncate">{cidade !== "-" ? cidade : "—"}</span>
      </div>
      {estado !== "-" ? (
        <p
          className={`text-[11px] font-bold leading-tight text-eid-fg ${end ? "text-end" : center ? "text-center" : "text-start"}`}
        >
          {estado}
        </p>
      ) : null}
    </div>
  );
}

/** Selo EID compacto — usa variáveis `--eid-seal-*` (claro/escuro em `globals.css`). */
function PedidoElencoEidSeal({ notaEid }: { notaEid: number }) {
  const v = (Number.isFinite(notaEid) ? notaEid : 0).toFixed(1);
  return (
    <div
      className="inline-flex items-stretch overflow-hidden rounded-full border text-[9px] font-black leading-none sm:text-[10px] [border-color:var(--eid-seal-border)] [box-shadow:var(--eid-seal-shadow)]"
      title="Nota EID no esporte"
    >
      <span className="flex items-center px-[7px] py-[4px] uppercase tracking-[0.08em] [background-color:var(--eid-seal-label-bg)] [color:var(--eid-seal-label-fg)]">
        EID
      </span>
      <span className="flex items-center px-[7px] py-[4px] tabular-nums [background-color:var(--eid-seal-score-bg)] [color:var(--eid-seal-score-fg)]">
        {v}
      </span>
    </div>
  );
}

function ComunidadeQuadro({
  id,
  title,
  hasPending,
  badgeLabel = "Pendente",
  children,
}: {
  id: string;
  title: string;
  hasPending: boolean;
  badgeLabel?: string;
  children: ReactNode;
}) {
  if (!hasPending) return null;
  return (
    <details
      id={id}
      open
      className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 px-1 py-2 sm:px-1.5 sm:py-2.5 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <h3 className="text-[11px] font-black tracking-tight text-eid-fg">{title}</h3>
        <EidPendingBadge label={badgeLabel} />
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

export default async function ComunidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/comunidade");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, nome, avatar_url, localizacao, lat, lng, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !legalAcceptanceIsCurrent(profile)) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");
  const myLat = Number((profile as { lat?: number | null }).lat ?? NaN);
  const myLng = Number((profile as { lng?: number | null }).lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  await supabase.rpc("auto_aprovar_resultados_pendentes", { p_only_user: user.id });
  await supabase.rpc("processar_pendencias_cancelamento_match", { p_only_user: user.id });
  await supabase.rpc("limpar_notificacoes_match_cancelado", { p_only_user: user.id });
  const featureCfg = await getSystemFeatureConfig(supabase);

  const { data: notificacoes } = await supabase
    .from("notificacoes")
    .select("id, mensagem, tipo, lida, criada_em, data_criacao, referencia_id, remetente_id")
    .eq("usuario_id", user.id)
    .order("id", { ascending: false })
    .limit(50);
  const uniqueNotificacoes = (() => {
    const seen = new Set<string>();
    const out: NonNullable<typeof notificacoes> = [];
    for (const n of notificacoes ?? []) {
      const tipo = String(n.tipo ?? "").trim().toLowerCase();
      const isDedupeTipo = tipo === "match" || tipo === "desafio" || tipo === "time" || tipo === "convite";
      const key = isDedupeTipo
        ? `${tipo}:${String((n as { referencia_id?: number | null }).referencia_id ?? "null")}:${String((n as { remetente_id?: string | null }).remetente_id ?? "null")}`
        : `id:${n.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out;
  })();
  const flowNotifRefIds = [
    ...new Set(
      uniqueNotificacoes
        .filter((n) => {
          const tipo = String(n.tipo ?? "")
            .trim()
            .toLowerCase();
          return tipo === "match" || tipo === "desafio";
        })
        .map((n) => Number((n as { referencia_id?: number | null }).referencia_id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const { data: flowMatchStatusRows } = flowNotifRefIds.length
    ? await supabase.from("matches").select("id, status").in("id", flowNotifRefIds)
    : { data: [] };
  const canceledMatchIds = new Set(
    (flowMatchStatusRows ?? [])
      .filter((row) => String(row.status ?? "").trim().toLowerCase() === "cancelado")
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
  if (canceledMatchIds.size > 0) {
    await supabase
      .from("notificacoes")
      .delete()
      .eq("usuario_id", user.id)
      .in("tipo", ["match", "desafio"])
      .in("referencia_id", [...canceledMatchIds]);
  }
  const uniqueNotificacoesVisiveis = uniqueNotificacoes.filter((n) => {
    const tipo = String(n.tipo ?? "")
      .trim()
      .toLowerCase();
    if (tipo !== "match" && tipo !== "desafio") return true;
    const refId = Number((n as { referencia_id?: number | null }).referencia_id ?? 0);
    if (!Number.isFinite(refId) || refId < 1) return true;
    return !canceledMatchIds.has(refId);
  });
  const cancelFlowNotifIds = uniqueNotificacoesVisiveis
    .filter((n) => {
      const tipo = String(n.tipo ?? "")
        .trim()
        .toLowerCase();
      if (tipo !== "match" && tipo !== "desafio") return false;
      const msg = String(n.mensagem ?? "")
        .trim()
        .toLowerCase();
      return msg.includes("cancelado") || msg.includes("cancelamento");
    })
    .map((n) => Number(n.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (cancelFlowNotifIds.length > 0) {
    await supabase.from("notificacoes").delete().eq("usuario_id", user.id).in("id", cancelFlowNotifIds);
  }
  const uniqueNotificacoesSetor = uniqueNotificacoesVisiveis.filter((n) => !cancelFlowNotifIds.includes(Number(n.id)));

  const { data: recebidos } = await supabase
    .from("matches")
    .select("id, modalidade_confronto, data_solicitacao, data_registro, usuario_id, esporte_id, adversario_time_id, finalidade")
    .eq("adversario_id", user.id)
    .eq("status", "Pendente")
    .order("data_registro", { ascending: false })
    .limit(30);
  const receivedSportIds = [
    ...new Set((recebidos ?? []).map((m) => Number(m.esporte_id ?? 0)).filter((id) => Number.isFinite(id) && id > 0)),
  ];

  const uids = [...new Set((recebidos ?? []).map((m) => m.usuario_id).filter(Boolean))] as string[];
  const { data: desafiantes } = uids.length
    ? await supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", uids)
    : { data: [] };
  const uMap = new Map((desafiantes ?? []).map((p) => [p.id, p]));
  const { data: desafiantesEid } =
    uids.length > 0 && receivedSportIds.length > 0
      ? await supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", uids)
          .in("esporte_id", receivedSportIds)
      : { data: [] };
  const desafianteEidMap = new Map(
    (desafiantesEid ?? []).map((row) => [`${String(row.usuario_id)}:${Number(row.esporte_id)}`, Number(row.nota_eid ?? 0)])
  );

  const { data: enviadosPendentes } = await supabase
    .from("matches")
    .select("id, adversario_id, adversario_time_id, esporte_id, modalidade_confronto, data_solicitacao")
    .eq("usuario_id", user.id)
    .eq("status", "Pendente")
    .order("data_solicitacao", { ascending: false })
    .limit(20);

  const eidsRecebidos = (recebidos ?? []).map((m) => m.esporte_id).filter(Boolean) as number[];
  const eidsEnviados = (enviadosPendentes ?? []).map((m) => m.esporte_id).filter(Boolean) as number[];
  const eids = [...new Set([...eidsRecebidos, ...eidsEnviados])] as number[];
  const { data: esportes } = eids.length
    ? await supabase.from("esportes").select("id, nome").in("id", eids)
    : { data: [] };
  const espMap = new Map((esportes ?? []).map((e) => [e.id, e.nome]));

  const timeIds = [...new Set((recebidos ?? []).map((m) => m.adversario_time_id).filter(Boolean))] as number[];
  const { data: timesRows } = timeIds.length
    ? await supabase.from("times").select("id, nome").in("id", timeIds)
    : { data: [] };
  const timeMap = new Map((timesRows ?? []).map((t) => [t.id, t.nome]));

  /** Confronto dupla/time: desafiante é a formação (mesma regra que fetchPedidoRankingPreview), não o perfil individual do líder. */
  const coletivoRecebidos = (recebidos ?? []).filter((row) => {
    const mod = String(row.modalidade_confronto ?? "").toLowerCase();
    return mod === "dupla" || mod === "time";
  });
  const chLiderUids = [...new Set(coletivoRecebidos.map((row) => String(row.usuario_id ?? "")).filter(Boolean))];
  const chEsporteIdsColetivo = [
    ...new Set(
      coletivoRecebidos.map((row) => Number(row.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  const { data: formacoesDesafianteRows } =
    chLiderUids.length > 0 && chEsporteIdsColetivo.length > 0
      ? await supabase
          .from("times")
          .select("id, nome, escudo, localizacao, criador_id, esporte_id, tipo, eid_time, pontos_ranking")
          .in("criador_id", chLiderUids)
          .in("esporte_id", chEsporteIdsColetivo)
      : { data: [] };
  type FormacaoDesafiantePedido = {
    id: number;
    nome: string | null;
    escudo: string | null;
    localizacao: string | null;
    tipo: "dupla" | "time";
    eidTime: number;
    pontosRanking: number;
  };
  const formacaoDesafianteByChave = new Map<string, FormacaoDesafiantePedido>();
  for (const row of formacoesDesafianteRows ?? []) {
    const tipoRaw = String((row as { tipo?: string | null }).tipo ?? "").trim().toLowerCase();
    if (tipoRaw !== "dupla" && tipoRaw !== "time") continue;
    const tipo = tipoRaw as "dupla" | "time";
    const uid = String((row as { criador_id?: string | null }).criador_id ?? "");
    const esp = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
    if (!uid || !esp) continue;
    const key = `${uid}:${esp}:${tipo}`;
    const id = Number((row as { id?: number }).id ?? 0);
    const prev = formacaoDesafianteByChave.get(key);
    if (!prev || id > prev.id) {
      formacaoDesafianteByChave.set(key, {
        id,
        nome: (row as { nome?: string | null }).nome ?? null,
        escudo: (row as { escudo?: string | null }).escudo ?? null,
        localizacao: (row as { localizacao?: string | null }).localizacao ?? null,
        tipo,
        eidTime: Number((row as { eid_time?: number | null }).eid_time ?? 0),
        pontosRanking: Number((row as { pontos_ranking?: number | null }).pontos_ranking ?? 0),
      });
    }
  }

  const pedidosItemsBase = (recebidos ?? []).map((m) => {
    const mod = String(m.modalidade_confronto ?? "individual").toLowerCase();
    const formacaoDesafianteKey =
      m.usuario_id && (mod === "dupla" || mod === "time") && m.esporte_id
        ? `${String(m.usuario_id)}:${Number(m.esporte_id)}:${mod}`
        : null;
    const formacaoDesafiante = formacaoDesafianteKey ? formacaoDesafianteByChave.get(formacaoDesafianteKey) ?? null : null;
    return {
      id: Number(m.id),
      dataSolicitacao:
        (m as { data_solicitacao?: string | null }).data_solicitacao ??
        (m as { data_registro?: string | null }).data_registro ??
        null,
      desafianteNome: (m.usuario_id ? uMap.get(m.usuario_id)?.nome : null) ?? "Atleta",
      desafianteId: String(m.usuario_id ?? ""),
      desafianteAvatarUrl: (m.usuario_id ? uMap.get(m.usuario_id)?.avatar_url : null) ?? null,
      desafianteLocalizacao: (m.usuario_id ? uMap.get(m.usuario_id)?.localizacao : null) ?? null,
      desafianteNotaEid:
        m.usuario_id && Number.isFinite(Number(m.esporte_id ?? 0))
          ? desafianteEidMap.get(`${String(m.usuario_id)}:${Number(m.esporte_id ?? 0)}`) ?? 0
          : 0,
      esporte: (m.esporte_id ? espMap.get(m.esporte_id) : null) ?? "Esporte",
      esporteId: Number(m.esporte_id ?? 0),
      modalidade: mod === "atleta" ? "individual" : mod,
      formacaoDesafiante,
      timeNome: m.adversario_time_id ? timeMap.get(m.adversario_time_id) ?? null : null,
      adversarioTimeId: m.adversario_time_id != null ? Number(m.adversario_time_id) : null,
      finalidade: (String(m.finalidade ?? "ranking") === "amistoso" ? "amistoso" : "ranking") as "ranking" | "amistoso",
    };
  });

  const pedidosItems = await Promise.all(
    pedidosItemsBase.map(async (m) => ({
      ...m,
      rankingPosicao:
        m.finalidade === "ranking" && m.esporteId > 0
          ? await (async () => {
              const mod = String(m.modalidade ?? "").toLowerCase();
              if (m.formacaoDesafiante && (mod === "dupla" || mod === "time")) {
                const pontos = m.formacaoDesafiante.pontosRanking;
                const { count } = await supabase
                  .from("times")
                  .select("id", { count: "exact", head: true })
                  .eq("esporte_id", m.esporteId)
                  .eq("tipo", mod)
                  .gt("pontos_ranking", pontos);
                return Number(count ?? 0) + 1;
              }
              const { data: chEid } = await supabase
                .from("usuario_eid")
                .select("pontos_ranking")
                .eq("usuario_id", m.desafianteId)
                .eq("esporte_id", m.esporteId)
                .maybeSingle();
              const pontos = Number(chEid?.pontos_ranking ?? NaN);
              if (!Number.isFinite(pontos)) return null;
              const { count } = await supabase
                .from("usuario_eid")
                .select("id", { count: "exact", head: true })
                .eq("esporte_id", m.esporteId)
                .gt("pontos_ranking", pontos);
              return Number(count ?? 0) + 1;
            })()
          : null,
      rankingPreview:
        m.finalidade === "ranking" && m.esporteId > 0
          ? await fetchPedidoRankingPreview(supabase, {
              accepterId: user.id,
              challengerId: m.desafianteId,
              esporteId: m.esporteId,
              modalidade: m.modalidade,
              adversarioTimeId: m.adversarioTimeId,
            })
          : null,
    }))
  );

  const nPedidos = pedidosItems.length;

  const enviadosAdversarioIds = [
    ...new Set((enviadosPendentes ?? []).map((m) => String(m.adversario_id ?? "")).filter(Boolean)),
  ];
  const enviadosEsporteIds = [
    ...new Set((enviadosPendentes ?? []).map((m) => Number(m.esporte_id ?? 0)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const { data: enviadosPerfis } = enviadosAdversarioIds.length
    ? await supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", enviadosAdversarioIds)
    : { data: [] };
  const { data: enviadosEids } =
    enviadosAdversarioIds.length > 0 && enviadosEsporteIds.length > 0
      ? await supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", enviadosAdversarioIds)
          .in("esporte_id", enviadosEsporteIds)
      : { data: [] };
  const enviadosPerfisMap = new Map((enviadosPerfis ?? []).map((p) => [p.id, p]));
  const enviadosEidMap = new Map(
    (enviadosEids ?? []).map((row) => [`${String(row.usuario_id)}:${Number(row.esporte_id)}`, Number(row.nota_eid ?? 0)])
  );
  const enviadosAdvTimeIds = [
    ...new Set(
      (enviadosPendentes ?? [])
        .map((row) => Number((row as { adversario_time_id?: number | null }).adversario_time_id ?? 0))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  const { data: enviadosFormacaoRows } = enviadosAdvTimeIds.length
    ? await supabase.from("times").select("id, nome, escudo, localizacao, tipo, eid_time").in("id", enviadosAdvTimeIds)
    : { data: [] };
  const enviadosFormacaoMap = new Map(
    (enviadosFormacaoRows ?? []).map((t) => [Number((t as { id: number }).id), t])
  );
  const pedidosEnviadosItems = (enviadosPendentes ?? []).map((m) => {
    const mod = String(m.modalidade_confronto ?? "individual").toLowerCase();
    const normalizedMod = mod === "atleta" ? "individual" : mod;
    const advTimeId = Number((m as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    let formacaoAdversaria: {
      id: number;
      nome: string | null;
      escudo: string | null;
      localizacao: string | null;
      tipo: "dupla" | "time";
      eidTime: number;
    } | null = null;
    if (advTimeId > 0 && (normalizedMod === "dupla" || normalizedMod === "time")) {
      const t = enviadosFormacaoMap.get(advTimeId);
      if (t) {
        const tipoRaw = String((t as { tipo?: string | null }).tipo ?? "").trim().toLowerCase();
        if (tipoRaw === "dupla" || tipoRaw === "time") {
          formacaoAdversaria = {
            id: advTimeId,
            nome: (t as { nome?: string | null }).nome ?? null,
            escudo: (t as { escudo?: string | null }).escudo ?? null,
            localizacao: (t as { localizacao?: string | null }).localizacao ?? null,
            tipo: tipoRaw as "dupla" | "time",
            eidTime: Number((t as { eid_time?: number | null }).eid_time ?? 0),
          };
        }
      }
    }
    return {
      id: Number(m.id),
      solicitadoEm: (m as { data_solicitacao?: string | null }).data_solicitacao ?? null,
      adversarioId: String(m.adversario_id ?? ""),
      adversarioNome: enviadosPerfisMap.get(String(m.adversario_id ?? ""))?.nome ?? "Oponente",
      adversarioAvatarUrl: enviadosPerfisMap.get(String(m.adversario_id ?? ""))?.avatar_url ?? null,
      adversarioLocalizacao: enviadosPerfisMap.get(String(m.adversario_id ?? ""))?.localizacao ?? null,
      adversarioNotaEid: enviadosEidMap.get(`${String(m.adversario_id ?? "")}:${Number(m.esporte_id ?? 0)}`) ?? 0,
      esporte: (m.esporte_id ? espMap.get(m.esporte_id) : null) ?? "Esporte",
      esporteId: Number(m.esporte_id ?? 0),
      modalidade: normalizedMod,
      formacaoAdversaria,
    };
  });

  const { data: aceitosCancelaveisPainel } = await supabase
    .from("matches")
    .select("id, usuario_id, adversario_id, esporte_id, status, reschedule_selected_option")
    .or(`usuario_id.eq.${user.id},adversario_id.eq.${user.id}`)
    .eq("finalidade", "ranking")
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"]);
  const { data: historicoCancelamentoPainelRows } = await supabase
    .from("matches")
    .select("id, usuario_id, adversario_id, esporte_id, status")
    .or(`usuario_id.eq.${user.id},adversario_id.eq.${user.id}`)
    .eq("finalidade", "ranking")
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente", "Cancelado"])
    .order("id", { ascending: false })
    .limit(120);

  const { data: sugestoesRaw } = await supabase
    .from("match_sugestoes")
    .select("id, sugeridor_id, sugeridor_time_id, alvo_time_id, esporte_id, modalidade, mensagem, criado_em")
    .eq("alvo_dono_id", user.id)
    .eq("status", "pendente")
    .order("id", { ascending: false })
    .limit(25);
  const { data: sugestoesEnviadasRaw } = await supabase
    .from("match_sugestoes")
    .select("id, sugeridor_id, sugeridor_time_id, alvo_time_id, esporte_id, modalidade, mensagem, status, criado_em, respondido_em, oculto_sugeridor")
    .eq("sugeridor_id", user.id)
    .neq("oculto_sugeridor", true)
    .order("id", { ascending: false })
    .limit(40);

  const cooldownMesesSug = await getMatchRankCooldownMeses(supabase);

  const sugSugIds = [...new Set((sugestoesRaw ?? []).map((s) => s.sugeridor_id).filter(Boolean))] as string[];
  const sugTimeIds = [
    ...new Set(
      (sugestoesRaw ?? []).flatMap((s) => [s.sugeridor_time_id, s.alvo_time_id].filter((x): x is number => x != null))
    ),
  ];
  const { data: sugPerfis } = sugSugIds.length
    ? await supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", sugSugIds)
    : { data: [] };
  const sugPerfilMap = new Map((sugPerfis ?? []).map((p) => [p.id, p.nome]));
  const sugPerfilAvatarMap = new Map(
    (sugPerfis ?? []).map((p) => [p.id, String((p as { avatar_url?: string | null }).avatar_url ?? "")])
  );
  const sugPerfilLocMap = new Map<string, string | null>(
    (sugPerfis ?? []).map((p) => {
      const loc = String((p as { localizacao?: string | null }).localizacao ?? "").trim();
      return [p.id, loc || null];
    })
  );
  const { data: sugTimes } = sugTimeIds.length
    ? await supabase.from("times").select("id, nome, criador_id, escudo, eid_time, localizacao").in("id", sugTimeIds)
    : { data: [] };
  const sugTimeMap = new Map((sugTimes ?? []).map((t) => [t.id, t.nome]));
  const sugTimeAvatarMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), String((t as { escudo?: string | null }).escudo ?? "")]));
  const sugTimeEidMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), Number((t as { eid_time?: number | null }).eid_time ?? 0)]));
  const sugTimeLocMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), String((t as { localizacao?: string | null }).localizacao ?? "")]));
  const sugTimeOwnerMap = new Map((sugTimes ?? []).map((t) => [Number(t.id), String((t as { criador_id?: string | null }).criador_id ?? "")]));
  const sugEspIds = [...new Set((sugestoesRaw ?? []).map((s) => s.esporte_id).filter(Boolean))] as number[];
  const { data: sugEsportes } = sugEspIds.length
    ? await supabase.from("esportes").select("id, nome").in("id", sugEspIds)
    : { data: [] };
  const sugEspMap = new Map((sugEsportes ?? []).map((e) => [e.id, e.nome]));

  const cutoffSug = new Date();
  cutoffSug.setMonth(cutoffSug.getMonth() - cooldownMesesSug);
  const cutoffSugMs = cutoffSug.getTime();
  const candidateOwnerIds = [
    ...new Set(
      (sugestoesRaw ?? [])
        .map((s) => {
          const modalidade = String(s.modalidade ?? "").trim().toLowerCase();
          if (modalidade === "individual") return String(s.sugeridor_id ?? "");
          const teamId = Number(s.sugeridor_time_id ?? 0);
          return sugTimeOwnerMap.get(teamId) ?? "";
        })
        .filter(Boolean)
    ),
  ];
  const sugEsporteIdsSet = [...new Set((sugestoesRaw ?? []).map((s) => Number(s.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0))];
  const { data: partidasSugCooldown } = candidateOwnerIds.length && sugEsporteIdsSet.length
    ? await supabase
        .from("partidas")
        .select("esporte_id, modalidade, jogador1_id, jogador2_id, status, status_ranking, data_resultado, data_partida, data_registro")
        .is("torneio_id", null)
        .in("esporte_id", sugEsporteIdsSet)
        .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id}`)
        .order("id", { ascending: false })
        .limit(350)
    : { data: [] as Array<Record<string, unknown>> };
  const blockedSugByKey = new Set<string>();
  const normTxt = (v: string | null | undefined) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  for (const p of partidasSugCooldown ?? []) {
    const status = normTxt((p as { status?: string | null }).status);
    const statusRanking = normTxt((p as { status_ranking?: string | null }).status_ranking);
    const valid =
      statusRanking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valid) continue;
    const dtRaw =
      (p as { data_resultado?: string | null }).data_resultado ??
      (p as { data_partida?: string | null }).data_partida ??
      (p as { data_registro?: string | null }).data_registro ??
      null;
    if (!dtRaw) continue;
    const ts = new Date(dtRaw).getTime();
    if (!Number.isFinite(ts) || ts < cutoffSugMs) continue;
    const j1 = String((p as { jogador1_id?: string | null }).jogador1_id ?? "");
    const j2 = String((p as { jogador2_id?: string | null }).jogador2_id ?? "");
    const otherId = j1 === user.id ? j2 : j2 === user.id ? j1 : "";
    if (!otherId) continue;
    const esporteId = Number((p as { esporte_id?: number | null }).esporte_id ?? 0);
    if (!Number.isFinite(esporteId) || esporteId <= 0) continue;
    const modRaw = normTxt((p as { modalidade?: string | null }).modalidade);
    const modalidade = modRaw === "dupla" ? "dupla" : modRaw === "time" ? "time" : "individual";
    blockedSugByKey.add(`${otherId}:${esporteId}:${modalidade}`);
  }

  const sugestoesItems: SugestaoMatchItem[] = (sugestoesRaw ?? [])
    .filter((s) => {
      const modalidadeRaw = String(s.modalidade ?? "").trim().toLowerCase();
      const modalidade = modalidadeRaw === "dupla" ? "dupla" : modalidadeRaw === "time" ? "time" : "individual";
      const esporteId = Number(s.esporte_id ?? 0);
      const ownerId =
        modalidade === "individual"
          ? String(s.sugeridor_id ?? "")
          : sugTimeOwnerMap.get(Number(s.sugeridor_time_id ?? 0)) ?? "";
      if (!ownerId || !Number.isFinite(esporteId) || esporteId <= 0) return true;
      return !blockedSugByKey.has(`${ownerId}:${esporteId}:${modalidade}`);
    })
    .map((s) => ({
    id: Number(s.id),
    criadoEm: String((s as { criado_em?: string | null }).criado_em ?? "").trim() || null,
    sugeridorId: String(s.sugeridor_id ?? ""),
    sugeridorNome: sugPerfilMap.get(s.sugeridor_id) ?? "Atleta",
    sugeridorAvatarUrl: sugPerfilAvatarMap.get(String(s.sugeridor_id ?? "")) || null,
    sugeridorLocalizacao: sugPerfilLocMap.get(String(s.sugeridor_id ?? "")) ?? null,
    meuTimeId: Number(s.sugeridor_time_id ?? 0) || null,
    meuTimeTipo: String(s.modalidade ?? "time"),
    meuTimeNome: sugTimeMap.get(s.sugeridor_time_id) ?? "Formação",
    meuTimeAvatarUrl: sugTimeAvatarMap.get(Number(s.sugeridor_time_id ?? 0)) || null,
    meuTimeNotaEid: sugTimeEidMap.get(Number(s.sugeridor_time_id ?? 0)) ?? 0,
    meuTimeLocalizacao: sugTimeLocMap.get(Number(s.sugeridor_time_id ?? 0)) || null,
    alvoTimeNome: sugTimeMap.get(s.alvo_time_id) ?? "Formação",
    esporte: (s.esporte_id ? sugEspMap.get(s.esporte_id) : null) ?? "Esporte",
    modalidade: s.modalidade ?? "time",
    mensagem: s.mensagem ?? null,
  }));
  const nSugestoes = sugestoesItems.length;
  const sugEnvTimeIds = [
    ...new Set(
      (sugestoesEnviadasRaw ?? []).flatMap((s) => [s.sugeridor_time_id, s.alvo_time_id].filter((x): x is number => x != null))
    ),
  ];
  const sugEnvEspIds = [...new Set((sugestoesEnviadasRaw ?? []).map((s) => Number(s.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0))];
  const { data: sugEnvTimes } = sugEnvTimeIds.length
    ? await supabase.from("times").select("id, nome, escudo, eid_time, localizacao").in("id", sugEnvTimeIds)
    : { data: [] };
  const { data: sugEnvEsportes } = sugEnvEspIds.length
    ? await supabase.from("esportes").select("id, nome").in("id", sugEnvEspIds)
    : { data: [] };
  const sugEnvTimesMap = new Map((sugEnvTimes ?? []).map((t) => [Number(t.id), t]));
  const sugEnvEspMap = new Map((sugEnvEsportes ?? []).map((e) => [Number(e.id), String(e.nome ?? "Esporte")]));
  const sugestoesEnviadasItems: SugestaoEnviadaMatchItem[] = (sugestoesEnviadasRaw ?? [])
    .map((s) => {
      const time = sugEnvTimesMap.get(Number(s.sugeridor_time_id ?? 0));
      const statusRaw = String(s.status ?? "pendente").trim().toLowerCase();
      const statusLabel =
        statusRaw === "aprovado"
          ? "Aprovado"
          : statusRaw === "recusado"
            ? "Recusado"
            : "Pendente";
      const statusClass =
        statusRaw === "aprovado"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
          : statusRaw === "recusado"
            ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
            : "border-amber-500/35 bg-amber-500/10 text-amber-200";
      return {
        id: Number(s.id),
        statusRaw,
        statusLabel,
        statusClass,
        criadoEm: String(s.criado_em ?? new Date().toISOString()),
        respondidoEm: (s as { respondido_em?: string | null }).respondido_em ?? null,
        sugeridorId: user.id,
        sugeridorNome: String((profile as { nome?: string | null } | null)?.nome ?? "Você"),
        sugeridorAvatarUrl: String((profile as { avatar_url?: string | null } | null)?.avatar_url ?? "") || null,
        meuTimeId: Number(s.sugeridor_time_id ?? 0) || null,
        meuTimeTipo: String(s.modalidade ?? "time"),
        meuTimeNome: String((time as { nome?: string | null } | null)?.nome ?? "Formação"),
        meuTimeAvatarUrl: String((time as { escudo?: string | null } | null)?.escudo ?? "") || null,
        meuTimeNotaEid: Number((time as { eid_time?: number | null } | null)?.eid_time ?? 0),
        meuTimeLocalizacao: String((time as { localizacao?: string | null } | null)?.localizacao ?? "") || null,
        alvoTimeNome: String((sugEnvTimesMap.get(Number(s.alvo_time_id ?? 0)) as { nome?: string | null } | null)?.nome ?? "Formação"),
        alvoLocalizacao:
          String(
            (sugEnvTimesMap.get(Number(s.alvo_time_id ?? 0)) as { localizacao?: string | null } | null)?.localizacao ?? ""
          ).trim() || null,
        esporte: sugEnvEspMap.get(Number(s.esporte_id ?? 0)) ?? "Esporte",
        modalidade: String(s.modalidade ?? "time"),
        mensagem: String(s.mensagem ?? "").trim() || null,
      };
    })
    .filter((s) => s.statusRaw !== "recusado" && s.statusRaw !== "cancelado")
    .sort((a, b) => {
      const priority = (status: string) => {
        if (status === "pendente") return 0;
        if (status === "aprovado") return 1;
        return 2;
      };
      const p = priority(a.statusRaw) - priority(b.statusRaw);
      if (p !== 0) return p;
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });
  const hasSugestoesEnviadasPendentes = sugestoesEnviadasItems.some((s) => s.statusRaw === "pendente");
  const { data: convites } = await supabase
    .from("time_convites")
    .select(
      "id, time_id, convidado_por_usuario_id, criado_em, times!inner(id, nome, tipo, escudo, eid_time, localizacao, lat, lng, esportes(nome))"
    )
    .eq("convidado_usuario_id", user.id)
    .eq("status", "pendente")
    .order("id", { ascending: false })
    .limit(30);
  const inviterIds = [...new Set((convites ?? []).map((c) => c.convidado_por_usuario_id).filter(Boolean))] as string[];
  const { data: inviteProfiles } = inviterIds.length
    ? await supabase
        .from("profiles")
        .select("id, nome, username, avatar_url, localizacao")
        .in("id", inviterIds)
    : { data: [] as { id: string; nome: string | null; username: string | null; avatar_url: string | null; localizacao: string | null }[] };
  const inviteProfileMap = new Map((inviteProfiles ?? []).map((u) => [u.id, u]));
  const conviteItems: ConviteTimeItem[] = (convites ?? []).map((c) => {
    const t = Array.isArray(c.times) ? c.times[0] : c.times;
    const esp = t?.esportes ? (Array.isArray(t.esportes) ? t.esportes[0] : t.esportes) : null;
    const inviterId = String(c.convidado_por_usuario_id ?? "");
    const inv = inviteProfileMap.get(inviterId);
    const invNome = inv?.nome?.trim() || inv?.username?.trim() || "Líder";
    return {
      id: Number(c.id),
      equipeNome: t?.nome ?? "Equipe",
      equipePrimeiroNome: primeiroNome(t?.nome ?? null),
      equipeId: Number(t?.id ?? 0),
      equipeTipo: String(t?.tipo ?? "time"),
      equipeAvatarUrl: (t as { escudo?: string | null } | null)?.escudo ?? null,
      equipeNotaEid: Number((t as { eid_time?: number | null } | null)?.eid_time ?? 0),
      equipeLocalizacao: (t as { localizacao?: string | null } | null)?.localizacao ?? null,
      equipeDistanceKm:
        hasMyCoords &&
        Number.isFinite(Number((t as { lat?: number | null } | null)?.lat ?? NaN)) &&
        Number.isFinite(Number((t as { lng?: number | null } | null)?.lng ?? NaN))
          ? distanciaKm(
              myLat,
              myLng,
              Number((t as { lat?: number | null } | null)?.lat ?? NaN),
              Number((t as { lng?: number | null } | null)?.lng ?? NaN)
            )
          : null,
      esporteNome: esp?.nome ?? "Esporte",
      criadoEm: String((c as { criado_em?: string | null }).criado_em ?? new Date().toISOString()),
      convidadoPorUsuarioId: inviterId,
      convidadoPorNome: invNome,
      convidadoPorPrimeiroNome: primeiroNome(invNome),
      convidadoPorUsername: inv?.username?.trim() ? `@${inv.username.trim()}` : null,
      convidadoPorAvatarUrl: inv?.avatar_url ?? null,
      convidadoPorLocalizacao: inv?.localizacao ?? null,
    };
  });
  const { data: convitesEnviados } = await supabase
    .from("time_convites")
    .select("id, time_id, convidado_usuario_id, status, criado_em, respondido_em, times!inner(id, nome, tipo, escudo, eid_time, localizacao, esporte_id, esportes(nome))")
    .eq("convidado_por_usuario_id", user.id)
    .order("id", { ascending: false })
    .limit(40);
  const convidadoIds = [
    ...new Set((convitesEnviados ?? []).map((c) => String(c.convidado_usuario_id ?? "")).filter(Boolean)),
  ] as string[];
  const { data: convidadosPerfis } = convidadoIds.length
    ? await supabase.from("profiles").select("id, nome, username, avatar_url, localizacao, lat, lng").in("id", convidadoIds)
    : { data: [] };
  const convidadosMap = new Map(
    (convidadosPerfis ?? []).map((p) => [
      p.id,
      {
        nome: p.nome,
        username: (p as { username?: string | null }).username ?? null,
        avatarUrl: (p as { avatar_url?: string | null }).avatar_url ?? null,
        localizacao: (p as { localizacao?: string | null }).localizacao ?? null,
        lat: Number((p as { lat?: number | null }).lat ?? NaN),
        lng: Number((p as { lng?: number | null }).lng ?? NaN),
      },
    ])
  );
  const conviteEsporteIds = [
    ...new Set(
      (convitesEnviados ?? [])
        .map((c) => {
          const t = Array.isArray((c as { times?: unknown }).times)
            ? ((c as { times?: Array<{ esporte_id?: number | null }> }).times?.[0] ?? null)
            : ((c as { times?: { esporte_id?: number | null } }).times ?? null);
          return Number(t?.esporte_id ?? 0);
        })
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const { data: convitesEidRows } = convidadoIds.length && conviteEsporteIds.length
    ? await supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid")
        .in("usuario_id", convidadoIds)
        .in("esporte_id", conviteEsporteIds)
    : { data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> };
  const convitesEidMap = new Map(
    (convitesEidRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)])
  );
  const conviteEnviadoItems: ConviteTimeEnviadoItem[] = (convitesEnviados ?? [])
    .map((c) => {
      const t = Array.isArray(c.times) ? c.times[0] : c.times;
      const esp = t?.esportes ? (Array.isArray(t.esportes) ? t.esportes[0] : t.esportes) : null;
      const convidadoId = String(c.convidado_usuario_id ?? "");
      const perfil = convidadosMap.get(convidadoId);
      const esporteId = Number((t as { esporte_id?: number | null } | null)?.esporte_id ?? 0);
      return {
        id: Number(c.id),
        equipeNome: t?.nome ?? "Equipe",
        equipeId: Number(t?.id ?? 0),
        equipeTipo: String(t?.tipo ?? "time"),
        equipeAvatarUrl: (t as { escudo?: string | null } | null)?.escudo ?? null,
        equipeNotaEid: Number((t as { eid_time?: number | null } | null)?.eid_time ?? 0),
        equipeLocalizacao: (t as { localizacao?: string | null } | null)?.localizacao ?? null,
        esporteNome: esp?.nome ?? "Esporte",
        convidadoId,
        convidadoNome: perfil?.nome ?? "Atleta",
        convidadoUsername: perfil?.username ?? null,
        convidadoAvatarUrl: perfil?.avatarUrl ?? null,
        convidadoNotaEid: convitesEidMap.get(`${convidadoId}:${esporteId}`) ?? 0,
        convidadoLocalizacao: perfil?.localizacao ?? null,
        convidadoDistanceKm:
          hasMyCoords && Number.isFinite(Number(perfil?.lat ?? NaN)) && Number.isFinite(Number(perfil?.lng ?? NaN))
            ? distanciaKm(myLat, myLng, Number(perfil?.lat ?? NaN), Number(perfil?.lng ?? NaN))
            : null,
        status: String(c.status ?? "pendente"),
        criadoEm: (c as { criado_em?: string | null }).criado_em ?? null,
        respondidoEm: (c as { respondido_em?: string | null }).respondido_em ?? null,
      };
    })
    .filter((c) => {
      const s = String(c.status ?? "").trim().toLowerCase();
      return s !== "recusado" && s !== "cancelado";
    });
  const { data: candidaturasEquipeRaw } = await supabase
    .from("time_candidaturas")
    .select(
      "id, time_id, mensagem, criado_em, candidato_usuario_id, times!inner(id, nome, criador_id, esporte_id, tipo, escudo, eid_time, localizacao, esportes(nome))"
    )
    .eq("status", "pendente")
    .eq("times.criador_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(40);
  const candEquipeIds = [
    ...new Set((candidaturasEquipeRaw ?? []).map((p) => String(p.candidato_usuario_id ?? "")).filter(Boolean)),
  ] as string[];
  const { data: candEquipeProfiles } = candEquipeIds.length
    ? await supabase.from("profiles").select("id, nome, username, avatar_url, localizacao").in("id", candEquipeIds)
    : {
        data: [] as { id: string; nome: string | null; username: string | null; avatar_url: string | null; localizacao: string | null }[],
      };
  const candEquipeEsporteIds = [
    ...new Set(
      (candidaturasEquipeRaw ?? [])
        .map((p) => {
          const t = Array.isArray((p as { times?: unknown }).times)
            ? ((p as { times?: Array<{ esporte_id?: number | null }> }).times?.[0] ?? null)
            : ((p as { times?: { esporte_id?: number | null } }).times ?? null);
          return Number(t?.esporte_id ?? 0);
        })
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const { data: candEquipeEidRows } = candEquipeIds.length && candEquipeEsporteIds.length
    ? await supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid")
        .in("usuario_id", candEquipeIds)
        .in("esporte_id", candEquipeEsporteIds)
    : { data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> };
  const candEquipeEidMap = new Map(
    (candEquipeEidRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)])
  );
  const candEquipeMap = new Map((candEquipeProfiles ?? []).map((r) => [r.id, r]));
  const candidaturasEquipe = (candidaturasEquipeRaw ?? []).map((raw) => {
    const p = raw as {
      id: number;
      time_id: number;
      mensagem: string | null;
      criado_em: string;
      candidato_usuario_id: string;
      times:
        | {
            id: number;
            nome: string | null;
            criador_id: string;
            esporte_id: number | null;
            tipo: string | null;
            escudo?: string | null;
            eid_time?: number | null;
            localizacao?: string | null;
            esportes?: { nome: string | null } | { nome: string | null }[] | null;
          }
        | {
            id: number;
            nome: string | null;
            criador_id: string;
            esporte_id: number | null;
            tipo: string | null;
            escudo?: string | null;
            eid_time?: number | null;
            localizacao?: string | null;
            esportes?: { nome: string | null } | { nome: string | null }[] | null;
          }[];
    };
    const team = Array.isArray(p.times) ? p.times[0] : p.times;
    const prof = candEquipeMap.get(p.candidato_usuario_id);
    const esporteId = Number(team?.esporte_id ?? 0);
    const notaEid = candEquipeEidMap.get(`${p.candidato_usuario_id}:${esporteId}`) ?? 0;
    const espRel = team?.esportes;
    const esporteNome =
      (Array.isArray(espRel) ? espRel[0]?.nome : espRel?.nome)?.trim() || "Esporte";
    const isDuplaTipo =
      String(team?.tipo ?? "")
        .trim()
        .toLowerCase() === "dupla";
    return {
      id: p.id,
      timeId: p.time_id,
      candidatoId: p.candidato_usuario_id,
      nome: prof?.nome?.trim() || prof?.username?.trim() || "Atleta",
      primeiroNome: primeiroNome(prof?.nome?.trim() || prof?.username?.trim() || "Atleta"),
      username: prof?.username?.trim() ? `@${prof.username.trim()}` : null,
      avatarUrl: prof?.avatar_url ?? null,
      candidatoLocalizacao: prof?.localizacao ?? null,
      notaEid,
      mensagem: p.mensagem?.trim() || null,
      criadoEm: p.criado_em,
      timeNome: team?.nome ?? "sua formação",
      timeTipo: String(team?.tipo ?? "time"),
      timePrimeiroNome: primeiroNome(team?.nome ?? null),
      timeEscudoUrl: team?.escudo ?? null,
      timeNotaEid: Number(team?.eid_time ?? 0),
      timeLocalizacao: team?.localizacao ?? null,
      esporteNome,
      isDuplaTipo,
    };
  });
  const { data: minhasCandidaturasRaw } = await supabase
    .from("time_candidaturas")
    .select(
      "id, time_id, status, mensagem, criado_em, respondido_em, times(id, nome, tipo, esporte_id, escudo, eid_time, localizacao, esportes(nome))"
    )
    .eq("candidato_usuario_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(60);
  const minhasCandEsporteIds = [
    ...new Set(
      (minhasCandidaturasRaw ?? [])
        .map((raw) => {
          const r = raw as {
            times?:
              | { esporte_id?: number | null }
              | Array<{ esporte_id?: number | null }>;
          };
          const tm = Array.isArray(r.times) ? r.times[0] : r.times;
          return Number(tm?.esporte_id ?? 0);
        })
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const { data: minhasCandEidRows } =
    minhasCandEsporteIds.length > 0
      ? await supabase
          .from("usuario_eid")
          .select("esporte_id, nota_eid")
          .eq("usuario_id", user.id)
          .in("esporte_id", minhasCandEsporteIds)
      : { data: [] as { esporte_id: number; nota_eid: number | null }[] };
  const minhasCandEidMap = new Map(
    (minhasCandEidRows ?? []).map((r) => [Number(r.esporte_id), Number(r.nota_eid ?? 0)])
  );
  const minhasCandidaturasEquipe = (minhasCandidaturasRaw ?? []).map((raw) => {
    const row = raw as {
      id: number;
      time_id: number;
      status: string | null;
      mensagem: string | null;
      criado_em: string;
      respondido_em: string | null;
      times:
        | {
            id: number;
            nome: string | null;
            tipo: string | null;
            esporte_id?: number | null;
            escudo?: string | null;
            eid_time?: number | null;
            localizacao?: string | null;
            esportes?: { nome: string | null } | { nome: string | null }[] | null;
          }
        | {
            id: number;
            nome: string | null;
            tipo: string | null;
            esporte_id?: number | null;
            escudo?: string | null;
            eid_time?: number | null;
            localizacao?: string | null;
            esportes?: { nome: string | null } | { nome: string | null }[] | null;
          }[];
    };
    const team = Array.isArray(row.times) ? row.times[0] : row.times;
    const espRel = team?.esportes;
    const espNome =
      (Array.isArray(espRel) ? espRel[0]?.nome : espRel?.nome)?.trim() || "Esporte";
    const statusRaw = String(row.status ?? "pendente").trim().toLowerCase();
    const statusLabel =
      statusRaw === "aprovado" || statusRaw === "aceita" || statusRaw === "aceito"
        ? "Aprovado"
        : statusRaw === "recusado" || statusRaw === "recusada"
          ? "Recusado"
          : statusRaw === "cancelado" || statusRaw === "cancelada"
            ? "Cancelado"
            : "Pendente";
    const statusClass =
      statusLabel === "Aprovado"
        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
        : statusLabel === "Recusado" || statusLabel === "Cancelado"
          ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
          : "border-amber-500/35 bg-amber-500/10 text-amber-200";
    const espId = Number(team?.esporte_id ?? 0);
    const notaEidMeu = minhasCandEidMap.get(espId) ?? 0;
    const isDuplaTipo =
      String(team?.tipo ?? "")
        .trim()
        .toLowerCase() === "dupla";
    return {
      id: row.id,
      timeId: row.time_id,
      statusRaw,
      statusLabel,
      statusClass,
      mensagem: row.mensagem?.trim() || null,
      criadoEm: row.criado_em,
      respondidoEm: row.respondido_em,
      timeNome: team?.nome ?? "Formação",
      timeTipo: String(team?.tipo ?? "time"),
      isDuplaTipo,
      notaEidMeu,
      timePrimeiroNome: primeiroNome(team?.nome ?? null),
      timeEscudoUrl: team?.escudo ?? null,
      timeNotaEid: Number(team?.eid_time ?? 0),
      timeLocalizacao: team?.localizacao ?? null,
      esporteNome: espNome,
      meuPrimeiroNome: primeiroNome(profile?.nome ?? null),
      meuAvatarUrl: profile?.avatar_url ?? null,
      meuLocalizacao: profile?.localizacao ?? null,
    };
  }).filter((c) => c.statusRaw !== "recusado" && c.statusRaw !== "cancelado");
  const nNotifUnread = uniqueNotificacoesSetor.filter((n) => n.lida !== true).length;
  const desafioNotifs = uniqueNotificacoesSetor.filter((n) => {
    const tipo = String(n.tipo ?? "").toLowerCase();
    const msg = String(n.mensagem ?? "").toLowerCase();
    if (msg.includes("cancelad") || msg.includes("cancelamento") || msg.includes("recusad")) return false;
    return tipo.includes("match") || tipo.includes("desafio") || msg.includes("desafio");
  });
  const equipeNotifs = uniqueNotificacoesSetor.filter((n) => {
    const tipo = String(n.tipo ?? "").toLowerCase();
    const msg = String(n.mensagem ?? "").toLowerCase();
    if (msg.includes("cancelad") || msg.includes("cancelamento") || msg.includes("recusad")) return false;
    return tipo.includes("time") || tipo.includes("convite") || tipo.includes("candidatura") || msg.includes("pedido para entrar");
  });

  const [{ data: solicitacoes }, { data: vinculos }] = await Promise.all([
    supabase
      .from("professor_solicitacoes_aula")
      .select(
        "id, professor_id, esporte_id, mensagem, status, criado_em, respondido_em, esportes(nome)"
      )
      .eq("aluno_id", user.id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("professor_aula_alunos")
      .select(
        "id, aula_id, aluno_id, valor_centavos, status_inscricao, status_pagamento, taxa_cancelamento_centavos, motivo_cancelamento, professor_aulas!inner(id, professor_id, titulo, inicio, fim, status, esportes(nome))"
      )
      .eq("aluno_id", user.id)
      .order("id", { ascending: false }),
  ]);

  const professorIds = [
    ...new Set([
      ...(solicitacoes ?? []).map((item) => item.professor_id),
      ...(vinculos ?? []).map((item) => {
        const aula = Array.isArray(item.professor_aulas)
          ? item.professor_aulas[0]
          : item.professor_aulas;
        return aula?.professor_id ?? null;
      }),
    ].filter(Boolean)),
  ] as string[];

  const [{ data: professores }, { data: professorPerfis }] = professorIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, nome, whatsapp").in("id", professorIds),
        supabase
          .from("professor_perfil")
          .select("usuario_id, whatsapp_visibilidade, headline, politica_cancelamento_json")
          .in("usuario_id", professorIds),
      ])
    : [
        { data: [] as Array<{ id: string; nome: string | null; whatsapp: string | null }> },
        {
          data: [] as Array<{
            usuario_id: string;
            whatsapp_visibilidade: string | null;
            headline: string | null;
            politica_cancelamento_json: unknown;
          }>,
        },
      ];

  const professorMap = new Map<string, ComunidadeProfessorProfileRow>();
  const professorPerfilMap = new Map(
    (professorPerfis ?? []).map((item) => [item.usuario_id, item])
  );
  for (const item of professores ?? []) {
    const professorPerfil = professorPerfilMap.get(item.id);
    professorMap.set(item.id, {
      id: item.id,
      nome: item.nome ?? null,
      whatsapp: item.whatsapp ?? null,
      whatsapp_visibilidade: professorPerfil?.whatsapp_visibilidade ?? "publico",
      headline: professorPerfil?.headline ?? null,
      politica_cancelamento_json: professorPerfil?.politica_cancelamento_json ?? null,
    });
  }

  const nAulas = (solicitacoes?.length ?? 0) + (vinculos?.length ?? 0);
  const emBreveKeys: SystemFeatureKey[] = ["marketplace", "locais", "torneios", "professores", "organizador_torneios"];
  const emBreveItems = emBreveKeys
    .map((key) => ({
      key,
      label: SYSTEM_FEATURE_LABEL[key],
      mode: featureCfg[key].mode,
    }))
    .filter((item) => item.mode !== "ativo");

  const { teamClause: teamClausePainel } = await getAgendaTeamContext(supabase, user.id);
  await processarPendenciasAgendamentoAceite(supabase, user.id, teamClausePainel);
  const [{ data: painelAgendadas }, { data: painelPlacarPendente }] = await Promise.all([
    fetchPartidasAgendadasUsuario(supabase, user.id, teamClausePainel),
    fetchPlacarAguardandoConfirmacao(supabase, user.id, teamClausePainel),
  ]);
  const { data: painelPartidasStatusRows } = await supabase
    .from("partidas")
    .select("id, esporte_id, jogador1_id, jogador2_id, status, status_ranking, lancado_por")
    .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id},usuario_id.eq.${user.id}${teamClausePainel}`)
    .in("status", ["agendada", "aguardando_confirmacao"])
    .order("id", { ascending: false })
    .limit(120);
  const painelPartidasAll = [...(painelAgendadas ?? []), ...(painelPlacarPendente ?? [])];
  const painelLocalIds = [
    ...new Set(
      painelPartidasAll.map((p) => p.local_espaco_id).filter((x): x is number => typeof x === "number" && x > 0)
    ),
  ];
  const { data: painelLocaisRows } = painelLocalIds.length
    ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", painelLocalIds)
    : { data: [] };
  const painelLocMap = new Map((painelLocaisRows ?? []).map((l) => [l.id, l.nome_publico]));
  const painelPlayerIds = new Set<string>();
  for (const p of painelPartidasAll) {
    if (p.jogador1_id) painelPlayerIds.add(p.jogador1_id);
    if (p.jogador2_id) painelPlayerIds.add(p.jogador2_id);
  }
  const painelPlayerList = [...painelPlayerIds];
  const { data: painelNomeRows } = painelPlayerList.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", painelPlayerList)
    : { data: [] };
  const painelPerfilMap = new Map((painelNomeRows ?? []).map((r) => [r.id, r]));
  const painelNomeMap = new Map((painelNomeRows ?? []).map((r) => [r.id, r.nome]));
  const painelEsporteIds = [
    ...new Set(
      painelPartidasAll
        .map((p) => Number((p as { esporte_id?: number | null }).esporte_id ?? 0))
        .filter((v) => Number.isFinite(v) && v > 0)
    ),
  ];
  const { data: painelUeRows } = painelPlayerList.length && painelEsporteIds.length
    ? await supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid")
        .in("usuario_id", painelPlayerList)
        .in("esporte_id", painelEsporteIds)
    : { data: [] };
  const painelNotaEidByUserSport = new Map(
    (painelUeRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)])
  );

  function localLabelPainel(p: AgendaPartidaCardRow) {
    if (p.local_str?.trim()) return p.local_str.trim();
    if (p.local_espaco_id) return painelLocMap.get(p.local_espaco_id) ?? null;
    return null;
  }

  function dueloKey(a: string | null | undefined, b: string | null | undefined, esporteId: number | null | undefined): string | null {
    if (!a || !b || !Number.isFinite(Number(esporteId)) || Number(esporteId) <= 0) return null;
    const [x, y] = [String(a), String(b)].sort();
    return `${Number(esporteId)}:${x}:${y}`;
  }
  function dueloKeyNoSport(a: string | null | undefined, b: string | null | undefined): string | null {
    if (!a || !b) return null;
    const [x, y] = [String(a), String(b)].sort();
    return `${x}:${y}`;
  }

  const partidaMaisRecentePorDueloPainel = new Map<
    string,
    { status: string | null; status_ranking: string | null; lancado_por: string | null }
  >();
  const partidaMaisRecentePorDueloPainelNoSport = new Map<
    string,
    { status: string | null; status_ranking: string | null; lancado_por: string | null }
  >();
  for (const row of painelPartidasStatusRows ?? []) {
    const key = dueloKey(
      (row as { jogador1_id?: string | null }).jogador1_id ?? null,
      (row as { jogador2_id?: string | null }).jogador2_id ?? null,
      Number((row as { esporte_id?: number | null }).esporte_id ?? 0)
    );
    const meta = {
      status: (row as { status?: string | null }).status ?? null,
      status_ranking: (row as { status_ranking?: string | null }).status_ranking ?? null,
      lancado_por: (row as { lancado_por?: string | null }).lancado_por ?? null,
    };
    if (key && !partidaMaisRecentePorDueloPainel.has(key)) {
      partidaMaisRecentePorDueloPainel.set(key, meta);
    }
    const keyNoSport = dueloKeyNoSport(
      (row as { jogador1_id?: string | null }).jogador1_id ?? null,
      (row as { jogador2_id?: string | null }).jogador2_id ?? null
    );
    if (keyNoSport && !partidaMaisRecentePorDueloPainelNoSport.has(keyNoSport)) {
      partidaMaisRecentePorDueloPainelNoSport.set(keyNoSport, meta);
    }
  }

  const cancelMatchIdByDueloPainel = new Map<string, number>();
  const rescheduleAcceptedByDueloPainel = new Set<string>();
  const blockedDueloByCancelFlowPainel = new Set<string>();
  for (const m of aceitosCancelaveisPainel ?? []) {
    const key = dueloKey(m.usuario_id, m.adversario_id, Number(m.esporte_id ?? 0));
    if (!key) continue;
    if (String(m.status ?? "") === "Aceito") {
      cancelMatchIdByDueloPainel.set(key, Number(m.id));
      const selected = Number((m as { reschedule_selected_option?: number | null }).reschedule_selected_option ?? 0);
      if (Number.isFinite(selected) && selected > 0) rescheduleAcceptedByDueloPainel.add(key);
    } else if (String(m.status ?? "") === "CancelamentoPendente" || String(m.status ?? "") === "ReagendamentoPendente") {
      blockedDueloByCancelFlowPainel.add(key);
    }
  }
  const latestStatusByDueloPainel = new Map<string, string>();
  for (const m of historicoCancelamentoPainelRows ?? []) {
    const key = dueloKey(
      (m as { usuario_id?: string | null }).usuario_id ?? null,
      (m as { adversario_id?: string | null }).adversario_id ?? null,
      Number((m as { esporte_id?: number | null }).esporte_id ?? 0)
    );
    if (!key || latestStatusByDueloPainel.has(key)) continue;
    latestStatusByDueloPainel.set(key, String((m as { status?: string | null }).status ?? "").trim());
  }
  const painelAgendadasVisiveis = (painelAgendadas ?? []).filter((row) => {
    if (String((row as { status?: string | null }).status ?? "") !== "agendada") return false;
    const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
    const key = dueloKey(row.jogador1_id, row.jogador2_id, esporteIdCard);
    const keyNoSport = dueloKeyNoSport(row.jogador1_id, row.jogador2_id);
    const meta = (key ? partidaMaisRecentePorDueloPainel.get(key) ?? null : null) ??
      (keyNoSport ? partidaMaisRecentePorDueloPainelNoSport.get(keyNoSport) ?? null : null);
    const rowStatusRanking = String(meta?.status_ranking ?? (row as { status_ranking?: string | null }).status_ranking ?? "")
      .trim()
      .toLowerCase();
    const rowLancadoPor = String(meta?.lancado_por ?? (row as { lancado_por?: string | null }).lancado_por ?? "").trim();
    const isContestadoLegacy =
      rowStatusRanking === "contestado" ||
      rowStatusRanking === "resultado_contestado" ||
      rowStatusRanking === "pendente_confirmacao_revisao" ||
      rowStatusRanking === "em_analise_admin";
    if (isContestadoLegacy) {
      if (!rowLancadoPor) return false;
      if (rowLancadoPor !== user.id) return false;
    }
    if (rowStatusRanking === "em_analise_admin") {
      return false;
    }
    if (!key) return true;
    if (blockedDueloByCancelFlowPainel.has(key)) return false;
    const latestStatus = String(latestStatusByDueloPainel.get(key) ?? "").toLowerCase();
    if (latestStatus === "cancelado") return false;
    return true;
  });
  const hasPartidasAcoes = (painelPlacarPendente ?? []).length > 0 || painelAgendadasVisiveis.length > 0;
  const hasDesafioAcoes =
    pedidosItems.length > 0 || pedidosEnviadosItems.length > 0 || desafioNotifs.some((n) => n.lida !== true);
  const hasEquipeAcoes =
    sugestoesItems.length > 0 ||
    sugestoesEnviadasItems.length > 0 ||
    conviteItems.length > 0 ||
    candidaturasEquipe.length > 0 ||
    conviteEnviadoItems.some((i) => String(i.status ?? "").toLowerCase() === "pendente") ||
    minhasCandidaturasEquipe.some((c) => c.statusRaw === "pendente") ||
    equipeNotifs.some((n) => n.lida !== true);
  const hasAulasAcoes = nAulas > 0;

  return (
    <main
      data-eid-comunidade-panel
      data-eid-touch-ui
      data-eid-touch-ui-compact="true"
      className="mx-auto w-full max-w-3xl px-2.5 py-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-6xl sm:px-5 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
    >
      <section className="overflow-hidden rounded-[16px] border border-[color:var(--eid-border-subtle)] bg-eid-card px-2.5 py-2.5 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.38)] sm:px-3 sm:py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[18px]">Painel de controle</h1>
            <p className="mt-1 max-w-[44ch] text-[11px] leading-snug text-eid-text-secondary">
              Acompanhe sua rede em um só lugar: notificações, convites e pedidos organizados para você decidir e agir com rapidez.
            </p>
          </div>
          <form action={marcarTodasNotificacoesLidas}>
            <button
              type="submit"
              data-eid-marcar-lidos-btn="true"
              className={`!inline-flex !h-[16px] !min-h-[16px] items-center justify-center whitespace-nowrap !rounded-full border !px-1.5 !py-0 !text-[7px] !leading-none font-black uppercase tracking-[0.04em] transition ${
                nNotifUnread > 0
                  ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/18"
                  : "border-emerald-500/28 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {nNotifUnread > 0 ? "Ler tudo" : "✓ Lido"}
            </button>
          </form>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Link href="/comunidade#notificacoes" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_82%,transparent)] px-2 py-2">
            <div className="flex items-center gap-1.5 text-eid-primary-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M18 9a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[16px] font-black leading-none">{nNotifUnread}</span>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-eid-text-secondary">Não lido(s)</p>
          </Link>
          <Link href="/comunidade#desafio-pedidos" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_82%,transparent)] px-2 py-2">
            <div className="flex items-center gap-1.5 text-eid-action-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <circle cx="15.5" cy="4.5" r="2" fill="currentColor" />
                <path d="M6 20l3-5 2.5-1.5L14 16l4 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.5 8.5l2.5 1.5 2.5-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[16px] font-black leading-none">{nPedidos}</span>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-eid-text-secondary">Pedido(s) de desafio</p>
          </Link>
          <Link href="/comunidade#equipe-sugestoes" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_82%,transparent)] px-2 py-2">
            <div className="flex items-center gap-1.5 text-fuchsia-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M9 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 22h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 2a7 7 0 00-4 12.7c.7.5 1 1 1 1.8V17h6v-.5c0-.8.3-1.3 1-1.8A7 7 0 0012 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <span className="text-[16px] font-black leading-none">{nSugestoes}</span>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-eid-text-secondary">Sugestão(ões)</p>
          </Link>
          <Link href="/comunidade#equipe-convites" className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_82%,transparent)] px-2 py-2">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[16px] font-black leading-none">{conviteItems.length}</span>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-eid-text-secondary">Convite(s)</p>
          </Link>
        </div>
      </section>

        <div className="mt-3 space-y-3 md:mt-5 md:space-y-5">
          <PushToggleCard defaultEnabled />

          {hasPartidasAcoes ? (
          <section id="resultados-partida" className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5 md:px-4">
              <div>
                <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Partidas e resultados</h2>
                <p className="mt-0.5 hidden text-[11px] text-eid-text-secondary md:block">
                  Lançamento de placar, revisão e confirmação. Na{" "}
                  <Link href="/agenda" className="font-semibold text-eid-primary-300 hover:underline">
                    Agenda
                  </Link>{" "}
                  você combina <strong className="text-eid-fg">data e local</strong>.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-eid-action-500/30 bg-eid-action-500/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-action-400">
                Fluxo de placar
              </span>
            </div>

            <div className="px-3 py-3 md:px-4 md:py-4">
            <div className="space-y-6">
              {(painelPlacarPendente ?? []).length > 0 ? (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-action-400">Placar aguardando você</h3>
                  <div className="mt-4 space-y-4">
                    {(painelPlacarPendente ?? []).map((row) => {
                      const esp = firstOfRelation(row.esportes);
                      const pr = row as AgendaPartidaCardRow;
                      const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
                      return (
                        <PartidaAgendaCard
                          key={pr.id}
                          id={pr.id}
                          esporteNome={esp?.nome ?? "Esporte"}
                          j1Nome={pr.jogador1_id ? painelNomeMap.get(pr.jogador1_id) ?? null : null}
                          j2Nome={pr.jogador2_id ? painelNomeMap.get(pr.jogador2_id) ?? null : null}
                          j1Id={pr.jogador1_id}
                          j2Id={pr.jogador2_id}
                          j1AvatarUrl={pr.jogador1_id ? painelPerfilMap.get(pr.jogador1_id)?.avatar_url ?? null : null}
                          j2AvatarUrl={pr.jogador2_id ? painelPerfilMap.get(pr.jogador2_id)?.avatar_url ?? null : null}
                          j1NotaEid={pr.jogador1_id ? painelNotaEidByUserSport.get(`${pr.jogador1_id}:${esporteIdCard}`) ?? 0 : 0}
                          j2NotaEid={pr.jogador2_id ? painelNotaEidByUserSport.get(`${pr.jogador2_id}:${esporteIdCard}`) ?? 0 : 0}
                          esporteId={esporteIdCard}
                          dataRef={pr.data_partida ?? pr.data_registro}
                          localLabel={localLabelPainel(pr)}
                          variant="placar"
                          ctaFullscreen
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel="Revisar resultado"
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {painelAgendadasVisiveis.length > 0 ? (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-primary-400">Lançar resultado</h3>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Partidas agendadas em que você pode enviar o placar após o jogo.
                  </p>
                  <div className="mt-4 space-y-4">
                    {painelAgendadasVisiveis.map((row) => {
                      const esp = firstOfRelation(row.esportes);
                      const pr = row as AgendaPartidaCardRow;
                      const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
                      const dueloCardKey = dueloKey(pr.jogador1_id, pr.jogador2_id, esporteIdCard) ?? "__";
                      return (
                        <PartidaAgendaCard
                          key={pr.id}
                          id={pr.id}
                          esporteNome={esp?.nome ?? "Esporte"}
                          j1Nome={pr.jogador1_id ? painelNomeMap.get(pr.jogador1_id) ?? null : null}
                          j2Nome={pr.jogador2_id ? painelNomeMap.get(pr.jogador2_id) ?? null : null}
                          j1Id={pr.jogador1_id}
                          j2Id={pr.jogador2_id}
                          j1AvatarUrl={pr.jogador1_id ? painelPerfilMap.get(pr.jogador1_id)?.avatar_url ?? null : null}
                          j2AvatarUrl={pr.jogador2_id ? painelPerfilMap.get(pr.jogador2_id)?.avatar_url ?? null : null}
                          j1NotaEid={pr.jogador1_id ? painelNotaEidByUserSport.get(`${pr.jogador1_id}:${esporteIdCard}`) ?? 0 : 0}
                          j2NotaEid={pr.jogador2_id ? painelNotaEidByUserSport.get(`${pr.jogador2_id}:${esporteIdCard}`) ?? 0 : 0}
                          esporteId={esporteIdCard}
                          dataRef={pr.data_partida ?? pr.data_registro}
                          localLabel={localLabelPainel(pr)}
                          variant="agendada"
                          ctaFullscreen
                          cancelMatchId={cancelMatchIdByDueloPainel.get(dueloCardKey) ?? null}
                          desistMatchId={
                            rescheduleAcceptedByDueloPainel.has(dueloCardKey)
                              ? cancelMatchIdByDueloPainel.get(dueloCardKey) ?? null
                              : null
                          }
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel="Lançar resultado"
                          topActionShiftXPx={24}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            </div>
          </section>
          ) : null}

          {hasDesafioAcoes ? (
          <section id="desafio-pedidos" className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5 md:px-4">
              <div>
                <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Desafio</h2>
                <p className="mt-0.5 hidden text-[11px] text-eid-text-secondary md:block">
                  Central de desafios: pedidos recebidos e notificações do fluxo de desafio.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-primary-300">
                Social
              </span>
            </div>
            <div className="px-3 py-3 md:px-4 md:py-4">
            <div className="space-y-4">
              <ComunidadeQuadro id="desafio-pedidos-recebidos" title="Pedidos recebidos" hasPending={pedidosItems.length > 0}>
                <ComunidadePedidosMatch items={pedidosItems} />
              </ComunidadeQuadro>
              <ComunidadeQuadro
                id="desafio-pedidos-enviados"
                title="Pedidos enviados (aguardando resposta)"
                hasPending={pedidosEnviadosItems.length > 0}
              >
                <ComunidadePedidosEnviados items={pedidosEnviadosItems} />
              </ComunidadeQuadro>
              <ComunidadeQuadro
                id="desafio-notificacoes"
                title="Notificações de desafio"
                hasPending={desafioNotifs.some((n) => n.lida !== true)}
              >
                <ComunidadeSetorNotificacoes
                  items={desafioNotifs.map((n) => ({
                    id: n.id,
                    mensagem: n.mensagem,
                    lida: n.lida,
                    tipo: n.tipo,
                  }))}
                  sector="desafio"
                  emptyLabel="Sem notificações de desafio no momento."
                />
              </ComunidadeQuadro>
            </div>
            </div>
          </section>
          ) : null}

          {hasEquipeAcoes ? (
          <section className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 md:px-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 shrink-0 text-eid-primary-500" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-[8px] font-black uppercase tracking-[0.14em] text-eid-fg">Equipe</h2>
                  <p className="mt-0.5 hidden text-[8px] font-medium text-eid-text-secondary md:block">
                    Convites, sugestões de liderança e avisos da sua dupla/time em um único quadro.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-eid-primary-500 eid-dark:text-eid-primary-300">
                <LayoutGrid className="h-3 w-3 text-eid-primary-500" strokeWidth={2} aria-hidden />
                Formações
              </span>
            </div>
            <div className="px-2 py-2.5 md:px-3 md:py-3">
            <div className="space-y-3">
              <ComunidadeQuadro id="equipe-sugestoes" title="Sugestões da equipe (liderança)" hasPending={sugestoesItems.length > 0}>
                <ComunidadeSugestoesMatch items={sugestoesItems} />
              </ComunidadeQuadro>
              <ComunidadeQuadro
                id="equipe-sugestoes-enviadas"
                title="Sugestões enviadas (acompanhamento)"
                hasPending={sugestoesEnviadasItems.length > 0}
                badgeLabel={hasSugestoesEnviadasPendentes ? "Pendente" : "Resolvido"}
              >
                <ComunidadeSugestoesEnviadasMatch items={sugestoesEnviadasItems} viewerUserId={user.id} />
              </ComunidadeQuadro>
              <ComunidadeQuadro id="equipe-convites" title="Convites recebidos" hasPending={conviteItems.length > 0}>
                <ComunidadeConvitesTime items={conviteItems} />
              </ComunidadeQuadro>
              {candidaturasEquipe.length > 0 ? (
                <>
                  {candidaturasEquipe.length > 1 ? (
                    <h3
                      id="equipe-pedidos-entrada"
                      className="mb-1.5 text-[12px] font-bold leading-snug tracking-tight text-eid-primary-500 eid-dark:text-eid-primary-300"
                    >
                      Pedidos para entrar no elenco
                    </h3>
                  ) : null}
                  <ul
                    id={candidaturasEquipe.length === 1 ? "equipe-pedidos-entrada" : undefined}
                    className="space-y-4"
                  >
                    {candidaturasEquipe.map((c) => {
                      const criado = formatSolicitacaoParts(c.criadoEm);
                      const formacaoHref =
                        Number.isFinite(c.timeId) && c.timeId > 0
                          ? `/perfil-time/${c.timeId}?from=/comunidade`
                          : "/comunidade";
                      return (
                        <li key={c.id} className={`${getSocialStatusCardShell("pendente")} p-0 text-sm`}>
                          <div className="flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-card)_62%,transparent)] px-3.5 py-2 sm:px-4.5 eid-light:bg-white/95">
                            {candidaturasEquipe.length === 1 ? (
                              <h3 className="min-w-0 text-[11px] font-semibold leading-snug tracking-tight text-eid-primary-500 eid-dark:text-eid-primary-300">
                                Pedidos para entrar no elenco
                              </h3>
                            ) : (
                              <p className="min-w-0 truncate text-[11px] font-medium text-eid-fg">
                                {c.primeiroNome}
                              </p>
                            )}
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/12 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.06em] text-amber-800 eid-dark:border-amber-300/65 eid-dark:bg-amber-950/55 eid-dark:text-amber-100 eid-light:border-amber-400 eid-light:bg-yellow-50 eid-light:text-amber-600">
                              <Clock3 className="h-3 w-3 shrink-0 text-amber-800 eid-dark:text-amber-100 eid-light:text-amber-600" strokeWidth={2.25} aria-hidden />
                              Pendente
                            </span>
                          </div>

                          <div className="mx-1.5 mb-2.5 mt-1.5 overflow-hidden rounded-[12px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-warning-500)_8%,var(--eid-card)_92%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-2.5 pb-2.5 pt-3 sm:mx-2 sm:px-3.5 sm:pb-3 eid-light:bg-[linear-gradient(180deg,color-mix(in_srgb,#f59e0b_4%,#fffdf7_96%),#fffefc)]">
                            <div className="grid min-w-0 grid-cols-3 gap-x-2 gap-y-1 sm:gap-x-5">
                              <div className="flex min-w-0 flex-col items-center">
                                <p className="flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.14em] text-eid-action-600">
                                  <User className="h-3.5 w-3.5 shrink-0 text-eid-action-600" strokeWidth={2.25} aria-hidden />
                                  <span className="shrink-0">Candidato</span>
                                </p>
                                <ProfileEditDrawerTrigger
                                  href={`/perfil/${c.candidatoId}?from=/comunidade`}
                                  title={c.nome}
                                  fullscreen
                                  topMode="backOnly"
                                  className="mt-2.5 block w-full max-w-full rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                                >
                                  <div className="flex w-full flex-col items-center gap-2 px-0.5 py-0.5 text-center">
                                    <div className="flex w-full flex-col items-center gap-1.5">
                                      <p className="w-full max-w-[12rem] truncate text-[14px] font-semibold leading-tight text-eid-fg">
                                        {c.primeiroNome}
                                      </p>
                                      <div className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-eid-card bg-eid-field-bg shadow-sm ring-1 ring-[color:var(--eid-border-subtle)]">
                                        {c.avatarUrl ? (
                                          <Image src={c.avatarUrl} alt="" fill unoptimized className="object-cover" />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-lg font-black text-eid-text-muted">
                                            {c.nome.slice(0, 1).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex justify-center">
                                      <PedidoElencoEidSeal notaEid={c.notaEid} />
                                    </div>
                                    <PedidoElencoLocationLight location={c.candidatoLocalizacao} align="center" />
                                  </div>
                                </ProfileEditDrawerTrigger>
                              </div>

                              <div className="flex min-w-0 w-full flex-col items-center gap-2.5 px-0.5 pt-0 text-center">
                                <div className="mx-auto flex w-full max-w-[11rem] flex-col items-center gap-0.5">
                                  <p className="inline-flex items-center justify-center gap-1.5 text-[10px] tabular-nums text-eid-text-secondary">
                                    <Calendar className="h-3 w-3 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
                                    {criado.date}
                                  </p>
                                  <p className="inline-flex items-center justify-center gap-1.5 text-[10px] tabular-nums text-eid-text-secondary">
                                    <Clock className="h-3 w-3 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
                                    {criado.time}
                                  </p>
                                </div>
                                <div className="mx-auto flex w-full max-w-[11rem] flex-col items-stretch">
                                  <span className="inline-flex w-full items-center justify-center rounded-full border border-sky-300/55 bg-sky-500/12 px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.06em] text-eid-fg eid-light:border-sky-200/90 eid-light:bg-sky-100 eid-light:text-[#1a2b4c]">
                                    Pedido
                                  </span>
                                  <div className="mt-2.5 flex w-full flex-col gap-1.5 sm:mt-3">
                                    <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-teal-500/35 bg-teal-500/12 px-1.5 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.05em] text-teal-100 eid-light:border-teal-200/90 eid-light:bg-teal-50 eid-light:text-teal-900">
                                      <span className="inline-flex shrink-0 scale-90 text-teal-200 eid-light:text-teal-800">
                                        <ModalidadeGlyphIcon modalidade={c.isDuplaTipo ? "dupla" : "time"} />
                                      </span>
                                      <span className="truncate">{c.isDuplaTipo ? "Dupla" : "Time"}</span>
                                    </span>
                                    <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-orange-500/35 bg-orange-500/10 px-1.5 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.04em] text-orange-200 eid-light:border-orange-200/90 eid-light:bg-[#fff7ed] eid-light:text-[#9a3412]">
                                      <span className="inline-flex shrink-0 scale-90 text-orange-300 eid-light:text-[#c2410c]">
                                        <SportGlyphIcon sportName={c.esporteNome} />
                                      </span>
                                      <span className="truncate normal-case">{c.esporteNome}</span>
                                    </span>
                                  </div>
                                </div>
                                <p className="mx-auto w-full max-w-[13rem] text-center text-[10px] leading-snug text-eid-text-secondary">
                                  Quer integrar{" "}
                                  <span className="font-semibold text-eid-fg">{c.timeNome}</span>
                                </p>
                                {c.mensagem ? (
                                  <p className="mx-auto w-full max-w-[13rem] rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-surface)_12%)] px-2.5 py-2 text-center text-[10px] leading-snug text-eid-text-secondary eid-light:bg-white/90 eid-light:text-slate-700">
                                    “{c.mensagem}”
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex min-w-0 flex-col items-center">
                                <p className="flex w-full flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.14em] text-eid-action-600">
                                  <Shield className="h-3.5 w-3.5 shrink-0 text-eid-action-600" strokeWidth={2.25} aria-hidden />
                                  <span className="shrink-0">Sua formação</span>
                                </p>
                                <ProfileEditDrawerTrigger
                                  href={formacaoHref}
                                  title={c.timeNome}
                                  fullscreen
                                  topMode="backOnly"
                                  className="mt-2.5 block w-full max-w-full rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                                >
                                  <div className="flex flex-col items-center gap-2 px-0.5 py-0.5 text-center">
                                    <p className="max-w-[12rem] truncate text-[14px] font-semibold leading-tight text-eid-fg">
                                      {c.timePrimeiroNome}
                                    </p>
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-eid-card bg-eid-field-bg shadow-sm ring-1 ring-[color:var(--eid-border-subtle)]">
                                      {c.timeEscudoUrl ? (
                                        <Image src={c.timeEscudoUrl} alt="" fill unoptimized className="object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-lg font-black text-eid-text-muted">
                                          {(c.timeNome ?? "F").slice(0, 1).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex justify-center">
                                      <PedidoElencoEidSeal notaEid={c.timeNotaEid} />
                                    </div>
                                    <PedidoElencoLocationLight location={c.timeLocalizacao} align="center" />
                                  </div>
                                </ProfileEditDrawerTrigger>
                              </div>
                            </div>

                            <div className="mt-1.5 rounded-b-[12px] bg-[color:color-mix(in_srgb,var(--eid-card)_90%,var(--eid-surface)_10%)] px-0 pb-0 pt-1.5 eid-light:bg-[#fffefb]">
                              <div
                                className={`${PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS} !items-stretch gap-1.5 px-3 pb-1.5 sm:gap-2 sm:px-4 sm:pb-2`}
                              >
                                <div className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
                                  <ResponderCandidaturaForm
                                    candidaturaId={c.id}
                                    aceitar={true}
                                    stretch
                                    lightChrome
                                    label="Aprovar"
                                  />
                                </div>
                                <div className={`${PEDIDO_MATCH_RECEBIDO_FORM_CLASS} flex min-h-0 min-w-0`}>
                                  <ResponderCandidaturaForm
                                    candidaturaId={c.id}
                                    aceitar={false}
                                    stretch
                                    lightChrome
                                    label="Recusar"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
              <ComunidadeQuadro
                id="equipe-convites-enviados"
                title="Convites enviados (acompanhamento)"
                hasPending={conviteEnviadoItems.some((i) => String(i.status ?? "").toLowerCase() === "pendente")}
              >
                <ComunidadeConvitesEnviadosTime items={conviteEnviadoItems} />
              </ComunidadeQuadro>
              <ComunidadeQuadro
                id="equipe-pedidos-enviados"
                title="Pedidos de entrada enviados"
                hasPending={minhasCandidaturasEquipe.some((c) => c.statusRaw === "pendente")}
              >
                {minhasCandidaturasEquipe.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_92%,var(--eid-surface)_8%)] p-2.5 text-[11px] text-eid-text-secondary">
                    Você ainda não enviou pedido para entrar em formação.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {minhasCandidaturasEquipe.map((c) => {
                      const criado = formatSolicitacaoParts(c.criadoEm);
                      const resp = c.respondidoEm ? formatSolicitacaoParts(c.respondidoEm) : null;
                      const formacaoHref =
                        Number.isFinite(c.timeId) && c.timeId > 0
                          ? `/perfil-time/${c.timeId}?from=/comunidade`
                          : "/comunidade";
                      return (
                        <li key={c.id} className={`${getSocialStatusCardShell(c.statusRaw)} p-0 text-sm`}>

                          <div className={`${EID_SOCIAL_GRID_3} pt-2`}>
                            <div className="min-w-0 px-2 pb-2 pt-1 sm:px-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">
                                Formação
                              </p>
                              <ProfileEditDrawerTrigger
                                href={formacaoHref}
                                title={c.timeNome}
                                fullscreen
                                topMode="backOnly"
                                className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                              >
                                <div className="flex w-full flex-col items-center px-0.5 py-1">
                                  <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">
                                    {c.timePrimeiroNome}
                                  </p>
                                  <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                                    {c.timeEscudoUrl ? (
                                      <Image
                                        src={c.timeEscudoUrl}
                                        alt=""
                                        fill
                                        unoptimized
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                                        {(c.timeNome ?? "F").slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-0.5">
                                    <ProfileEidPerformanceSeal notaEid={c.timeNotaEid} compact className="scale-125" />
                                  </div>
                                  <EidCityState
                                    location={c.timeLocalizacao}
                                    compact
                                    align="center"
                                    className="mt-1 w-full"
                                  />
                                </div>
                              </ProfileEditDrawerTrigger>
                            </div>

                            <div className="flex min-w-0 flex-col items-center gap-2 px-2 pb-2 pt-1 text-center sm:px-3">
                              <div className="w-full">
                                <p className="text-[11px] tabular-nums text-eid-text-secondary">{criado.date}</p>
                                <p className="mt-0.5 text-[11px] tabular-nums text-eid-text-secondary">{criado.time}</p>
                                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-eid-text-muted">
                                  Pedido
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-primary-200">
                                  <ModalidadeGlyphIcon modalidade={c.isDuplaTipo ? "dupla" : "time"} />
                                  <span className="truncate">{c.isDuplaTipo ? "Dupla" : "Time"}</span>
                                </span>
                                <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-semibold leading-none text-eid-action-200">
                                  <SportGlyphIcon sportName={c.esporteNome} />
                                  <span className="truncate">{c.esporteNome}</span>
                                </span>
                              </div>
                              {resp ? (
                                <div className="w-full border-t border-[color:var(--eid-border-subtle)] pt-2">
                                  <p className="text-[10px] font-semibold text-eid-text-secondary">Atualizado</p>
                                  <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.date}</p>
                                  <p className="text-[11px] tabular-nums text-eid-text-secondary">{resp.time}</p>
                                </div>
                              ) : null}
                              {c.mensagem ? (
                                <p className="w-full rounded-lg bg-eid-surface/35 px-2 py-1.5 text-[10px] text-eid-fg">
                                  “{c.mensagem}”
                                </p>
                              ) : null}
                            </div>

                            <div className="flex min-w-0 flex-col items-center px-2 pb-2 pt-1 sm:px-3">
                              <p className="text-center text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">
                                Você
                              </p>
                              <ProfileEditDrawerTrigger
                                href={`/perfil/${user.id}?from=/comunidade`}
                                title="Meu perfil"
                                fullscreen
                                topMode="backOnly"
                                className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                              >
                                <div className="flex w-full flex-col items-center px-0.5 py-1">
                                  <p className="max-w-full truncate text-center text-[11px] font-black text-eid-fg">
                                    {c.meuPrimeiroNome}
                                  </p>
                                  <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                                    {c.meuAvatarUrl ? (
                                      <Image
                                        src={c.meuAvatarUrl}
                                        alt=""
                                        fill
                                        unoptimized
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                                        {(c.meuPrimeiroNome || "?").slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-0.5">
                                    <ProfileEidPerformanceSeal notaEid={c.notaEidMeu} compact className="scale-125" />
                                  </div>
                                  <EidCityState
                                    location={c.meuLocalizacao}
                                    compact
                                    align="center"
                                    className="mt-1 w-full"
                                  />
                                </div>
                              </ProfileEditDrawerTrigger>
                            </div>
                          </div>

                          {c.statusRaw === "pendente" ? (
                            <div className={EID_SOCIAL_CARD_FOOTER}>
                              <CancelarCandidaturaForm candidaturaId={c.id} compact label="Cancelar" />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ComunidadeQuadro>
              <ComunidadeQuadro
                id="equipe-avisos"
                title="Avisos de equipe"
                hasPending={equipeNotifs.some((n) => n.lida !== true)}
              >
                <ComunidadeSetorNotificacoes
                  items={equipeNotifs.map((n) => ({
                    id: n.id,
                    mensagem: n.mensagem,
                    lida: n.lida,
                    tipo: n.tipo,
                  }))}
                  sector="equipe"
                  emptyLabel="Sem avisos de equipe no momento."
                />
              </ComunidadeQuadro>
            </div>
            </div>
          </section>
          ) : null}

          {hasAulasAcoes ? (
          <section id="minhas-aulas" className="eid-list-item rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3 opacity-80 md:p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Minhas aulas</h2>
              <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-primary-300">
                Em desenvolvimento
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-eid-text-secondary">
              Este quadro está em preparação e ficará disponível em breve.
            </p>
            <div className="mt-3 space-y-2 pointer-events-none select-none">
              <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-xs text-eid-text-secondary">
                Pedidos de aula
              </div>
              <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-xs text-eid-text-secondary">
                Aulas confirmadas e em andamento
              </div>
              <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-xs text-eid-text-secondary">
                Avisos das suas aulas
              </div>
            </div>
          </section>
          ) : null}

          <section className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5">
              <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Status dos módulos do app</h2>
              <span className="shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-primary-300">
                Ver painel
              </span>
            </div>
            <div className="p-3">
            {emBreveItems.length === 0 ? (
              <p className="mt-2 text-xs text-eid-text-secondary">
                Tudo que é controlado pelo painel de funcionalidades está liberado para você no momento.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-xs text-eid-text-secondary">
                {emBreveItems.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-1.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--eid-card)_84%,#ffffff_16%)] text-eid-primary-500">
                        <ModuloIcon moduleKey={item.key} />
                      </span>
                      <span className="truncate text-[11px] font-semibold text-eid-fg">{item.label}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.04em] ${
                          item.mode === "em_breve"
                            ? "border-eid-primary-500/25 bg-eid-primary-500/10 text-eid-primary-400"
                            : "border-eid-action-500/30 bg-eid-action-500/12 text-eid-action-400"
                        }`}
                      >
                        {item.mode === "em_breve" ? "• Em breve" : "• Em desenvolvimento"}
                      </span>
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-eid-text-secondary" fill="none" aria-hidden>
                        <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </section>

        </div>
    </main>
  );
}
