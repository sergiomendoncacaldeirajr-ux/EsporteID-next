import Link from "next/link";
import { redirect } from "next/navigation";
import { MatchLocationPrompt } from "@/components/match/match-location-prompt";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";

type RadarTipo = "atleta" | "dupla" | "time";
type Ordenar = "proximo" | "rank" | "eid";

type Search = {
  tipo?: string;
  esporte?: string;
  raio?: string;
  ordenar?: string;
  status?: string;
};

function toTipo(v: string | undefined): RadarTipo {
  return v === "dupla" || v === "time" ? v : "atleta";
}

function toOrdenar(v: string | undefined): Ordenar {
  return v === "rank" || v === "eid" ? v : "proximo";
}

function toRaio(v: string | undefined): number {
  const n = Number(v ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.max(5, Math.min(150, Math.round(n)));
}

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 99999;
  }
  const degLen = 111.12;
  const x = (lat2 - lat1) * degLen;
  const y = (lng2 - lng1) * degLen * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(x * x + y * y);
}

export default async function MatchPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const sp = (await searchParams) ?? {};
  const tipo = toTipo(sp.tipo);
  const ordenar = toOrdenar(sp.ordenar);
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
    let q = supabase
      .from("usuario_eid")
      .select("id, usuario_id, esporte_id, nota_eid, pontos_ranking, modalidade_match, interesse_match, profiles!inner(id, nome, localizacao, lat, lng), esportes!inner(nome)")
      .neq("usuario_id", user.id)
      .order("id", { ascending: true });
    if (/^\d+$/.test(esporteSelecionado)) q = q.eq("esporte_id", Number(esporteSelecionado));
    const { data } = await q.limit(500);

    const base = /^\d+$/.test(esporteSelecionado)
      ? data ?? []
      : (data ?? []).filter((row, idx, arr) => arr.findIndex((x) => x.usuario_id === row.usuario_id) === idx);

    cards = base.map((row) => {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const esp = Array.isArray(row.esportes) ? row.esportes[0] : row.esportes;
      const lat = Number(p?.lat ?? NaN);
      const lng = Number(p?.lng ?? NaN);
      return {
        id: String(p?.id ?? row.usuario_id),
        nome: String(p?.nome ?? "Atleta"),
        localizacao: String(p?.localizacao ?? "Localização não informada"),
        esporteNome: String(esp?.nome ?? "Esporte"),
        esporteId: Number(row.esporte_id ?? 0),
        dist: distanciaKm(Number(me.lat), Number(me.lng), lat, lng),
        eid: Number(row.nota_eid ?? 1),
        rank: Number(row.pontos_ranking ?? 0),
        modalidade: row.modalidade_match === "dupla" || row.modalidade_match === "time" ? row.modalidade_match : "individual",
        interesseMatch: row.interesse_match === "ranking" ? "ranking" : "ranking_e_amistoso",
        href: `/perfil/${encodeURIComponent(String(p?.id ?? row.usuario_id ?? ""))}?from=/match`,
        canChallenge: true,
      };
    });
  } else {
    let q = supabase
      .from("times")
      .select("id, nome, tipo, esporte_id, localizacao, lat, lng, pontos_ranking, eid_time, interesse_rank_match, disponivel_amistoso, criador_id, esportes(nome)")
      .eq("tipo", tipo)
      .order("id", { ascending: false });
    if (/^\d+$/.test(esporteSelecionado)) q = q.eq("esporte_id", Number(esporteSelecionado));
    const { data: times } = await q.limit(300);
    let qMine = supabase.from("times").select("id").eq("criador_id", user.id).eq("tipo", tipo);
    if (/^\d+$/.test(esporteSelecionado)) {
      qMine = qMine.eq("esporte_id", Number(esporteSelecionado));
    }
    const { data: minhasFormacoes } = await qMine.limit(1);
    const canChallengeTeam = (minhasFormacoes ?? []).length > 0;

    const criadores = Array.from(new Set((times ?? []).map((t) => t.criador_id).filter(Boolean)));
    const { data: criadoresProfiles } = criadores.length
      ? await supabase.from("profiles").select("id, lat, lng").in("id", criadores)
      : { data: [] };
    const mapCoords = new Map((criadoresProfiles ?? []).map((p) => [p.id, { lat: Number(p.lat ?? NaN), lng: Number(p.lng ?? NaN) }]));

    cards = (times ?? []).map((t) => {
      const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
      const lat = Number(t.lat ?? mapCoords.get(t.criador_id)?.lat ?? NaN);
      const lng = Number(t.lng ?? mapCoords.get(t.criador_id)?.lng ?? NaN);
      return {
        id: String(t.id),
        nome: String(t.nome ?? "Time"),
        localizacao: String(t.localizacao ?? "Localização não informada"),
        esporteNome: String(esp?.nome ?? "Esporte"),
        esporteId: Number(t.esporte_id ?? 0),
        dist: distanciaKm(Number(me.lat), Number(me.lng), lat, lng),
        eid: Number(t.eid_time ?? 1),
        rank: Number(t.pontos_ranking ?? 0),
        modalidade: tipo,
        interesseMatch: t.disponivel_amistoso ? "ranking_e_amistoso" : t.interesse_rank_match ? "ranking" : "ranking_e_amistoso",
        href: `/perfil-time/${t.id}?from=/match`,
        canChallenge: canChallengeTeam,
        challengeHint: canChallengeTeam
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
      if (ordenar === "rank") return b.rank - a.rank;
      if (ordenar === "eid") return b.eid - a.eid;
      return a.dist - b.dist;
    })
    .slice(0, 40);

  const baseParams = new URLSearchParams();
  baseParams.set("tipo", tipo);
  baseParams.set("esporte", /^\d+$/.test(esporteSelecionado) ? esporteSelecionado : "all");
  baseParams.set("raio", String(raio));
  baseParams.set("ordenar", ordenar);

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-4">
        <div className="relative mb-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 md:mb-4 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-6">
          <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-2xl md:font-black">Radar Match</h1>
          <p className="mt-1 hidden text-sm text-eid-text-secondary md:mt-2 md:block">
            Filtre por modalidade, esporte, raio e ordenação para encontrar oponentes.
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
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Ordenar</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["proximo", "Mais próximo"],
                ["rank", "Ranking"],
                ["eid", "EID"],
              ].map(([k, label]) => {
                const qp = new URLSearchParams(baseParams);
                qp.set("ordenar", k);
                return (
                  <Link key={k} href={`/match?${qp.toString()}`} className={`rounded-full border px-3 py-1 text-xs ${k === ordenar ? "border-eid-primary-500/50 bg-eid-primary-500/15 text-eid-fg" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"}`}>
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
                className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-eid-fg">{c.nome}</p>
                    <p className="text-xs text-eid-text-secondary">{c.esporteNome}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">{c.localizacao}</p>
                    <p className="mt-1 text-xs text-eid-primary-300">
                      {canOrderByDistance ? `${c.dist.toFixed(1).replace(".", ",")} km` : "Distância indisponível"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-eid-primary-300">EID {c.eid.toFixed(1)}</p>
                    <p className="text-xs text-eid-text-secondary">Ranking {c.rank}</p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">
                      {c.modalidade === "individual" ? "Individual" : c.modalidade === "dupla" ? "Dupla" : "Time"}
                    </p>
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
