import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MapPin, Navigation, ShieldCheck, Sparkles } from "lucide-react";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import {
  locaisHeroClass,
  locaisMainWideClass,
  locaisPageH1Class,
  locaisPageLeadClass,
  locaisPaginationLinkActiveClass,
  locaisPaginationLinkDisabledClass,
  locaisPaginationWrapClass,
  locaisSearchCardClass,
  locaisSectionBodyClass,
  locaisSectionHeadClass,
  locaisSectionOuterClass,
  locaisSectionTitleClass,
  locaisShellBgGradientClass,
  locaisShellBgRadialClass,
  locaisShellOuterClass,
} from "@/components/locais/locais-ui-tokens";
import { distanciaKm } from "@/lib/geo/distance-km";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Locais",
  description: "Locais esportivos da comunidade EsporteID",
};

type Props = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

type LocalCard = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  localizacao: string | null;
  cidade: string | null;
  uf: string | null;
  status: string | null;
  ownership_status: string | null;
  logo_arquivo: string | null;
  cover_arquivo: string | null;
  aceita_reserva: boolean | null;
  aceita_socios: boolean | null;
  modo_reserva: string | null;
  tipo_quadra: string | null;
  lat: string | number | null;
  lng: string | number | null;
  venue_config_json: unknown;
};

function localHref(l: LocalCard) {
  return l.slug ? `/espaco/${l.slug}` : `/local/${l.id}?from=/locais`;
}

