import { redirect } from "next/navigation";
import Image from "next/image";
import { RankingFilterBar } from "@/components/ranking/ranking-compact";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { parseRankingSearch, type RankingSearchState } from "@/lib/ranking/ranking-href";
import { isSportRankingEnabled } from "@/lib/sport-capabilities";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { MatchRankingRulesModal } from "@/components/match/match-ranking-rules-modal";
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

export default async function RankingPage({ searchParams }: Props) {
  const spRaw = (await searchParams) ?? {};
  const state = parseRankingSearch(spRaw);
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/ranking");
  const viewerId = user.id;

  const [{ data: me }, { data: meusEsportesRaw }, { data: criados }, { data: membro }, { data: esportesCatalogoRaw }] =
    await Promise.all([
      supabase.from("profiles").select("localizacao, genero").eq("id", viewerId).maybeSingle(),
      supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", viewerId).order("esporte_id", { ascending: true }),
      supabase.from("times").select("id").eq("criador_id", viewerId),
      supabase.from("membros_time").select("time_id").eq("usuario_id", viewerId).eq("status", "ativo"),
      supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
    ]);

  const meusEsportes = (meusEsportesRaw ?? []) as MeuEsporteRow[];
  const esportePrincipalId = meusEsportes[0]?.esporte_id ?? null;
  const generoPerfil = normalizeGeneroRanking((me as { genero?: string | null } | null)?.genero ?? null) || "masculino";
  const generoSelecionado = (state.genero || generoPerfil) as RankingSearchState["genero"];
  const stateComGenero: RankingSearchState = { ...state, genero: generoSelecionado };

  const todosEsportes = (esportesCatalogoRaw ?? [])
    .filter((e): e is { id: number; nome: string | null } => typeof (e as { id?: number }).id === "number" && Number.isFinite((e as { id: number }).id))
    .filter((e) => isSportRankingEnabled(e.nome))
    .map((e) => ({
      id: e.id,
      nome: String(e.nome ?? "").trim() || "Esporte",
    }));

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
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 max-h-[24rem] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.11),transparent_55%)] sm:h-64"
        aria-hidden
      />
      <main className="eid-progressive-enter relative z-[1] mx-auto flex w-full min-w-0 max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] pt-0 sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]">
        <div className={`eid-ranking-hero mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-6 sm:py-5`}>
          <div className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_320px] sm:gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-eid-action-400 sm:text-[13px]">Painel competitivo</p>
              <h1 className="mt-1 text-[18px] font-black leading-none tracking-tight text-eid-fg sm:text-[42px]">Ranking EID</h1>
              <p className="mt-1.5 max-w-[30ch] text-[9px] leading-relaxed text-eid-text-secondary sm:mt-3 sm:max-w-[36ch] sm:text-[18px] sm:leading-relaxed">
                Posições por esporte, modalidade e período. Compare desafios (pontos) ou nota EID.
              </p>
            </div>
            <div className="block justify-self-end" aria-hidden>
              <div className="relative h-[82px] w-[132px] overflow-hidden sm:h-[165px] sm:w-[320px]">
                <Image src="/ranking-podio-alpha.png" alt="" fill unoptimized className="object-contain object-center" />
              </div>
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
          <p className="eid-ranking-empty mt-4 rounded-xl border border-transparent bg-eid-surface/40 p-5 text-center text-sm leading-relaxed text-eid-text-secondary shadow-none">
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
      <MatchRankingRulesModal />
    </div>
  );
}
