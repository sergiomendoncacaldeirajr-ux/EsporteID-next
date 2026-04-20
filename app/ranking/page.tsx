import Link from "next/link";
import { redirect } from "next/navigation";
import { AthleteRankingCard } from "@/components/ranking/athlete-ranking-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
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
      eid: Number(row.nota_eid ?? 1),
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
    <>
      <DashboardTopbar />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="mb-3 flex items-center justify-between gap-3 md:mb-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-eid-fg md:text-lg">Ranking</h1>
            <p className="mt-0.5 hidden text-[11px] leading-relaxed text-eid-text-secondary md:mt-1 md:block">
              Nota EID (azul) e pontos de ranking (laranja); interesse em match —{" "}
              <span className="text-eid-fg/90">só ranking</span> ou <span className="text-eid-fg/90">ranking + amistoso</span>.
            </p>
          </div>
          <Link href="/dashboard" className="shrink-0 text-xs font-medium text-eid-primary-300 hover:text-eid-fg">
            Painel
          </Link>
        </div>
        <form className="mb-5 grid gap-2 rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card p-2.5 sm:grid-cols-[1fr_1fr_auto]">
          <select
            name="esporte"
            defaultValue={sp.esporte ?? ""}
            className="eid-input-dark h-9 rounded-[var(--eid-radius-md)] px-3 text-sm text-eid-fg"
          >
            <option value="">Todos os esportes</option>
            {esportes?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <input
            name="cidade"
            defaultValue={sp.cidade ?? ""}
            placeholder="Filtrar por cidade (opcional)"
            className="eid-input-dark h-9 rounded-[var(--eid-radius-md)] px-3 text-sm text-eid-fg placeholder:text-eid-text-secondary/85"
          />
          <button type="submit" className="eid-btn-primary rounded-[var(--eid-radius-md)] px-4 text-sm">
            Filtrar
          </button>
        </form>

        {podium.length > 0 && page === 1 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-eid-primary-500">
              Pódio
            </h2>
            <div className="grid gap-3 md:grid-cols-3 md:items-end">
              {podium[1] ? (
                <div className="order-2 md:order-1">
                  <AthleteRankingCard {...rowToCardProps(podium[1], 2, "podium-2")} />
                </div>
              ) : null}
              {podium[0] ? (
                <div className="order-1 md:order-2">
                  <AthleteRankingCard {...rowToCardProps(podium[0], 1, "podium-1")} />
                </div>
              ) : null}
              {podium[2] ? (
                <div className="order-3">
                  <AthleteRankingCard {...rowToCardProps(podium[2], 3, "podium-3")} />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {rankingAll.length === 0 ? (
          <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
            Nenhum atleta encontrado para os filtros selecionados.
          </p>
        ) : pageRest.length > 0 ? (
          <section>
            {page === 1 && podium.length > 0 ? (
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">
                Demais posições
              </h2>
            ) : null}
            <div className="grid gap-3">
              {pageRest.map((row, idx) => (
                <AthleteRankingCard
                  key={`${row.usuario_id}-${row.esporte_id}-${start}-${idx}`}
                  {...rowToCardProps(row, 4 + start + idx, "list")}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <Link
            href={`/ranking?${qs}&page=${page - 1}`}
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
            href={`/ranking?${qs}&page=${page + 1}`}
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
      </div>
    </>
  );
}
