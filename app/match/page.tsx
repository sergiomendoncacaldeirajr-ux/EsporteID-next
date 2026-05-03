import { redirect } from "next/navigation";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { MatchPageShell } from "@/components/match/match-page-shell";
import { MatchRadarGridHero } from "@/components/match/match-radar-grid-hero";
import { EidStreamSection } from "@/components/eid-stream-section";
import { MatchRadarBodyStreamSkeleton } from "@/components/loading/match-radar-stream-skeleton";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { MatchStreamRadar } from "./match-stream-radar";
import {
  redirectIfAmistosoViewInvalid,
  toMatchFinalidade,
  toViewMode,
  type MatchPageSearch,
} from "./match-search-params";

export default async function MatchPage({ searchParams }: { searchParams?: Promise<MatchPageSearch> }) {
  const sp = (await searchParams) ?? {};
  redirectIfAmistosoViewInvalid(sp);
  const initialView = toViewMode(sp.view);

  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/match");

  const [gate, { data: me }] = await Promise.all([
    getCachedProfileLegalRow(user.id),
    supabase
      .from("profiles")
      .select("id, lat, lng, genero, disponivel_amistoso, disponivel_amistoso_ate, match_maioridade_confirmada")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (!gate || !legalAcceptanceIsCurrent(gate)) redirect("/conta/aceitar-termos");
  if (!gate.perfil_completo) redirect("/onboarding");
  if (!me) redirect("/onboarding");

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

  const hasLocation = Number.isFinite(Number(me.lat)) && Number.isFinite(Number(me.lng));
  const urlIsGridView = initialView === "grid";
  const viewerAmistosoOn = computeDisponivelAmistosoEffective(me.disponivel_amistoso, me.disponivel_amistoso_ate);
  const viewerAmistosoExpiresAt =
    viewerAmistosoOn && me.disponivel_amistoso_ate ? String(me.disponivel_amistoso_ate) : null;

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

  return (
    <MatchPageShell fullBleed={initialView === "full"}>
      {urlIsGridView ? (
        <MatchRadarGridHero
          viewerId={user.id}
          finalidade={toMatchFinalidade(sp.finalidade)}
          viewerDisponivelAmistoso={viewerAmistosoOn}
          viewerAmistosoExpiresAt={viewerAmistosoExpiresAt}
        />
      ) : null}
      <EidStreamSection
        fallback={<MatchRadarBodyStreamSkeleton variant={initialView === "full" ? "full" : "grid"} />}
      >
        <MatchStreamRadar supabase={supabase} viewerId={user.id} me={me} sp={sp} hideHero={urlIsGridView} />
      </EidStreamSection>
    </MatchPageShell>
  );
}
