import { redirect } from "next/navigation";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchPageShell } from "@/components/match/match-page-shell";
import { MatchRadarApp } from "@/components/match/match-radar-app";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { getEsportesConfrontoCached } from "@/lib/match/esportes-confronto";
import {
  fetchMatchRadarCards,
  type MatchRadarFinalidade,
  type RadarTipo,
  type SortBy,
} from "@/lib/match/radar-snapshot";
import { safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import {
  computeDisponivelAmistosoEffective,
  expireDisponivelAmistosoProfileIfNeeded,
} from "@/lib/perfil/disponivel-amistoso";

type Search = {
  tipo?: string;
  esporte?: string;
  raio?: string;
  sort_by?: string;
  status?: string;
  finalidade?: string;
  view?: string;
  genero?: string;
};

type RadarViewMode = "full" | "grid";
type RadarGeneroFiltro = "all" | "masculino" | "feminino" | "outro";

function toTipo(v: string | undefined): RadarTipo {
  return v === "dupla" || v === "time" ? v : "atleta";
}

function toSortBy(v: string | undefined): SortBy {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "eid_score") return "eid_score";
  return "match_ranking_points";
}

function toRaio(v: string | undefined): number {
  const n = Number(v ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(150, Math.round(n)));
}

function toMatchFinalidade(v: string | undefined): MatchRadarFinalidade {
  return String(v ?? "").trim().toLowerCase() === "amistoso" ? "amistoso" : "ranking";
}

function toViewMode(v: string | undefined): RadarViewMode {
  return String(v ?? "").trim().toLowerCase() === "grid" ? "grid" : "full";
}

function toGeneroFiltro(v: string | undefined, perfilGenero: string | null | undefined): RadarGeneroFiltro {
  const raw = String(v ?? "").trim().toLowerCase();
  if (raw === "masculino" || raw === "feminino" || raw === "outro" || raw === "all") return raw;
  const g = String(perfilGenero ?? "").trim().toLowerCase();
  if (g === "masculino") return "masculino";
  if (g === "feminino") return "feminino";
  if (g) return "outro";
  return "all";
}

