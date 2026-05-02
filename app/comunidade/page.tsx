import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgendaAceitosCancelaveis, type AceitosCancelaveisItem } from "@/components/agenda/agenda-aceitos-cancelaveis";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import { ComunidadeConvitesTime, type ConviteTimeItem } from "@/components/comunidade/comunidade-convites-time";
import {
  ComunidadeConvitesEnviadosTime,
  type ConviteTimeEnviadoItem,
} from "@/components/comunidade/comunidade-convites-enviados-time";
import { ComunidadeBackgroundSync } from "@/components/comunidade/comunidade-background-sync";
import { ComunidadeQuadro } from "@/components/comunidade/comunidade-quadro";
import { ComunidadePedidosEnviados } from "@/components/comunidade/comunidade-pedidos-enviados";
import { ComunidadePedidosMatch } from "@/components/comunidade/comunidade-pedidos-match";
import { PedidoMatchFinalidadeSeal } from "@/components/comunidade/pedido-match-finalidade-seal";
import {
  ComunidadeSugestoesEnviadasMatch,
  type SugestaoEnviadaMatchItem,
} from "@/components/comunidade/comunidade-sugestoes-enviadas-match";
import { ComunidadeSugestoesMatch, type SugestaoMatchItem } from "@/components/comunidade/comunidade-sugestoes-match";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { CancelarCandidaturaForm } from "@/components/vagas/vagas-actions";
import { CandidaturaResponseActions } from "@/components/vagas/candidatura-response-actions";
import { PushToggleCard } from "@/components/pwa/push-toggle-card";
import { fetchPedidoRankingPreview, type PedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import {
  EID_SOCIAL_GRID_3,
  EID_SOCIAL_PANEL_FOOTER,
  getSocialStatusPanelItemShell,
  formatSolicitacaoParts,
} from "@/lib/comunidade/social-panel-layout";
import { userIsDesafioAgendaLeaderFromMap } from "@/lib/agenda/desafio-match-leadership";
import { loadAceitosCancelaveisItems } from "@/lib/agenda/load-aceitos-cancelaveis-items";
import {
  type AgendaPartidaCardRow,
  fetchPartidasAgendadasUsuario,
  fetchPlacarAguardandoConfirmacao,
  firstOfRelation,
  getAgendaTeamContext,
  mergeAgendaLocalDisplayed,
  resolveCancelMatchIdParaCard,
} from "@/lib/agenda/partidas-usuario";
import { pickFormacaoLadoPartida } from "@/lib/agenda/partida-formacao-lado";
import { processarPendenciasAgendamentoAceite } from "@/lib/agenda/processar-pendencias-agendamento";
import { distanciaKm } from "@/lib/geo/distance-km";
import { splitCityState } from "@/lib/geo/split-city-state";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { createClient } from "@/lib/supabase/server";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { Calendar, Clock, Clock3, LayoutGrid, MapPin, Shield, User, UserPlus } from "lucide-react";

export const metadata = {
  title: "Ações pendentes",
  description: "Central de ações pendentes no EsporteID: desafios, equipe e placar que precisam da sua resposta.",
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

  const uidEq = user.id;
  const { teamIds: comunidadeAgendaTeamIds, teamClause: comunidadeAgendaTeamClause } = await getAgendaTeamContext(
    supabase,
    uidEq,
  );
  const matchRankFlowOr =
    comunidadeAgendaTeamIds.length > 0
      ? `usuario_id.eq.${uidEq},adversario_id.eq.${uidEq},desafiante_time_id.in.(${comunidadeAgendaTeamIds.join(",")}),adversario_time_id.in.(${comunidadeAgendaTeamIds.join(",")})`
      : `usuario_id.eq.${uidEq},adversario_id.eq.${uidEq}`;
  const partidasPainelCountOr = `jogador1_id.eq.${uidEq},jogador2_id.eq.${uidEq},usuario_id.eq.${uidEq}${comunidadeAgendaTeamClause}`;
  const { data: meusTimesLider } = await supabase.from("times").select("id").eq("criador_id", uidEq);
  const meusTimeIdsLider = [
    ...new Set(
      (meusTimesLider ?? [])
        .map((t) => Number((t as { id?: number | null }).id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  let cntCandLider = 0;
  if (meusTimeIdsLider.length > 0) {
    const { count: candLiderCount } = await supabase
      .from("time_candidaturas")
      .select("id", { count: "exact", head: true })
      .in("time_id", meusTimeIdsLider.slice(0, 100))
      .eq("status", "pendente");
    cntCandLider = candLiderCount ?? 0;
  }

  const [
    { count: cntMatchIn },
    { count: cntMatchOut },
    { count: cntSugRec },
    { count: cntSugEnv },
    { count: cntConvRec },
    { count: cntConvEnv },
    { count: cntCandMine },
    { count: cntPartAguarda },
    { count: cntPartAgend },
    { count: cntMatchRankFlow },
  ] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("adversario_id", uidEq).eq("status", "Pendente"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("usuario_id", uidEq).eq("status", "Pendente"),
    supabase.from("match_sugestoes").select("id", { count: "exact", head: true }).eq("alvo_dono_id", uidEq).eq("status", "pendente"),
    supabase
      .from("match_sugestoes")
      .select("id", { count: "exact", head: true })
      .eq("sugeridor_id", uidEq)
      .eq("status", "pendente")
      .neq("oculto_sugeridor", true),
    supabase.from("time_convites").select("id", { count: "exact", head: true }).eq("convidado_usuario_id", uidEq).eq("status", "pendente"),
    supabase.from("time_convites").select("id", { count: "exact", head: true }).eq("convidado_por_usuario_id", uidEq).eq("status", "pendente"),
    supabase.from("time_candidaturas").select("id", { count: "exact", head: true }).eq("candidato_usuario_id", uidEq).eq("status", "pendente"),
    supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .or(partidasPainelCountOr)
      .eq("status", "aguardando_confirmacao"),
    supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .or(partidasPainelCountOr)
      .eq("status", "agendada"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(matchRankFlowOr)
      .eq("finalidade", "ranking")
      .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"]),
  ]);

  /** Só busca o miolo “Equipe” quando as contagens indicam alguma pendência (mesma regra de exibir o bloco). */
  const needEquipe =
    (cntSugRec ?? 0) > 0 ||
    (cntSugEnv ?? 0) > 0 ||
    (cntConvRec ?? 0) > 0 ||
    (cntConvEnv ?? 0) > 0 ||
    (cntCandLider ?? 0) > 0 ||
    (cntCandMine ?? 0) > 0;
  const needPartidas =
    (cntPartAguarda ?? 0) > 0 || (cntPartAgend ?? 0) > 0 || (cntMatchRankFlow ?? 0) > 0;

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
    (() => {
      const rankingPosCache = new Map<string, Promise<number | null>>();
      const rankingPontosCache = new Map<string, Promise<number | null>>();
      const rankingPreviewCache = new Map<string, Promise<PedidoRankingPreview | null>>();

      async function getRankingPosicao(item: (typeof pedidosItemsBase)[number]): Promise<number | null> {
        if (item.finalidade !== "ranking" || item.esporteId <= 0) return null;
        const mod = String(item.modalidade ?? "").toLowerCase();

        if (item.formacaoDesafiante && (mod === "dupla" || mod === "time")) {
          const key = `time:${item.esporteId}:${mod}:${item.formacaoDesafiante.pontosRanking}`;
          const cached = rankingPosCache.get(key);
          if (cached) return cached;
          const promise = (async () => {
            const { count } = await supabase
              .from("times")
              .select("id", { count: "exact", head: true })
              .eq("esporte_id", item.esporteId)
              .eq("tipo", mod)
              .gt("pontos_ranking", item.formacaoDesafiante?.pontosRanking ?? 0);
            return Number(count ?? 0) + 1;
          })();
          rankingPosCache.set(key, promise);
          return promise;
        }

        const pontosKey = `${item.desafianteId}:${item.esporteId}`;
        const pontosPromise =
          rankingPontosCache.get(pontosKey) ??
          (async () => {
            const { data: chEid } = await supabase
              .from("usuario_eid")
              .select("pontos_ranking")
              .eq("usuario_id", item.desafianteId)
              .eq("esporte_id", item.esporteId)
              .maybeSingle();
            const pontos = Number(chEid?.pontos_ranking ?? NaN);
            return Number.isFinite(pontos) ? pontos : null;
          })();
        rankingPontosCache.set(pontosKey, pontosPromise);
        const pontos = await pontosPromise;
        if (!Number.isFinite(pontos)) return null;

        const key = `user:${item.esporteId}:${pontos}`;
        const cached = rankingPosCache.get(key);
        if (cached) return cached;
        const promise = (async () => {
          const { count } = await supabase
            .from("usuario_eid")
            .select("id", { count: "exact", head: true })
            .eq("esporte_id", item.esporteId)
            .gt("pontos_ranking", pontos ?? 0);
          return Number(count ?? 0) + 1;
        })();
        rankingPosCache.set(key, promise);
        return promise;
      }

      async function getRankingPreview(item: (typeof pedidosItemsBase)[number]): Promise<PedidoRankingPreview | null> {
        if (item.finalidade !== "ranking" || item.esporteId <= 0) return null;
        const previewKey = `${uidEq}:${item.desafianteId}:${item.esporteId}:${String(item.modalidade ?? "").toLowerCase()}:${Number(item.adversarioTimeId ?? 0)}`;
        const cached = rankingPreviewCache.get(previewKey);
        if (cached) return cached;
        const promise = fetchPedidoRankingPreview(supabase, {
          accepterId: uidEq,
          challengerId: item.desafianteId,
          esporteId: item.esporteId,
          modalidade: item.modalidade,
          adversarioTimeId: item.adversarioTimeId,
        });
        rankingPreviewCache.set(previewKey, promise);
        return promise;
      }

      return pedidosItemsBase.map(async (m) => ({
        ...m,
        rankingPosicao: await getRankingPosicao(m),
        rankingPreview: await getRankingPreview(m),
      }));
    })()
  );


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

  const equipeData = await (async () => {
    if (!needEquipe) {
      return {
        sugestoesItems: [] as SugestaoMatchItem[],
        sugestoesEnviadasItems: [] as SugestaoEnviadaMatchItem[],
        conviteItems: [] as ConviteTimeItem[],
        conviteEnviadoItems: [] as ConviteTimeEnviadoItem[],
        candidaturasEquipe: [],
        minhasCandidaturasEquipe: [],
      };
    }

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

    return {
      sugestoesItems,
      sugestoesEnviadasItems,
      conviteItems,
      conviteEnviadoItems,
      candidaturasEquipe,
      minhasCandidaturasEquipe,
    };
  })();
  const {
    sugestoesItems,
    sugestoesEnviadasItems,
    conviteItems,
    conviteEnviadoItems,
    candidaturasEquipe,
    minhasCandidaturasEquipe,
  } = equipeData;

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

  let hasPartidasAcoes = false;
  let painelPlacarPendente: AgendaPartidaCardRow[] = [];
  let painelAgendadasVisiveis: AgendaPartidaCardRow[] = [];
  let painelNomeMap = new Map<string, string | null>();
  let painelPerfilMap = new Map<string, { nome: string | null; avatar_url: string | null }>();
  let painelNotaEidByUserSport = new Map<string, number>();
  let cancelMatchIdByDueloPainel = new Map<string, number>();
  let cancelMatchIdByMatchIdPainel = new Map<number, number>();
  let rescheduleAcceptedMatchIdSetPainel = new Set<number>();
  let rescheduleAcceptedByDueloPainel = new Set<string>();
  let painelLocMap = new Map<number, string | null>();
  let painelTimesById = new Map<number, { nome: string | null; escudo: string | null; eid_time: number | null }>();
  let painelAceitosCancelaveisItems: AceitosCancelaveisItem[] = [];
  /** Mesmo critério da /agenda: data/local vindos de `matches` após reagendamento + fallback na partida. */
  let painelAcceptedScheduleByMatchId = new Map<
    number,
    { scheduledFor: string | null; scheduledLocation: string | null }
  >();

  if (needPartidas) {
    const { teamIds: painelTeamIds, teamClause: teamClausePainel } = await getAgendaTeamContext(supabase, user.id);
    const matchPainelOr =
      painelTeamIds.length > 0
        ? `usuario_id.eq.${user.id},adversario_id.eq.${user.id},desafiante_time_id.in.(${painelTeamIds.join(",")}),adversario_time_id.in.(${painelTeamIds.join(",")})`
        : `usuario_id.eq.${user.id},adversario_id.eq.${user.id}`;
    const { data: aceitosCancelaveisPainel } = await supabase
      .from("matches")
      .select("id, usuario_id, adversario_id, esporte_id, status, reschedule_selected_option, scheduled_for, scheduled_location")
      .or(matchPainelOr)
      .eq("finalidade", "ranking")
      .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"]);
    const { data: historicoCancelamentoPainelRows } = await supabase
      .from("matches")
      .select("id, usuario_id, adversario_id, esporte_id, status")
      .or(matchPainelOr)
      .eq("finalidade", "ranking")
      .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente", "Cancelado"])
      .order("id", { ascending: false })
      .limit(120);
    await processarPendenciasAgendamentoAceite(supabase, user.id, teamClausePainel);
    const [{ data: painelAgendadas }, { data: painelPlacarFetch }] = await Promise.all([
      fetchPartidasAgendadasUsuario(supabase, user.id, teamClausePainel),
      fetchPlacarAguardandoConfirmacao(supabase, user.id, teamClausePainel),
    ]);
    const { items: painelAceitosLoaded } = await loadAceitosCancelaveisItems(
      supabase,
      user.id,
      (painelAgendadas ?? []) as AgendaPartidaCardRow[]
    );
    painelAceitosCancelaveisItems = painelAceitosLoaded;
    const painelPlacarPendenteBruto = painelPlacarFetch ?? [];
    const { data: painelPartidasStatusRows } = await supabase
      .from("partidas")
      .select("id, esporte_id, jogador1_id, jogador2_id, status, status_ranking, lancado_por")
      .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id},usuario_id.eq.${user.id}${teamClausePainel}`)
      .in("status", ["agendada", "aguardando_confirmacao"])
      .order("id", { ascending: false })
      .limit(120);
    const painelPartidasAll = [...(painelAgendadas ?? []), ...painelPlacarPendenteBruto];
    const painelTimeIdsSet = new Set<number>();
    for (const p of painelPartidasAll) {
      const r = p as AgendaPartidaCardRow;
      for (const t of [r.time1_id, r.time2_id]) {
        const n = Number(t);
        if (Number.isFinite(n) && n > 0) painelTimeIdsSet.add(n);
      }
    }
    const painelTimeIds = [...painelTimeIdsSet];
    const { data: painelTimesRows } = painelTimeIds.length
      ? await supabase.from("times").select("id, nome, escudo, eid_time, criador_id").in("id", painelTimeIds)
      : { data: [] };
    painelTimesById = new Map<number, { nome: string | null; escudo: string | null; eid_time: number | null }>();
    const criadorPorTimePainel = new Map<number, string>();
    for (const t of painelTimesRows ?? []) {
      const id = Number((t as { id: number }).id);
      if (!Number.isFinite(id) || id <= 0) continue;
      painelTimesById.set(id, {
        nome: (t as { nome?: string | null }).nome ?? null,
        escudo: (t as { escudo?: string | null }).escudo ?? null,
        eid_time: (t as { eid_time?: number | null }).eid_time ?? null,
      });
      const cid = String((t as { criador_id?: string | null }).criador_id ?? "").trim();
      if (cid) criadorPorTimePainel.set(id, cid);
    }
    const usuarioPodeGerenciarPartidaPainel = (row: AgendaPartidaCardRow) =>
      userIsDesafioAgendaLeaderFromMap(
        user.id,
        {
          usuario_id: row.jogador1_id,
          adversario_id: row.jogador2_id,
          desafiante_time_id: row.time1_id ?? null,
          adversario_time_id: row.time2_id ?? null,
          modalidade_confronto: row.modalidade ?? null,
        },
        criadorPorTimePainel
      );
    painelPlacarPendente = painelPlacarPendenteBruto.filter((row) => usuarioPodeGerenciarPartidaPainel(row as AgendaPartidaCardRow));
    const painelLocalIds = [
      ...new Set(
        painelPartidasAll.map((p) => p.local_espaco_id).filter((x): x is number => typeof x === "number" && x > 0)
      ),
    ];
    const { data: painelLocaisRows } = painelLocalIds.length
      ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", painelLocalIds)
      : { data: [] };
    painelLocMap = new Map((painelLocaisRows ?? []).map((l) => [l.id, l.nome_publico]));
    const painelPlayerIds = new Set<string>();
    for (const p of painelPartidasAll) {
      if (p.jogador1_id) painelPlayerIds.add(p.jogador1_id);
      if (p.jogador2_id) painelPlayerIds.add(p.jogador2_id);
    }
    const painelPlayerList = [...painelPlayerIds];
    const { data: painelNomeRows } = painelPlayerList.length
      ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", painelPlayerList)
      : { data: [] };
    painelPerfilMap = new Map((painelNomeRows ?? []).map((r) => [r.id, r]));
    painelNomeMap = new Map((painelNomeRows ?? []).map((r) => [r.id, r.nome]));
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
    painelNotaEidByUserSport = new Map(
      (painelUeRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)])
    );

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

    cancelMatchIdByDueloPainel = new Map();
    cancelMatchIdByMatchIdPainel = new Map();
    rescheduleAcceptedMatchIdSetPainel = new Set();
    rescheduleAcceptedByDueloPainel = new Set();
    const blockedDueloByCancelFlowPainel = new Set<string>();
    const blockedMatchIdsByCancelFlowPainel = new Set<number>();
    for (const m of aceitosCancelaveisPainel ?? []) {
      const mid = Number(m.id);
      const st = String(m.status ?? "");
      if (st === "CancelamentoPendente" || st === "ReagendamentoPendente") {
        if (Number.isFinite(mid) && mid > 0) blockedMatchIdsByCancelFlowPainel.add(mid);
      }
      const key = dueloKey(m.usuario_id, m.adversario_id, Number(m.esporte_id ?? 0));
      if (key && (st === "CancelamentoPendente" || st === "ReagendamentoPendente")) {
        blockedDueloByCancelFlowPainel.add(key);
      }
      if (st === "Aceito" && Number.isFinite(mid) && mid > 0) {
        cancelMatchIdByMatchIdPainel.set(mid, mid);
        if (key) cancelMatchIdByDueloPainel.set(key, mid);
        const selected = Number((m as { reschedule_selected_option?: number | null }).reschedule_selected_option ?? 0);
        const sfRaw = (m as { scheduled_for?: string | null }).scheduled_for;
        const slRaw = (m as { scheduled_location?: string | null }).scheduled_location;
        const scheduledFor = sfRaw ? String(sfRaw) : null;
        const scheduledLocation = slRaw && String(slRaw).trim() ? String(slRaw).trim() : null;
        if (Number.isFinite(selected) && selected > 0) {
          rescheduleAcceptedMatchIdSetPainel.add(mid);
          if (key) rescheduleAcceptedByDueloPainel.add(key);
        }
        if (selected > 0 || scheduledFor || scheduledLocation) {
          painelAcceptedScheduleByMatchId.set(mid, { scheduledFor, scheduledLocation });
        }
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
    painelAgendadasVisiveis = (painelAgendadas ?? [])
      .filter((row) => {
        if (String((row as { status?: string | null }).status ?? "") !== "agendada") return false;
        const midRow = Number((row as AgendaPartidaCardRow).match_id ?? 0);
        if (Number.isFinite(midRow) && midRow > 0 && blockedMatchIdsByCancelFlowPainel.has(midRow)) return false;
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
      })
      .filter((row) => usuarioPodeGerenciarPartidaPainel(row as AgendaPartidaCardRow));
    hasPartidasAcoes =
      painelPlacarPendente.length > 0 ||
      painelAgendadasVisiveis.length > 0 ||
      painelAceitosCancelaveisItems.length > 0;
  }

  const hasDesafioAcoes = pedidosItems.length > 0 || pedidosEnviadosItems.length > 0;
  const hasEquipeAcoes =
    sugestoesItems.length > 0 ||
    sugestoesEnviadasItems.some((s) => s.statusRaw === "pendente") ||
    conviteItems.length > 0 ||
    candidaturasEquipe.length > 0 ||
    conviteEnviadoItems.some((i) => String(i.status ?? "").toLowerCase() === "pendente") ||
    minhasCandidaturasEquipe.some((c) => c.statusRaw === "pendente");
  const temAlgumaAcaoPendente = hasPartidasAcoes || hasDesafioAcoes || hasEquipeAcoes;
  const sugestoesEnviadasSoPendentes = sugestoesEnviadasItems.filter((s) => s.statusRaw === "pendente");
  const convitesEnviadosSoPendentes = conviteEnviadoItems.filter(
    (i) => String(i.status ?? "").toLowerCase() === "pendente",
  );
  const minhasCandSoPendentes = minhasCandidaturasEquipe.filter((c) => c.statusRaw === "pendente");

  return (
    <main
      data-eid-comunidade-panel
      data-eid-touch-ui
      data-eid-touch-ui-compact="true"
      className="mx-auto w-full max-w-3xl px-2.5 py-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-6xl sm:px-5 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
    >
      <ComunidadeBackgroundSync />
      <div className="mb-3 md:mb-4">
        <PushToggleCard defaultEnabled />
      </div>

        <div className="space-y-3 md:space-y-5">
          {!temAlgumaAcaoPendente ? (
            <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-4 text-center text-sm text-eid-text-secondary">
              Nada pendente por aqui no momento.
            </p>
          ) : null}

          {hasPartidasAcoes ? (
          <>
          {painelAceitosCancelaveisItems.length > 0 ? (
            <div id="desafios-aceitos-gestao" className="scroll-mt-4 md:scroll-mt-6">
              <AgendaAceitosCancelaveis items={painelAceitosCancelaveisItems} cadastrarLocalReturnBase="/comunidade" />
            </div>
          ) : null}
          {(painelPlacarPendente.length > 0 || painelAgendadasVisiveis.length > 0) ? (
          <section id="resultados-partida" className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0">
            <div className="flex items-center justify-between gap-2 border-b border-transparent bg-eid-surface/40 px-3 py-2.5 md:px-4">
              <div>
                <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Partidas e resultados</h2>
                <p className="mt-0.5 hidden text-[11px] text-eid-text-secondary md:block">
                  Lançamento de placar, revisão e confirmação. Cancelamento ou nova data em desafio aceito fica em{" "}
                  <strong className="text-eid-fg">Desafios aceitos</strong> (neste painel, quando houver). Na{" "}
                  <Link href="/agenda" className="font-semibold text-eid-primary-300 hover:underline">
                    Agenda
                  </Link>{" "}
                  você vê só <strong className="text-eid-fg">data e local</strong> como referência.
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
                      const midPartida = Number(pr.match_id ?? 0);
                      const sched =
                        Number.isFinite(midPartida) && midPartida > 0
                          ? painelAcceptedScheduleByMatchId.get(midPartida) ?? null
                          : null;
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
                          formacaoJ1={pickFormacaoLadoPartida(pr, 1, painelTimesById)}
                          formacaoJ2={pickFormacaoLadoPartida(pr, 2, painelTimesById)}
                          esporteId={esporteIdCard}
                          dataRef={sched?.scheduledFor ?? pr.data_partida ?? pr.data_registro}
                          localLabel={mergeAgendaLocalDisplayed(
                            sched?.scheduledLocation,
                            pr.local_str,
                            pr.local_espaco_id,
                            pr.local_espaco_id ? painelLocMap.get(pr.local_espaco_id) ?? null : null
                          )}
                          variant="placar"
                          ctaFullscreen
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel="Revisar resultado"
                          perfilEidFrom="/comunidade"
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
                      const dueloKeyCard = dueloKey(pr.jogador1_id, pr.jogador2_id, esporteIdCard);
                      const midPartida = Number(pr.match_id ?? 0);
                      const sched =
                        Number.isFinite(midPartida) && midPartida > 0
                          ? painelAcceptedScheduleByMatchId.get(midPartida) ?? null
                          : null;
                      const cancelMatchIdResolved = resolveCancelMatchIdParaCard(
                        pr,
                        cancelMatchIdByMatchIdPainel,
                        cancelMatchIdByDueloPainel,
                        dueloKeyCard
                      );
                      const rescheduleAceito =
                        (Number.isFinite(midPartida) && midPartida > 0 && rescheduleAcceptedMatchIdSetPainel.has(midPartida)) ||
                        (dueloKeyCard ? rescheduleAcceptedByDueloPainel.has(dueloKeyCard) : false);
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
                          formacaoJ1={pickFormacaoLadoPartida(pr, 1, painelTimesById)}
                          formacaoJ2={pickFormacaoLadoPartida(pr, 2, painelTimesById)}
                          esporteId={esporteIdCard}
                          dataRef={sched?.scheduledFor ?? pr.data_partida ?? pr.data_registro}
                          localLabel={mergeAgendaLocalDisplayed(
                            sched?.scheduledLocation,
                            pr.local_str,
                            pr.local_espaco_id,
                            pr.local_espaco_id ? painelLocMap.get(pr.local_espaco_id) ?? null : null
                          )}
                          variant="agendada"
                          ctaFullscreen
                          cancelMatchId={cancelMatchIdResolved}
                          desistMatchId={rescheduleAceito ? cancelMatchIdResolved : null}
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel="Lançar resultado"
                          perfilEidFrom="/comunidade"
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
          </>
          ) : null}

          {hasDesafioAcoes ? (
          <section id="desafio-pedidos" className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0">
            <div className="flex items-center justify-between gap-2 border-b border-transparent bg-eid-surface/40 px-3 py-2.5 md:px-4">
              <div>
                <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Desafio</h2>
                <p className="mt-0.5 hidden text-[11px] text-eid-text-secondary md:block">
                  Pedidos de desafio que aguardam aceite ou resposta.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-primary-300">
                Social
              </span>
            </div>
            <div className="px-3 py-3 md:px-4 md:py-4">
            <div className="space-y-4">
              <ComunidadeQuadro
                id="desafio-pedidos-recebidos"
                title="Pedidos recebidos"
                hasPending={pedidosItems.length > 0}
                headerBadgeExtra={
                  pedidosItems.length === 1 ? <PedidoMatchFinalidadeSeal finalidade={pedidosItems[0]?.finalidade} /> : null
                }
              >
                <ComunidadePedidosMatch items={pedidosItems} />
              </ComunidadeQuadro>
              <ComunidadeQuadro
                id="desafio-pedidos-enviados"
                title="Pedidos enviados (aguardando resposta)"
                hasPending={pedidosEnviadosItems.length > 0}
              >
                <ComunidadePedidosEnviados items={pedidosEnviadosItems} />
              </ComunidadeQuadro>
            </div>
            </div>
          </section>
          ) : null}

          {hasEquipeAcoes ? (
          <section className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0">
            <div className="flex items-center justify-between gap-2 border-b border-transparent bg-eid-card px-3 py-2 md:px-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 shrink-0 text-eid-primary-500" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-[8px] font-black uppercase tracking-[0.14em] text-eid-fg">Equipe</h2>
                  <p className="mt-0.5 hidden text-[8px] font-medium text-eid-text-secondary md:block">
                    Convites e sugestões de liderança que precisam da sua resposta.
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
                title="Sugestões enviadas (aguardando resposta)"
                hasPending={sugestoesEnviadasSoPendentes.length > 0}
                badgeLabel="Pendente"
              >
                <ComunidadeSugestoesEnviadasMatch items={sugestoesEnviadasSoPendentes} viewerUserId={user.id} />
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
                        <li key={c.id} className={`${getSocialStatusPanelItemShell("pendente")} p-0 text-sm`}>
                          <div className="flex items-center justify-between gap-2 border-b border-transparent bg-[color:color-mix(in_srgb,var(--eid-card)_62%,transparent)] px-3.5 py-2 sm:px-4.5 eid-light:bg-white/95">
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

                          <div className="mt-2 px-0.5 pb-1 pt-0.5 sm:px-1 sm:pb-2 sm:pt-1">
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

                            <div className="mt-2 border-t border-transparent pt-2">
                              <CandidaturaResponseActions candidaturaId={c.id} className="!items-stretch gap-1.5 px-3 pb-1.5 sm:gap-2 sm:px-4 sm:pb-2" />
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
                title="Convites enviados (aguardando resposta)"
                hasPending={convitesEnviadosSoPendentes.length > 0}
              >
                <ComunidadeConvitesEnviadosTime items={convitesEnviadosSoPendentes} />
              </ComunidadeQuadro>
              <ComunidadeQuadro
                id="equipe-pedidos-enviados"
                title="Pedidos de entrada enviados"
                hasPending={minhasCandSoPendentes.length > 0}
              >
                {minhasCandSoPendentes.length === 0 ? null : (
                  <ul className="mt-3 space-y-3">
                    {minhasCandSoPendentes.map((c) => {
                      const criado = formatSolicitacaoParts(c.criadoEm);
                      const resp = c.respondidoEm ? formatSolicitacaoParts(c.respondidoEm) : null;
                      const formacaoHref =
                        Number.isFinite(c.timeId) && c.timeId > 0
                          ? `/perfil-time/${c.timeId}?from=/comunidade`
                          : "/comunidade";
                      return (
                        <li key={c.id} className={`${getSocialStatusPanelItemShell(c.statusRaw)} p-0 text-sm`}>

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
                            <div className={EID_SOCIAL_PANEL_FOOTER}>
                              <CancelarCandidaturaForm candidaturaId={c.id} compact label="Cancelar" />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ComunidadeQuadro>
            </div>
            </div>
          </section>
          ) : null}

        </div>
    </main>
  );
}
