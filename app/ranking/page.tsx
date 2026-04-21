import Link from "next/link";
import { redirect } from "next/navigation";
import { AthleteRankingCard } from "@/components/ranking/athlete-ranking-card";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Ranking",
  description: "Ranking EsporteID",
};

type Props = {
  searchParams?: Promise<{ esporte?: string; cidade?: string; page?: string }>;
};

type RankingProfile = { nome?: string | null; avatar_url?: string | null; localizacao?: string | null };
type RankingSport = { nome?: string | null };
type RankingRow = {
  usuario_id: string;
  esporte_id: number;
  nota_eid?: number | null;
  vitorias?: number | null;
  derrotas?: number | null;
  pontos_ranking?: number | null;
  partidas_jogadas?: number | null;
  interesse_match?: string | null;
  modalidade_match?: string | null;
  profiles?: RankingProfile | RankingProfile[] | null;
  esportes?: RankingSport | RankingSport[] | null;
};

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

const REST_PAGE_SIZE = 17;

export default async function RankingPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ranking");
  const viewerId = user.id;

  const esporteParam = Number(sp.esporte ?? 0);
  const cidadeParam = (sp.cidade ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const { data: esportes } = await supabase
    .from("esportes")
    .select("id, nome")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  let rankingQuery = supabase
    .from("usuario_eid")
    .select(
      "usuario_id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, interesse_match, modalidade_match, profiles!inner(nome, avatar_url, localizacao), esportes!inner(nome)"
    )
    .order("nota_eid", { ascending: false });

  if (Number.isFinite(esporteParam) && esporteParam > 0) {
    rankingQuery = rankingQuery.eq("esporte_id", esporteParam);
  }

  const { data: rawRankingAll } = await rankingQuery;
  const rankingAll = ((rawRankingAll ?? []) as RankingRow[]).filter((r) => {
    if (!cidadeParam) return true;
    const p = firstOf(r.profiles);
    const loc = String(p?.localizacao ?? "").toLowerCase();
    return loc.includes(cidadeParam);
  });

  const podium = rankingAll.slice(0, 3);
  const rest = rankingAll.slice(3);
  const totalRest = rest.length;
  const start = (page - 1) * REST_PAGE_SIZE;
  const pageRest = rest.slice(start, start + REST_PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = start + REST_PAGE_SIZE < totalRest;
  const qs = `esporte=${encodeURIComponent(sp.esporte ?? "")}&cidade=${encodeURIComponent(sp.cidade ?? "")}`;

  function rowToCardProps(row: RankingRow, rank: number, variant: "podium-1" | "podium-2" | "podium-3" | "list") {
    const p = firstOf(row.profiles);
    const e = firstOf(row.esportes);
    return {
      rank,
      nome: p?.nome ?? "Atleta",
      avatarUrl: p?.avatar_url ?? null,
      localizacao: p?.localizacao ?? "Brasil",
      esporteNome: e?.nome ?? "Esporte",
      eid: Number(row.nota_eid ?? 0),
      vitorias: Number(row.vitorias ?? 0),
      derrotas: Number(row.derrotas ?? 0),
      pontos: Number(row.pontos_ranking ?? 0),
      partidas: Number(row.partidas_jogadas ?? 0),
      usuarioId: row.usuario_id,
      esporteId: row.esporte_id,
      interesseMatch: row.interesse_match ?? null,
      viewerId,
      variant,
    };
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,28rem)] bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,rgba(37,99,235,0.14),transparent_58%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-eid-fg md:text-2xl md:font-extrabold">Ranking</h1>
          <p className="mt-2 hidden text-xs leading-relaxed text-eid-text-secondary md:block md:max-w-xl">
            Nota EID (azul) e pontos de ranking (laranja); interesse em match —{" "}
            <span className="font-medium text-eid-fg">só ranking</span> ou{" "}
            <span className="font-medium text-eid-fg">ranking + amistoso</span>.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-eid-primary-500/25 bg-eid-primary-500/[0.06] px-4 text-xs font-bold text-eid-primary-300 transition duration-200 hover:border-eid-primary-500/38 hover:bg-eid-primary-500/10 active:scale-[0.98]"
        >
          Painel
        </Link>
      </header>

      <form
        action="/ranking"
        method="get"
        className="mb-10 rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card/95 p-5 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.55)] sm:rounded-2xl sm:p-6"
      >
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Filtros</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-0 flex-1 sm:min-w-[200px]">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Esporte</span>
            <select
              name="esporte"
              defaultValue={sp.esporte ?? ""}
              className="eid-input-dark h-11 w-full rounded-[var(--eid-radius-md)] border border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] px-3.5 text-sm font-medium text-eid-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 focus:border-eid-primary-500/45 focus:outline-none focus:ring-2 focus:ring-eid-primary-500/20"
            >
              <option value="">Todos os esportes</option>
              {esportes?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 sm:min-w-[220px]">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Cidade</span>
            <input
              name="cidade"
              defaultValue={sp.cidade ?? ""}
              placeholder="Filtrar por cidade (opcional)"
              className="eid-input-dark h-11 w-full rounded-[var(--eid-radius-md)] border border-[color:var(--eid-border-subtle)] bg-[color:var(--eid-field-bg)] px-3.5 text-sm font-medium text-eid-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-eid-text-secondary/80 transition duration-200 focus:border-eid-primary-500/45 focus:outline-none focus:ring-2 focus:ring-eid-primary-500/20"
            />
          </label>
          <button
            type="submit"
            className="eid-btn-primary h-11 shrink-0 rounded-[var(--eid-radius-md)] px-6 text-sm font-bold shadow-md transition duration-200 active:scale-[0.98] sm:min-w-[7rem]"
          >
            Filtrar
          </button>
        </div>
      </form>

      {podium.length > 0 && page === 1 ? (
        <section className="relative mb-12 sm:mb-14">
          <div
            className="pointer-events-none absolute -inset-x-4 -top-6 bottom-0 -z-10 mx-auto max-w-3xl rounded-[2rem] bg-[radial-gradient(ellipse_85%_60%_at_50%_15%,rgba(37,99,235,0.11),transparent_65%)] md:-inset-x-8"
            aria-hidden
          />
          <h2 className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-eid-text-secondary md:mb-7">
            Pódio de destaques
          </h2>
          <div className="flex flex-row items-end justify-center gap-2 sm:gap-4 md:gap-6 lg:gap-8">
            {podium[1] ? (
              <div className="order-1 min-w-0 w-[32%] max-w-[15rem] shrink pb-1 sm:w-auto sm:flex-1 sm:pb-2">
                <AthleteRankingCard {...rowToCardProps(podium[1], 2, "podium-2")} />
              </div>
            ) : null}
            {podium[0] ? (
              <div className="order-2 z-10 min-w-0 w-[36%] max-w-[19rem] shrink sm:w-auto sm:flex-[1.15] md:-translate-y-1">
                <AthleteRankingCard {...rowToCardProps(podium[0], 1, "podium-1")} />
              </div>
            ) : null}
            {podium[2] ? (
              <div className="order-3 min-w-0 w-[32%] max-w-[15rem] shrink pb-1 sm:w-auto sm:flex-1 sm:pb-2">
                <AthleteRankingCard {...rowToCardProps(podium[2], 3, "podium-3")} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {rankingAll.length === 0 ? (
        <p className="rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card/95 p-8 text-center text-sm leading-relaxed text-eid-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl">
          Nenhum atleta encontrado para os filtros selecionados.
        </p>
      ) : pageRest.length > 0 ? (
        <section>
          {page === 1 && podium.length > 0 ? (
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-eid-text-secondary md:mb-5">
              Classificação geral
            </h2>
          ) : null}
          <div className="grid gap-4 md:gap-4">
            {pageRest.map((row, idx) => (
              <AthleteRankingCard
                key={`${row.usuario_id}-${row.esporte_id}-${start}-${idx}`}
                {...rowToCardProps(row, 4 + start + idx, "list")}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-[color:var(--eid-border-subtle)] pt-8">
        <Link
          href={`/ranking?${qs}&page=${page - 1}`}
          aria-disabled={!hasPrev}
          className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition duration-200 ${
            hasPrev
              ? "border-eid-primary-500/30 bg-eid-primary-500/[0.06] text-eid-fg hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10 active:scale-[0.98]"
              : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-45"
          }`}
        >
          ← Anterior
        </Link>
        <span className="text-xs font-medium text-eid-text-secondary">Página {page}</span>
        <Link
          href={`/ranking?${qs}&page=${page + 1}`}
          aria-disabled={!hasNext}
          className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition duration-200 ${
            hasNext
              ? "border-eid-primary-500/30 bg-eid-primary-500/[0.06] text-eid-fg hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10 active:scale-[0.98]"
              : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-45"
          }`}
        >
          Próxima →
        </Link>
      </div>
      </div>
    </div>
  );
}