export default async function MatchPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const sp = (await searchParams) ?? {};
  const tipo = toTipo(sp.tipo);
  const matchFinalidade = toMatchFinalidade(sp.finalidade);
  const initialView = toViewMode(sp.view);
  if (initialView !== "full" && matchFinalidade === "amistoso" && tipo !== "atleta") {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string" && v.length > 0) q.set(k, v);
    }
    q.set("tipo", "atleta");
    q.set("finalidade", "amistoso");
    redirect(`/match?${q.toString()}`);
  }
  const sortBy = toSortBy(sp.sort_by);
  const raio = toRaio(sp.raio);
  const esporteParam = sp.esporte ?? "all";

  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/match");

  const { data: me } = await supabase
    .from("profiles")
    .select(
      `id, lat, lng, genero, perfil_completo, disponivel_amistoso, disponivel_amistoso_ate, match_maioridade_confirmada, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!me || !legalAcceptanceIsCurrent(me)) redirect("/conta/aceitar-termos");
  if (!me.perfil_completo) redirect("/onboarding");

  const qs = new URLSearchParams();
  if (sp.tipo) qs.set("tipo", sp.tipo);
  if (sp.esporte) qs.set("esporte", sp.esporte);
  if (sp.raio) qs.set("raio", sp.raio);
  if (sp.sort_by) qs.set("sort_by", sp.sort_by);
  if (sp.status) qs.set("status", sp.status);
  if (sp.finalidade) qs.set("finalidade", sp.finalidade);
  const matchNext = safeNextInternalPath(qs.toString() ? `/match?${qs}` : "/match");
  if (!(me as { match_maioridade_confirmada?: boolean }).match_maioridade_confirmada) {
    redirect(`/conta/confirmar-maioridade-match?next=${encodeURIComponent(matchNext)}`);
  }
  await expireDisponivelAmistosoProfileIfNeeded(supabase, user.id);
  const { data: meAm } = await supabase
    .from("profiles")
    .select("disponivel_amistoso, disponivel_amistoso_ate")
    .eq("id", user.id)
    .maybeSingle();
  const viewerAmistosoOn = computeDisponivelAmistosoEffective(
    meAm?.disponivel_amistoso ?? me.disponivel_amistoso,
    meAm?.disponivel_amistoso_ate ?? me.disponivel_amistoso_ate
  );
  const viewerAmistosoExpiresAt =
    viewerAmistosoOn && (meAm?.disponivel_amistoso_ate ?? me.disponivel_amistoso_ate)
      ? String(meAm?.disponivel_amistoso_ate ?? me.disponivel_amistoso_ate)
      : null;
  const hasLocation = Number.isFinite(Number(me.lat)) && Number.isFinite(Number(me.lng));
  const [{ data: meusTimesCriados }, { data: minhasMembRows }] = await Promise.all([
    supabase.from("times").select("id, tipo").eq("criador_id", user.id),
    supabase.from("membros_time").select("time_id").eq("usuario_id", user.id).eq("status", "ativo"),
  ]);
  const meusTimesMembroIds = (minhasMembRows ?? []).map((r) => Number((r as { time_id: number }).time_id)).filter((n) => Number.isFinite(n) && n > 0);
  const { data: meusTimesMembro } =
    meusTimesMembroIds.length > 0
      ? await supabase.from("times").select("id, tipo").in("id", meusTimesMembroIds)
      : { data: [] as Array<{ id: number; tipo: string | null }> };
  const allViewerTimes = [...(meusTimesCriados ?? []), ...(meusTimesMembro ?? [])];
  const viewerHasDupla = allViewerTimes.some((t) => String((t as { tipo?: string | null }).tipo ?? "").trim().toLowerCase() === "dupla");
  const viewerHasTime = allViewerTimes.some((t) => String((t as { tipo?: string | null }).tipo ?? "").trim().toLowerCase() === "time");

  if (!hasLocation) {
    return (
      <MatchPageShell fullBleed={initialView === "full"}>
        <header
          className={`eid-match-hero relative mb-3 mt-0 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative z-[1] space-y-1">
            <div className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
                aria-hidden
              />
              Radar de oponentes
            </div>
            <h1 className="text-[1.35rem] font-black tracking-[0.01em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:text-[1.6rem]">
              Desafio
            </h1>
            <p className="max-w-prose text-[10px] leading-snug text-eid-text-secondary sm:text-[11px]">
              Ative a localização para ver atletas e formações perto de você. Depois você filtra esporte, raio e modalidade sem sair da tela.
            </p>
          </div>
        </header>
        <MatchLocationPrompt hasLocation={false} />
      </MatchPageShell>
    );
  }

  const esportes = await getEsportesConfrontoCached();
  const esporteIdsDisponiveis = new Set(esportes.map((e) => String(e.id)));

  const { data: meusEids } = await supabase
    .from("usuario_eid")
    .select("esporte_id")
    .eq("usuario_id", user.id)
    .order("id", { ascending: true })
    .limit(1);
  const esporteDefaultRaw = String(meusEids?.[0]?.esporte_id ?? "all");
  const esporteDefault =
    esporteDefaultRaw !== "all" && esporteIdsDisponiveis.has(esporteDefaultRaw)
      ? esporteDefaultRaw
      : String(esportes[0]?.id ?? "all");
  const esporteSelecionado =
    esporteParam === "all"
      ? esporteDefault
      : esporteIdsDisponiveis.has(esporteParam)
        ? esporteParam
        : esporteDefault;
  const initialGeneroFiltro = toGeneroFiltro(sp.genero, (me as { genero?: string | null })?.genero ?? null);

  const initialCards =
    initialView === "full"
      ? await (async () => {
          const merged = (
            await Promise.all([
            fetchMatchRadarCards(supabase, {
              viewerId: user.id,
              tipo: "atleta",
              sortBy,
              raio,
              esporteSelecionado,
              lat: Number(me.lat),
              lng: Number(me.lng),
              finalidade: "ranking",
            }),
            fetchMatchRadarCards(supabase, {
              viewerId: user.id,
              tipo: "atleta",
              sortBy,
              raio,
              esporteSelecionado,
              lat: Number(me.lat),
              lng: Number(me.lng),
              finalidade: "amistoso",
            }),
            fetchMatchRadarCards(supabase, {
              viewerId: user.id,
              tipo: "dupla",
              sortBy,
              raio,
              esporteSelecionado,
              lat: Number(me.lat),
              lng: Number(me.lng),
              finalidade: "ranking",
            }),
            fetchMatchRadarCards(supabase, {
              viewerId: user.id,
              tipo: "time",
              sortBy,
              raio,
              esporteSelecionado,
              lat: Number(me.lat),
              lng: Number(me.lng),
              finalidade: "ranking",
            }),
            ])
          ).flat();
          const byKey = new Map<string, (typeof merged)[number]>();
          for (const card of merged) {
            const key = `${card.modalidade}:${card.id}:${card.esporteId}`;
            const prev = byKey.get(key);
            if (!prev) {
              byKey.set(key, card);
              continue;
            }
            if (prev.interesseMatch !== "ranking_e_amistoso" && card.interesseMatch === "ranking_e_amistoso") {
              byKey.set(key, card);
            }
          }
          return Array.from(byKey.values());
        })()
      : await fetchMatchRadarCards(supabase, {
          viewerId: user.id,
          tipo,
          sortBy,
          raio,
          esporteSelecionado,
          lat: Number(me.lat),
          lng: Number(me.lng),
          finalidade: matchFinalidade,
        });
  const initialViewResolved: RadarViewMode =
    initialView === "full" && initialCards.length === 0 ? "grid" : initialView;

  return (
    <MatchPageShell fullBleed={initialViewResolved === "full"}>
      <MatchRadarApp
        viewerId={user.id}
        initialCards={initialCards}
        esportes={esportes}
        esporteSelecionado={esporteSelecionado}
        initialTipo={tipo}
        initialSortBy={sortBy}
        initialRaio={raio}
        initialFinalidade={matchFinalidade}
        initialView={initialViewResolved}
        initialGeneroFiltro={initialGeneroFiltro}
        viewerDisponivelAmistoso={viewerAmistosoOn}
        viewerAmistosoExpiresAt={viewerAmistosoExpiresAt}
        showSentBanner={sp.status === "enviado"}
        viewerHasDupla={viewerHasDupla}
        viewerHasTime={viewerHasTime}
      />
    </MatchPageShell>
  );
}
