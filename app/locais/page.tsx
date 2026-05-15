import Link from "next/link";
import { redirect } from "next/navigation";
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
  status: string | null;
  ownership_status: string | null;
  logo_arquivo: string | null;
  aceita_reserva: boolean | null;
  tipo_quadra: string | null;
  lat: string | number | null;
  lng: string | number | null;
  venue_config_json: unknown;
};

function localHref(l: LocalCard) {
  return l.slug ? `/espaco/${l.slug}` : `/local/${l.id}?from=/locais`;
}

function LocalRow({ l, dist }: { l: LocalCard; dist?: number }) {
  const verified = l.ownership_status === "verificado";
  return (
    <Link
      href={localHref(l)}
      className="group flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2.5 transition hover:border-eid-primary-500/35 hover:bg-[color:color-mix(in_srgb,var(--eid-card)_80%,var(--eid-primary-500)_6%)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/70">
        {l.logo_arquivo ? (
          <img
            src={l.logo_arquivo}
            alt=""
            className="max-h-[80%] max-w-[80%] object-contain transition duration-200 group-hover:scale-105"
          />
        ) : (
          <span className="text-[10px] font-black text-eid-primary-500/35">EID</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-eid-fg transition group-hover:text-eid-primary-300">
          {l.nome_publico}
        </p>
        <p className="truncate text-[11px] leading-snug text-eid-text-secondary">
          {l.localizacao ?? "Endereço não informado"}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {Number.isFinite(dist) && (dist ?? 0) < 9000 ? (
          <span className="text-[9px] font-bold tabular-nums text-eid-text-secondary">
            {Number(dist).toFixed(1).replace(".", ",")} km
          </span>
        ) : null}
        <div className="flex gap-1">
          {l.aceita_reserva ? (
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-emerald-300">
              Reserva
            </span>
          ) : null}
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide ${
              verified
                ? "border-eid-action-500/30 bg-eid-action-500/10 text-eid-action-400"
                : "border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-text-secondary"
            }`}
          >
            {verified ? "Verificado" : "Genérico"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function parseCoord(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function coordFromLocal(l: LocalCard, key: "lat" | "lng") {
  const direct = parseCoord(l[key]);
  if (Number.isFinite(direct)) return direct;
  const cfg = (l.venue_config_json ?? null) as Record<string, unknown> | null;
  const fallback = parseCoord(cfg?.[key]);
  return Number.isFinite(fallback) ? fallback : NaN;
}

export default async function LocaisPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 15;
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
    .select("id, slug, nome_publico, localizacao, status, ownership_status, logo_arquivo, aceita_reserva, tipo_quadra, lat, lng, venue_config_json")
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
      String(l.localizacao ?? "").toLowerCase().includes(q)
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
    .slice(0, 12);

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
              placeholder="Buscar por nome ou endereço…"
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

        {/* Seus locais (only when non-empty and no search active) */}
        {seusLocais.length > 0 && !q ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-700)_4%),color-mix(in_srgb,var(--eid-surface)_98%,transparent))] shadow-[0_8px_28px_-16px_rgba(15,23,42,0.4)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.045)] px-4 py-2.5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400">Seus locais</h2>
              <span className="text-[9px] font-bold text-eid-text-secondary">{seusLocais.length} vínculo(s)</span>
            </div>
            <div className="flex flex-col gap-1.5 p-3">
              {seusLocais.map(({ l, dist }) => (
                <LocalRow key={l.id} l={l} dist={dist} />
              ))}
            </div>
          </div>
        ) : null}

        {/* All locals */}
        <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-700)_4%),color-mix(in_srgb,var(--eid-surface)_98%,transparent))] shadow-[0_8px_28px_-16px_rgba(15,23,42,0.4)]">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.045)] px-4 py-2.5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400">
              {q ? "Resultados" : "Todos os locais"}
            </h2>
            <span className="text-[9px] font-bold text-eid-text-secondary">
              {count} local{count !== 1 ? "is" : ""}
              {q ? " encontrado(s)" : ""}
            </span>
          </div>

          {listaPaginada.length ? (
            <div className="flex flex-col gap-1.5 p-3">
              {listaPaginada.map(({ l, dist }) => (
                <LocalRow key={l.id} l={l} dist={dist} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-eid-text-secondary">
              Nenhum local encontrado{q ? ` para "${sp.q}"` : ""}.
            </div>
          )}
        </div>

        {/* Pagination */}
        {(hasPrev || hasNext) ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2.5">
            <Link
              href={`/locais?${queryBase}&page=${page - 1}`}
              aria-disabled={!hasPrev}
              className={
                hasPrev
                  ? "inline-flex h-9 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-3 text-[10px] font-bold uppercase tracking-wide text-eid-fg transition hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]"
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
                  ? "inline-flex h-9 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-3 text-[10px] font-bold uppercase tracking-wide text-eid-fg transition hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]"
                  : "pointer-events-none inline-flex h-9 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary opacity-40"
              }
            >
              Próxima →
            </Link>
          </div>
        ) : null}

      </main>
    </div>
  );
}
