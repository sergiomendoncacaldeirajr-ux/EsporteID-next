import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const metadata = {
  title: "Performance",
  description: "Performance esportiva no EsporteID",
};

export const unstable_instant = true;

type Props = {
  searchParams?: Promise<{ esporte?: string; tipo?: string; page?: string }>;
};

type PerfSport = { nome?: string | null };
type PerfProfile = { nome?: string | null };
type PerfRow = {
  id: number;
  usuario_id?: string;
  esporte_id: number;
  tipo_marca: string;
  valor_metrico: number;
  distancia_km?: number | null;
  observacoes?: string | null;
  registrado_em: string;
  status_validacao?: string | null;
  esportes?: PerfSport | PerfSport[] | null;
  profiles?: PerfProfile | PerfProfile[] | null;
};

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function formatMarca(tipo: string, valor: number, distanciaKm?: number | null) {
  if (tipo === "tempo") {
    const totalSeg = Math.max(0, Math.floor(valor));
    const mm = Math.floor(totalSeg / 60);
    const ss = totalSeg % 60;
    const base = `${mm}m ${String(ss).padStart(2, "0")}s`;
    return distanciaKm && Number(distanciaKm) > 0
      ? `${base} • ${Number(distanciaKm).toFixed(2)} km`
      : base;
  }
  return `${Number(valor).toFixed(2)} kg`;
}

function statusLabel(st?: string | null) {
  const s = (st ?? "").toLowerCase();
  if (s === "pendente") return "Em análise";
  if (s === "rejeitado") return "Não aceito";
  return "Aprovado";
}

