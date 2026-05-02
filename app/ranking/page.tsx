import { redirect } from "next/navigation";
import Image from "next/image";
import {
  RankingFilterBar,
  RankingGenderToggle,
  RankingPeriodToggle,
  RankingRankToggle,
  RankingPodium,
  RankingRow,
  ViewerRankCard,
  type PodiumSlot,
} from "@/components/ranking/ranking-compact";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { parseRankingSearch, rankingHref, type RankingSearchState } from "@/lib/ranking/ranking-href";
import { isSportRankingEnabled } from "@/lib/sport-capabilities";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { MatchRankingRulesModal } from "@/components/match/match-ranking-rules-modal";
import { RankingLoadMoreButton } from "@/components/ranking/ranking-load-more-button";

export const metadata = {
  title: "Ranking",
  description: "Ranking EsporteID",
};

/** Mesmo padrão dos cartões da dashboard (`dashboardSectionOuter` / `dashboardSectionHead`). */
const rankingCardShellClass =
  "eid-ranking-card overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 shadow-none";

const rankingCardHeadClass =
  "eid-ranking-card-head flex items-center justify-between gap-3 border-b border-transparent bg-transparent px-3 py-2.5 shadow-none sm:px-4";

const rankingCardHeadWrapClass =
  "eid-ranking-card-head flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-transparent bg-transparent px-3 py-3 shadow-none sm:px-4";

const rankingSectionTitleClass =
  "eid-ranking-section-title text-[11px] font-black uppercase tracking-[0.08em] text-eid-primary-400";

const rankingBadgePrimaryClass =
  "eid-ranking-badge inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]";

const rankingBadgeActionClass =
  "eid-ranking-badge-action inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-action-500)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-action-500)_10%,transparent)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-action-500)_32%)]";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileMini = { nome?: string | null; avatar_url?: string | null; localizacao?: string | null; genero?: string | null };
type SportMini = { nome?: string | null };

type UsuarioEidRow = {
  usuario_id: string;
  esporte_id: number;
  nota_eid?: number | null;
  pontos_ranking?: number | null;
  vitorias?: number | null;
  derrotas?: number | null;
  posicao_rank?: number | null;
  profiles?: ProfileMini | ProfileMini[] | null;
  esportes?: SportMini | SportMini[] | null;
};

type TimeRow = {
  id: number;
  nome?: string | null;
  escudo?: string | null;
  localizacao?: string | null;
  criador_id?: string | null;
  genero?: string | null;
  pontos_ranking?: number | null;
  eid_time?: number | null;
  esporte_id?: number | null;
  tipo?: string | null;
  esportes?: SportMini | SportMini[] | null;
};

type MeuEsporteRow = {
  esporte_id: number;
  esportes?: SportMini | SportMini[] | null;
};

type UnifiedRank = {
  key: string;
  nome: string;
  avatarUrl: string | null;
  pontos: number;
  notaEid: number;
  vitorias?: number | null;
  derrotas?: number | null;
  posicaoRank?: number | null;
  usuarioId?: string;
  timeId?: number;
  href: string;
};
type PartidaPeriodoRow = {
  jogador1_id?: string | null;
  jogador2_id?: string | null;
  time1_id?: number | string | null;
  time2_id?: number | string | null;
  data_resultado?: string | null;
  data_partida?: string | null;
  data_registro?: string | null;
};

type PartidaRankingRow = {
  id?: number | null;
  jogador1_id?: string | null;
  jogador2_id?: string | null;
  time1_id?: number | null;
  time2_id?: number | null;
  vencedor_id?: number | null;
  placar_1?: number | null;
  placar_2?: number | null;
  placar_desafiante?: number | null;
  placar_desafiado?: number | null;
  data_resultado?: string | null;
  data_partida?: string | null;
  data_registro?: string | null;
};

type GeneroBucket = "masculino" | "feminino" | "misto";

function timestampPartidaNoMesAtual(p: PartidaPeriodoRow, monthStartMs: number, nextMonthStartMs: number): boolean {
  const raw = p.data_resultado ?? p.data_partida ?? p.data_registro;
  if (raw == null || raw === "") return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= monthStartMs && t < nextMonthStartMs;
}

