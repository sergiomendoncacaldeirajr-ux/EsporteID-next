import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardPageSkeleton } from "@/components/loading/dashboard-page-skeleton";
import { eidRouteSkeletonsDisabled } from "@/lib/eid-route-skeleton-flag";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { MatchIdadeGateBanner } from "@/components/perfil/match-idade-gate-banner";
import { ProfileFriendlyStatusToggle } from "@/components/perfil/profile-friendly-status-toggle";
import { AmistosoDailyHint } from "@/components/dashboard/amistoso-daily-hint";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { distanciaKm } from "@/lib/geo/distance-km";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { EidSectionInfo } from "@/components/ui/eid-section-info";
import { EidSealPill } from "@/components/ui/eid-seal-pill";
import { FindChallengeCta } from "@/components/dashboard/find-challenge-cta";
import { getAgendaTeamContext } from "@/lib/agenda/partidas-usuario";

export const metadata = {
  title: "Painel",
  description: "Área logada do EsporteID",
};

function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

function iniciais(nome?: string | null) {
  const n = (nome ?? "").trim();
  if (!n) return "E";
  return n
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  searchParams?: Promise<{ q?: string }>;
};

type ProfileMini = {
  id?: string;
  nome?: string | null;
  avatar_url?: string | null;
  localizacao?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  disponivel_amistoso?: boolean | null;
  disponivel_amistoso_ate?: string | null;
  match_maioridade_confirmada?: boolean | null;
};

type AtletaRow = {
  nota_eid?: number | null;
  usuario_id?: string;
  profiles?: ProfileMini | ProfileMini[] | null;
};

type PartidaResumo = {
  id: number;
  data_partida: string | null;
  data_registro: string | null;
  torneio_id?: number | null;
  esportes?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
};

/** Linhas retornadas pelas queries de torneios / locais no painel (fallback `[]` tipado). */
type DashboardTorneioListRow = {
  id: number;
  nome: string | null;
  status: string | null;
  data_inicio: string | null;
  banner: string | null;
  esporte_id: number | null;
  lat: string | number | null;
  lng: string | number | null;
};

type DashboardEspacoListRow = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  logo_arquivo: string | null;
  localizacao: string | null;
  lat: string | number | null;
  lng: string | number | null;
  esportes_ids: unknown;
  aceita_socios: boolean | null;
  modo_monetizacao: string | null;
  modo_reserva: string | null;
};