function parseCoord(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function coordFromLocal(l: LocalCard, key: "lat" | "lng") {
  const direct = parseCoord(l[key]);
  if (Number.isFinite(direct)) return direct;
  const cfg = parseJsonRecord(l.venue_config_json);
  const fallback = parseCoord(cfg?.[key]);
  return Number.isFinite(fallback) ? fallback : NaN;
}

function EspacoCard({ l, dist }: { l: LocalCard; dist?: number }) {
  const verified = l.ownership_status === "verificado";
  const isPago = String(l.modo_reserva ?? "").toLowerCase() === "paga";
  const isGratuito = String(l.modo_reserva ?? "").toLowerCase() === "gratuita";
  const temDist = Number.isFinite(dist) && (dist ?? 9999) < 9000;
  const distLabel = temDist
    ? dist! < 1
      ? `${Math.round(dist! * 1000)} m`
      : `${dist!.toFixed(1).replace(".", ",")} km`
    : null;
  const cidadeUf = [l.cidade, l.uf].filter(Boolean).join(" - ") || l.localizacao || null;

  return (
    <Link
      href={localHref(l)}
      className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-eid-primary-500/14 bg-eid-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.62)] transition hover:-translate-y-0.5 hover:border-eid-primary-500/34 hover:shadow-[0_26px_48px_-30px_rgba(37,99,235,0.42)] eid-light:border-eid-primary-500/12 eid-light:bg-white"
    >
      <div className="relative h-32 overflow-hidden bg-[linear-gradient(145deg,var(--eid-brand-ink),color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-brand-ink)),#08111a)]">
        {l.cover_arquivo ? (
          <Image
            src={l.cover_arquivo}
            alt=""
            fill
            unoptimized
            className="object-cover opacity-82 transition duration-300 group-hover:scale-[1.03]"
          />
        ) : l.logo_arquivo ? (
          <Image src={l.logo_arquivo} alt="" fill unoptimized className="object-contain p-5 opacity-25" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,29,46,0.16),rgba(11,29,46,0.88))]" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/14 bg-black/22 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/82 backdrop-blur-sm">
            {verified ? "Local verificado" : "Perfil público"}
          </span>
          {isPago ? (
            <span className="rounded-full border border-eid-action-500/32 bg-eid-action-500/12 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-eid-action-300 backdrop-blur-sm">
              Reserva paga
            </span>
          ) : null}
          {isGratuito ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300 backdrop-blur-sm">
              Associação
            </span>
          ) : null}
        </div>

        {distLabel ? (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-eid-action-500/30 bg-eid-brand-ink/70 px-2.5 py-1 backdrop-blur-sm">
            <Navigation className="h-3 w-3 text-eid-action-300" aria-hidden />
            <span className="text-[9px] font-black tabular-nums text-eid-action-300">{distLabel}</span>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end gap-3">
            <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/16 bg-eid-surface/90 shadow-lg">
              {l.logo_arquivo ? (
                <Image src={l.logo_arquivo} alt="" fill unoptimized className="object-contain p-2" />
              ) : (
                <span className="text-base font-black text-eid-primary-300">
                  {(l.nome_publico ?? "L").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-black text-white transition group-hover:text-eid-primary-100">
                {l.nome_publico ?? "Local sem nome"}
              </p>
              {cidadeUf ? (
                <p className="mt-1 line-clamp-1 text-[11px] font-medium text-white/74">{cidadeUf}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex flex-wrap gap-1.5">
          {l.aceita_socios ? (
            <span className="rounded-full border border-eid-primary-500/24 bg-eid-primary-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-eid-primary-300">
              Aceita sócios
            </span>
          ) : null}
          {l.aceita_reserva ? (
            <span className="rounded-full border border-emerald-500/22 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
              Reserva ativa
            </span>
          ) : null}
          {!l.aceita_socios && !l.aceita_reserva && !verified ? (
            <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">
              Cadastro da comunidade
            </span>
          ) : null}
        </div>

        <div className="min-h-[2.75rem]">
          <p className="line-clamp-2 text-xs leading-relaxed text-eid-text-secondary">
            {l.tipo_quadra
              ? `${l.tipo_quadra} com perfil público e acesso rápido a localização e estrutura.`
              : "Veja o perfil do local, estrutura disponível e canais para reivindicar ou gerenciar a posse oficial."}
          </p>
        </div>

        <div className="mt-auto inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-eid-primary-300 transition group-hover:gap-1.5">
          Abrir perfil
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

export default async function LocaisPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 18;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/locais");

  const [featureCfg, profileGate] = await Promise.all([
    getSystemFeatureConfig(supabase),
    supabase.from("profiles").select("lat, lng, localizacao").eq("id", user.id).maybeSingle(),
  ]);
  if (!canAccessSystemFeature(featureCfg, "locais", user.id, false)) {
    redirect("/dashboard");
  }

  const { data: locaisRaw } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, localizacao, cidade, uf, status, ownership_status, logo_arquivo, cover_arquivo, aceita_reserva, aceita_socios, modo_reserva, tipo_quadra, lat, lng, venue_config_json"
    )
    .eq("ativo_listagem", true)
    .eq("admin_suspenso", false)
    .order("id", { ascending: false });

  const profile = profileGate.data;
  const myLat = Number(profile?.lat ?? NaN);
  const myLng = Number(profile?.lng ?? NaN);
  const hasCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const locais = (locaisRaw ?? []) as LocalCard[];
  const locaisComDist = locais.map((l) => {
    const lat = coordFromLocal(l, "lat");
    const lng = coordFromLocal(l, "lng");
    const dist = hasCoords ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { l, dist };
  });

  const locaisFiltrados = locaisComDist.filter(({ l }) => {
    if (!q) return true;
    return (
      String(l.nome_publico ?? "").toLowerCase().includes(q) ||
      String(l.localizacao ?? "").toLowerCase().includes(q) ||
      String(l.cidade ?? "").toLowerCase().includes(q)
    );
  });
  locaisFiltrados.sort((a, b) => a.dist - b.dist);

  const [{ data: sociosRows }, { data: meuEspacoRows }, { data: reservasPagasRows }, { data: visitanteRows }] =
    await Promise.all([
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

  const visitanteReservaIds = [
    ...new Set((visitanteRows ?? []).map((v) => Number(v.reserva_quadra_id ?? 0)).filter((id) => id > 0)),
  ];
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

  const seusLocaisIds = new Set([...meusLocaisIds, ...frequentesIds]);
  const seusLocais = locaisComDist
    .filter(({ l }) => seusLocaisIds.has(l.id))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6);

  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const listaPaginada = locaisFiltrados.slice(from, to);
  const count = locaisFiltrados.length;
  const hasPrev = page > 1;
  const hasNext = page * pageSize < count;
  const queryBase = `q=${encodeURIComponent(sp.q ?? "")}`;
  const locaisComReserva = locais.filter((local) => Boolean(local.aceita_reserva)).length;
  const locaisComSocios = locais.filter((local) => Boolean(local.aceita_socios)).length;

  return (
    <div className={locaisShellOuterClass} data-eid-locais-page>
      <div className={locaisShellBgGradientClass} aria-hidden />
      <div className={locaisShellBgRadialClass} aria-hidden />
      <main data-eid-touch-ui className={locaisMainWideClass}>
        <section className={locaisHeroClass}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_34%)]" aria-hidden />
          <div className="relative z-[1] flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-eid-primary-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Explorar locais
              </div>
              <h1 className={locaisPageH1Class}>{q ? `Resultado para "${sp.q}"` : "Locais perto de você"}</h1>
              <p className={locaisPageLeadClass}>
                Navegue por perfis públicos, encontre espaços da comunidade e abra cada local com a mesma linguagem premium do ecossistema EsporteID.
              </p>
              {!hasCoords && !q ? (
                <p className="mt-3 text-[11px] font-medium text-white/72 eid-light:text-eid-text-secondary">
                  Defina sua localização no perfil para ordenar por proximidade.
                </p>
              ) : null}
            </div>
            <CadastrarLocalOverlayTrigger className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-eid-action-500/35 bg-eid-action-500/12 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-eid-action-300 transition hover:bg-eid-action-500/18">
              + Cadastrar local
            </CadastrarLocalOverlayTrigger>
          </div>

          <div className="relative z-[1] mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Locais públicos", String(locais.length), "perfis disponíveis agora"],
              ["Com reservas", String(locaisComReserva), "locais com operação aberta"],
              ["Com sócios", String(locaisComSocios), "espaços com comunidade ativa"],
            ].map(([label, value, hint]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-center backdrop-blur-sm eid-light:border-slate-200 eid-light:bg-slate-50/95"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/70 eid-light:text-eid-text-secondary">{label}</p>
                <p className="mt-2 text-3xl font-black text-white eid-light:text-eid-fg">{value}</p>
                <p className="mt-1 text-xs text-white/65 eid-light:text-eid-text-secondary">{hint}</p>
              </div>
            ))}
          </div>
        </section>

        <div className={locaisSearchCardClass}>
          <form className="flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-400">Busca rápida</p>
              <LocalAutocompleteInput
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Buscar por nome, cidade ou endereço…"
                minChars={3}
                className="eid-input-dark h-11 w-full rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-4 text-sm text-eid-fg placeholder:text-eid-text-secondary/80"
              />
            </div>
            <div className="flex gap-2 md:self-end">
              <button
                type="submit"
                className="eid-btn-primary h-11 shrink-0 rounded-2xl px-5 text-[11px] font-extrabold uppercase tracking-wide"
              >
                Buscar
              </button>
              {q ? (
                <Link
                  href="/locais"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--eid-border-subtle)] px-4 text-[11px] font-bold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg"
                >
                  Limpar
                </Link>
              ) : null}
            </div>
          </form>
        </div>

        {seusLocais.length > 0 && !q ? (
          <section className={locaisSectionOuterClass}>
            <div className={locaisSectionHeadClass}>
              <h2 className={locaisSectionTitleClass}>Seus locais</h2>
              <span className="text-[10px] font-bold text-eid-text-secondary">{seusLocais.length} vínculo(s)</span>
            </div>
            <div className={locaisSectionBodyClass}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {seusLocais.map(({ l, dist }) => (
                  <EspacoCard key={l.id} l={l} dist={dist} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className={locaisSectionOuterClass}>
          <div className={locaisSectionHeadClass}>
            <h2 className={locaisSectionTitleClass}>{q ? "Resultados" : "Todos os locais"}</h2>
            <span className="text-[10px] font-bold text-eid-text-secondary">
              {count} local{count !== 1 ? "is" : ""}
              {q ? " encontrado(s)" : ""}
            </span>
          </div>

          <div className={locaisSectionBodyClass}>
            {listaPaginada.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {listaPaginada.map(({ l, dist }) => (
                  <EspacoCard key={l.id} l={l} dist={dist} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 px-4 py-10 text-center">
                <p className="text-sm font-bold text-eid-fg">Nenhum local encontrado{q ? ` para "${sp.q}"` : ""}.</p>
                <p className="mt-1 text-xs text-eid-text-secondary">Tente outro nome ou cadastre um espaço.</p>
              </div>
            )}
          </div>
        </section>

        {hasPrev || hasNext ? (
          <div className={locaisPaginationWrapClass}>
            <Link
              href={`/locais?${queryBase}&page=${page - 1}`}
              aria-disabled={!hasPrev}
              className={hasPrev ? locaisPaginationLinkActiveClass : locaisPaginationLinkDisabledClass}
            >
              ← Anterior
            </Link>
            <span className="text-[10px] font-bold text-eid-text-secondary">
              Página {page} de {Math.ceil(count / pageSize)}
            </span>
            <Link
              href={`/locais?${queryBase}&page=${page + 1}`}
              aria-disabled={!hasNext}
              className={hasNext ? locaisPaginationLinkActiveClass : locaisPaginationLinkDisabledClass}
            >
              Próxima →
            </Link>
          </div>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-eid-primary-500/14 bg-eid-card/92 p-4 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.38)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-400">Comunidade EsporteID</p>
              <p className="mt-1 text-sm font-medium text-eid-text-secondary">
                Não encontrou seu espaço? Cadastre um local genérico e comece a transformar o perfil em presença oficial.
              </p>
            </div>
            <CadastrarLocalOverlayTrigger
              href="/locais/cadastrar?return_to=/locais"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-eid-action-500/35 bg-eid-action-500/12 px-5 text-[11px] font-black uppercase tracking-[0.14em] text-eid-action-300 transition hover:bg-eid-action-500/18"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Cadastrar local
            </CadastrarLocalOverlayTrigger>
          </div>
        </section>
      </main>
    </div>
  );
}
