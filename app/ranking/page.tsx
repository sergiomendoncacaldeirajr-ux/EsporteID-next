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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
      <header className="mb-7 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-eid-fg md:text-2xl md:font-extrabold">Ranking</h1>
          <p className="mt-1.5 hidden text-xs leading-relaxed text-eid-text-secondary md:mt-2 md:block md:max-w-xl">
            Nota EID (azul) e pontos de ranking (laranja); interesse em match —{" "}
            <span className="font-medium text-eid-fg/90">só ranking</span> ou{" "}
            <span className="font-medium text-eid-fg/90">ranking + amistoso</span>.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-eid-primary-500/28 bg-eid-primary-500/[0.07] px-4 text-xs font-bold text-eid-primary-200 transition duration-200 hover:border-eid-primary-500/42 hover:bg-eid-primary-500/12 active:scale-[0.98]"
        >
          Painel
        </Link>
      </header>

      <form
        action="/ranking"
        method="get"
        className="mb-9 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-4 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-5"
      >
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Filtros</p>
        <div className="flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-0 flex-1 sm:min-w-[200px]">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Esporte</span>
            <select
              name="esporte"
              defaultValue={sp.esporte ?? ""}
              className="eid-input-dark h-11 w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3.5 text-sm font-medium text-eid-fg shadow-inner transition duration-200 focus:border-eid-primary-500/40 focus:outline-none focus:ring-2 focus:ring-eid-primary-500/25"
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
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Cidade</span>
            <input
              name="cidade"
              defaultValue={sp.cidade ?? ""}
              placeholder="Filtrar por cidade (opcional)"
              className="eid-input-dark h-11 w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3.5 text-sm font-medium text-eid-fg shadow-inner placeholder:text-eid-text-secondary/75 transition duration-200 focus:border-eid-primary-500/40 focus:outline-none focus:ring-2 focus:ring-eid-primary-500/25"
            />
          </label>
          <button
            type="submit"
            className="eid-btn-primary h-11 shrink-0 rounded-xl px-6 text-sm font-bold shadow-md transition duration-200 active:scale-[0.98] sm:min-w-[7rem]"
          >
            Filtrar
          </button>
        </div>
      </form>

      {podium.length > 0 && page === 1 ? (
        <section className="relative mb-11 sm:mb-12">
          <div
            className="pointer-events-none absolute -inset-x-4 -top-5 bottom-0 -z-10 mx-auto max-w-3xl rounded-[2rem] bg-[radial-gradient(ellipse_80%_55%_at_50%_18%,rgba(74,222,128,0.1),transparent_68%)] opacity-90 md:-inset-x-8"
            aria-hidden
          />
          <h2 className="mb-5 text-center text-xs font-bold uppercase tracking-[0.22em] text-eid-primary-400 md:mb-6">Pódio</h2>
          <div className="flex flex-col items-stretch gap-5 md:flex-row md:items-end md:justify-center md:gap-6 lg:gap-7">
            {podium[1] ? (
              <div className="order-2 w-full md:order-1 md:max-w-[15rem] md:flex-1 md:pb-2">
                <AthleteRankingCard {...rowToCardProps(podium[1], 2, "podium-2")} />
              </div>
            ) : null}
            {podium[0] ? (
              <div className="order-1 w-full md:order-2 md:z-10 md:max-w-[19rem] md:flex-[1.2] md:-translate-y-1">
                <AthleteRankingCard {...rowToCardProps(podium[0], 1, "podium-1")} />
              </div>
            ) : null}
            {podium[2] ? (
              <div className="order-3 w-full md:order-3 md:max-w-[15rem] md:flex-1 md:pb-2">
                <AthleteRankingCard {...rowToCardProps(podium[2], 3, "podium-3")} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {rankingAll.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-6 text-center text-sm text-eid-text-secondary shadow-inner">
          Nenhum atleta encontrado para os filtros selecionados.
        </p>
      ) : pageRest.length > 0 ? (
        <section>
          {page === 1 && podium.length > 0 ? (
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-eid-text-secondary md:mb-4">Demais posições</h2>
          ) : null}
          <div className="grid gap-3 md:gap-3.5">
            {pageRest.map((row, idx) => (
              <AthleteRankingCard
                key={`${row.usuario_id}-${row.esporte_id}-${start}-${idx}`}
                {...rowToCardProps(row, 4 + start + idx, "list")}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-9 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
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
  );
}
