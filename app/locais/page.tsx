import Link from "next/link";
import { redirect } from "next/navigation";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { DismissibleSectionIntro } from "@/components/ui/dismissible-section-intro";
import { distanciaKm } from "@/lib/geo/distance-km";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Locais",
  description: "Locais esportivos da comunidade EsporteID",
};

const locaisHeroClass = `eid-locais-hero relative mb-4 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-5 md:mb-6 md:px-6 md:py-6`;

const locaisSearchCardClass =
  "eid-locais-search-card mb-4 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)]";

const locaisSectionOuterClass =
  "eid-locais-section mb-6 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)] sm:mb-8";

const locaisSectionHeadClass =
  "eid-locais-section-head flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-transparent px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const locaisSectionTitleClass =
  "text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400";

const locaisSectionBodyClass = "px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3";

const locaisBadgeGhostClass =
  "inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]";

const locaisHintBlurbClass =
  "mb-6 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_90%,var(--eid-primary-500)_10%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_50%,transparent)] px-3 py-2.5 text-[11px] leading-relaxed text-eid-text-secondary sm:mb-8 sm:text-xs";

const locaisEmptyClass =
  "rounded-2xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_62%,var(--eid-primary-500)_38%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_45%,transparent),transparent)] px-4 py-9 text-center text-sm text-eid-text-secondary ring-1 ring-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)]";

const locaisPaginationWrapClass =
  "eid-locais-pagination mt-8 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] sm:px-4";

const locaisPaginationLinkActiveClass =
  "inline-flex min-h-9 items-center justify-center rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-eid-fg transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]";

const locaisPaginationLinkDisabledClass =
  "pointer-events-none inline-flex min-h-9 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary opacity-45";

type Props = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

type LocalCard = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  localizacao: string | null;
  status: string | null;
  ownership_status: string | null;
  logo_arquivo: string | null;
  aceita_reserva: boolean | null;
  tipo_quadra: string | null;
  lat: string | number | null;
  lng: string | number | null;
};

function localHref(l: LocalCard) {
  return l.slug ? `/espaco/${l.slug}` : `/local/${l.id}?from=/locais`;
}

function localCard(l: LocalCard, dist?: number) {
  return (
    <Link
      key={l.id}
      href={localHref(l)}
      className="group relative block overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_86%,var(--eid-primary-500)_14%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_14px_32px_-18px_rgba(15,23,42,0.45)] ring-1 ring-[color:color-mix(in_srgb,var(--eid-fg)_5%,transparent)] transition duration-200 hover:-translate-y-[2px] hover:border-eid-primary-500/45 hover:shadow-[0_20px_40px_-22px_rgba(37,99,235,0.35)] active:translate-y-0"
    >
      <div className="flex h-28 items-center justify-center bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_100%,var(--eid-field-bg)_0%),color-mix(in_srgb,var(--eid-field-bg)_32%,var(--eid-surface)_68%))] sm:h-32">
        {l.logo_arquivo ? (
          <img src={l.logo_arquivo} alt="" className="max-h-[70%] max-w-[78%] object-contain transition duration-300 group-hover:scale-[1.04]" />
        ) : (
          <span className="text-3xl font-black text-eid-primary-500/30">EID</span>
        )}
      </div>
      <div className="space-y-2 border-t border-[color:var(--eid-border-subtle)] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_10%,transparent)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-eid-primary-300">
            {l.status ?? "Ativo"}
          </span>
          <span className="rounded-full border border-[color:color-mix(in_srgb,var(--eid-action-500)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-action-500)_10%,transparent)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-eid-action-400">
            {l.ownership_status === "verificado" ? "Verificado" : "Genérico"}
          </span>
          {l.aceita_reserva ? (
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-200">
              Reserva
            </span>
          ) : null}
          {l.tipo_quadra ? (
            <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-0.5 text-[9px] font-bold uppercase text-eid-text-secondary">
              {l.tipo_quadra}
            </span>
          ) : null}
          {Number.isFinite(dist) && (dist ?? 0) < 9000 ? (
            <span className="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-eid-surface/55 px-2 py-0.5 text-[9px] font-bold tabular-nums uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_52%,var(--eid-primary-500)_48%)]">
              <span className="mr-1 text-[8px] font-black text-eid-text-secondary">Dist.</span>
              {Number(dist).toFixed(1).replace(".", ",")} km
            </span>
          ) : null}
        </div>
        <p className="text-base font-bold text-eid-fg transition group-hover:text-eid-primary-300">{l.nome_publico}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-eid-text-secondary">{l.localizacao ?? "Endereço não informado"}</p>
        <p className="pt-0.5 text-[10px] font-bold uppercase tracking-wide text-eid-action-500 transition group-hover:text-eid-action-400">
          Abrir local →
        </p>
      </div>
    </Link>
  );
}