function firstProfile(p: AtletaRow["profiles"]): ProfileMini | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function parseNumericList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function whenLabel(iso: string | null) {
  if (!iso) return "em breve";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "em breve";
  const now = new Date();
  const amanha = new Date(now);
  amanha.setDate(amanha.getDate() + 1);
  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isSameDay(dt, now)) return `hoje às ${hora}`;
  if (isSameDay(dt, amanha)) return `amanhã às ${hora}`;
  const data = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${data} às ${hora}`;
}

function rosterCapForTipo(tipo: string | null | undefined): number {
  return String(tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
}

function vagasAbertasLabel(tipo: string | null | undefined, rosterCount: number | null | undefined): string {
  const cap = rosterCapForTipo(tipo);
  const ocupacao = Number.isFinite(Number(rosterCount)) ? Math.max(0, Number(rosterCount)) : 0;
  const vagas = Math.max(0, cap - ocupacao);
  return vagas === 1 ? "1 vaga" : `${vagas} vagas`;
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08-.07-.12C7.59 10.71 7 8.33 7 8c0-.34.25-.66.5-.83C8.5 6.5 10 5 11 4c.33-.25.83-.25 1.17 0 .33.25.33.75 0 1l-1.5 4H16c.42 0 .67.46.42.79l-5 7c-.25.33-.79.25-1.04-.08L11 21z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="9" r="2.4" />
      <circle cx="15" cy="10" r="2" />
      <path d="M4.7 18.2a4.3 4.3 0 0 1 8.6 0" />
      <path d="M13.2 18.2a3.5 3.5 0 0 1 4.2-3.4" />
      <path d="M19.2 8.3v3.2" />
      <path d="M17.6 9.9h3.2" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function IconMarketplace({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4.5 9.5h15l-1.2 8.8a2 2 0 0 1-2 1.7H7.7a2 2 0 0 1-2-1.7L4.5 9.5Z" />
      <path d="M8 9.5V8a4 4 0 1 1 8 0v1.5" />
      <path d="M12 12.7v3.8" />
      <path d="M10.1 14.6H13.9" />
      <path d="M15.9 6.1l1.4-1.4" />
      <path d="M6.7 6.1l1.4-1.4" />
    </svg>
  );
}

function IconLocationCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20.8s5.8-5.2 5.8-9.5A5.8 5.8 0 0 0 6.2 11.3c0 4.3 5.8 9.5 5.8 9.5Z" />
      <circle cx="12" cy="11.2" r="2.1" />
      <path d="M4 19.5c2.3-1.2 4.8-1.8 8-1.8s5.7.6 8 1.8" />
    </svg>
  );
}

function IconReservaRapida({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.4" y="4.2" width="17.2" height="16.2" rx="2.8" />
      <path d="M7.2 2.8v2.8" />
      <path d="M16.8 2.8v2.8" />
      <path d="M3.4 9.2h17.2" />
      <path d="M8 13.2h3.2v3.2H8z" />
      <path d="M15.8 12.2v5.2" />
      <path d="M13.2 14.8h5.2" />
    </svg>
  );
}

function IconTorneioCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4.2 6.2h3.2v3H4.2z" />
      <path d="M16.6 6.2h3.2v3h-3.2z" />
      <path d="M4.2 14.8h3.2v3H4.2z" />
      <path d="M16.6 14.8h3.2v3h-3.2z" />
      <path d="M7.4 7.7h2.4v8.6H7.4" />
      <path d="M14.2 7.7h-2.4v8.6h2.4" />
      <path d="M9.8 12h2" />
    </svg>
  );
}

const scrollRow =
  "-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-4 sm:gap-3 sm:px-4 [&::-webkit-scrollbar]:hidden";

const sectionActionClass =
  "inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]";

const sectionTitleClass =
  "text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400";

const dashboardSectionOuter =
  "eid-dashboard-section overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 shadow-none";

const dashboardSectionHead =
  "eid-dashboard-section-head flex items-center justify-between gap-3 border-b border-transparent bg-transparent px-3 py-2.5 shadow-none sm:px-4";

const dashboardSectionBody = "px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3";

/** Mini-cards da grade “Confrontos próximos” (3 colunas). */
const dashboardSpotlightLink =
  "group flex flex-col items-center overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 px-2 pb-2.5 pt-2 text-center shadow-none transition duration-200 hover:-translate-y-[2px] hover:border-eid-primary-500/30 hover:bg-eid-primary-500/10 active:translate-y-0";

const dashboardSpotlightEmpty =
  "flex min-h-[8.5rem] flex-col items-center justify-center rounded-2xl border border-transparent bg-eid-surface/35 px-2 py-3 text-center shadow-none";

/** Card horizontal — torneios (maior). */
const dashboardRailTorneio =
  "group min-w-[220px] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 shadow-none transition duration-200 hover:-translate-y-[2px] hover:border-eid-primary-500/30 hover:bg-eid-primary-500/10 active:translate-y-0";

/** Card horizontal — locais. */
const dashboardRailLocal =
  "group min-w-[148px] max-w-[148px] shrink-0 snap-start rounded-2xl border border-transparent bg-eid-surface/40 p-3 text-left shadow-none transition duration-200 hover:-translate-y-[2px] hover:border-eid-primary-500/28 hover:bg-eid-primary-500/10 active:translate-y-0";

const dashboardEmptyWide =
  "rounded-2xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_62%,var(--eid-primary-500)_38%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_45%,transparent),transparent)] px-4 py-9 text-center ring-1 ring-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)]";

/** Barra de atalhos tipo dock / menu (sem cabeçalho de seção). */
const dashboardAppNavClass =
  "eid-dashboard-app-nav rounded-2xl border border-transparent bg-[color-mix(in_srgb,var(--eid-surface)_42%,var(--eid-bg)_58%)] p-1 shadow-none sm:rounded-[1.35rem] sm:p-1.5";

export default function DashboardPage(props: Props) {
  return (
    <Suspense fallback={eidRouteSkeletonsDisabled() ? null : <DashboardPageSkeleton />}>
      <DashboardPageContent {...props} />
    </Suspense>
  );
}

async function DashboardPageContent({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const contextState = await getAuthContextState();
  const { user, activeContext } = contextState;
  const { supabase } = await getServerAuth();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  if (activeContext === "organizador" && contextState.papeis.includes("organizador")) {
    redirect("/organizador");
  }
  const gate = await getCachedProfileLegalRow(user.id);
  if (!gate || !legalAcceptanceIsCurrent(gate)) {
    redirect("/conta/aceitar-termos");
  }
  if (!gate.perfil_completo) {
    redirect("/onboarding");
  }
  const [featureCfg, profileRes] = await Promise.all([
    getSystemFeatureConfig(supabase),
    supabase
      .from("profiles")
      .select("nome, avatar_url, localizacao, lat, lng, match_idade_gate, disponivel_amistoso, disponivel_amistoso_ate, perfil_completo")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const canSeeLocais = canAccessSystemFeature(featureCfg, "locais", user.id);
  const canSeeTorneios = canAccessSystemFeature(featureCfg, "torneios", user.id);
  const canSeeProfessores = canAccessSystemFeature(featureCfg, "professores", user.id);
  const canSeeMarketplace = canAccessSystemFeature(featureCfg, "marketplace", user.id);
  const profile = profileRes.data;

  if (!profile) {
    redirect("/onboarding");
  }

  const hasProfessor = contextState.papeis.includes("professor");
  const hasEspaco = contextState.papeis.includes("espaco");
  const amistosoLigado = computeDisponivelAmistosoEffective(profile.disponivel_amistoso, profile.disponivel_amistoso_ate);

  const myLat = Number(profile.lat ?? NaN);
  const myLng = Number(profile.lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const { teamIds: dashTeamIds, teamClause: dashTeamClause } = await getAgendaTeamContext(supabase, user.id);
  const dashMatchOr =
    dashTeamIds.length > 0
      ? `usuario_id.eq.${user.id},adversario_id.eq.${user.id},desafiante_time_id.in.(${dashTeamIds.join(",")}),adversario_time_id.in.(${dashTeamIds.join(",")})`
      : `usuario_id.eq.${user.id},adversario_id.eq.${user.id}`;
  const partidasDashOr = `jogador1_id.eq.${user.id},jogador2_id.eq.${user.id},usuario_id.eq.${user.id}${dashTeamClause}`;
  const [{ data: activeMatches }, { data: meusEsportes }] = await Promise.all([
    supabase
      .from("matches")
      .select("usuario_id, adversario_id, status")
      .or(dashMatchOr)
      .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"]),
    supabase
      .from("usuario_eid")
      .select("esporte_id, esportes(nome)")
      .eq("usuario_id", user.id)
      .order("esporte_id", { ascending: true })
      .limit(3),
  ]);
  const activeOpponentIds = new Set<string>();
  for (const m of activeMatches ?? []) {
    const usuarioId = String((m as { usuario_id?: string | null }).usuario_id ?? "");
    const adversarioId = String((m as { adversario_id?: string | null }).adversario_id ?? "");
    if (usuarioId === user.id && adversarioId) activeOpponentIds.add(adversarioId);
    else if (adversarioId === user.id && usuarioId) activeOpponentIds.add(usuarioId);
  }

  const meusEsportesResumo = (meusEsportes ?? [])
    .map((row) => {
      const esporteNome =
        (Array.isArray(row.esportes) ? row.esportes[0] : row.esportes)?.nome?.trim() || `Esporte ${row.esporte_id}`;
      return {
        esporteId: Number(row.esporte_id ?? 0),
        esporteNome,
      };
    })
    .filter((item) => Number.isFinite(item.esporteId) && item.esporteId > 0);
  const meusEsportesSet = new Set(meusEsportesResumo.map((item) => item.esporteId));
  const esportePrincipalId = meusEsportes?.[0]?.esporte_id ?? null;
  const partidasAgendadasResumoPromise = supabase
    .from("partidas")
    .select("id, data_partida, data_registro, torneio_id, esportes(nome)")
    .or(partidasDashOr)
    .eq("status", "agendada")
    .order("data_partida", { ascending: true, nullsFirst: false })
    .limit(20);

  const placarPendenteResumoPromise = supabase
    .from("partidas")
    .select("id, data_partida, data_registro, torneio_id, esportes(nome)")
    .or(partidasDashOr)
    .eq("status", "aguardando_confirmacao")
    .neq("lancado_por", user.id)
    .order("data_registro", { ascending: false })
    .limit(20);

  let atletasQuery = supabase
    .from("usuario_eid")
    .select(
      "nota_eid, usuario_id, profiles!inner(id, nome, avatar_url, localizacao, lat, lng, disponivel_amistoso, disponivel_amistoso_ate, match_maioridade_confirmada)"
    )
    .neq("usuario_id", user.id)
    .order("nota_eid", { ascending: false })
    .limit(80);
  if (esportePrincipalId != null) {
    atletasQuery = atletasQuery.eq("esporte_id", esportePrincipalId);
  }

  const esportesParaFiltro = Array.from(meusEsportesSet);
  let torneiosQuery = supabase
    .from("torneios")
    .select("id, nome, status, data_inicio, banner, esporte_id, lat, lng")
    .eq("status", "aberto")
    .order("criado_em", { ascending: false })
    .limit(36);
  if (esportesParaFiltro.length) {
    torneiosQuery = torneiosQuery.in("esporte_id", esportesParaFiltro);
  }
  let timesQuery = supabase
    .from("times")
    .select("id, nome, tipo, localizacao, escudo, esporte_id, vagas_abertas, aceita_pedidos, lat, lng, criador_id, pontos_ranking, eid_time, esportes(nome)")
    .neq("criador_id", user.id)
    .order("pontos_ranking", { ascending: false })
    .limit(50);
  if (esportesParaFiltro.length) {
    timesQuery = timesQuery.in("esporte_id", esportesParaFiltro);
  }
  const dashTeamIdSet = new Set(dashTeamIds);
  const myTeamsInClause = dashTeamIds.length > 0 ? dashTeamIds.join(",") : "";
  const locaisScrollPromise = canSeeLocais
    ? supabase
        .from("espacos_genericos")
        .select("id, slug, nome_publico, logo_arquivo, localizacao, lat, lng, esportes_ids, aceita_socios, modo_monetizacao, modo_reserva")
        .eq("ativo_listagem", true)
        .limit(80)
    : Promise.resolve({ data: [] as DashboardEspacoListRow[] });

  const [
    { data: atletasRaw },
    torneiosRes,
    { data: partidasAgendadasResumo },
    { data: placarPendenteResumo },
    [{ data: timesRaw }, { data: minhasFormacoesMembro }, { data: pendingColetivoRows }],
    { data: locaisScrollRaw },
  ] = await Promise.all([
    atletasQuery,
    canSeeTorneios ? torneiosQuery : Promise.resolve({ data: [] as DashboardTorneioListRow[] }),
    partidasAgendadasResumoPromise,
    placarPendenteResumoPromise,
    Promise.all([
      timesQuery,
      supabase.from("membros_time").select("time_id").eq("usuario_id", user.id).in("status", ["ativo", "aceito", "aprovado"]),
      dashTeamIds.length > 0
        ? supabase
            .from("matches")
            .select("desafiante_time_id, adversario_time_id")
            .eq("status", "Pendente")
            .eq("finalidade", "ranking")
            .in("modalidade_confronto", ["dupla", "time"])
            .or(`desafiante_time_id.in.(${myTeamsInClause}),adversario_time_id.in.(${myTeamsInClause})`)
        : Promise.resolve({ data: [] as Array<{ desafiante_time_id?: number | null; adversario_time_id?: number | null }> }),
    ]),
    locaisScrollPromise,
  ]);
  const torneios = torneiosRes.data;

  const atletasRows = (atletasRaw ?? []) as AtletaRow[];
  const atletasRowsFiltered = atletasRows.filter((row) => {
    const p = firstProfile(row.profiles);
    const id = String(p?.id ?? row.usuario_id ?? "");
    const maioridadeOk = p?.match_maioridade_confirmada === true;
    return id ? !activeOpponentIds.has(id) && maioridadeOk : false;
  });
  let atletasComDist: Array<{ row: AtletaRow; p: ProfileMini | null; dist: number }> = atletasRowsFiltered.map((row) => {
    const p = firstProfile(row.profiles);
    const lat = Number(p?.lat ?? NaN);
    const lng = Number(p?.lng ?? NaN);
    const dist = hasMyCoords ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { row, p, dist };
  });
  atletasComDist.sort((a, b) => {
    if (hasMyCoords) return a.dist - b.dist;
    return Number(b.row.nota_eid ?? 0) - Number(a.row.nota_eid ?? 0);
  });
  const seenAtleta = new Set<string>();
  atletasComDist = atletasComDist.filter(({ p }) => {
    const id = String(p?.id ?? "");
    if (!id) return false;
    if (seenAtleta.has(id)) return false;
    seenAtleta.add(id);
    return true;
  });
  const atletasFiltrados = atletasComDist
    .filter(({ p }) => {
      if (!q) return true;
      const nome = String(p?.nome ?? "").toLowerCase();
      const loc = String(p?.localizacao ?? "").toLowerCase();
      return nome.includes(q) || loc.includes(q);
    })
    .slice(0, 12);

  const torneiosFiltrados = (torneios ?? [])
    .map((t) => {
      const dist = hasMyCoords ? distanciaKm(myLat, myLng, Number(t.lat ?? NaN), Number(t.lng ?? NaN)) : 99999;
      return { ...t, dist };
    })
    .filter((t) => {
      if (!q) return true;
      return String(t.nome ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 12);

  const timeIdsComDesafioRankingPendente = new Set<number>();
  for (const m of pendingColetivoRows ?? []) {
    const a = Number((m as { desafiante_time_id?: number | null }).desafiante_time_id ?? 0);
    const b = Number((m as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) continue;
    if (dashTeamIdSet.has(a)) timeIdsComDesafioRankingPendente.add(b);
    if (dashTeamIdSet.has(b)) timeIdsComDesafioRankingPendente.add(a);
  }
  const meusTimesMembroIds = new Set(
    (minhasFormacoesMembro ?? [])
      .map((row) => Number((row as { time_id?: number | null }).time_id ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
  const timeCriadorIds = [...new Set((timesRaw ?? []).map((t) => String(t.criador_id ?? "")).filter(Boolean))];
  const { data: timeCriadoresProfiles } =
    timeCriadorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, match_maioridade_confirmada")
          .in("id", timeCriadorIds)
      : { data: [] as Array<{ id: string; match_maioridade_confirmada: boolean | null }> };
  const criadoresComMaioridade = new Set(
    (timeCriadoresProfiles ?? [])
      .filter((p) => p.match_maioridade_confirmada === true)
      .map((p) => String(p.id))
  );
  const timesSemAtivos = (timesRaw ?? []).filter(
    (t) =>
      !meusTimesMembroIds.has(Number(t.id ?? 0)) &&
      !activeOpponentIds.has(String(t.criador_id ?? "")) &&
      criadoresComMaioridade.has(String(t.criador_id ?? "")) &&
      !timeIdsComDesafioRankingPendente.has(Number(t.id ?? 0))
  );
  const timesComDist = timesSemAtivos.map((t) => {
    const lat = Number(t.lat ?? NaN);
    const lng = Number(t.lng ?? NaN);
    const dist = hasMyCoords && Number.isFinite(lat) && Number.isFinite(lng) ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { t, dist };
  });
  timesComDist.sort((a, b) => a.dist - b.dist);
  const timesComBusca = timesComDist
    .filter(({ t }) => {
      if (!q) return true;
      return (
        String(t.nome ?? "").toLowerCase().includes(q) || String(t.localizacao ?? "").toLowerCase().includes(q)
      );
    })
    .filter(({ t }) => meusEsportesSet.size === 0 || meusEsportesSet.has(Number(t.esporte_id ?? 0)));
  const atletaMaisProximo = atletasFiltrados[0] ?? null;
  const esporteCardNome = meusEsportesResumo[0]?.esporteNome ?? "Esporte";
  const teamRosterIds = [
    ...new Set(
      [
        ...timesComBusca.map(({ t }) => Number(t.id ?? 0)),
      ].filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const teamRosterMap = new Map<number, number>();
  if (teamRosterIds.length > 0) {
    const { data: headBatch, error: headBatchErr } = await supabase.rpc("time_roster_headcount_many", {
      p_time_ids: teamRosterIds,
    });
    if (!headBatchErr && Array.isArray(headBatch)) {
      for (const row of headBatch as Array<{ time_id?: number | null; headcount?: number | null }>) {
        const timeId = Number(row.time_id ?? 0);
        const hc = Number(row.headcount ?? 0);
        if (Number.isFinite(timeId) && timeId > 0) {
          teamRosterMap.set(timeId, Number.isFinite(hc) ? Math.max(0, hc) : 0);
        }
      }
    } else {
      const { data: rosterRows } = await supabase
        .from("membros_time")
        .select("time_id")
        .in("time_id", teamRosterIds)
        .in("status", ["ativo", "aceito", "aprovado"]);
      for (const row of rosterRows ?? []) {
        const timeId = Number((row as { time_id?: number | null }).time_id ?? 0);
        if (!Number.isFinite(timeId) || timeId <= 0) continue;
        teamRosterMap.set(timeId, (teamRosterMap.get(timeId) ?? 0) + 1);
      }
    }
    for (const timeId of teamRosterIds) {
      if (!teamRosterMap.has(timeId)) teamRosterMap.set(timeId, 0);
    }
  }
  const vagasDisponiveisMap = new Map<number, number>(
    timesComBusca.map(({ t }) => {
      const cap = String(t.tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
      const head = teamRosterMap.get(Number(t.id ?? 0)) ?? 1;
      return [Number(t.id), Math.max(0, cap - head)] as const;
    })
  );
  const timesComBuscaEVaga = timesComBusca.filter(
    ({ t }) =>
      Boolean(t.vagas_abertas) &&
      Boolean(t.aceita_pedidos) &&
      (vagasDisponiveisMap.get(Number(t.id ?? 0)) ?? 0) > 0
  );
  const timesFiltrados = timesComBuscaEVaga.slice(0, 12);
  const duplaMaisProxima = timesComBusca.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "dupla");
  const timeMaisProximo = timesComBusca.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "time");

  const locaisScroll = (locaisScrollRaw ?? [])
    .map((loc) => {
      const esporteIds = parseNumericList(loc.esportes_ids);
      const sportMatch = meusEsportesSet.size === 0 || esporteIds.some((id) => meusEsportesSet.has(id));
      const aceitaSocios = Boolean(loc.aceita_socios);
      const mensalidadePlataforma = String(loc.modo_monetizacao ?? "").toLowerCase() === "mensalidade_plataforma";
      const reservaPaga = ["paga", "mista"].includes(String(loc.modo_reserva ?? "").toLowerCase());
      const dist = hasMyCoords ? distanciaKm(myLat, myLng, Number(loc.lat ?? NaN), Number(loc.lng ?? NaN)) : 99999;
      const score =
        (sportMatch ? 4 : 0) +
        (aceitaSocios ? 2 : 0) +
        (mensalidadePlataforma ? 2 : 0) +
        (reservaPaga ? 2 : 0);
      return { ...loc, sportMatch, aceitaSocios, mensalidadePlataforma, reservaPaga, score, dist };
    })
    .filter((loc) => loc.score > 0)
    .filter((loc) => {
      if (!q) return true;
      return (
        String(loc.nome_publico ?? "").toLowerCase().includes(q) ||
        String(loc.localizacao ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.dist - b.dist || b.score - a.score)
    .slice(0, 12);

  const [{ data: sociosAtivosRows }, { data: atalhosRows }] = canSeeLocais
    ? await Promise.all([
        supabase
          .from("espaco_socios")
          .select("espaco_generico_id, espacos_genericos!inner(id, slug, nome_publico, ativo_listagem)")
          .eq("usuario_id", user.id)
          .eq("status", "ativo"),
        supabase
          .from("espaco_reserva_atalhos")
          .select("espaco_generico_id, espacos_genericos!inner(id, slug, nome_publico, ativo_listagem)")
          .eq("usuario_id", user.id),
      ])
    : [{ data: [] as Array<{ espaco_generico_id?: number | null; espacos_genericos?: unknown }> }, { data: [] as Array<{ espaco_generico_id?: number | null; espacos_genericos?: unknown }> }];
  const reservaRapidaMap = new Map<number, { id: number; slug: string | null; nome_publico: string | null }>();
  for (const row of [...(sociosAtivosRows ?? []), ...(atalhosRows ?? [])]) {
    const espacoRaw = Array.isArray(row.espacos_genericos) ? row.espacos_genericos[0] : row.espacos_genericos;
    const espacoId = Number(espacoRaw?.id ?? row.espaco_generico_id ?? 0);
    if (!Number.isFinite(espacoId) || espacoId < 1) continue;
    if (!espacoRaw?.ativo_listagem) continue;
    if (reservaRapidaMap.has(espacoId)) continue;
    reservaRapidaMap.set(espacoId, {
      id: espacoId,
      slug: String(espacoRaw?.slug ?? "") || null,
      nome_publico: espacoRaw?.nome_publico ?? "Espaço",
    });
  }
  const espacosReservaRapida = Array.from(reservaRapidaMap.values());
  const reservaHref =
    espacosReservaRapida.length <= 1 && espacosReservaRapida[0]?.slug
      ? `/reservar/${encodeURIComponent(String(espacosReservaRapida[0].slug))}`
      : "/reservar";
  const mostrarReservarRapido = espacosReservaRapida.length > 0;

  const agora = new Date();
  const agoraMs = agora.getTime();
  const proximasPartidas = (partidasAgendadasResumo ?? [])
    .map((p) => ({ raw: p as PartidaResumo, atMs: p.data_partida ? new Date(p.data_partida).getTime() : Number.NaN }))
    .filter((x) => Number.isFinite(x.atMs))
    .sort((a, b) => a.atMs - b.atMs);
  const proximaPartida = proximasPartidas.find((x) => x.atMs >= agoraMs)?.raw ?? proximasPartidas[0]?.raw ?? null;
  const esporteProximaPartida = firstOf(proximaPartida?.esportes)?.nome ?? "seu esporte";
  const hasPlacarPendente = (placarPendenteResumo?.length ?? 0) > 0;

  let mensagemTopo = "Sua evolução está em dia";
  let mensagemTopoHref: string | null = null;
  let mensagemTopoTom: "ok" | "aviso" = "ok";

  if (proximaPartida?.data_partida) {
    const when = whenLabel(proximaPartida.data_partida);
    if (proximaPartida.torneio_id) {
      mensagemTopo = `Prioridade: partida de torneio ${when}. Confira na agenda.`;
    } else {
      mensagemTopo = `Jogo ${when} em ${esporteProximaPartida}.`;
    }
    mensagemTopoHref = "/agenda";
    mensagemTopoTom = "aviso";
  } else if (hasPlacarPendente) {
    const qtd = placarPendenteResumo?.length ?? 0;
    mensagemTopo = qtd === 1 ? "Você tem 1 placar aguardando sua revisão." : `Você tem ${qtd} placares aguardando sua revisão.`;
    mensagemTopoHref = "/agenda#placares";
    mensagemTopoTom = "aviso";
  }

  const matchHref =
    esportePrincipalId != null
      ? `/match?esporte=${encodeURIComponent(String(esportePrincipalId))}&tipo=todas`
      : "/match?tipo=todas";

  const matchIdadeGate = String(profile.match_idade_gate ?? "ok");

  const statusFromFeature = (
    canSee: boolean,
    mode: "ativo" | "em_breve" | "desenvolvimento" | "teste"
  ): "active" | "coming" | "testing" | "blocked" => {
    if (canSee) return "active";
    if (mode === "em_breve") return "coming";
    if (mode === "teste") return "testing";
    return "blocked";
  };
  const navItems = [
    {
      label: "Locais",
      shortLabel: "Locais",
      href: canSeeLocais ? "/locais" : undefined,
      icon: IconLocationCard,
      status: statusFromFeature(canSeeLocais, featureCfg.locais.mode),
    },
    ...(mostrarReservarRapido
      ? [
          {
            label: "Reservar",
            shortLabel: "Reservar",
            href: reservaHref,
            icon: IconReservaRapida,
            status: "active" as const,
          },
        ]
      : []),
    {
      label: "Vagas",
      shortLabel: "Vagas",
      href: "/times",
      icon: IconUsers,
      status: "active" as const,
    },
    {
      label: "Torneios",
      shortLabel: "Torneios",
      href: canSeeTorneios ? "/torneios" : undefined,
      icon: IconTorneioCard,
      status: statusFromFeature(canSeeTorneios, featureCfg.torneios.mode),
    },
    {
      label: "MarketPlace",
      shortLabel: "Market",
      // Ainda não há rota dedicada de marketplace; quando liberado abre a comunidade.
      href: canSeeMarketplace ? "/comunidade" : undefined,
      icon: IconMarketplace,
      status: statusFromFeature(canSeeMarketplace, featureCfg.marketplace.mode),
    },
  ];
  const quickNavMain = navItems;

  return (
    <div
      className="relative z-0 mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col px-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] pt-0 sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
      data-eid-dashboard-page
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-[radial-gradient(ellipse_95%_60%_at_50%_-10%,rgba(37,99,235,0.1),transparent_55%)] sm:h-52" aria-hidden />
      <div className={`eid-dashboard-hero relative mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}>
          <div
            className="eid-dashboard-hero-glow pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="eid-dashboard-hero-glow pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="relative flex shrink-0 flex-col items-center gap-1.5">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Seu avatar"
                  width={72}
                  height={72}
                  unoptimized
                  className={`h-[4.25rem] w-[4.25rem] rounded-full border-[3px] object-cover ring-2 ring-offset-2 ring-offset-eid-card sm:h-[4.5rem] sm:w-[4.5rem] ${
                    amistosoLigado
                      ? "border-emerald-400/80 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.5)] ring-emerald-400/35"
                      : "border-red-500/80 shadow-[0_8px_24px_-6px_rgba(239,68,68,0.48)] ring-red-500/30"
                  }`}
                />
              ) : (
                <div
                  className={`flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[3px] bg-eid-surface text-lg font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] ring-2 ring-offset-2 ring-offset-eid-card sm:h-[4.5rem] sm:w-[4.5rem] ${
                    amistosoLigado
                      ? "border-emerald-400/80 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.5)] ring-emerald-400/35"
                      : "border-red-500/80 shadow-[0_8px_24px_-6px_rgba(239,68,68,0.48)] ring-red-500/30"
                  }`}
                >
                  {iniciais(profile.nome)}
                </div>
              )}
              <ProfileFriendlyStatusToggle
                userId={user.id}
                initialOn={amistosoLigado}
                initialExpiresAt={profile.disponivel_amistoso_ate ? String(profile.disponivel_amistoso_ate) : null}
                canToggle
              />
              <AmistosoDailyHint />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-400">Painel</p>
              <h1 className="mt-0.5 text-base font-black leading-tight text-eid-fg sm:text-lg">
                Olá, {primeiroNome(profile.nome)}!
              </h1>
              {mensagemTopoHref ? (
                <Link
                  href={mensagemTopoHref}
                  className={`mt-1.5 inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.04em] transition hover:brightness-110 sm:text-[11px] ${
                    mensagemTopoTom === "aviso"
                      ? "border border-eid-action-500/35 bg-eid-action-500/10 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-action-500)_42%)]"
                      : "border border-eid-primary-500/35 bg-eid-primary-500/12 text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]"
                  }`}
                >
                  <span className="truncate">{mensagemTopo}</span>
                </Link>
              ) : (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-fg)_52%,var(--eid-primary-500)_48%)] sm:text-[11px]">
                  {mensagemTopo}
                </p>
              )}
              {profile.localizacao ? (
                <p className="mt-1.5 truncate text-xs text-eid-text-secondary">{profile.localizacao}</p>
              ) : null}
              {meusEsportesResumo.length > 0 ? (
                <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max min-w-full items-center gap-1.5">
                    {meusEsportesResumo.map((item) => (
                      <span
                        key={item.esporteId}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-1 text-[10px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)]"
                        title={item.esporteNome}
                      >
                        <SportGlyphIcon sportName={item.esporteNome} />
                        <span className="truncate">{item.esporteNome}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <MatchIdadeGateBanner gate={matchIdadeGate} />
          </div>

          <FindChallengeCta href={matchHref} />
        </div>

        <nav aria-label="Atalhos do app" className={`${dashboardAppNavClass} mt-4 sm:mt-5`}>
        <div className={`grid gap-1.5 sm:gap-2 ${navItems.length >= 4 ? "grid-cols-4" : navItems.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {quickNavMain.map((item) => {
            const Icon = item.icon;
            const cardContent = (
              <>
                {item.status === "coming" ? (
                  <span className="absolute right-1 top-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_88%,var(--eid-card)_12%)] px-1.5 py-[1px] text-[6px] font-black uppercase tracking-[0.08em] text-eid-text-secondary sm:right-1.5 sm:top-1.5">
                    Em breve
                  </span>
                ) : item.status === "testing" ? (
                  <span className="absolute right-1 top-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-[1px] text-[6px] font-black uppercase tracking-[0.08em] text-eid-action-400 sm:right-1.5 sm:top-1.5">
                    Em teste
                  </span>
                ) : null}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border sm:h-11 sm:w-11 sm:rounded-2xl ${
                    item.status !== "active"
                      ? "border-transparent bg-eid-surface/45 text-eid-text-secondary"
                      : "border-transparent bg-eid-primary-500/14 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
                </span>
                <span className={`text-[8px] font-extrabold uppercase leading-tight tracking-wide sm:text-[9px] ${item.status !== "active" ? "text-eid-text-secondary" : "text-eid-fg"}`}>
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
                {item.status === "coming" ? (
                  <span className="text-[7px] font-semibold leading-none text-eid-text-secondary/85 sm:text-[8px]">em breve</span>
                ) : item.status === "testing" ? (
                  <span className="text-[7px] font-semibold leading-none text-eid-action-400/90 sm:text-[8px]">pilotos</span>
                ) : item.status === "blocked" ? (
                  <span className="text-[7px] font-semibold leading-none text-eid-text-secondary/85 sm:text-[8px]">indisponível</span>
                ) : null}
              </>
            );

            if (item.status === "active" && item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="eid-dashboard-app-nav-item eid-list-item relative flex min-h-[4rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent bg-transparent px-1 py-1.5 text-center transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_28%,transparent)] hover:bg-eid-primary-500/10 active:scale-[0.98] sm:min-h-[4.35rem] sm:rounded-xl sm:py-2"
                >
                  {cardContent}
                </Link>
              );
            }
            return (
              <div
                key={item.label}
                aria-disabled
                className="eid-dashboard-app-nav-item eid-list-item relative flex min-h-[4rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent bg-transparent px-1 py-1.5 text-center opacity-75 sm:min-h-[4.35rem] sm:rounded-xl sm:py-2"
              >
                {cardContent}
              </div>
            );
          })}
        </div>
        </nav>

        {hasProfessor && canSeeProfessores ? (
          <Link
            href="/professor"
            className="eid-btn-soft mt-3 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl border-eid-action-500/35 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-action-500)_45%)] sm:mt-4 sm:text-[11px]"
          >
            <IconUsers className="h-5 w-5 shrink-0 text-eid-action-400" />
            Painel do professor
          </Link>
        ) : null}
        {hasEspaco && canSeeLocais ? (
          <Link
            href="/espaco"
            className="eid-btn-soft mt-3 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl border-eid-primary-500/35 bg-eid-primary-500/12 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)] sm:mt-4 sm:text-[11px]"
          >
            <IconMapPin className="h-5 w-5 shrink-0 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]" />
            Painel do espaço
          </Link>
        ) : null}
        {q ? (
          <p className="mt-4 rounded-xl border border-transparent bg-eid-surface/40 px-3 py-2 text-xs text-eid-text-secondary shadow-none">
            Busca ativa por: <span className="font-semibold text-eid-fg">{sp.q}</span>
          </p>
        ) : null}

        <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
          <div className={dashboardSectionHead}>
            <div className="flex items-center gap-1.5">
              <h2 className={sectionTitleClass}>Confrontos próximos</h2>
              <EidSectionInfo sectionLabel="Confrontos próximos">
                Destaques em <strong>individual</strong>, <strong>dupla</strong> e <strong>time</strong> pelo seu esporte
                principal e proximidade.
              </EidSectionInfo>
            </div>
            <a href={matchHref} className={sectionActionClass}>
              Ver todos
            </a>
          </div>
          <div className={dashboardSectionBody}>
          {atletaMaisProximo || duplaMaisProxima || timeMaisProximo ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {atletaMaisProximo
                ? (() => {
                    const { row, p } = atletaMaisProximo;
                const atletaAmistosoOn = computeDisponivelAmistosoEffective(
                  p?.disponivel_amistoso,
                  p?.disponivel_amistoso_ate
                );
                return (
                <Link
                  key={p?.id ?? "atleta-individual"}
                  href={`/perfil/${encodeURIComponent(String(p?.id ?? ""))}?from=/dashboard`}
                  className={dashboardSpotlightLink}
                >
                  <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(p?.nome)}</p>
                  <div className="relative mx-auto h-12 w-12">
                    {p?.avatar_url ? (
                      <Image
                        src={p.avatar_url}
                        alt=""
                        fill
                        unoptimized
                        className={`h-full w-full rounded-full border-2 object-cover ${
                          atletaAmistosoOn ? "border-emerald-400/80" : "border-red-500/80"
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full border-2 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] ${
                          atletaAmistosoOn ? "border-emerald-400/75" : "border-red-500/75"
                        }`}
                      >
                        {iniciais(p?.nome)}
                      </div>
                    )}
                    <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                      <EidSealPill value={Number(row.nota_eid ?? 0)} variant="compact" />
                    </div>
                  </div>
                  <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                    <SportGlyphIcon sportName={esporteCardNome} />
                    <span className="truncate">{esporteCardNome}</span>
                  </p>
                  <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                    <ModalidadeGlyphIcon modalidade="individual" />
                    Individual
                  </p>
                </Link>
                );
                  })()
                : (
                  <div className={dashboardSpotlightEmpty}>
                    <p className="text-[11px] font-semibold text-eid-fg">Individual</p>
                    <p className="mt-1 max-w-[5.5rem] text-[9px] leading-snug text-eid-text-secondary">Sem sugestão no momento</p>
                  </div>
                )}

              {duplaMaisProxima ? (
                <Link
                  href={`/perfil-time/${duplaMaisProxima.t.id}?from=/dashboard`}
                  className={dashboardSpotlightLink}
                >
                  <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(duplaMaisProxima.t.nome)}</p>
                  <div className="relative mx-auto h-12 w-12">
                    {duplaMaisProxima.t.escudo ? (
                      <Image
                        src={duplaMaisProxima.t.escudo}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]">
                        D
                      </div>
                    )}
                    <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                      <EidSealPill value={Number(duplaMaisProxima.t.eid_time ?? 0)} variant="compact" />
                    </div>
                  </div>
                  <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                    <SportGlyphIcon
                      sportName={String(
                        firstOf(duplaMaisProxima.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ?? "Esporte"
                      )}
                    />
                    <span className="truncate">
                      {String(firstOf(duplaMaisProxima.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ?? "Esporte")}
                    </span>
                  </p>
                  <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                    <ModalidadeGlyphIcon modalidade="dupla" />
                    Dupla
                  </p>
                </Link>
              ) : (
                <div className={dashboardSpotlightEmpty}>
                  <p className="text-[11px] font-semibold text-eid-fg">Dupla</p>
                  <p className="mt-1 max-w-[5.5rem] text-[9px] leading-snug text-eid-text-secondary">Sem sugestão no momento</p>
                </div>
              )}

              {timeMaisProximo ? (
                <Link
                  href={`/perfil-time/${timeMaisProximo.t.id}?from=/dashboard`}
                  className={dashboardSpotlightLink}
                >
                  <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(timeMaisProximo.t.nome)}</p>
                  <div className="relative mx-auto h-12 w-12">
                    {timeMaisProximo.t.escudo ? (
                      <Image
                        src={timeMaisProximo.t.escudo}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]">
                        T
                      </div>
                    )}
                    <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                      <EidSealPill value={Number(timeMaisProximo.t.eid_time ?? 0)} variant="compact" />
                    </div>
                  </div>
                  <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                    <SportGlyphIcon
                      sportName={String(
                        firstOf(timeMaisProximo.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ?? "Esporte"
                      )}
                    />
                    <span className="truncate">
                      {String(firstOf(timeMaisProximo.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ?? "Esporte")}
                    </span>
                  </p>
                  <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                    <ModalidadeGlyphIcon modalidade="time" />
                    Time
                  </p>
                </Link>
              ) : (
                <div className={dashboardSpotlightEmpty}>
                  <p className="text-[11px] font-semibold text-eid-fg">Time</p>
                  <p className="mt-1 max-w-[5.5rem] text-[9px] leading-snug text-eid-text-secondary">Sem sugestão no momento</p>
                </div>
              )}
            </div>
          ) : (
            <div className={dashboardEmptyWide}>
              <p className="text-sm font-semibold text-eid-fg">Nada por aqui ainda</p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
                {q
                  ? "Nenhum resultado para a busca atual. Tente outro termo ou explore o radar."
                  : "Quando houver sugestões no seu esporte principal, elas aparecem nesta grade."}
              </p>
            </div>
          )}
          </div>
        </section>

        {canSeeTorneios ? (
        <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
          <div className={dashboardSectionHead}>
            <div className="flex items-center gap-1.5">
              <h2 className={sectionTitleClass}>Sugestões de torneios</h2>
              <EidSectionInfo sectionLabel="Sugestões de torneios">
                Inscrições <strong>abertas</strong>, filtradas pelo seu esporte e pela <strong>distância</strong> da sua
                localização.
              </EidSectionInfo>
            </div>
            <Link href="/torneios" className={sectionActionClass}>
              Explorar
            </Link>
          </div>
          <div className={dashboardSectionBody}>
          {torneiosFiltrados.length > 0 ? (
            <div className={scrollRow}>
              {torneiosFiltrados.map((t) => (
                <Link
                  key={t.id}
                  href={`/torneios/${t.id}?from=/dashboard`}
                  className={dashboardRailTorneio}
                >
                  <div className="relative h-[100px] w-full overflow-hidden bg-[color-mix(in_srgb,var(--eid-surface)_90%,var(--eid-primary-500)_10%)]">
                    {t.banner ? (
                      <div className="relative h-full w-full">
                        <Image src={t.banner} alt="" fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-0.5">
                        <IconTorneioCard className="h-8 w-8 text-[color:color-mix(in_srgb,var(--eid-fg)_35%,var(--eid-primary-500)_65%)] opacity-80" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Torneio</span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-eid-bg/80 to-transparent" aria-hidden />
                  </div>
                  <p className="border-t border-transparent px-3 py-2.5 text-[11px] font-bold leading-snug text-eid-fg sm:text-xs sm:font-extrabold">
                    {t.nome}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className={dashboardEmptyWide}>
              <p className="text-sm font-semibold text-eid-fg">Sem torneios na lista</p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
                {q
                  ? "Nada encontrado para essa busca. Ajuste o termo ou abra a lista completa."
                  : "Não há competições com inscrição aberta no seu esporte agora. Volte mais tarde ou explore todos os torneios."}
              </p>
            </div>
          )}
          </div>
        </section>
        ) : null}

        <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
          <div className={dashboardSectionHead}>
            <div className="flex items-center gap-1.5">
              <h2 className={sectionTitleClass}>Vagas para equipes</h2>
              <EidSectionInfo sectionLabel="Vagas para equipes">
                <strong>Duplas e times</strong> com vagas abertas, ordenados por proximidade e pelos esportes do seu perfil.
              </EidSectionInfo>
            </div>
            <Link href="/times" className={sectionActionClass}>
              Ver todos
            </Link>
          </div>
          <div className={dashboardSectionBody}>
          {timesFiltrados.length > 0 ? (
            <div className={scrollRow}>
              {timesFiltrados.map(({ t, dist }) => (
                <Link
                  key={t.id}
                  href={`/perfil-time/${t.id}?from=/dashboard`}
                  className={`${dashboardSpotlightLink} min-w-[124px] max-w-[124px] shrink-0 snap-start`}
                >
                  <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(t.nome)}</p>
                  <div className="relative mx-auto h-12 w-12">
                    {t.escudo ? (
                      <Image
                        src={t.escudo}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]">
                        {String(t.tipo ?? "").toLowerCase() === "dupla" ? "D" : "T"}
                      </div>
                    )}
                    <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                      <EidSealPill value={Number(t.eid_time ?? 0)} variant="compact" />
                    </div>
                  </div>
                  <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                    <SportGlyphIcon
                      sportName={String(firstOf(t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ?? "Esporte")}
                    />
                    <span className="truncate">{String(firstOf(t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ?? "Esporte")}</span>
                  </p>
                  <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                    <ModalidadeGlyphIcon modalidade={String(t.tipo ?? "").toLowerCase() === "dupla" ? "dupla" : "time"} />
                    {String(t.tipo ?? "").toLowerCase() === "dupla" ? "Dupla" : "Time"}
                  </p>
                  <p className="mt-1 inline-flex items-center justify-center rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-px text-[7px] font-black uppercase tracking-[0.08em] text-eid-action-300">
                    {vagasAbertasLabel(t.tipo, teamRosterMap.get(Number(t.id ?? 0)) ?? null)}
                  </p>
                  {hasMyCoords && dist < 9000 ? (
                    <p className="mt-1 inline-flex min-h-[1.2rem] items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-eid-surface/55 px-2 py-0.5 text-[8px] font-bold tabular-nums text-[color:color-mix(in_srgb,var(--eid-fg)_48%,var(--eid-primary-500)_52%)]">
                      {`${dist.toFixed(1).replace(".", ",")} km`}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className={dashboardEmptyWide}>
              <p className="text-sm font-semibold text-eid-fg">Sem vagas listadas</p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
                {q
                  ? "Nenhuma equipe bate com a busca. Tente outro termo."
                  : "Não encontramos duplas/times com vagas no seu esporte por perto. Atualize o perfil ou volte depois."}
              </p>
            </div>
          )}
          </div>
        </section>

        <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
          <div className={dashboardSectionHead}>
            <div className="flex items-center gap-1.5">
              <h2 className={sectionTitleClass}>Locais na comunidade</h2>
              <EidSectionInfo sectionLabel="Locais na comunidade">
                Locais alinhados ao seu esporte, com preferência para <strong>sócios</strong>,{" "}
                <strong>mensalidade na plataforma</strong> e <strong>reserva paga</strong>.
              </EidSectionInfo>
            </div>
            {canSeeLocais ? (
              <Link href="/locais" className={sectionActionClass}>
                Ver lista
              </Link>
            ) : (
              <span className={sectionActionClass} aria-disabled>
                Em breve
              </span>
            )}
          </div>
          <div className={dashboardSectionBody}>
          {locaisScroll && locaisScroll.length > 0 ? (
            <div className={scrollRow}>
              {locaisScroll.map((loc) => (
                <Link
                  key={loc.id}
                  href={loc.slug ? `/espaco/${loc.slug}` : `/local/${loc.id}?from=/dashboard`}
                  className={dashboardRailLocal}
                >
                  <div className="flex h-[3.25rem] items-center justify-center overflow-hidden rounded-xl border border-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_100%,var(--eid-field-bg)_0%),color-mix(in_srgb,var(--eid-field-bg)_35%,var(--eid-surface)_65%))]">
                    {loc.logo_arquivo ? (
                      <div className="relative h-10 w-full">
                        <Image src={loc.logo_arquivo} alt="" fill unoptimized className="object-contain" />
                      </div>
                    ) : (
                      <IconMapPin className="h-6 w-6 text-eid-primary-500/50" />
                    )}
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-[11px] font-bold leading-snug text-eid-fg">{loc.nome_publico}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-eid-text-secondary">{loc.localizacao}</p>
                  <p className="mt-2 inline-flex items-center text-[9px] font-bold tabular-nums text-[color:color-mix(in_srgb,var(--eid-fg)_52%,var(--eid-primary-500)_48%)]">
                    <span className="mr-1 rounded-md bg-eid-primary-500/12 px-1 py-px text-[8px] font-black uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-primary-500)_45%)]">
                      Dist.
                    </span>
                    {hasMyCoords && loc.dist < 9000 ? `${loc.dist.toFixed(1).replace(".", ",")} km` : "—"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className={dashboardEmptyWide}>
              <p className="text-sm font-semibold text-eid-fg">Nenhum local sugerido</p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
                Ajuste seus esportes no perfil ou cadastre um espaço para aparecer por aqui.
              </p>
            </div>
          )}

          <CadastrarLocalOverlayTrigger
            href="/locais/cadastrar?return_to=/dashboard"
            className="eid-btn-primary mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-xs font-extrabold uppercase tracking-wide active:scale-[0.98] sm:text-sm"
          >
            <IconMapPin className="h-5 w-5 shrink-0 text-[var(--eid-brand-ink)]" />
            Cadastrar local genérico
          </CadastrarLocalOverlayTrigger>
          <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary sm:text-[11px]">
            Qualquer pessoa pode sugerir um espaço. Para ser o responsável oficial, envie documentação pela página do local após criá-lo.
          </p>
          </div>
        </section>
    </div>
  );
}
