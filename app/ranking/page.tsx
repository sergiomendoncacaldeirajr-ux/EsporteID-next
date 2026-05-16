import { redirect } from "next/navigation";
import { LocationPermissionBanner } from "@/components/location/location-permission-banner";
import { NativeShareButton } from "@/components/native/native-share-button";
import { RankingFilterBar } from "@/components/ranking/ranking-compact";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { parseRankingSearch, type RankingSearchState } from "@/lib/ranking/ranking-href";
import { isSportRankingEnabled } from "@/lib/sport-capabilities";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { MatchRankingRulesModal } from "@/components/match/match-ranking-rules-modal";
import { getMatchRankMonthlyLimitPerSport } from "@/lib/app-config/match-rank-monthly-limit";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { EidStreamSection } from "@/components/eid-stream-section";
import { RankingStreamBodySkeleton } from "@/components/loading/ranking-stream-skeletons";
import {
  cidadeDisplayFromProfile,
  normalizeCityHint,
  normalizeGeneroRanking,
  type MeuEsporteRow,
} from "./ranking-page-utils";
import { RankingStreamBody } from "./ranking-stream-body";

export const metadata = {
  title: "Ranking",
  description: "Ranking EsporteID",
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RankingRulesConfigProps = {
  supabase: Awaited<ReturnType<typeof getServerAuth>>["supabase"];
};

export default async function RankingPage({ searchParams }: Props) {
  const spRaw = (await searchParams) ?? {};
  const state = parseRankingSearch(spRaw);
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/ranking");
  const viewerId = user.id;

  const [{ data: me }, { data: meusEsportesRaw }, { data: criados }, { data: membro }, { data: esportesCatalogoRaw }] =
    await Promise.all([
      supabase.from("profiles").select("localizacao, genero, lat, lng").eq("id", viewerId).maybeSingle(),
      supabase
        .from("usuario_eid")
        .select("esporte_id")
        .eq("usuario_id", viewerId)
        .order("esporte_id", { ascending: true })
        .limit(80),
      supabase.from("times").select("id").eq("criador_id", viewerId),
      supabase.from("membros_time").select("time_id").eq("usuario_id", viewerId).eq("status", "ativo"),
      supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
    ]);

  const meusEsportes = (meusEsportesRaw ?? []) as MeuEsporteRow[];
  const esportePrincipalId = meusEsportes[0]?.esporte_id ?? null;
  const generoPerfil = normalizeGeneroRanking((me as { genero?: string | null } | null)?.genero ?? null) || "masculino";
  const generoSelecionado = (state.genero || generoPerfil) as RankingSearchState["genero"];
  const stateComGenero: RankingSearchState = { ...state, genero: generoSelecionado };

  const esportesHabilitadosNoCatalogo = (esportesCatalogoRaw ?? [])
    .filter((e): e is { id: number; nome: string | null } => typeof (e as { id?: number }).id === "number" && Number.isFinite((e as { id: number }).id))
    .filter((e) => isSportRankingEnabled(e.nome))
    .map((e) => ({
      id: e.id,
      nome: String(e.nome ?? "").trim() || "Esporte",
    }));
  const meusEsportesIds = new Set(
    meusEsportes
      .map((r) => Number(r.esporte_id))
      .filter((id) => Number.isFinite(id) && id > 0),
  );
  const todosEsportes = esportesHabilitadosNoCatalogo.filter((e) => meusEsportesIds.has(e.id));

  const allEsporteIds = new Set(todosEsportes.map((e) => e.id));

  const parsedEsporteParam = Number(state.esporte);
  let selectedEsporteId: number | null = null;
  if (Number.isFinite(parsedEsporteParam) && parsedEsporteParam > 0 && allEsporteIds.has(parsedEsporteParam)) {
    selectedEsporteId = parsedEsporteParam;
  } else if (esportePrincipalId != null && allEsporteIds.has(esportePrincipalId)) {
    selectedEsporteId = esportePrincipalId;
  } else {
    selectedEsporteId = todosEsportes[0]?.id ?? null;
  }

  const cidadeDisplay = cidadeDisplayFromProfile(me?.localizacao ?? null);
  const needsCidadeFallback = state.local === "cidade" && !cidadeDisplay;
  const myLat = Number((me as { lat?: unknown } | null)?.lat ?? NaN);
  const myLng = Number((me as { lng?: unknown } | null)?.lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const myTeamIds = new Set<number>();
  for (const r of criados ?? []) {
    if (typeof r.id === "number") myTeamIds.add(r.id);
  }
  for (const r of membro ?? []) {
    const id = Number(r.time_id);
    if (Number.isFinite(id)) myTeamIds.add(id);
  }

  const cityNeedle = state.local === "cidade" ? normalizeCityHint(me?.localizacao ?? null) : "";

  const noCatalogHint = todosEsportes.length === 0;

  return (
    <div className="relative z-0 flex w-full min-w-0 flex-col" data-eid-ranking-page data-eid-touch-ui-compact="true">
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 max-h-[24rem] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.13),transparent_55%),radial-gradient(ellipse_50%_30%_at_80%_0%,rgba(249,115,22,0.07),transparent_60%)] sm:h-64"
        aria-hidden
      />
      <main className="eid-progressive-enter relative z-[1] mx-auto flex w-full min-w-0 max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-content-bottom-pad)+1.5rem)] pt-0 sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[var(--eid-shell-content-bottom-pad)]">
        <div className={`eid-ranking-hero mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-6 sm:py-5`}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-eid-action-500/8 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-eid-primary-500/10 blur-3xl" aria-hidden />
          <div className="absolute right-3 top-3 z-[2]">
            <NativeShareButton
              title="Ranking EID"
              text="Veja o ranking do EsporteID"
              path="/ranking"
              iconOnly
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/75 text-eid-fg shadow-sm backdrop-blur-md transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10"
            />
          </div>
          <div className="relative grid grid-cols-[minmax(0,1fr)_132px] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_320px] sm:gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-eid-action-400 sm:text-[13px]">Painel competitivo</p>
              <h1 className="mt-1 text-[18px] font-black leading-none tracking-tight text-eid-fg sm:text-[42px]">Ranking EID</h1>
              <p className="mt-1.5 max-w-[30ch] text-[9px] leading-relaxed text-eid-text-secondary sm:mt-3 sm:max-w-[36ch] sm:text-[18px] sm:leading-relaxed">
                Posições por esporte, modalidade e período. Compare desafios (pontos) ou nota EID.
              </p>
            </div>
            <div className="justify-self-end" aria-hidden>
              <svg
                viewBox="0 0 160 104"
                className="h-[82px] w-[132px] drop-shadow-[0_8px_18px_rgba(249,115,22,0.26)] sm:h-[165px] sm:w-[320px]"
              >
                <defs>
                  <linearGradient id="rank-panel" x1="14" y1="16" x2="146" y2="92" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--eid-primary-500)" stopOpacity="0.14" />
                    <stop offset="1" stopColor="var(--eid-action-500)" stopOpacity="0.18" />
                  </linearGradient>
                  <linearGradient id="rank-gold" x1="76" y1="18" x2="103" y2="76" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--eid-action-200)" />
                    <stop offset="0.52" stopColor="var(--eid-action-400)" />
                    <stop offset="1" stopColor="var(--eid-action-600)" />
                  </linearGradient>
                  <linearGradient id="rank-blue" x1="36" y1="62" x2="74" y2="90" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--eid-primary-300)" />
                    <stop offset="1" stopColor="var(--eid-primary-600)" />
                  </linearGradient>
                  <filter id="rank-soft-shadow" x="-20%" y="-20%" width="140%" height="150%">
                    <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="rgb(15 23 42)" floodOpacity="0.22" />
                  </filter>
                </defs>
                <rect x="14" y="16" width="132" height="76" rx="18" fill="url(#rank-panel)" />
                <path
                  d="M96 24h17v5c0 10-6 18-16 20M64 24H47v5c0 10 6 18 16 20"
                  fill="none"
                  stroke="var(--eid-action-400)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.82"
                />
                <g filter="url(#rank-soft-shadow)">
                  <rect x="42" y="68" width="34" height="18" rx="6" fill="url(#rank-blue)" />
                  <rect x="73" y="56" width="36" height="30" rx="7" fill="url(#rank-gold)" />
                  <rect x="106" y="72" width="30" height="14" rx="6" fill="var(--eid-action-600)" opacity="0.92" />
                  <path
                    d="M69 22h32v8c0 13-7 24-16 24s-16-11-16-24v-8Z"
                    fill="url(#rank-gold)"
                  />
                  <rect x="80" y="51" width="10" height="12" rx="3" fill="var(--eid-action-500)" />
                  <path d="M72 64h26l4 8H68l4-8Z" fill="var(--eid-action-500)" />
                  <ellipse cx="85" cy="22" rx="18" ry="5" fill="var(--eid-action-200)" />
                  <path
                    d="M78 31c4 2 10 2 14 0"
                    fill="none"
                    stroke="rgba(255,255,255,0.72)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
                <text x="59" y="81" textAnchor="middle" className="fill-white text-[10px] font-black">2</text>
                <text x="91" y="77" textAnchor="middle" className="fill-white text-[12px] font-black">1</text>
                <text x="121" y="82" textAnchor="middle" className="fill-white text-[9px] font-black">3</text>
              </svg>
            </div>
          </div>
        </div>

        <section className="mt-4 md:mt-6">
          <RankingFilterBar
            state={stateComGenero}
            principalEsporteId={esportePrincipalId}
            selectedEsporteId={selectedEsporteId}
            cidadeDisplay={cidadeDisplay}
            needsCidadeFallback={needsCidadeFallback}
            todosEsportes={todosEsportes}
          />
        </section>

        {noCatalogHint ? (
          <p className="eid-ranking-empty mt-4 rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-700)_4%),color-mix(in_srgb,var(--eid-surface)_98%,transparent))] p-5 text-center text-sm leading-relaxed text-eid-text-secondary shadow-[0_8px_28px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
            Nenhum esporte disponível no momento.
          </p>
        ) : (
          <EidStreamSection fallback={<RankingStreamBodySkeleton />}>
            <RankingStreamBody
              supabase={supabase}
              viewerId={viewerId}
              state={state}
              stateComGenero={stateComGenero}
              selectedEsporteId={selectedEsporteId}
              myTeamIds={myTeamIds}
              cityNeedle={cityNeedle}
              todosEsportes={todosEsportes}
              esportePrincipalId={esportePrincipalId}
            />
          </EidStreamSection>
        )}
      </main>
      <EidStreamSection fallback={null}>
        <RankingRulesConfig supabase={supabase} />
      </EidStreamSection>
      <LocationPermissionBanner hasCoords={hasMyCoords} />
    </div>
  );
}

async function RankingRulesConfig({ supabase }: RankingRulesConfigProps) {
  const [limitesMensal, cooldownMeses, pendingLimitRow, autoAprovacaoRow] = await Promise.all([
    getMatchRankMonthlyLimitPerSport(supabase),
    getMatchRankCooldownMeses(supabase),
    supabase.from("app_config").select("value_json").eq("key", "match_rank_pending_result_limit").maybeSingle(),
    supabase.from("app_config").select("value_json").eq("key", "match_resultado_autoaprovacao_horas").maybeSingle(),
  ]);
  const pendingLimit = (() => {
    const v = (pendingLimitRow?.data?.value_json as { limite?: unknown } | null)?.limite;
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 ? Math.min(20, n) : 2;
  })();
  const autoAprovacaoHoras = (() => {
    const v = (autoAprovacaoRow?.data?.value_json as { horas?: unknown } | null)?.horas;
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 ? Math.min(168, n) : 24;
  })();

  return <MatchRankingRulesModal config={{ limitesMensal, cooldownMeses, pendingLimit, autoAprovacaoHoras }} />;
}