export default async function PerformancePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/performance");

  const esporteParam = Number(sp.esporte ?? 0);
  const tipoParam = sp.tipo === "carga" ? "carga" : "tempo";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 20;

  const { data: esportes } = await supabase
    .from("esportes")
    .select("id, nome, tipo_lancamento, categoria_processamento")
    .eq("ativo", true)
    .eq("categoria_processamento", "performance")
    .order("ordem", { ascending: true });

  let historicoQuery = supabase
    .from("usuario_performance_registros")
    .select(
      "id, esporte_id, tipo_marca, valor_metrico, distancia_km, observacoes, registrado_em, status_validacao, esportes!inner(nome)"
    )
    .eq("usuario_id", user.id)
    .order("registrado_em", { ascending: false })
    .limit(50);

  if (Number.isFinite(esporteParam) && esporteParam > 0) {
    historicoQuery = historicoQuery.eq("esporte_id", esporteParam);
  }
  if (tipoParam) {
    historicoQuery = historicoQuery.eq("tipo_marca", tipoParam);
  }

  const { data: historico } = await historicoQuery;
  const historicoRows = (historico ?? []) as PerfRow[];

  const aprovados = historicoRows.filter(
    (h) => (h.status_validacao ?? "aprovado").toLowerCase() === "aprovado"
  );
  const pbMap = new Map<string, PerfRow>();
  for (const r of aprovados) {
    const key = `${r.esporte_id}:${r.tipo_marca}`;
    const atual = pbMap.get(key);
    if (!atual) {
      pbMap.set(key, r);
      continue;
    }
    if (r.tipo_marca === "tempo") {
      if (Number(r.valor_metrico) < Number(atual.valor_metrico)) pbMap.set(key, r);
    } else if (Number(r.valor_metrico) > Number(atual.valor_metrico)) {
      pbMap.set(key, r);
    }
  }
  const pbs = Array.from(pbMap.values()).slice(0, 6);

  const esporteLeaderboardId =
    Number.isFinite(esporteParam) && esporteParam > 0
      ? esporteParam
      : esportes?.[0]?.id ?? 0;
  const { data: leaderboardRaw } =
    esporteLeaderboardId > 0
      ? await supabase
          .from("usuario_performance_registros")
          .select(
            "usuario_id, tipo_marca, valor_metrico, distancia_km, status_validacao, profiles!inner(nome), esportes!inner(nome)"
          )
          .eq("esporte_id", esporteLeaderboardId)
          .eq("tipo_marca", tipoParam)
          .eq("status_validacao", "aprovado")
          .order("valor_metrico", { ascending: tipoParam === "tempo" })
          .limit(10)
      : { data: [] as unknown[] };
  const leaderboard = (leaderboardRaw ?? []) as PerfRow[];
  const start = (page - 1) * pageSize;
  const historicoPage = historicoRows.slice(start, start + pageSize);
  const hasPrev = page > 1;
  const hasNext = start + pageSize < historicoRows.length;
  const qs = `esporte=${encodeURIComponent(sp.esporte ?? "")}&tipo=${encodeURIComponent(sp.tipo ?? tipoParam)}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="eid-surface-panel relative mb-4 rounded-xl p-3 md:mb-6 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/20 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-8">
          <div className="pointer-events-none absolute right-0 top-0 hidden h-36 w-36 rounded-full bg-eid-action-500/15 blur-3xl md:block" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-3xl md:font-black">Performance</h1>
              <p className="mt-1 hidden max-w-2xl text-sm text-eid-text-secondary md:mt-2 md:block">
                Recordes pessoais, histórico validado e ranking da modalidade, com leitura clara e hierárquica.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="eid-btn-ghost shrink-0 rounded-xl px-4 py-2 text-center text-xs font-bold text-eid-text-secondary hover:text-eid-fg"
            >
              Painel
            </Link>
          </div>
        </div>

        <form className="eid-surface-panel mb-6 grid gap-2 rounded-2xl p-3 sm:grid-cols-[1fr_180px_auto]">
          <select
            name="esporte"
            defaultValue={sp.esporte ?? ""}
            className="eid-input-dark h-10 rounded-xl px-3 text-sm text-eid-fg"
          >
            <option value="">Todos os esportes de performance</option>
            {esportes?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <select
            name="tipo"
            defaultValue={tipoParam}
            className="eid-input-dark h-10 rounded-xl px-3 text-sm text-eid-fg"
          >
            <option value="tempo">Tempo</option>
            <option value="carga">Carga</option>
          </select>
          <button type="submit" className="eid-btn-primary rounded-xl px-4 text-sm font-bold">
            Filtrar
          </button>
        </form>

        <section className="mb-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">
            Seus recordes pessoais
          </h2>
          {pbs.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pbs.map((r, idx) => {
                const e = Array.isArray(r.esportes) ? r.esportes[0] : r.esportes;
                return (
                  <article
                    key={`${r.id}-${idx}`}
                    className="eid-list-item relative overflow-hidden rounded-xl border-eid-primary-500/20 bg-eid-card p-3 shadow-sm sm:rounded-2xl sm:bg-gradient-to-br sm:from-eid-card sm:to-eid-primary-500/[0.07] sm:p-4 sm:shadow-md sm:shadow-black/20"
                  >
                    <div className="pointer-events-none absolute -right-4 -top-4 hidden h-16 w-16 rounded-full bg-eid-primary-500/15 blur-2xl sm:block" />
                    <p className="relative text-sm font-bold text-eid-fg">{e?.nome ?? "Esporte"}</p>
                    <p className="relative mt-1 text-xs text-eid-text-secondary">
                      {r.tipo_marca === "tempo" ? "Melhor tempo" : "Maior carga"}
                    </p>
                    <p className="relative mt-3 text-lg font-bold tabular-nums text-eid-action-500 sm:text-xl sm:font-black">
                      {formatMarca(r.tipo_marca, Number(r.valor_metrico ?? 0), Number(r.distancia_km ?? 0))}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
              Sem marcas aprovadas para os filtros atuais.
            </p>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">
            Top 10 da modalidade
          </h2>
          {leaderboard.length > 0 ? (
            <div className="grid gap-2">
              {leaderboard.map((r, idx) => {
                const p = firstOf(r.profiles);
                const rank = idx + 1;
                const medal =
                  rank === 1
                    ? "from-[color:color-mix(in_srgb,var(--eid-warning-500)_26%,transparent)] border-[color:color-mix(in_srgb,var(--eid-warning-500)_40%,transparent)]"
                    : rank === 2
                      ? "from-[color:color-mix(in_srgb,var(--eid-info-500)_20%,transparent)] border-[color:color-mix(in_srgb,var(--eid-info-500)_34%,transparent)]"
                      : rank === 3
                        ? "from-[color:color-mix(in_srgb,var(--eid-action-500)_20%,transparent)] border-[color:color-mix(in_srgb,var(--eid-action-500)_36%,transparent)]"
                        : "from-eid-card border-[color:var(--eid-border-subtle)]";
                return (
                  <article
                    key={`${r.usuario_id}-${idx}`}
                    className={`flex items-center justify-between rounded-xl border bg-eid-card px-3 py-2.5 sm:rounded-2xl sm:bg-gradient-to-r ${medal} sm:to-eid-card sm:px-4 sm:py-3`}
                  >
                    <p className="truncate text-sm font-semibold text-eid-fg">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-eid-bg/80 text-[10px] font-bold text-eid-primary-300 sm:h-7 sm:w-7 sm:text-xs sm:font-black">
                        {rank}
                      </span>
                      {p?.nome ?? "Atleta"}
                    </p>
                    <p className="ml-3 shrink-0 text-xs font-bold text-eid-action-500">
                      {formatMarca(r.tipo_marca, Number(r.valor_metrico ?? 0), Number(r.distancia_km ?? 0))}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="eid-list-item rounded-xl bg-eid-card p-4 text-sm text-eid-text-secondary">
              Ainda não há ranking de performance para esse filtro.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">
            Últimos registros
          </h2>
          {historicoRows.length > 0 ? (
            <div className="grid gap-2">
              {historicoPage.map((h) => {
                const e = firstOf(h.esportes);
                const st = (h.status_validacao ?? "aprovado").toLowerCase();
                return (
                  <article
                    key={h.id}
                    className="eid-list-item rounded-2xl bg-eid-card/90 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-eid-fg">{e?.nome ?? "Esporte"}</p>
                      <p
                        className={`text-xs font-semibold ${
                          st === "pendente"
                            ? "text-eid-action-500"
                            : st === "rejeitado"
                              ? "text-[color:color-mix(in_srgb,var(--eid-danger-400)_78%,var(--eid-fg)_22%)]"
                              : "text-eid-primary-300"
                        }`}
                      >
                        {statusLabel(h.status_validacao)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {formatMarca(h.tipo_marca, Number(h.valor_metrico ?? 0), Number(h.distancia_km ?? 0))}
                    </p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">
                      {new Date(h.registrado_em).toLocaleString("pt-BR")}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="eid-list-item rounded-xl bg-eid-card p-4 text-sm text-eid-text-secondary">
              Você ainda não possui registros de performance.
            </p>
          )}
          {historicoRows.length > 0 ? (
            <div className="mt-5 flex items-center justify-between">
              <Link
                href={`/performance?${qs}&page=${page - 1}`}
                aria-disabled={!hasPrev}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  hasPrev
                    ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
                    : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
                }`}
              >
                ← Anterior
              </Link>
              <span className="text-xs text-eid-text-secondary">Página {page}</span>
              <Link
                href={`/performance?${qs}&page=${page + 1}`}
                aria-disabled={!hasNext}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  hasNext
                    ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
                    : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
                }`}
              >
                Próxima →
              </Link>
            </div>
          ) : null}
        </section>
      </div>
  );
}
