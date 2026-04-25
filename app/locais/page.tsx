import Link from "next/link";
import { redirect } from "next/navigation";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
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
};

function localHref(l: LocalCard) {
  return l.slug ? `/espaco/${l.slug}` : `/local/${l.id}?from=/locais`;
}

function localCard(l: LocalCard, dist?: number) {
  return (
    <Link
      key={l.id}
      href={localHref(l)}
      className="group relative block overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card transition hover:border-eid-primary-500/40 md:rounded-3xl md:shadow-lg md:shadow-black/20 md:hover:shadow-eid-primary-500/10"
    >
      <div className="flex h-24 items-center justify-center bg-eid-surface md:h-32 md:bg-gradient-to-br md:from-eid-primary-500/20 md:via-eid-surface md:to-eid-card">
        {l.logo_arquivo ? (
          <img src={l.logo_arquivo} alt="" className="max-h-[72%] max-w-[80%] object-contain transition group-hover:scale-[1.03]" />
        ) : (
          <span className="text-3xl font-black text-eid-primary-500/25">EID</span>
        )}
      </div>
      <div className="space-y-1.5 p-3 md:space-y-2 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-eid-primary-300">
            {l.status ?? "Ativo"}
          </span>
          <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-eid-action-400">
            {l.ownership_status === "verificado" ? "Verificado" : "Genérico"}
          </span>
          {l.aceita_reserva ? (
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-200">
              Reserva
            </span>
          ) : null}
          {l.tipo_quadra ? <span className="text-[10px] font-bold uppercase text-eid-text-secondary">{l.tipo_quadra}</span> : null}
          {Number.isFinite(dist) && (dist ?? 0) < 9000 ? (
            <span className="text-[10px] font-bold uppercase text-eid-primary-300">{Number(dist).toFixed(1).replace(".", ",")} km</span>
          ) : null}
        </div>
        <p className="text-base font-bold text-eid-fg group-hover:text-eid-primary-300">{l.nome_publico}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-eid-text-secondary">{l.localizacao ?? "Endereço não informado"}</p>
        <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-eid-action-500">Abrir local →</p>
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
    supabase.from("espacos_genericos").select("id").or(`responsavel_usuario_id.eq.${user.id},criado_por_usuario_id.eq.${user.id}`),
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
    <main data-eid-touch-ui className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <div className="relative mb-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 md:mb-6 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/20 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 hidden h-32 w-32 rounded-full bg-eid-primary-500/20 blur-3xl md:block" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-eid-primary-300">Guia de locais</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-eid-fg md:text-3xl">Locais esportivos perto de você</h1>
            <p className="mt-1 max-w-2xl text-xs text-eid-text-secondary md:mt-2 md:text-sm">
              Encontre locais por proximidade, veja seus vínculos e escolha onde reservar com mais rapidez.
            </p>
          </div>
          <div className="flex max-w-sm shrink-0 flex-col gap-2">
            <CadastrarLocalOverlayTrigger
              className="rounded-xl border border-eid-primary-500/40 px-4 py-2 text-center text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/10"
            >
              Cadastrar local genérico
            </CadastrarLocalOverlayTrigger>
            <p className="text-[11px] leading-relaxed text-eid-text-secondary">
              Para cadastrar um <span className="font-semibold text-eid-fg">local oficial (proprietário)</span>, crie um novo cadastro como dono de espaço e solicite aprovação.
            </p>
          </div>
        </div>
      </div>

      <form className="mb-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-2 sm:p-2.5">
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
      <p className="mb-6 text-xs text-eid-text-secondary">
        {hasCoords ? "Resultados ordenados por proximidade da sua localização." : "Defina sua localização no perfil para priorizar locais próximos de você."}
      </p>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-eid-primary-300">Meus locais</h2>
        {meusLocais.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{meusLocais.map(({ l, dist }) => localCard(l, dist))}</div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4 text-sm text-eid-text-secondary">
            Você ainda não tem locais vinculados como membro/sócio.
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-eid-primary-300">Sugestões de locais próximos de você</h2>
        {sugestoesProximas.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sugestoesProximas.map(({ l, dist }) => localCard(l, dist))}</div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4 text-sm text-eid-text-secondary">
            Não encontramos sugestões para seu filtro atual.
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-eid-primary-300">Locais que você vai com frequência</h2>
        <p className="mb-3 text-xs text-eid-text-secondary">
          Considera histórico como sócio/membro, reserva paga e participação como visitante.
        </p>
        {locaisFrequentes.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{locaisFrequentes.map(({ l, dist }) => localCard(l, dist))}</div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4 text-sm text-eid-text-secondary">
            Ainda não há histórico suficiente para montar seus locais frequentes.
          </p>
        )}
      </section>

      <section className="mb-2">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-eid-primary-300">Todos os locais</h2>
        {q ? (
          <p className="mb-4 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/10 px-4 py-3 text-xs text-eid-text-secondary">
            Busca ativa: <span className="font-bold text-eid-fg">{sp.q}</span>
          </p>
        ) : null}
        {listaPaginada.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listaPaginada.map(({ l, dist }) => localCard(l, dist))}</div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-8 text-center">
            <p className="text-sm text-eid-text-secondary">Nenhum local encontrado para esse filtro.</p>
          </div>
        )}
      </section>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href={`/locais?${queryBase}&page=${page - 1}`}
          aria-disabled={!hasPrev}
          className={`rounded-xl border px-4 py-2 text-xs font-bold ${
            hasPrev
              ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
              : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
          }`}
        >
          ← Anterior
        </Link>
        <span className="text-xs text-eid-text-secondary">Página {page}</span>
        <Link
          href={`/locais?${queryBase}&page=${page + 1}`}
          aria-disabled={!hasNext}
          className={`rounded-xl border px-4 py-2 text-xs font-bold ${
            hasNext
              ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
              : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
          }`}
        >
          Próxima →
        </Link>
      </div>
    </main>
  );
}