export default async function LocaisPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 12;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/locais");
  const featureCfg = await getSystemFeatureConfig(supabase);
  if (!canAccessSystemFeature(featureCfg, "locais", user.id)) {
    redirect("/dashboard");
  }

  const [{ data: profile }, { data: locaisRaw }] = await Promise.all([
    supabase.from("profiles").select("lat, lng, localizacao").eq("id", user.id).maybeSingle(),
    supabase
      .from("espacos_genericos")
      .select("id, slug, nome_publico, localizacao, status, ownership_status, logo_arquivo, aceita_reserva, tipo_quadra, lat, lng")
      .eq("ativo_listagem", true)
      .order("id", { ascending: false }),
  ]);

  const myLat = Number(profile?.lat ?? NaN);
  const myLng = Number(profile?.lng ?? NaN);
  const hasCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const locais = (locaisRaw ?? []) as LocalCard[];
  const locaisComDist = locais.map((l) => {
    const lat = Number(l.lat ?? NaN);
    const lng = Number(l.lng ?? NaN);
    const dist = hasCoords ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { l, dist };
  });

  const locaisFiltrados = locaisComDist.filter(({ l }) => {
    if (!q) return true;
    return String(l.nome_publico ?? "").toLowerCase().includes(q) || String(l.localizacao ?? "").toLowerCase().includes(q);
  });
  locaisFiltrados.sort((a, b) => a.dist - b.dist);

  const [{ data: sociosRows }, { data: meuEspacoRows }, { data: reservasPagasRows }, { data: visitanteRows }] = await Promise.all([
    supabase.from("espaco_socios").select("espaco_generico_id").eq("usuario_id", user.id).eq("status", "ativo"),
    supabase.from("espacos_genericos").select("id").eq("responsavel_usuario_id", user.id),
    supabase
      .from("reservas_quadra")
      .select("espaco_generico_id")
      .eq("usuario_solicitante_id", user.id)
      .eq("tipo_reserva", "paga")
      .in("status_reserva", ["confirmada", "agendada"]),
    supabase.from("espaco_reserva_participantes").select("reserva_quadra_id").eq("usuario_id", user.id),
  ]);

  const visitanteReservaIds = [...new Set((visitanteRows ?? []).map((v) => Number(v.reserva_quadra_id ?? 0)).filter((id) => id > 0))];
  const { data: visitanteReservas } = visitanteReservaIds.length
    ? await supabase.from("reservas_quadra").select("espaco_generico_id").in("id", visitanteReservaIds)
    : { data: [] as Array<{ espaco_generico_id: number | null }> };

  const meusLocaisIds = new Set<number>(
    [
      ...(sociosRows ?? []).map((r) => Number(r.espaco_generico_id ?? 0)),
      ...(meuEspacoRows ?? []).map((r) => Number(r.id ?? 0)),
    ].filter((id) => id > 0)
  );
  const frequentesIds = new Set<number>(
    [
      ...(sociosRows ?? []).map((r) => Number(r.espaco_generico_id ?? 0)),
      ...(reservasPagasRows ?? []).map((r) => Number(r.espaco_generico_id ?? 0)),
      ...(visitanteReservas ?? []).map((r) => Number(r.espaco_generico_id ?? 0)),
    ].filter((id) => id > 0)
  );

  const meusLocais = locaisComDist.filter(({ l }) => meusLocaisIds.has(l.id)).sort((a, b) => a.dist - b.dist).slice(0, 12);
  const sugestoesProximas = locaisFiltrados.filter(({ l }) => !meusLocaisIds.has(l.id)).slice(0, 12);
  const locaisFrequentes = locaisComDist.filter(({ l }) => frequentesIds.has(l.id)).sort((a, b) => a.dist - b.dist).slice(0, 12);

  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const listaPaginada = locaisFiltrados.slice(from, to);
  const count = locaisFiltrados.length;
  const hasPrev = page > 1;
  const hasNext = page * pageSize < count;
  const queryBase = `q=${encodeURIComponent(sp.q ?? "")}`;

  return (
    <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col" data-eid-locais-page>
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(48vh,26rem)] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.11),transparent_55%)]"
        aria-hidden
      />
      <main
        data-eid-touch-ui
        className="relative z-[1] mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+0.75rem)] sm:px-6 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
      >
        <header className={locaisHeroClass}>
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400">Guia de locais</p>
              <h1 className="mt-1 text-xl font-black leading-tight tracking-tight text-eid-fg md:text-3xl">
                Locais esportivos perto de você
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-eid-text-secondary md:text-sm">
                Encontre locais por proximidade, veja seus vínculos e escolha onde reservar com mais rapidez.
              </p>
            </div>
            <div className="flex max-w-sm shrink-0 flex-col gap-2">
              <CadastrarLocalOverlayTrigger className="eid-btn-primary flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide">
                Cadastrar local genérico
              </CadastrarLocalOverlayTrigger>
              <p className="text-[10px] leading-relaxed text-eid-text-secondary sm:text-[11px]">
                Para cadastrar um <span className="font-semibold text-eid-fg">local oficial (proprietário)</span>, crie um
                novo cadastro como dono de espaço e solicite aprovação.
              </p>
            </div>
          </div>
        </header>

        <div className={locaisSearchCardClass}>
          <div className={locaisSectionHeadClass}>
            <h2 className={locaisSectionTitleClass}>Buscar na lista</h2>
            <span className={locaisBadgeGhostClass}>Nome ou endereço</span>
          </div>
          <div className={locaisSectionBodyClass}>
            <form>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <LocalAutocompleteInput
                  name="q"
                  defaultValue={sp.q ?? ""}
                  placeholder="Buscar locais perto de você (nome ou endereço)..."
                  minChars={3}
                  className="eid-input-dark h-14 w-full flex-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-4 text-base text-eid-fg placeholder:text-eid-text-secondary/80 sm:h-12"
                />
                <button
                  type="submit"
                  className="eid-btn-primary h-10 shrink-0 rounded-xl px-4 text-xs font-extrabold uppercase tracking-wide sm:h-11 sm:min-w-[112px] sm:px-5 sm:text-sm"
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        <DismissibleSectionIntro storageKey="locais:hint-ordenacao-proximidade" className={locaisHintBlurbClass}>
          {hasCoords
            ? "Resultados ordenados por proximidade da sua localização."
            : "Defina sua localização no perfil para priorizar locais próximos de você."}
        </DismissibleSectionIntro>

        <section>
          <div className={locaisSectionOuterClass}>
            <div className={locaisSectionHeadClass}>
              <h2 className={locaisSectionTitleClass}>Meus locais</h2>
              {meusLocais.length > 0 ? (
                <span className={locaisBadgeGhostClass}>{meusLocais.length} vínculo(s)</span>
              ) : null}
            </div>
            <div className={locaisSectionBodyClass}>
              {meusLocais.length ? (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {meusLocais.map(({ l, dist }) => localCard(l, dist))}
                </div>
              ) : (
                <p className={locaisEmptyClass}>Você ainda não tem locais vinculados como membro/sócio.</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className={locaisSectionOuterClass}>
            <div className={locaisSectionHeadClass}>
              <h2 className={locaisSectionTitleClass}>Sugestões próximas</h2>
              {sugestoesProximas.length > 0 ? (
                <span className={locaisBadgeGhostClass}>{sugestoesProximas.length} local(is)</span>
              ) : null}
            </div>
            <div className={locaisSectionBodyClass}>
              {sugestoesProximas.length ? (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {sugestoesProximas.map(({ l, dist }) => localCard(l, dist))}
                </div>
              ) : (
                <p className={locaisEmptyClass}>Não encontramos sugestões para seu filtro atual.</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className={locaisSectionOuterClass}>
            <div className={locaisSectionHeadClass}>
              <h2 className={locaisSectionTitleClass}>Locais frequentes</h2>
              {locaisFrequentes.length > 0 ? (
                <span className={locaisBadgeGhostClass}>{locaisFrequentes.length} no histórico</span>
              ) : null}
            </div>
            <div className={locaisSectionBodyClass}>
              <DismissibleSectionIntro
                storageKey="locais:frequentes-explicacao"
                className="mb-3 rounded-lg border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,var(--eid-primary-500)_12%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_42%,transparent)] px-3 py-2 text-[10px] leading-relaxed text-eid-text-secondary sm:text-[11px]"
              >
                Considera histórico como sócio/membro, reserva paga e participação como visitante.
              </DismissibleSectionIntro>
              {locaisFrequentes.length ? (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {locaisFrequentes.map(({ l, dist }) => localCard(l, dist))}
                </div>
              ) : (
                <p className={locaisEmptyClass}>Ainda não há histórico suficiente para montar seus locais frequentes.</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className={`${locaisSectionOuterClass} mb-2`}>
            <div className={locaisSectionHeadClass}>
              <h2 className={locaisSectionTitleClass}>Todos os locais</h2>
              <span className={locaisBadgeGhostClass}>
                {count} total{q ? " · filtrado" : ""}
              </span>
            </div>
            <div className={locaisSectionBodyClass}>
              {q ? (
                <p className="mb-4 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-border-subtle)_78%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-3 py-2.5 text-[11px] text-eid-text-secondary sm:text-xs">
                  Busca ativa: <span className="font-bold text-eid-fg">{sp.q}</span>
                </p>
              ) : null}
              {listaPaginada.length ? (
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {listaPaginada.map(({ l, dist }) => localCard(l, dist))}
                </div>
              ) : (
                <div className={locaisEmptyClass}>
                  <p className="text-sm">Nenhum local encontrado para esse filtro.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className={locaisPaginationWrapClass}>
          <Link
            href={`/locais?${queryBase}&page=${page - 1}`}
            aria-disabled={!hasPrev}
            className={hasPrev ? locaisPaginationLinkActiveClass : locaisPaginationLinkDisabledClass}
          >
            ← Anterior
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Página {page}</span>
          <Link
            href={`/locais?${queryBase}&page=${page + 1}`}
            aria-disabled={!hasNext}
            className={hasNext ? locaisPaginationLinkActiveClass : locaisPaginationLinkDisabledClass}
          >
            Próxima →
          </Link>
        </div>
      </main>
    </div>
  );
}
