import { redirect } from "next/navigation";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchPageShell } from "@/components/match/match-page-shell";
import { MatchRadarApp } from "@/components/match/match-radar-app";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { getEsportesConfrontoCached } from "@/lib/match/esportes-confronto";
import { fetchMatchRadarCards, type RadarTipo, type SortBy } from "@/lib/match/radar-snapshot";
import { safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
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
    .select(
      "id, lat, lng, termos_aceitos_em, perfil_completo, disponivel_amistoso, disponivel_amistoso_ate, match_maioridade_confirmada"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.termos_aceitos_em) redirect("/conta/aceitar-termos");
  if (!me.perfil_completo) redirect("/onboarding");

  const qs = new URLSearchParams();
  if (sp.tipo) qs.set("tipo", sp.tipo);
  if (sp.esporte) qs.set("esporte", sp.esporte);
  if (sp.raio) qs.set("raio", sp.raio);
  if (sp.sort_by) qs.set("sort_by", sp.sort_by);
  if (sp.status) qs.set("status", sp.status);
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

  if (!hasLocation) {
    return (
      <MatchPageShell>
        <header className="mb-3 mt-0.5">
          <div className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-border-subtle)_66%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)_86%)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-primary-500)_72%,var(--eid-fg)_28%)]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,white_22%)] shadow-[0_0_10px_color-mix(in_srgb,var(--eid-primary-500)_52%,transparent)]"
              aria-hidden
            />
            Radar de oponentes
          </div>
          <h1 className="mt-1 text-[1.45rem] font-black tracking-[0.01em] text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%))] bg-clip-text drop-shadow-[0_1px_6px_color-mix(in_srgb,var(--eid-primary-500)_34%,transparent)] sm:text-[1.7rem]">
            Match
          </h1>
          <p className="mt-1.5 max-w-prose text-[11px] leading-relaxed text-eid-text-secondary sm:text-xs">
            Ative a localização para ver atletas e formações perto de você. Depois você filtra esporte, raio e modalidade sem sair da tela.
          </p>
        </header>
        <MatchLocationPrompt hasLocation={false} />
      </MatchPageShell>
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
    <MatchPageShell>
      <MatchRadarApp
        viewerId={user.id}
        initialCards={initialCards}
        esportes={esportes}
        esporteSelecionado={esporteSelecionado}
        initialTipo={tipo}
        initialSortBy={sortBy}
        initialRaio={raio}
        viewerDisponivelAmistoso={viewerAmistosoOn}
        viewerAmistosoExpiresAt={viewerAmistosoExpiresAt}
        showSentBanner={sp.status === "enviado"}
      />
    </MatchPageShell>
  );
}