function numTimeId(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const LIST_PAGE_SIZE = 10;

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function normalizeCityHint(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const part = s.split(",")[0]?.trim() ?? s;
  return normalizeSearchText(part);
}

function cidadeDisplayFromProfile(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const part = s.split(",")[0]?.trim() ?? s;
  return part || null;
}

function normalizeSearchText(raw: string | null | undefined): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bestViewerRankIndex(rows: UnifiedRank[], viewerId: string, teamIds: Set<number>, mode: RankingSearchState["tipo"]): number | null {
  let best: number | null = null;
  rows.forEach((r, i) => {
    if (mode === "individual") {
      if (r.usuarioId === viewerId) {
        if (best === null || i < best) best = i;
      }
    } else {
      if (r.timeId !== undefined && teamIds.has(r.timeId)) {
        if (best === null || i < best) best = i;
      }
    }
  });
  return best;
}

function toPodiumSlot(row: UnifiedRank | undefined, place: string): PodiumSlot | null {
  if (!row) return null;
  return {
    place,
    nome: row.nome,
    avatarUrl: row.avatarUrl,
    notaEid: row.notaEid,
    pontos: row.pontos,
    href: row.href,
  };
}

function normalizeGeneroRanking(raw: string | null | undefined): "masculino" | "feminino" | "" {
  const g = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (g === "masculino") return "masculino";
  if (g === "feminino") return "feminino";
  return "";
}

function matchBucketIndividual(g1: string | null | undefined, g2: string | null | undefined): GeneroBucket {
  const a = normalizeGeneroRanking(g1);
  const b = normalizeGeneroRanking(g2);
  if (a && a === b) return a;
  return "misto";
}

function teamBucketFromMembers(memberGeneros: Array<string | null | undefined>): GeneroBucket {
  const set = new Set(memberGeneros.map((g) => normalizeGeneroRanking(g)).filter(Boolean));
  if (set.size === 1) return Array.from(set)[0] as GeneroBucket;
  return "misto";
}

function matchBucketFormacoes(t1: GeneroBucket, t2: GeneroBucket): GeneroBucket {
  if (t1 === t2 && (t1 === "masculino" || t1 === "feminino")) return t1;
  return "misto";
}

export default async function RankingPage({ searchParams }: Props) {
  const spRaw = (await searchParams) ?? {};
  const state = parseRankingSearch(spRaw);
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/ranking");
  const viewerId = user.id;

  const [{ data: me }, { data: meusEsportesRaw }, { data: criados }, { data: membro }, { data: esportesCatalogoRaw }] = await Promise.all([
    supabase.from("profiles").select("localizacao, genero").eq("id", viewerId).maybeSingle(),
    supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", viewerId).order("esporte_id", { ascending: true }),
    supabase.from("times").select("id").eq("criador_id", viewerId),
    supabase.from("membros_time").select("time_id").eq("usuario_id", viewerId).eq("status", "ativo"),
    supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
  ]);

  const meusEsportes = (meusEsportesRaw ?? []) as MeuEsporteRow[];
  const esportePrincipalId = meusEsportes[0]?.esporte_id ?? null;
  const generoPerfil = normalizeGeneroRanking((me as { genero?: string | null } | null)?.genero ?? null) || "masculino";
  const generoSelecionado = (state.genero || generoPerfil) as RankingSearchState["genero"];
  const stateComGenero: RankingSearchState = { ...state, genero: generoSelecionado };

  const todosEsportes = (esportesCatalogoRaw ?? [])
    .filter((e): e is { id: number; nome: string | null } => typeof (e as { id?: number }).id === "number" && Number.isFinite((e as { id: number }).id))
    .filter((e) => isSportRankingEnabled(e.nome))
    .map((e) => ({
      id: e.id,
      nome: String(e.nome ?? "").trim() || "Esporte",
    }));

  const allEsporteIds = new Set(todosEsportes.map((e) => e.id));

  const parsedEsporteParam = Number(state.esporte);
  let selectedEsporteId: number | null = null;
  if (Number.isFinite(parsedEsporteParam) && parsedEsporteParam > 0 && allEsporteIds.has(parsedEsporteParam)) {
    selectedEsporteId = parsedEsporteParam;
  } else if (esportePrincipalId != null && allEsporteIds.has(esportePrincipalId)) {
    selectedEsporteId = esportePrincipalId;
  } else {
    selectedEsporteId = todosEsportes[0]?.id ?? null;
  }

  const cidadeDisplay = cidadeDisplayFromProfile(me?.localizacao ?? null);
  const needsCidadeFallback = state.local === "cidade" && !cidadeDisplay;

  const myTeamIds = new Set<number>();
  for (const r of criados ?? []) {
    if (typeof r.id === "number") myTeamIds.add(r.id);
  }
  for (const r of membro ?? []) {
    const id = Number(r.time_id);
    if (Number.isFinite(id)) myTeamIds.add(id);
  }

  const cityNeedle = state.local === "cidade" ? normalizeCityHint(me?.localizacao ?? null) : "";

  let rankingAll: UnifiedRank[] = [];
  let partidasRanking: PartidaRankingRow[] = [];
  let pontosVitoriaRegra = 10;
  let pontosDerrotaRegra = 4;

  if (selectedEsporteId != null && stateComGenero.rank === "match") {
    const [{ data: regras }, { data: partidasBrutas }] = await Promise.all([
      supabase.from("regras_ranking_match").select("pontos_vitoria, pontos_derrota").eq("esporte_id", selectedEsporteId).maybeSingle(),
      supabase
        .from("partidas")
        .select("id, jogador1_id, jogador2_id, time1_id, time2_id, vencedor_id, placar_1, placar_2, placar_desafiante, placar_desafiado, data_resultado, data_partida, data_registro")
        .eq("esporte_id", selectedEsporteId)
        .eq("tipo_partida", "ranking")
        .in("status", ["encerrada", "finalizada", "concluida", "concluída", "validada"]),
    ]);
    pontosVitoriaRegra = Number.isFinite(Number(regras?.pontos_vitoria)) ? Number(regras?.pontos_vitoria) : 10;
    pontosDerrotaRegra = Number.isFinite(Number(regras?.pontos_derrota)) ? Number(regras?.pontos_derrota) : 4;
    partidasRanking = (partidasBrutas ?? []) as PartidaRankingRow[];
  }

  if (selectedEsporteId != null) {
    if (state.tipo === "individual") {
      let q = cityNeedle
        ? supabase
            .from("usuario_eid")
            .select(
              "usuario_id, esporte_id, nota_eid, pontos_ranking, vitorias, derrotas, posicao_rank, profiles!inner(nome, avatar_url, localizacao, genero)"
            )
            .eq("esporte_id", selectedEsporteId)
        : supabase
            .from("usuario_eid")
            .select("usuario_id, esporte_id, nota_eid, pontos_ranking, vitorias, derrotas, posicao_rank, profiles!inner(nome, avatar_url, genero)")
            .eq("esporte_id", selectedEsporteId);
      q = state.rank === "match" ? q.order("pontos_ranking", { ascending: false }) : q.order("nota_eid", { ascending: false });
      const { data: raw } = await q;
      const rows = ((raw ?? []) as UsuarioEidRow[]).filter((r) => {
        if (!cityNeedle) return true;
        const p = firstOf(r.profiles);
        const loc = normalizeSearchText(p?.localizacao ?? "");
        return loc.includes(cityNeedle);
      });
      const perfilGeneroByUser = new Map<string, "masculino" | "feminino" | "">();
      for (const r of rows) {
        const p = firstOf(r.profiles);
        perfilGeneroByUser.set(String(r.usuario_id), normalizeGeneroRanking(p?.genero ?? null));
      }
      const pontosByUserBucket = new Map<string, Record<GeneroBucket, number>>();
      const winsByUserBucket = new Map<string, Record<GeneroBucket, number>>();
      const lossesByUserBucket = new Map<string, Record<GeneroBucket, number>>();
      const ensureUserBuckets = (uid: string) => {
        if (!pontosByUserBucket.has(uid)) pontosByUserBucket.set(uid, { masculino: 0, feminino: 0, misto: 0 });
        if (!winsByUserBucket.has(uid)) winsByUserBucket.set(uid, { masculino: 0, feminino: 0, misto: 0 });
        if (!lossesByUserBucket.has(uid)) lossesByUserBucket.set(uid, { masculino: 0, feminino: 0, misto: 0 });
      };
      if (stateComGenero.rank === "match") {
        const ordered = [...partidasRanking].sort((a, b) => {
          const ta = new Date(a.data_resultado ?? a.data_partida ?? a.data_registro ?? 0).getTime();
          const tb = new Date(b.data_resultado ?? b.data_partida ?? b.data_registro ?? 0).getTime();
          return ta - tb;
        });
        for (const p of ordered) {
          const u1 = String(p.jogador1_id ?? "");
          const u2 = String(p.jogador2_id ?? "");
          if (!u1 || !u2) continue;
          const s1 = Number(p.placar_1 ?? p.placar_desafiante ?? NaN);
          const s2 = Number(p.placar_2 ?? p.placar_desafiado ?? NaN);
          if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) continue;
          const winner = s1 > s2 ? u1 : u2;
          const loser = s1 > s2 ? u2 : u1;
          const bucket = matchBucketIndividual(perfilGeneroByUser.get(u1), perfilGeneroByUser.get(u2));
          ensureUserBuckets(winner);
          ensureUserBuckets(loser);
          const wBase = pontosByUserBucket.get(winner)![bucket];
          const lBase = pontosByUserBucket.get(loser)![bucket];
          const upsetCap = Math.max(0, Math.floor(pontosVitoriaRegra * 0.2));
          const upset = lBase > wBase ? upsetCap : 0;
          pontosByUserBucket.get(winner)![bucket] += pontosVitoriaRegra + upset;
          pontosByUserBucket.get(loser)![bucket] += pontosDerrotaRegra;
          winsByUserBucket.get(winner)![bucket] += 1;
          lossesByUserBucket.get(loser)![bucket] += 1;
        }
      }
      rankingAll = rows
        .filter((r) => {
          if (stateComGenero.rank !== "match") return true;
          const p = firstOf(r.profiles);
          const g = normalizeGeneroRanking(p?.genero ?? null);
          if (stateComGenero.genero === "masculino" || stateComGenero.genero === "feminino") return g === stateComGenero.genero;
          if (stateComGenero.genero === "misto" && stateComGenero.rank === "match") {
            const uid = String(r.usuario_id);
            const rec = pontosByUserBucket.get(uid);
            return (rec?.misto ?? 0) > 0;
          }
          return true;
        })
        .map((r) => {
        const p = firstOf(r.profiles);
        const uid = r.usuario_id;
        const pontosGenero =
          stateComGenero.rank === "match"
            ? (pontosByUserBucket.get(uid)?.[stateComGenero.genero as GeneroBucket] ?? 0)
            : Number(r.pontos_ranking ?? 0);
        const vitoriasGenero =
          stateComGenero.rank === "match"
            ? (winsByUserBucket.get(uid)?.[stateComGenero.genero as GeneroBucket] ?? 0)
            : Number(r.vitorias ?? 0);
        const derrotasGenero =
          stateComGenero.rank === "match"
            ? (lossesByUserBucket.get(uid)?.[stateComGenero.genero as GeneroBucket] ?? 0)
            : Number(r.derrotas ?? 0);
        return {
          key: `u-${uid}-${r.esporte_id}`,
          usuarioId: uid,
          nome: p?.nome ?? "Atleta",
          avatarUrl: p?.avatar_url ?? null,
          pontos: pontosGenero,
          notaEid: Number(r.nota_eid ?? 0),
          vitorias: vitoriasGenero,
          derrotas: derrotasGenero,
          posicaoRank: Number.isFinite(Number(r.posicao_rank)) ? Number(r.posicao_rank) : null,
          href: `/perfil/${uid}`,
        };
        });
    } else {
      let q = cityNeedle
        ? supabase
            .from("times")
            .select("id, nome, escudo, localizacao, pontos_ranking, eid_time, esporte_id, tipo, criador_id, genero")
            .eq("esporte_id", selectedEsporteId)
        : supabase
            .from("times")
            .select("id, nome, escudo, pontos_ranking, eid_time, esporte_id, tipo, criador_id, genero")
            .eq("esporte_id", selectedEsporteId);
      q = state.rank === "match" ? q.order("pontos_ranking", { ascending: false }) : q.order("eid_time", { ascending: false });
      const { data: raw } = await q;
      const tipoMatches = (r: TimeRow): boolean => {
        const t = String(r.tipo ?? "")
          .trim()
          .toLowerCase();
        if (state.tipo === "dupla") return t === "dupla" || t === "duplas";
        // Time: considera qualquer formação que não seja explícita como dupla.
        return t !== "dupla" && t !== "duplas";
      };
      const baseRows = ((raw ?? []) as TimeRow[]).filter(tipoMatches);
      const rows = cityNeedle
        ? baseRows.filter((r) => normalizeSearchText(r.localizacao ?? "").includes(cityNeedle))
        : baseRows;
      const teamIds = rows.map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
      const { data: rosterRows } =
        teamIds.length > 0
          ? await supabase
              .from("membros_time")
              .select("time_id, usuario_id")
              .in("time_id", teamIds)
              .in("status", ["ativo", "aceito", "aprovado"])
          : { data: [] as Array<{ time_id?: number | null; usuario_id?: string | null }> };
      const membersByTeam = new Map<number, Set<string>>();
      const profileIds = new Set<string>();
      for (const r of rows) {
        if (r.criador_id) profileIds.add(String(r.criador_id));
        if (!membersByTeam.has(Number(r.id))) membersByTeam.set(Number(r.id), new Set<string>());
      }
      for (const m of rosterRows ?? []) {
        const tid = Number(m.time_id ?? 0);
        const uid = String(m.usuario_id ?? "");
        if (!tid || !uid) continue;
        if (!membersByTeam.has(tid)) membersByTeam.set(tid, new Set<string>());
        membersByTeam.get(tid)!.add(uid);
        profileIds.add(uid);
      }
      const { data: perfilGenerosRows } =
        profileIds.size > 0
          ? await supabase.from("profiles").select("id, genero").in("id", Array.from(profileIds))
          : { data: [] as Array<{ id?: string | null; genero?: string | null }> };
      const generoByProfile = new Map<string, string | null>();
      for (const p of perfilGenerosRows ?? []) generoByProfile.set(String(p.id ?? ""), p.genero ?? null);
      const generoByTeam = new Map<number, GeneroBucket>();
      for (const t of rows) {
        const ids = new Set<string>([String(t.criador_id ?? "")]);
        for (const mid of membersByTeam.get(Number(t.id)) ?? new Set<string>()) ids.add(mid);
        const generos = Array.from(ids).map((id) => generoByProfile.get(id) ?? null);
        generoByTeam.set(Number(t.id), teamBucketFromMembers(generos));
      }
      const pontosByTeamBucket = new Map<number, Record<GeneroBucket, number>>();
      const winsByTeamBucket = new Map<number, Record<GeneroBucket, number>>();
      const lossesByTeamBucket = new Map<number, Record<GeneroBucket, number>>();
      const ensureTeamBuckets = (tid: number) => {
        if (!pontosByTeamBucket.has(tid)) pontosByTeamBucket.set(tid, { masculino: 0, feminino: 0, misto: 0 });
        if (!winsByTeamBucket.has(tid)) winsByTeamBucket.set(tid, { masculino: 0, feminino: 0, misto: 0 });
        if (!lossesByTeamBucket.has(tid)) lossesByTeamBucket.set(tid, { masculino: 0, feminino: 0, misto: 0 });
      };
      if (stateComGenero.rank === "match") {
        const ordered = [...partidasRanking].sort((a, b) => {
          const ta = new Date(a.data_resultado ?? a.data_partida ?? a.data_registro ?? 0).getTime();
          const tb = new Date(b.data_resultado ?? b.data_partida ?? b.data_registro ?? 0).getTime();
          return ta - tb;
        });
        for (const p of ordered) {
          const t1 = Number(p.time1_id ?? 0);
          const t2 = Number(p.time2_id ?? 0);
          if (!t1 || !t2) continue;
          const s1 = Number(p.placar_1 ?? p.placar_desafiante ?? NaN);
          const s2 = Number(p.placar_2 ?? p.placar_desafiado ?? NaN);
          let winner = 0;
          let loser = 0;
          if (Number(p.vencedor_id ?? 0) === t1 || Number(p.vencedor_id ?? 0) === t2) {
            winner = Number(p.vencedor_id ?? 0);
            loser = winner === t1 ? t2 : t1;
          } else if (Number.isFinite(s1) && Number.isFinite(s2) && s1 !== s2) {
            winner = s1 > s2 ? t1 : t2;
            loser = winner === t1 ? t2 : t1;
          } else {
            continue;
          }
          const g1 = generoByTeam.get(t1) ?? "misto";
          const g2 = generoByTeam.get(t2) ?? "misto";
          const bucket = matchBucketFormacoes(g1, g2);
          ensureTeamBuckets(winner);
          ensureTeamBuckets(loser);
          const wBase = pontosByTeamBucket.get(winner)![bucket];
          const lBase = pontosByTeamBucket.get(loser)![bucket];
          const upsetCap = Math.max(0, Math.floor(pontosVitoriaRegra * 0.2));
          const upset = lBase > wBase ? upsetCap : 0;
          pontosByTeamBucket.get(winner)![bucket] += pontosVitoriaRegra + upset;
          pontosByTeamBucket.get(loser)![bucket] += pontosDerrotaRegra;
          winsByTeamBucket.get(winner)![bucket] += 1;
          lossesByTeamBucket.get(loser)![bucket] += 1;
        }
      }
      rankingAll = rows
        .filter((r) => {
          if (stateComGenero.rank !== "match") return true;
          const teamGenero = generoByTeam.get(Number(r.id)) ?? "misto";
          if (stateComGenero.genero === "misto") return teamGenero === "misto";
          if (stateComGenero.genero === "masculino" || stateComGenero.genero === "feminino") return teamGenero === stateComGenero.genero;
          return true;
        })
        .map((r) => ({
        key: `t-${r.id}-${r.esporte_id ?? 0}`,
        timeId: r.id,
        nome: r.nome?.trim() || "Equipe",
        avatarUrl: r.escudo ?? null,
        pontos:
          stateComGenero.rank === "match"
            ? (pontosByTeamBucket.get(Number(r.id))?.[stateComGenero.genero as GeneroBucket] ?? 0)
            : Number(r.pontos_ranking ?? 0),
        notaEid: Number(r.eid_time ?? 0),
        vitorias:
          stateComGenero.rank === "match"
            ? (winsByTeamBucket.get(Number(r.id))?.[stateComGenero.genero as GeneroBucket] ?? 0)
            : null,
        derrotas:
          stateComGenero.rank === "match"
            ? (lossesByTeamBucket.get(Number(r.id))?.[stateComGenero.genero as GeneroBucket] ?? 0)
            : null,
        href: state.tipo === "dupla" ? `/perfil-dupla/${r.id}` : `/perfil-time/${r.id}`,
      }));
    }
  }

  if (state.periodo === "mes" && selectedEsporteId != null) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthStartMs = monthStart.getTime();
    const nextMonthStartMs = nextMonthStart.getTime();
    const monthStartIso = monthStart.toISOString();
    const nextMonthStartIso = nextMonthStart.toISOString();
    const partidaSelect =
      state.tipo === "individual"
        ? "jogador1_id, jogador2_id, data_resultado, data_partida, data_registro"
        : "time1_id, time2_id, data_resultado, data_partida, data_registro";

    const { data: partidasBrutas } = await supabase
      .from("partidas")
      .select(partidaSelect)
      .eq("esporte_id", selectedEsporteId)
      .or(
        `and(data_resultado.gte.${monthStartIso},data_resultado.lt.${nextMonthStartIso}),and(data_partida.gte.${monthStartIso},data_partida.lt.${nextMonthStartIso}),and(data_registro.gte.${monthStartIso},data_registro.lt.${nextMonthStartIso})`
      )
      .in("status", ["encerrada", "finalizada", "concluida", "concluída", "validada"]);

    const rows = ((partidasBrutas ?? []) as PartidaPeriodoRow[]).filter((p) =>
      timestampPartidaNoMesAtual(p, monthStartMs, nextMonthStartMs)
    );

    const activeUsers = new Set<string>();
    const activeTeams = new Set<number>();
    rows.forEach((p) => {
      if (p.jogador1_id) activeUsers.add(String(p.jogador1_id));
      if (p.jogador2_id) activeUsers.add(String(p.jogador2_id));
      const t1 = numTimeId(p.time1_id);
      const t2 = numTimeId(p.time2_id);
      if (t1 != null) activeTeams.add(t1);
      if (t2 != null) activeTeams.add(t2);
    });

    rankingAll = rankingAll.filter((r) => {
      if (state.tipo === "individual") return !!r.usuarioId && activeUsers.has(String(r.usuarioId));
      return typeof r.timeId === "number" && activeTeams.has(r.timeId);
    });
  }
  rankingAll.sort((a, b) => {
    const metricA = stateComGenero.rank === "eid" ? a.notaEid : a.pontos;
    const metricB = stateComGenero.rank === "eid" ? b.notaEid : b.pontos;
    if (metricB !== metricA) return metricB - metricA;
    return b.notaEid - a.notaEid;
  });

  const podiumRows = rankingAll.slice(0, 3);
  const afterPodium = rankingAll.slice(3);
  const start = (state.page - 1) * LIST_PAGE_SIZE;
  const pageSlice = afterPodium.slice(start, start + LIST_PAGE_SIZE);
  const hasMore = afterPodium.length > start + LIST_PAGE_SIZE;

  const viewerIdx = bestViewerRankIndex(rankingAll, viewerId, myTeamIds, state.tipo);
  const viewerRank = viewerIdx === null ? null : viewerIdx + 1;
  const showViewerCard = viewerRank !== null && viewerRank > 10;

  const podiumSecond = toPodiumSlot(podiumRows[1], "2º");
  const podiumFirst = toPodiumSlot(podiumRows[0], "1º");
  const podiumThird = toPodiumSlot(podiumRows[2], "3º");

  const noCatalogHint = todosEsportes.length === 0;
  const esporteNomeAtual =
    selectedEsporteId != null ? todosEsportes.find((e) => e.id === selectedEsporteId)?.nome ?? null : null;
  const rankBadgeLabel = state.rank === "eid" ? "EID" : "Desafio";
  const periodoBadgeLabel = state.periodo === "mes" ? "Mês" : "Ano";

  return (
    <div className="relative z-0 flex w-full min-w-0 flex-col" data-eid-ranking-page data-eid-touch-ui-compact="true">
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48 max-h-[24rem] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.11),transparent_55%)] sm:h-64"
        aria-hidden
      />
      <main className="relative z-[1] mx-auto flex w-full min-w-0 max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] pt-0 sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]">
        <div className={`eid-ranking-hero mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-6 sm:py-5`}>
          <div className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_320px] sm:gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-eid-action-400 sm:text-[13px]">Painel competitivo</p>
              <h1 className="mt-1 text-[18px] font-black leading-none tracking-tight text-eid-fg sm:text-[42px]">Ranking EID</h1>
              <p className="mt-1.5 max-w-[30ch] text-[9px] leading-relaxed text-eid-text-secondary sm:mt-3 sm:max-w-[36ch] sm:text-[18px] sm:leading-relaxed">
                Posições por esporte, modalidade e período. Compare desafios (pontos) ou nota EID.
              </p>
            </div>
            <div className="block justify-self-end" aria-hidden>
              <div className="relative h-[82px] w-[132px] overflow-hidden sm:h-[165px] sm:w-[320px]">
                <Image
                  src="/ranking-podio-alpha.png"
                  alt=""
                  fill
                  unoptimized
                  className="object-contain object-center"
                />
              </div>
            </div>
          </div>
        </div>

        <section className="mt-4 md:mt-6">
          <RankingFilterBar
            state={stateComGenero}
            principalEsporteId={esportePrincipalId}
            selectedEsporteId={selectedEsporteId}
            cidadeDisplay={cidadeDisplay}
            needsCidadeFallback={needsCidadeFallback}
            todosEsportes={todosEsportes}
          />
        </section>

        {noCatalogHint ? (
          <p className="eid-ranking-empty mt-4 rounded-xl border border-transparent bg-eid-surface/40 p-5 text-center text-sm leading-relaxed text-eid-text-secondary shadow-none">
            Nenhum esporte disponível no momento.
          </p>
        ) : (
          <>
            {state.page === 1 ? (
              <section className="mt-4 md:mt-6">
                <RankingPodium
                  second={podiumSecond}
                  first={podiumFirst}
                  third={podiumThird}
                  rankKind={state.rank}
                  genderToggle={
                    state.rank === "match" ? (
                      <RankingGenderToggle state={stateComGenero} principalEsporteId={esportePrincipalId} />
                    ) : undefined
                  }
                  rankToggle={<RankingRankToggle state={stateComGenero} principalEsporteId={esportePrincipalId} />}
                  periodToggle={<RankingPeriodToggle state={stateComGenero} principalEsporteId={esportePrincipalId} />}
                />
              </section>
            ) : null}

            {showViewerCard && viewerRank !== null ? (
              <div className="mt-3 md:mt-4">
                <ViewerRankCard rank={viewerRank} />
              </div>
            ) : null}

            {rankingAll.length === 0 ? (
              <p className="eid-ranking-empty mt-4 rounded-xl border border-transparent bg-eid-surface/40 p-6 text-center text-sm text-eid-text-secondary shadow-none">
                Nenhum resultado para estes filtros.
              </p>
            ) : null}

            {rankingAll.length > 0 ? (
              <>
                <section className="relative z-[1] mt-4 md:mt-6">
                  <div className={rankingCardShellClass}>
                    <div className={rankingCardHeadWrapClass}>
                      <h2 className={rankingSectionTitleClass}>Classificação</h2>
                      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                        {esporteNomeAtual ? (
                          <span className={rankingBadgeActionClass}>{esporteNomeAtual}</span>
                        ) : null}
                        <span className={rankingBadgePrimaryClass}>
                          {rankBadgeLabel} · {periodoBadgeLabel}
                        </span>
                      </div>
                    </div>
                    <div className="eid-ranking-list-inner px-2.5 sm:px-3">
                    {pageSlice.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-center">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] shadow-[0_8px_16px_-12px_rgba(37,99,235,0.55)]"
                          aria-hidden
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                            <path d="M7 4h10v2h2a1 1 0 0 1 1 1v2a4.5 4.5 0 0 1-4 4.47A5.02 5.02 0 0 1 13 16.8V19h3v2H8v-2h3v-2.2a5.02 5.02 0 0 1-3-3.33A4.5 4.5 0 0 1 4 9V7a1 1 0 0 1 1-1h2V4zm-1 4v1a2.5 2.5 0 0 0 2 2.45V8H6zm12 0v3.45A2.5 2.5 0 0 0 20 9V8h-2z" />
                          </svg>
                        </span>
                        <p className="text-xs font-medium text-eid-text-secondary">Sem resultados aqui</p>
                      </div>
                    ) : (
                      pageSlice.map((row, i) => {
                        const rank = 4 + start + i;
                        return (
                          <RankingRow
                            key={row.key}
                            rank={rank}
                            nome={row.nome}
                            metricValue={state.rank === "eid" ? row.notaEid : row.pontos}
                            metricKind={state.rank === "eid" ? "eid" : "pontos"}
                            eidScore={row.notaEid}
                            vitorias={row.vitorias ?? null}
                            derrotas={row.derrotas ?? null}
                            rankDelta={row.posicaoRank != null ? row.posicaoRank - rank : null}
                            avatarUrl={row.avatarUrl}
                            href={row.href}
                          />
                        );
                      })
                    )}
                    </div>
                  </div>
                </section>

                {hasMore ? (
                  <div className="mt-0">
                    <RankingLoadMoreButton
                      href={rankingHref({ page: state.page + 1 }, stateComGenero, esportePrincipalId)}
                      className="eid-ranking-cta inline-flex min-h-10 w-full items-center justify-center gap-1.5 border-t border-transparent px-5 text-[11px] font-black uppercase tracking-[0.02em] text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] transition-all duration-200 ease-out motion-safe:transform-gpu hover:bg-eid-primary-500/10 active:scale-[0.995]"
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </main>
      <MatchRankingRulesModal />
    </div>
  );
}
