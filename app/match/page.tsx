import Link from "next/link";
import { redirect } from "next/navigation";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { EidNotaMetric, EidRankingPtsMetric } from "@/components/ui/eid-metrics";
import { createClient } from "@/lib/supabase/server";

type RadarTipo = "atleta" | "dupla" | "time";
type SortBy = "eid_score" | "match_ranking_points";

type Search = {
  tipo?: string;
  esporte?: string;
  raio?: string;
  sort_by?: string;
  status?: string;
};

type AtletaMatchRow = {
  usuario_id: string;
  nome: string | null;
  localizacao: string | null;
  esporte_id: number | null;
  esporte_nome: string | null;
  dist_km: number | null;
  nota_eid: number | null;
  pontos_ranking: number | null;
  modalidade_match: string | null;
  interesse_match: string | null;
};

type FormacaoMatchRow = {
  id: number;
  nome: string | null;
  localizacao: string | null;
  esporte_id: number | null;
  esporte_nome: string | null;
  dist_km: number | null;
  eid_time: number | null;
  pontos_ranking: number | null;
  interesse_match: string | null;
  can_challenge: boolean | null;
};

function toTipo(v: string | undefined): RadarTipo {
  return v === "dupla" || v === "time" ? v : "atleta";
}

function toSortBy(v: string | undefined): SortBy {
  return v === "match_ranking_points" ? "match_ranking_points" : "eid_score";
}

function toRaio(v: string | undefined): number {
  const n = Number(v ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(150, Math.round(n)));
}

