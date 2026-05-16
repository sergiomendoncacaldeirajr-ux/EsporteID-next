import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import {
  locaisMainWideClass,
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

// ─── Card Component ──────────────────────────────────────────────────────────

function EspacoCard({ l, dist }: { l: LocalCard; dist?: number }) {
  const verified = l.ownership_status === "verificado";
  const isPago = String(l.modo_reserva ?? "").toLowerCase() === "paga";
  const isGratuito = String(l.modo_reserva ?? "").toLowerCase() === "gratuita";
  const temDist = Number.isFinite(dist) && (dist ?? 9999) < 9000;
  const distLabel = temDist
    ? (dist! < 1
        ? `${Math.round(dist! * 1000)} m`
        : `${dist!.toFixed(1).replace(".", ",")} km`)
    : null;
  const cidadeUf = [l.cidade, l.uf].filter(Boolean).join(" - ") || l.localizacao || null;

  return (
    <Link
      href={localHref(l)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-sm transition hover:border-eid-primary-500/40 hover:shadow-[0_4px_20px_-8px_rgba(37,99,235,0.18)]"
    >
      {/* Photo header */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-eid-primary-900/30 to-eid-brand-ink">
        {l.cover_arquivo ? (
          <Image
            src={l.cover_arquivo}
            alt=""
            fill
            unoptimized
            className="object-cover opacity-80 transition duration-300 group-hover:scale-105"
          />
        ) : l.logo_arquivo ? (
          <Image
            src={l.logo_arquivo}
            alt=""
            fill
            unoptimized
            className="object-contain p-4 opacity-30"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-8 w-8 text-eid-primary-500/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-eid-brand-ink/70 via-transparent to-transparent" />

        {/* Logo circle */}
        {l.logo_arquivo && (
          <div className="absolute bottom-3 left-3 h-10 w-10 overflow-hidden rounded-xl border-2 border-white/15 bg-eid-card shadow-lg">
            <Image src={l.logo_arquivo} alt="" fill unoptimized className="object-cover" />
          </div>
        )}

        {/* Distance badge */}
        {distLabel && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full border border-eid-action-500/30 bg-eid-brand-ink/70 px-2 py-0.5 backdrop-blur-sm">
            <Navigation className="h-2.5 w-2.5 text-eid-action-300" />
            <span className="text-[9px] font-black tabular-nums text-eid-action-300">{distLabel}</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-1 text-sm font-black text-eid-fg transition group-hover:text-eid-primary-200">
          {l.nome_publico ?? "Local sem nome"}
        </p>
        {cidadeUf && (
          <p className="line-clamp-1 text-[11px] text-eid-text-secondary">{cidadeUf}</p>
        )}

        {/* Badges */}
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {isPago && (
            <span className="rounded-full border border-eid-action-500/30 bg-eid-action-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-eid-action-300">
              Reservas pagas
            </span>
          )}
          {isGratuito && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">
              Reservas grátis
            </span>
          )}
          {l.aceita_socios && (
            <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-eid-primary-300">
              Aceitando sócios
            </span>
          )}
          {verified && (
            <span className="rounded-full border border-eid-action-500/25 bg-eid-action-500/8 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-eid-action-400">
              Verificado
            </span>
          )}
          {!verified && !isPago && !isGratuito && !l.aceita_socios && (
            <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-0.5 text-[9px] font-bold text-eid-text-secondary">
              Genérico
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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

  return (
    <div className={locaisShellOuterClass} data-eid-locais-page>
      <div className={locaisShellBgGradientClass} aria-hidden />
      <div className={locaisShellBgRadialClass} aria-hidden />
      <main data-eid-touch-ui className={locaisMainWideClass}>

        {/* Page header */}
        <div className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400">Locais esportivos</p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight text-eid-fg md:text-2xl">
                {q ? `Resultado para "${sp.q}"` : "Locais perto de você"}
              </h1>
              {!hasCoords && !q ? (
                <p className="mt-1 text-[11px] text-eid-text-secondary">
                  Defina sua localização no perfil para ordenar por proximidade.
                </p>
              ) : null}
            </div>
            <CadastrarLocalOverlayTrigger className="eid-btn-primary flex min-h-[40px] shrink-0 items-center justify-center rounded-xl px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-wide">
              + Cadastrar local
            </CadastrarLocalOverlayTrigger>
          </div>

          {/* Search */}
          <form className="mt-3 flex gap-2">
            <LocalAutocompleteInput
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Buscar por nome, cidade ou endereço…"
              minChars={3}
              className="eid-input-dark h-11 w-full flex-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-4 text-sm text-eid-fg placeholder:text-eid-text-secondary/80"
            />
            <button
              type="submit"
              className="eid-btn-primary h-11 shrink-0 rounded-xl px-5 text-[11px] font-extrabold uppercase tracking-wide"
            >
              Buscar
            </button>
            {q ? (
              <Link
                href="/locais"
                className="flex h-11 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-bold text-eid-text-secondary transition hover:text-eid-fg"
              >
                Limpar
              </Link>
            ) : null}
          </form>
        </div>

        {/* Seus locais */}
        {seusLocais.length > 0 && !q ? (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400">Seus locais</h2>
              <span className="text-[9px] font-bold text-eid-text-secondary">{seusLocais.length} vínculo(s)</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {seusLocais.map(({ l, dist }) => (
                <EspacoCard key={l.id} l={l} dist={dist} />
              ))}
            </div>
          </section>
        ) : null}

        {/* All locals */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400">
              {q ? "Resultados" : "Todos os locais"}
            </h2>
            <span className="text-[9px] font-bold text-eid-text-secondary">
              {count} local{count !== 1 ? "is" : ""}
              {q ? " encontrado(s)" : ""}
            </span>
          </div>

          {listaPaginada.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {listaPaginada.map(({ l, dist }) => (
                <EspacoCard key={l.id} l={l} dist={dist} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 px-4 py-10 text-center">
              <p className="text-sm font-bold text-eid-fg">Nenhum local encontrado{q ? ` para "${sp.q}"` : ""}.</p>
              <p className="mt-1 text-xs text-eid-text-secondary">
                Tente outro nome ou cadastre um espaço.
              </p>
            </div>
          )}
        </section>

        {/* Pagination */}
        {(hasPrev || hasNext) ? (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2.5">
            <Link
              href={`/locais?${queryBase}&page=${page - 1}`}
              aria-disabled={!hasPrev}
              className={
                hasPrev
                  ? "inline-flex h-9 items-center justify-center rounded-lg border border-eid-primary-500/22 bg-eid-primary-500/8 px-3 text-[10px] font-bold uppercase tracking-wide text-eid-fg transition hover:bg-eid-primary-500/14"
                  : "pointer-events-none inline-flex h-9 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary opacity-40"
              }
            >
              ← Anterior
            </Link>
            <span className="text-[10px] font-bold text-eid-text-secondary">
              Página {page} de {Math.ceil(count / pageSize)}
            </span>
            <Link
              href={`/locais?${queryBase}&page=${page + 1}`}
              aria-disabled={!hasNext}
              className={
                hasNext
                  ? "inline-flex h-9 items-center justify-center rounded-lg border border-eid-primary-500/22 bg-eid-primary-500/8 px-3 text-[10px] font-bold uppercase tracking-wide text-eid-fg transition hover:bg-eid-primary-500/14"
                  : "pointer-events-none inline-flex h-9 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary opacity-40"
              }
            >
              Próxima →
            </Link>
          </div>
        ) : null}

        {/* CTA cadastrar */}
        <div className="mt-6 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-4 text-center">
          <p className="text-[11px] text-eid-text-secondary">
            Não encontrou seu espaço? Cadastre-o e faça parte da rede EsporteID.
          </p>
          <CadastrarLocalOverlayTrigger
            href="/locais/cadastrar?return_to=/locais"
            className="eid-btn-primary mt-3 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-5 text-[11px] font-extrabold uppercase tracking-wide"
          >
            + Cadastrar local genérico
          </CadastrarLocalOverlayTrigger>
        </div>

      </main>
    </div>
  );
}
