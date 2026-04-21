import { redirect } from "next/navigation";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchRadarApp } from "@/components/match/match-radar-app";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { getEsportesConfrontoCached } from "@/lib/match/esportes-confronto";
import { fetchMatchRadarCards, type RadarTipo, type SortBy } from "@/lib/match/radar-snapshot";

type Search = {
  tipo?: string;
  esporte?: string;
  raio?: string;
  sort_by?: string;
  status?: string;
};

function toTipo(v: string | undefined): RadarTipo {
  return v === "dupla" || v === "time" ? v : "atleta";
}

function toSortBy(v: string | undefined): SortBy {
  return v === "match_ranking_points" ? "match_ranking_points" : "eid_score";
}

function toRaio(v: string | undefined): number {
  const n = Number(v ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(150, Math.round(n)));
}

export default async function MatchPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const sp = (await searchParams) ?? {};
  const tipo = toTipo(sp.tipo);
  const sortBy = toSortBy(sp.sort_by);
  const raio = toRaio(sp.raio);
  const esporteParam = sp.esporte ?? "all";

  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/match");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, lat, lng, termos_aceitos_em, perfil_completo, disponivel_amistoso")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.termos_aceitos_em) redirect("/conta/aceitar-termos");
  if (!me.perfil_completo) redirect("/onboarding");
  const hasLocation = Number.isFinite(Number(me.lat)) && Number.isFinite(Number(me.lng));

  if (!hasLocation) {
    return (
      <main className="mx-auto w-full max-w-lg px-3 py-3 sm:max-w-2xl sm:px-4 sm:py-4">
        <div className="mb-4 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-eid-card via-eid-primary-950/30 to-eid-bg px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">Radar</p>
          <h1 className="mt-1 text-xl font-black text-eid-fg sm:text-2xl">Match</h1>
          <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
            Ative a localização para ver oponentes perto de você. Depois você filtra esporte, raio e modalidade sem sair da tela.
          </p>
        </div>
        <MatchLocationPrompt hasLocation={false} />
      </main>
    );
  }

  const esportes = await getEsportesConfrontoCached();

  const { data: meusEids } = await supabase
    .from("usuario_eid")
    .select("esporte_id")
    .eq("usuario_id", user.id)
    .order("id", { ascending: true })
    .limit(1);
  const esporteDefault = String(meusEids?.[0]?.esporte_id ?? "all");
  const esporteSelecionado = esporteParam === "all" ? esporteDefault : esporteParam;

  const initialCards = await fetchMatchRadarCards(supabase, {
    viewerId: user.id,
    tipo,
    sortBy,
    raio,
    esporteSelecionado,
    lat: Number(me.lat),
    lng: Number(me.lng),
  });

  return (
    <MatchRadarApp
      viewerId={user.id}
      initialCards={initialCards}
      esportes={esportes}
      esporteSelecionado={esporteSelecionado}
      initialTipo={tipo}
      initialSortBy={sortBy}
      initialRaio={raio}
      viewerDisponivelAmistoso={me.disponivel_amistoso !== false}
      showSentBanner={sp.status === "enviado"}
    />
  );
}