export default async function MatchPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const sp = (await searchParams) ?? {};
  const tipo = toTipo(sp.tipo);
  const sortBy = toSortBy(sp.sort_by);
  const raio = toRaio(sp.raio);
  const esporteParam = sp.esporte ?? "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/match");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, lat, lng, termos_aceitos_em, perfil_completo")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.termos_aceitos_em) redirect("/conta/aceitar-termos");
  if (!me.perfil_completo) redirect("/onboarding");
  const hasLocation = Number.isFinite(Number(me.lat)) && Number.isFinite(Number(me.lng));

  if (!hasLocation) {
    return (
      <>
        <DashboardTopbar />
        <main className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-4">
          <div className="relative mb-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 md:mb-5 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-6">
            <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-2xl md:font-black">Radar Match</h1>
            <p className="mt-1 text-xs text-eid-text-secondary md:mt-2 md:text-sm">
              Depois de permitir a localização, esta página recarrega e mostra o radar com os filtros de esporte, raio e ordenação.
            </p>
          </div>
          <MatchLocationPrompt hasLocation={false} />
        </main>
      </>
    );
  }

  const { data: esportes } = await supabase
    .from("esportes")
    .select("id, nome, categoria_processamento")
    .eq("ativo", true)
    .eq("categoria_processamento", "confronto")
    .order("ordem", { ascending: true });

  const { data: meusEids } = await supabase
    .from("usuario_eid")
    .select("esporte_id")
    .eq("usuario_id", user.id)
    .order("id", { ascending: true })
    .limit(1);
  const esporteDefault = String(meusEids?.[0]?.esporte_id ?? "all");
  const esporteSelecionado = esporteParam === "all" ? esporteDefault : esporteParam;

  let cards: Array<{
    id: string;
    nome: string;
    localizacao: string;
    esporteNome: string;
    esporteId: number;
    dist: number;
    eid: number;
    rank: number;
    modalidade: "individual" | "dupla" | "time";
    interesseMatch: "ranking" | "ranking_e_amistoso";
    href: string;
    canChallenge: boolean;
    challengeHint?: string;
  }> = [];

  if (tipo === "atleta") {
    const esporteId = /^\d+$/.test(esporteSelecionado) ? Number(esporteSelecionado) : null;
    const { data } = await supabase.rpc("buscar_match_atletas", {
      p_viewer_id: user.id,
      p_lat: Number(me.lat),
      p_lng: Number(me.lng),
      p_esporte_id: esporteId,
      p_raio_km: raio,
      p_limit: 500,
    });

    cards = ((data ?? []) as AtletaMatchRow[]).map((row) => {
      return {
        id: String(row.usuario_id),
        nome: String(row.nome ?? "Atleta"),
        localizacao: String(row.localizacao ?? "Localização não informada"),
        esporteNome: String(row.esporte_nome ?? "Esporte"),
        esporteId: Number(row.esporte_id ?? 0),
        dist: Number(row.dist_km ?? 99999),
        eid: Number(row.nota_eid ?? 1),
        rank: Number(row.pontos_ranking ?? 0),
        modalidade: row.modalidade_match === "dupla" || row.modalidade_match === "time" ? row.modalidade_match : "individual",
        interesseMatch: row.interesse_match === "ranking" ? "ranking" : "ranking_e_amistoso",
        href: `/perfil/${encodeURIComponent(String(row.usuario_id ?? ""))}?from=/match`,
        canChallenge: true,
      };
    });
  } else {
    const esporteId = /^\d+$/.test(esporteSelecionado) ? Number(esporteSelecionado) : null;
    const { data: formacoes } = await supabase.rpc("buscar_match_formacoes", {
      p_viewer_id: user.id,
      p_tipo: tipo,
      p_lat: Number(me.lat),
      p_lng: Number(me.lng),
      p_esporte_id: esporteId,
      p_raio_km: raio,
      p_limit: 300,
    });

    cards = ((formacoes ?? []) as FormacaoMatchRow[]).map((t) => {
      return {
        id: String(t.id),
        nome: String(t.nome ?? "Time"),
        localizacao: String(t.localizacao ?? "Localização não informada"),
        esporteNome: String(t.esporte_nome ?? "Esporte"),
        esporteId: Number(t.esporte_id ?? 0),
        dist: Number(t.dist_km ?? 99999),
        eid: Number(t.eid_time ?? 1),
        rank: Number(t.pontos_ranking ?? 0),
        modalidade: tipo,
        interesseMatch: t.interesse_match === "ranking" ? "ranking" : "ranking_e_amistoso",
        href: `/perfil-time/${t.id}?from=/match`,
        canChallenge: Boolean(t.can_challenge),
        challengeHint: Boolean(t.can_challenge)
          ? undefined
          : /^\d+$/.test(esporteSelecionado)
            ? `Somente o proprietário (capitão) pode desafiar. Crie sua ${tipo} neste esporte como líder.`
            : `Selecione um esporte e seja proprietário de uma ${tipo} para desafiar.`,
      };
    });
  }

  const canOrderByDistance = hasLocation;
  const filtered = cards
    .filter((c) => (!canOrderByDistance ? true : c.dist <= raio))
    .sort((a, b) => {
      if (a.dist !== b.dist) return a.dist - b.dist;
      if (sortBy === "match_ranking_points" && b.rank !== a.rank) return b.rank - a.rank;
      if (sortBy === "eid_score" && b.eid !== a.eid) return b.eid - a.eid;
      return a.nome.localeCompare(b.nome, "pt-BR");
    })
    .slice(0, 40);

  const baseParams = new URLSearchParams();
  baseParams.set("tipo", tipo);
  baseParams.set("esporte", /^\d+$/.test(esporteSelecionado) ? esporteSelecionado : "all");
  baseParams.set("raio", String(raio));
  baseParams.set("sort_by", sortBy);

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-4">
        <div className="relative mb-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 md:mb-4 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-6">
          <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-2xl md:font-black">Radar Match</h1>
          <p className="mt-1 hidden text-sm text-eid-text-secondary md:mt-2 md:block">
            A lista sempre prioriza proximidade. Depois, você escolhe o critério técnico: Nota EID ou Pontos de Rank.
          </p>
        </div>
        {sp.status === "enviado" ? (
          <p className="mb-3 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-sm text-eid-fg">
            Pedido de Match enviado. O adversário será notificado.
          </p>
        ) : null}
        <MatchLocationPrompt hasLocation />
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Modalidade</p>
            <div className="flex flex-wrap gap-2">
              {(["atleta", "dupla", "time"] as const).map((t) => {
                const qp = new URLSearchParams(baseParams);
                qp.set("tipo", t);
                return (
                  <Link key={t} href={`/match?${qp.toString()}`} className={`rounded-full border px-3 py-1 text-xs ${t === tipo ? "border-eid-primary-500/50 bg-eid-primary-500/15 text-eid-fg" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"}`}>
                    {t === "atleta" ? "Atletas" : t === "dupla" ? "Duplas" : "Times"}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Esporte</p>
            <div className="flex max-h-24 flex-wrap gap-2 overflow-auto">
              {[{ id: "all", nome: "Todos" }, ...((esportes ?? []).map((e) => ({ id: String(e.id), nome: e.nome })) ?? [])].map((e) => {
                const qp = new URLSearchParams(baseParams);
                qp.set("esporte", e.id === "all" ? "all" : e.id);
                return (
                  <Link key={e.id} href={`/match?${qp.toString()}`} className={`rounded-full border px-3 py-1 text-xs ${String(esporteSelecionado) === String(e.id) ? "border-eid-primary-500/50 bg-eid-primary-500/15 text-eid-fg" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"}`}>
                    {e.nome}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Raio</p>
            <div className="flex flex-wrap gap-2">
              {[10, 30, 50, 100].map((r) => {
                const qp = new URLSearchParams(baseParams);
                qp.set("raio", String(r));
                return (
                  <Link key={r} href={`/match?${qp.toString()}`} className={`rounded-full border px-3 py-1 text-xs ${r === raio ? "border-eid-primary-500/50 bg-eid-primary-500/15 text-eid-fg" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"}`}>
                    {r} km
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["eid_score", "Nota EID"],
                ["match_ranking_points", "Pontos Rank"],
              ].map(([k, label]) => {
                const qp = new URLSearchParams(baseParams);
                qp.set("sort_by", k);
                return (
                  <Link key={k} href={`/match?${qp.toString()}`} className={`rounded-full border px-3 py-1 text-xs ${k === sortBy ? "border-eid-primary-500/50 bg-eid-primary-500/15 text-eid-fg" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"}`}>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <section className="mt-4 grid gap-3">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
              Nenhum oponente encontrado com esses filtros.
            </p>
          ) : (
            filtered.map((c) => (
              <article
                key={`${c.modalidade}-${c.id}`}
                className="rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-eid-fg">{c.nome}</p>
                    <p className="text-xs text-eid-text-secondary">{c.esporteNome}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">{c.localizacao}</p>
                    <p className="mt-1 text-xs text-eid-primary-300">
                      {canOrderByDistance ? `${c.dist.toFixed(1).replace(".", ",")} km` : "Distância indisponível"}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-eid-text-muted">
                      {c.modalidade === "individual" ? "Individual" : c.modalidade === "dupla" ? "Dupla" : "Time"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:max-w-[14rem] sm:justify-end">
                    <EidNotaMetric value={c.eid} size="sm" />
                    <EidRankingPtsMetric value={c.rank} size="sm" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[11px] text-eid-text-secondary">
                    {c.interesseMatch === "ranking" ? "RANK" : "RANK + AMISTOSO"}
                  </span>
                  <Link href={c.href} className="ml-auto rounded-lg border border-eid-primary-500/40 px-3 py-1.5 text-xs font-semibold text-eid-fg">
                    Ver perfil
                  </Link>
                  {c.canChallenge ? (
                    <Link
                      href={`/desafio?id=${encodeURIComponent(c.id)}&tipo=${encodeURIComponent(c.modalidade)}&esporte=${encodeURIComponent(String(c.esporteId > 0 ? c.esporteId : esporteSelecionado))}`}
                      className="rounded-lg border border-eid-primary-500/40 px-3 py-1.5 text-xs font-semibold text-eid-fg"
                    >
                      Desafiar
                    </Link>
                  ) : (
                    <span className="text-[11px] text-eid-text-secondary">{c.challengeHint}</span>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </>
  );
}
