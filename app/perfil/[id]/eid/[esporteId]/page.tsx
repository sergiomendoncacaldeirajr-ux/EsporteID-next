import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD } from "@/components/perfil/profile-ui-tokens";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  fmtDataPtBr,
  PARTIDA_STATUS_CONCLUIDA,
  resultadoColetivo,
  type PartidaColetivaRow,
} from "@/lib/perfil/formacao-eid-stats";
import { labelModalidadesMatchPt, modalidadesFromUsuarioEidRow } from "@/lib/onboarding/modalidades-match";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string; esporteId: string }>;
  searchParams?: Promise<{ from?: string; embed?: string; view?: string }>;
};

type EidView = "all" | "individual" | "dupla" | "time";

function parseEsporteId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

function parseEidView(raw: string | undefined): EidView {
  if (raw === "individual" || raw === "dupla" || raw === "time") return raw;
  return "all";
}

function tempoDesdePrimeiraPartida(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return null;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "menos de 1 dia neste esporte (pelas partidas registradas)";
  if (days < 30) return `há ${days} dia${days !== 1 ? "s" : ""} neste esporte (desde a 1ª partida registrada)`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há cerca de ${months} mese${months !== 1 ? "s" : ""} neste esporte (desde a 1ª partida registrada)`;
  const years = Math.floor(months / 12);
  const restM = months % 12;
  if (restM === 0) return `há ${years} ano${years !== 1 ? "s" : ""} neste esporte (desde a 1ª partida registrada)`;
  return `há ${years}a ${restM}m neste esporte (desde a 1ª partida registrada)`;
}

function membroTimeAtivo(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "ativo" || s === "aceito" || s === "aprovado";
}

function resultadoPartida(
  profileId: string,
  p: { jogador1_id: string | null; jogador2_id: string | null; placar_1: number | null; placar_2: number | null }
): { label: "V" | "D" | "E" | "—"; tone: string } {
  const isP1 = p.jogador1_id === profileId;
  const isP2 = p.jogador2_id === profileId;
  if (!isP1 && !isP2) return { label: "—", tone: "text-eid-text-secondary" };
  const s1 = Number(p.placar_1);
  const s2 = Number(p.placar_2);
  if (!Number.isFinite(s1) || !Number.isFinite(s2)) return { label: "—", tone: "text-eid-text-secondary" };
  if (s1 === s2) return { label: "E", tone: "text-eid-primary-300" };
  if (isP1) {
    return s1 > s2
      ? { label: "V", tone: "text-emerald-400" }
      : { label: "D", tone: "text-rose-400" };
  }
  return s2 > s1
    ? { label: "V", tone: "text-emerald-400" }
    : { label: "D", tone: "text-rose-400" };
}

export default async function PerfilEidEsportePage({ params, searchParams }: Props) {
  const { id: profileId, esporteId: esporteRaw } = await params;
  const sp = (await searchParams) ?? {};
  const isEmbed = sp.embed === "1";
  const view = parseEidView(typeof sp.view === "string" ? sp.view : undefined);
  const backHref = resolveBackHref(sp.from, `/perfil/${profileId}`);

  const esporteId = parseEsporteId(esporteRaw);
  if (esporteId == null) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/perfil/${encodeURIComponent(profileId)}/eid/${esporteId}${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nome, username, avatar_url, foto_capa, localizacao, tempo_experiencia")
    .eq("id", profileId)
    .maybeSingle();
  if (!perfil) notFound();

  const { data: ue } = await supabase
    .from("usuario_eid")
    .select(
      "id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, interesse_match, modalidade_match, modalidades_match, posicao_rank, categoria, esportes(nome)"
    )
    .eq("usuario_id", profileId)
    .eq("esporte_id", esporteId)
    .maybeSingle();

  if (!ue) notFound();

  const esp = Array.isArray(ue.esportes) ? ue.esportes[0] : ue.esportes;
  const nomeEsporte = esp?.nome ?? "Esporte";

  type FormationRow = {
    id: number;
    nome: string;
    tipo: string | null;
    escudo: string | null;
    eid_time: number;
    pontos_ranking: number;
    duplaRegistroIds: number[];
  };

  const formationsMap = new Map<number, FormationRow>();

  const { data: timesCriador } = await supabase
    .from("times")
    .select("id, nome, tipo, escudo, eid_time, pontos_ranking")
    .eq("criador_id", profileId)
    .eq("esporte_id", esporteId);

  for (const t of timesCriador ?? []) {
    const id = Number(t.id);
    formationsMap.set(id, {
      id,
      nome: String(t.nome ?? `Equipe #${id}`),
      tipo: t.tipo ?? null,
      escudo: t.escudo ?? null,
      eid_time: Number(t.eid_time ?? 0),
      pontos_ranking: Number(t.pontos_ranking ?? 0),
      duplaRegistroIds: [],
    });
  }

  const { data: membrosRows } = await supabase
    .from("membros_time")
    .select("status, times(id, nome, tipo, escudo, eid_time, pontos_ranking, esporte_id)")
    .eq("usuario_id", profileId);

  for (const row of membrosRows ?? []) {
    if (!membroTimeAtivo(row.status)) continue;
    const tRaw = row.times as
      | {
          id: number;
          nome: string | null;
          tipo: string | null;
          escudo: string | null;
          eid_time: number | null;
          pontos_ranking: number | null;
          esporte_id: number | null;
        }
      | {
          id: number;
          nome: string | null;
          tipo: string | null;
          escudo: string | null;
          eid_time: number | null;
          pontos_ranking: number | null;
          esporte_id: number | null;
        }[]
      | null;
    const t = Array.isArray(tRaw) ? tRaw[0] : tRaw;
    if (!t || Number(t.esporte_id) !== esporteId) continue;
    const id = Number(t.id);
    if (!formationsMap.has(id)) {
      formationsMap.set(id, {
        id,
        nome: String(t.nome ?? `Equipe #${id}`),
        tipo: t.tipo ?? null,
        escudo: t.escudo ?? null,
        eid_time: Number(t.eid_time ?? 0),
        pontos_ranking: Number(t.pontos_ranking ?? 0),
        duplaRegistroIds: [],
      });
    }
  }

  const { data: duplasRows } = await supabase
    .from("duplas")
    .select("id, player1_id, player2_id")
    .eq("esporte_id", esporteId)
    .or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`);

  const duplasSemTime: { id: number }[] = [];

  for (const d of duplasRows ?? []) {
    const p1 = d.player1_id as string;
    const p2 = d.player2_id as string;
    const tid = await resolverTimeIdParaDuplaRegistrada(supabase, p1, p2, esporteId);
    const did = Number(d.id);
    if (tid != null) {
      const ex = formationsMap.get(tid);
      if (ex) {
        if (!ex.duplaRegistroIds.includes(did)) ex.duplaRegistroIds.push(did);
        continue;
      }
      const { data: trow } = await supabase
        .from("times")
        .select("id, nome, tipo, escudo, eid_time, pontos_ranking")
        .eq("id", tid)
        .maybeSingle();
      if (trow) {
        formationsMap.set(tid, {
          id: tid,
          nome: String(trow.nome ?? `Equipe #${tid}`),
          tipo: trow.tipo ?? null,
          escudo: trow.escudo ?? null,
          eid_time: Number(trow.eid_time ?? 0),
          pontos_ranking: Number(trow.pontos_ranking ?? 0),
          duplaRegistroIds: [did],
        });
      }
    } else {
      duplasSemTime.push({ id: did });
    }
  }

  const formationList = [...formationsMap.values()].sort((a, b) => b.pontos_ranking - a.pontos_ranking);
  const timeIds = formationList.map((f) => f.id);

  let partidasColetivoRaw: PartidaColetivaRow[] = [];
  if (timeIds.length > 0) {
    const orClause = timeIds.flatMap((tid) => [`time1_id.eq.${tid}`, `time2_id.eq.${tid}`]).join(",");
    const { data: pc } = await supabase
      .from("partidas")
      .select(
        "id, time1_id, time2_id, placar_1, placar_2, vencedor_id, status, torneio_id, modalidade, data_resultado, data_registro, tipo_partida"
      )
      .eq("esporte_id", esporteId)
      .or(orClause)
      .order("data_registro", { ascending: false })
      .limit(320);
    partidasColetivoRaw = (pc ?? []) as PartidaColetivaRow[];
  }

  const listaColetivoPorTime = new Map<number, PartidaColetivaRow[]>();
  for (const f of formationList) listaColetivoPorTime.set(f.id, []);

  const incluirPartidaColetivaNoPerfil = (p: PartidaColetivaRow) => {
    const st = (p.status ?? "").toLowerCase();
    if (PARTIDA_STATUS_CONCLUIDA.has(st)) return true;
    return user.id === profileId;
  };

  for (const p of partidasColetivoRaw) {
    if (!incluirPartidaColetivaNoPerfil(p)) continue;
    const t1 = p.time1_id != null ? Number(p.time1_id) : null;
    const t2 = p.time2_id != null ? Number(p.time2_id) : null;
    if (t1 == null || t2 == null) continue;
    const pid = Number(p.id);
    for (const tid of [t1, t2]) {
      if (!timeIds.includes(tid) || !formationsMap.has(tid)) continue;
      const bucket = listaColetivoPorTime.get(tid)!;
      if (!bucket.some((x) => Number(x.id) === pid)) bucket.push(p);
    }
  }

  const { data: historicoColetivoRowsRaw } =
    timeIds.length > 0
      ? await supabase.from("historico_eid_coletivo").select("time_id, nota_nova, data_alteracao").in("time_id", timeIds)
      : { data: [] as { time_id: number; nota_nova: number | null; data_alteracao: string }[] };

  const historicoColetivoRows = [...(historicoColetivoRowsRaw ?? [])].sort((a, b) => {
    const ta = new Date(a.data_alteracao).getTime();
    const tb = new Date(b.data_alteracao).getTime();
    return ta - tb;
  });

  const notasColetivoPorTime = new Map<number, number[]>();
  for (const h of historicoColetivoRows) {
    const tid = Number(h.time_id);
    const n = Number(h.nota_nova);
    if (!Number.isFinite(tid) || !Number.isFinite(n)) continue;
    if (!notasColetivoPorTime.has(tid)) notasColetivoPorTime.set(tid, []);
    notasColetivoPorTime.get(tid)!.push(n);
  }

  const opponentTeamIds = new Set<number>();
  for (const f of formationList) {
    for (const p of listaColetivoPorTime.get(f.id) ?? []) {
      const t1 = p.time1_id != null ? Number(p.time1_id) : null;
      const t2 = p.time2_id != null ? Number(p.time2_id) : null;
      if (t1 === f.id && t2 != null) opponentTeamIds.add(t2);
      else if (t2 === f.id && t1 != null) opponentTeamIds.add(t1);
    }
  }
  const nomeOponenteTime = new Map<number, string>();
  if (opponentTeamIds.size > 0) {
    const { data: oppT } = await supabase.from("times").select("id, nome").in("id", [...opponentTeamIds]);
    for (const r of oppT ?? []) {
      if (r.id != null) nomeOponenteTime.set(Number(r.id), String(r.nome ?? `Equipe #${r.id}`));
    }
  }

  const { data: partidas } = await supabase
    .from("partidas")
    .select(
      "id, esporte_id, modalidade, jogador1_id, jogador2_id, placar_1, placar_2, status, torneio_id, data_resultado, data_registro, tipo_partida"
    )
    .eq("esporte_id", esporteId)
    .or(`jogador1_id.eq.${profileId},jogador2_id.eq.${profileId}`)
    .order("data_registro", { ascending: false })
    .limit(120);

  const lista = (partidas ?? []).filter((p) => {
    if (p.jogador1_id !== profileId && p.jogador2_id !== profileId) return false;
    if (!p.jogador1_id || !p.jogador2_id) return false;
    const st = (p.status ?? "").toLowerCase();
    if (PARTIDA_STATUS_CONCLUIDA.has(st)) return true;
    return user.id === profileId;
  });

  const datasColetivoStr = formationList.flatMap((f) =>
    (listaColetivoPorTime.get(f.id) ?? []).map((p) => p.data_resultado ?? p.data_registro)
  );

  const datasValidas = [...lista.map((p) => p.data_resultado ?? p.data_registro), ...datasColetivoStr]
    .filter((x): x is string => !!x)
    .map((x) => new Date(x))
    .filter((d) => !Number.isNaN(d.getTime()));

  const primeira = datasValidas.length
    ? new Date(Math.min(...datasValidas.map((d) => d.getTime()))).toISOString()
    : null;
  const ultima = datasValidas.length
    ? new Date(Math.max(...datasValidas.map((d) => d.getTime()))).toISOString()
    : null;

  const torneioIds = [
    ...new Set(
      [
        ...lista.map((p) => p.torneio_id),
        ...formationList.flatMap((f) => (listaColetivoPorTime.get(f.id) ?? []).map((p) => p.torneio_id)),
      ].filter((x): x is number => x != null && Number(x) > 0)
    ),
  ];
  const torneioNome = new Map<number, string>();
  if (torneioIds.length > 0) {
    const { data: torRows } = await supabase.from("torneios").select("id, nome").in("id", torneioIds);
    for (const t of torRows ?? []) {
      if (t.id != null) torneioNome.set(Number(t.id), t.nome ?? `Torneio #${t.id}`);
    }
  }

  const opponentIds = [
    ...new Set(
      lista.map((p) => (p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id)).filter((x): x is string => !!x)
    ),
  ];
  const nomesOponente = new Map<string, string>();
  if (opponentIds.length > 0) {
    const { data: opRows } = await supabase.from("profiles").select("id, nome").in("id", opponentIds);
    for (const r of opRows ?? []) {
      if (r.id) nomesOponente.set(r.id, r.nome ?? "Atleta");
    }
  }

  const { data: historicoEid } = await supabase
    .from("historico_eid")
    .select("nota_nova, data_registro")
    .eq("esporte_id", esporteId)
    .eq("entidade_id", ue.id)
    .order("data_registro", { ascending: true })
    .limit(80);

  const notasHist = (historicoEid ?? []).map((h) => Number(h.nota_nova)).filter((n) => Number.isFinite(n));
  const eidNum = Number(ue.nota_eid ?? 0);
  const trendPoints: [number, number, number] =
    notasHist.length >= 3
      ? [notasHist[notasHist.length - 3]!, notasHist[notasHist.length - 2]!, notasHist[notasHist.length - 1]!]
      : notasHist.length === 2
        ? [notasHist[0]!, notasHist[1]!, eidNum]
        : notasHist.length === 1
          ? [notasHist[0]!, eidNum, eidNum]
          : [eidNum, eidNum, eidNum];

  const vit = Number(ue.vitorias ?? 0);
  const der = Number(ue.derrotas ?? 0);
  const decisoes = vit + der;
  const winRate = decisoes > 0 ? Math.round((vit / decisoes) * 100) : null;

  const interesseLabel =
    {
      ranking: "Ranking",
      amistoso: "Amistoso",
      ranking_e_amistoso: "Ranking e amistoso",
    }[String(ue.interesse_match ?? "").toLowerCase()] ?? (ue.interesse_match ? String(ue.interesse_match) : "—");

  const modalidadeLabel = labelModalidadesMatchPt(modalidadesFromUsuarioEidRow(ue));

  const totalColetivoListados = formationList.reduce(
    (acc, f) => acc + (listaColetivoPorTime.get(f.id)?.length ?? 0),
    0
  );

  const individualHeadRows = Array.from(
    lista.reduce((acc, p) => {
      const oid = p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id;
      if (!oid) return acc;
      const bucket = acc.get(oid) ?? { oid, nome: nomesOponente.get(oid) ?? "Atleta", jogos: 0, v: 0, d: 0, e: 0 };
      bucket.jogos += 1;
      const r = resultadoPartida(profileId, p).label;
      if (r === "V") bucket.v += 1;
      else if (r === "D") bucket.d += 1;
      else if (r === "E") bucket.e += 1;
      acc.set(oid, bucket);
      return acc;
    }, new Map<string, { oid: string; nome: string; jogos: number; v: number; d: number; e: number }>())
  )
    .map(([, v]) => v)
    .sort((a, b) => b.jogos - a.jogos);

  const coletivoHeadRows = Array.from(
    formationList.reduce((acc, f) => {
      const partidasForm = listaColetivoPorTime.get(f.id) ?? [];
      for (const p of partidasForm) {
        const t1 = p.time1_id != null ? Number(p.time1_id) : null;
        const t2 = p.time2_id != null ? Number(p.time2_id) : null;
        const oppId = t1 === f.id ? t2 : t1;
        if (oppId == null) continue;
        const key = `${f.id}:${oppId}`;
        const bucket = acc.get(key) ?? {
          key,
          formacao: f.nome,
          modalidade: String(f.tipo ?? "equipe").toLowerCase() === "dupla" ? "dupla" : "time",
          oponenteId: oppId,
          oponenteNome: nomeOponenteTime.get(oppId) ?? `Equipe #${oppId}`,
          jogos: 0,
          v: 0,
          d: 0,
          e: 0,
        };
        bucket.jogos += 1;
        const r = resultadoColetivo(f.id, p).label;
        if (r === "V") bucket.v += 1;
        else if (r === "D") bucket.d += 1;
        else if (r === "E") bucket.e += 1;
        acc.set(key, bucket);
      }
      return acc;
    }, new Map<string, { key: string; formacao: string; modalidade: "dupla" | "time"; oponenteId: number; oponenteNome: string; jogos: number; v: number; d: number; e: number }>())
  )
    .map(([, v]) => v)
    .sort((a, b) => b.jogos - a.jogos);

  const showIndividual = view === "all" || view === "individual";
  const showDupla = view === "all" || view === "dupla";
  const showTime = view === "all" || view === "time";
  const filteredFormationList = formationList.filter((f) => {
    const tipo = String(f.tipo ?? "time").toLowerCase();
    if (tipo === "dupla") return showDupla;
    return showTime;
  });
  const showDuplasSemTime = showDupla && duplasSemTime.length > 0;

  const trendPointsColetivo = (timeId: number, eidAtual: number): [number, number, number] => {
    const nh = notasColetivoPorTime.get(timeId) ?? [];
    if (nh.length >= 3)
      return [nh[nh.length - 3]!, nh[nh.length - 2]!, nh[nh.length - 1]!];
    if (nh.length === 2) return [nh[0]!, nh[1]!, eidAtual];
    if (nh.length === 1) return [nh[0]!, eidAtual, eidAtual];
    return [eidAtual, eidAtual, eidAtual];
  };

  return (
      <main className="mx-auto w-full max-w-lg px-2.5 pb-8 pt-2 sm:max-w-2xl sm:px-5 sm:pt-3">
        {!isEmbed ? <PerfilBackLink href={backHref} label="Voltar ao perfil" /> : null}

        <div className={`relative mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_4px_24px_rgba(0,0,0,0.3)]`}>
          <div className="relative h-20 w-full sm:h-24">
            {perfil.foto_capa ? (
              <img src={perfil.foto_capa} alt="" className="h-full w-full object-cover object-center" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: "linear-gradient(135deg,#172554 0%,#0b1d2e 55%,#0b0f14 100%)" }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-eid-card to-transparent" />
          </div>

          <div className="px-3 pb-3 pt-0">
            <div className="-mt-9 flex items-end gap-3">
              {perfil.avatar_url ? (
                <img
                  src={perfil.avatar_url}
                  alt=""
                  className="relative z-10 h-14 w-14 shrink-0 rounded-xl border-[3px] border-eid-card object-cover shadow-md sm:h-16 sm:w-16"
                />
              ) : (
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-xs font-black text-eid-primary-200 sm:h-16 sm:w-16">
                  EID
                </div>
              )}
              <div className="min-w-0 flex-1 pb-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-400">{nomeEsporte}</p>
                <h1 className="text-sm font-black leading-tight text-eid-fg sm:text-base">{perfil.nome ?? "Atleta"}</h1>
                {perfil.username ? (
                  <p className="text-[10px] font-semibold text-eid-primary-400">@{perfil.username}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">EID</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-eid-fg">{eidNum.toFixed(2)}</p>
              </div>
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Pts ranking</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-eid-fg">{Number(ue.pontos_ranking ?? 0)}</p>
              </div>
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Vitórias</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-emerald-400">{vit}</p>
              </div>
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Derrotas</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-rose-400">{der}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card`}>
          <ProfileSportsMetricsCard
            sportName={nomeEsporte}
            eidValue={eidNum}
            rankValue={Number(ue.pontos_ranking ?? 0)}
            eidLabel="Nota atual"
            rankLabel="Pontos"
            trendLabel="Evolução da nota (histórico)"
            trendPoints={trendPoints}
            footer={
              (historicoEid?.length ?? 0) === 0 ? (
                <span>Sem registros em histórico de EID para este esporte — a linha reflete a nota atual.</span>
              ) : (
                <span>{historicoEid?.length} alterações registradas no histórico.</span>
              )
            }
          />
        </div>

        <div className="mt-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Ver estatísticas</p>
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              { id: "all", label: "Tudo" },
              { id: "individual", label: "Individual" },
              { id: "dupla", label: "Dupla" },
              { id: "time", label: "Time" },
            ] as const).map((opt) => (
              <Link
                key={opt.id}
                href={`/perfil/${encodeURIComponent(profileId)}/eid/${esporteId}?from=${encodeURIComponent(backHref)}${isEmbed ? "&embed=1" : ""}&view=${opt.id}`}
                className={`inline-flex h-[1.5rem] shrink-0 items-center justify-center rounded-md px-2 text-[9px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200 ${
                  view === opt.id
                    ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
                    : "text-eid-text-secondary hover:bg-eid-surface/55"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        <ProfileSection title="Panorama" className="mt-4">
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Aproveitamento (V+D)</p>
              <p className="mt-1 text-xl font-black text-eid-fg">
                {winRate != null ? `${winRate}%` : "—"}
                <span className="ml-1 text-[11px] font-semibold text-eid-text-secondary">
                  ({vit}V {der}D · {Number(ue.partidas_jogadas ?? 0)} no ranking)
                </span>
              </p>
            </div>
            <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Posição no ranking</p>
              <p className="mt-1 text-xl font-black text-eid-fg">
                {ue.posicao_rank != null ? `#${ue.posicao_rank}` : "—"}
              </p>
            </div>
            <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Interesse em match</p>
              <p className="mt-1 text-[12px] font-semibold text-eid-fg">{interesseLabel}</p>
              <p className="mt-0.5 text-[10px] text-eid-text-secondary">Modalidade: {modalidadeLabel}</p>
            </div>
            {ue.categoria ? (
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Categoria</p>
                <p className="mt-1 text-[12px] font-semibold text-eid-fg">{ue.categoria}</p>
              </div>
            ) : null}
          </div>
        </ProfileSection>

        <ProfileSection title="Experiência e linha do tempo" className="mt-4">
          <div className="mt-2 space-y-2">
            {perfil.tempo_experiencia ? (
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Experiência (perfil)</p>
                <p className="mt-1 text-[12px] leading-snug text-eid-fg">{perfil.tempo_experiencia}</p>
              </div>
            ) : null}
            <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Partidas neste esporte</p>
              <p className="mt-1 text-[12px] text-eid-fg">
                {lista.length > 0 || totalColetivoListados > 0 ? (
                  <>
                    <span className="font-semibold">{lista.length}</span> confronto{lista.length !== 1 ? "s" : ""}{" "}
                    1v1
                    {totalColetivoListados > 0 ? (
                      <>
                        {" "}
                        e <span className="font-semibold">{totalColetivoListados}</span> partida
                        {totalColetivoListados !== 1 ? "s" : ""} em equipe/dupla neste esporte (listagens abaixo).
                      </>
                    ) : (
                      " visíveis (concluídos ou seus próprios)."
                    )}
                  </>
                ) : (
                  "Nenhuma partida listada ainda no individual — os números de vitória/derrota vêm do ranking agregado. Equipes aparecem na seção seguinte quando houver."
                )}
              </p>
              {primeira ? (
                <p className="mt-2 text-[11px] text-eid-text-secondary">
                  Primeira partida registrada: <span className="font-semibold text-eid-fg">{fmtDataPtBr(primeira)}</span>
                  {tempoDesdePrimeiraPartida(primeira) ? (
                    <>
                      {" "}
                      · <span className="text-eid-primary-300">{tempoDesdePrimeiraPartida(primeira)}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
              {ultima ? (
                <p className="mt-1 text-[11px] text-eid-text-secondary">
                  Última atividade (partida): <span className="font-semibold text-eid-fg">{fmtDataPtBr(ultima)}</span>
                </p>
              ) : null}
            </div>
          </div>
        </ProfileSection>

        {filteredFormationList.length > 0 || showDuplasSemTime ? (
          <ProfileSection title="Equipes e duplas neste esporte" className="mt-4">
            {showDuplasSemTime ? (
              <div className="mt-2 space-y-2">
                <p className="text-[10px] text-eid-text-secondary">
                  Dupla registrada sem time ativo comum no ranking — abra o perfil da dupla para ver detalhes.
                </p>
                <div className="flex flex-wrap gap-3">
                  {duplasSemTime.map((d) => (
                    <div key={`d-${d.id}`} className="flex items-center gap-2">
                      <Link
                        href={`/perfil-dupla/${d.id}?from=${encodeURIComponent(nextPath)}`}
                        className="shrink-0 rounded-xl ring-2 ring-eid-primary-500/35 transition hover:ring-eid-primary-500/70"
                        aria-label={`Perfil da dupla ${d.id}`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface text-xs font-black text-eid-primary-300">
                          D
                        </div>
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/perfil-dupla/${d.id}?from=${encodeURIComponent(nextPath)}`}
                          className="block text-[11px] font-bold text-eid-primary-400 hover:underline"
                        >
                          Dupla #{d.id}
                        </Link>
                        <Link
                          href={`/perfil-dupla/${d.id}/eid/${esporteId}?from=${encodeURIComponent(nextPath)}`}
                          className="mt-0.5 block text-[10px] font-semibold text-eid-action-400 hover:underline"
                        >
                          Estatísticas neste esporte →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 space-y-4">
              {filteredFormationList.map((f) => {
                const partidasForm = listaColetivoPorTime.get(f.id) ?? [];
                let cv = 0;
                let cd = 0;
                let ce = 0;
                for (const p of partidasForm) {
                  const r = resultadoColetivo(f.id, p);
                  if (r.label === "V") cv++;
                  else if (r.label === "D") cd++;
                  else if (r.label === "E") ce++;
                }
                const decResultado = cv + cd;
                const wrCol = decResultado > 0 ? Math.round((cv / decResultado) * 100) : null;
                const tipoFmt = String(f.tipo ?? "equipe").trim().toLowerCase();
                const tipoLabel =
                  tipoFmt === "dupla" ? "Dupla" : tipoFmt === "time" ? "Time" : f.tipo ? String(f.tipo) : "Equipe";

                const primeiraDuplaId = f.duplaRegistroIds[0];
                const hrefPerfilFormacao = primeiraDuplaId
                  ? `/perfil-dupla/${primeiraDuplaId}?from=${encodeURIComponent(nextPath)}`
                  : `/perfil-time/${f.id}?from=${encodeURIComponent(nextPath)}`;
                const hrefStatsFormacaoEsporte = primeiraDuplaId
                  ? `/perfil-dupla/${primeiraDuplaId}/eid/${esporteId}?from=${encodeURIComponent(nextPath)}`
                  : `/perfil-time/${f.id}/eid/${esporteId}?from=${encodeURIComponent(nextPath)}`;

                return (
                  <div
                    key={`form-${f.id}`}
                    className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card"
                  >
                    <div className={`flex flex-wrap items-start gap-3 ${PROFILE_CARD_PAD_MD}`}>
                      <Link
                        href={hrefPerfilFormacao}
                        className="shrink-0 rounded-xl ring-2 ring-eid-action-500/40 transition hover:ring-eid-action-500/80 hover:brightness-110"
                        aria-label={`Ver perfil da formação ${f.nome}`}
                      >
                        {f.escudo ? (
                          <img
                            src={f.escudo}
                            alt=""
                            className="h-14 w-14 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover sm:h-16 sm:w-16"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-surface text-sm font-black text-eid-primary-300 sm:h-16 sm:w-16">
                            {(f.tipo ?? "E").toUpperCase().slice(0, 1)}
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-eid-action-500">
                            {tipoLabel}
                          </span>
                          {f.duplaRegistroIds.length > 0 ? (
                            <span className="text-[9px] font-semibold text-eid-text-secondary">
                              Registro dupla:{" "}
                              {f.duplaRegistroIds.map((did, i) => (
                                <span key={did}>
                                  {i > 0 ? ", " : null}
                                  <Link
                                    href={`/perfil-dupla/${did}?from=${encodeURIComponent(nextPath)}`}
                                    className="text-eid-primary-400 hover:underline"
                                  >
                                    #{did}
                                  </Link>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-1 text-sm font-black text-eid-fg">
                          <Link
                            href={hrefPerfilFormacao}
                            className="hover:text-eid-primary-300 hover:underline"
                          >
                            {f.nome}
                          </Link>
                        </h3>
                        <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                          EID equipe {f.eid_time.toFixed(2)} · {f.pontos_ranking} pts ranking
                          {decResultado > 0 ? (
                            <>
                              {" "}
                              · {wrCol}% aproveitamento (V+D) nas partidas listadas — {cv}V {cd}D
                              {ce > 0 ? ` · ${ce} empate${ce !== 1 ? "s" : ""}` : ""}
                            </>
                          ) : ce > 0 ? (
                            <> · {ce} empate{ce !== 1 ? "s" : ""} registrado{ce !== 1 ? "s" : ""}</>
                          ) : null}
                        </p>
                        <Link
                          href={hrefStatsFormacaoEsporte}
                          className="mt-1.5 inline-flex text-[10px] font-bold uppercase tracking-wide text-eid-action-400 hover:underline"
                        >
                          Estatísticas completas neste esporte →
                        </Link>
                      </div>
                    </div>

                    <div className="border-t border-[color:var(--eid-border-subtle)]">
                      <ProfileSportsMetricsCard
                        sportName={`${nomeEsporte} · ${f.nome}`}
                        eidValue={f.eid_time}
                        rankValue={f.pontos_ranking}
                        eidLabel="EID da equipe"
                        rankLabel="Pontos"
                        trendLabel="Evolução EID coletivo"
                        trendPoints={trendPointsColetivo(f.id, f.eid_time)}
                        footer={
                          (notasColetivoPorTime.get(f.id)?.length ?? 0) === 0 ? (
                            <span>Sem histórico coletivo registrado — tendência igual à nota atual.</span>
                          ) : (
                            <span>{notasColetivoPorTime.get(f.id)?.length} registro(s) no histórico.</span>
                          )
                        }
                      />
                    </div>

                    {partidasForm.length === 0 ? (
                      <p className={`${PROFILE_CARD_PAD_MD} text-[11px] text-eid-text-secondary`}>
                        Nenhuma partida de equipe listada para esta formação neste esporte.
                      </p>
                    ) : (
                      <ul className="space-y-2 px-2.5 pb-3">
                        {partidasForm.map((p) => {
                          const t1 = p.time1_id != null ? Number(p.time1_id) : null;
                          const t2 = p.time2_id != null ? Number(p.time2_id) : null;
                          const oppId = t1 === f.id ? t2 : t1;
                          const onome = oppId != null ? nomeOponenteTime.get(oppId) ?? `Equipe #${oppId}` : "—";
                          const res = resultadoColetivo(f.id, p);
                          const when = fmtDataPtBr(p.data_resultado ?? p.data_registro);
                          const torNome = p.torneio_id ? torneioNome.get(Number(p.torneio_id)) : null;
                          return (
                            <li
                              key={`c-${f.id}-${p.id}`}
                              className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} flex flex-wrap items-center gap-2`}
                            >
                              <span
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${res.tone} bg-eid-surface/80`}
                              >
                                {res.label}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-eid-fg">
                                  vs{" "}
                                  {oppId != null ? (
                                    <Link
                                      href={`/perfil-time/${oppId}?from=${encodeURIComponent(nextPath)}`}
                                      className="text-eid-primary-400 hover:underline"
                                    >
                                      {onome}
                                    </Link>
                                  ) : (
                                    onome
                                  )}
                                </p>
                                <p className="text-[10px] text-eid-text-secondary">
                                  {when}
                                  {p.modalidade ? ` · ${p.modalidade}` : ""}
                                  {torNome ? (
                                    <span className="text-eid-action-400"> · {torNome}</span>
                                  ) : p.torneio_id ? (
                                    <span className="text-eid-action-400"> · Torneio #{p.torneio_id}</span>
                                  ) : null}
                                  {p.tipo_partida ? ` · ${p.tipo_partida}` : ""}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black tabular-nums text-eid-fg">
                                  {Number.isFinite(Number(p.placar_1)) && Number.isFinite(Number(p.placar_2))
                                    ? `${p.placar_1} × ${p.placar_2}`
                                    : "—"}
                                </p>
                                <p className="text-[9px] uppercase text-eid-text-secondary">{p.status ?? "—"}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </ProfileSection>
        ) : null}

        {showIndividual ? (
        <ProfileSection title="Histórico de partidas (individual)" className="mt-4">
          {lista.length === 0 ? (
            <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-[11px] text-eid-text-secondary">
              Sem partidas individuais para exibir. Quando houver jogos válidos no ranking, eles aparecem aqui com
              placar e adversário.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {lista.map((p) => {
                const oid = p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id;
                const onome = oid ? nomesOponente.get(oid) ?? "Atleta" : "—";
                const res = resultadoPartida(profileId, p);
                const when = fmtDataPtBr(p.data_resultado ?? p.data_registro);
                const torNome = p.torneio_id ? torneioNome.get(Number(p.torneio_id)) : null;
                return (
                  <li
                    key={p.id}
                    className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} flex flex-wrap items-center gap-2`}
                  >
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${res.tone} bg-eid-surface/80`}>
                      {res.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-eid-fg">
                        vs{" "}
                        {oid ? (
                          <Link href={`/perfil/${encodeURIComponent(oid)}?from=${encodeURIComponent(nextPath)}`} className="text-eid-primary-400 hover:underline">
                            {onome}
                          </Link>
                        ) : (
                          onome
                        )}
                      </p>
                      <p className="text-[10px] text-eid-text-secondary">
                        {when}
                        {p.modalidade ? ` · ${p.modalidade}` : ""}
                        {torNome ? (
                          <span className="text-eid-action-400"> · {torNome}</span>
                        ) : p.torneio_id ? (
                          <span className="text-eid-action-400"> · Torneio #{p.torneio_id}</span>
                        ) : null}
                        {p.tipo_partida ? ` · ${p.tipo_partida}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black tabular-nums text-eid-fg">
                        {Number.isFinite(Number(p.placar_1)) && Number.isFinite(Number(p.placar_2))
                          ? `${p.placar_1} × ${p.placar_2}`
                          : "—"}
                      </p>
                      <p className="text-[9px] uppercase text-eid-text-secondary">{p.status ?? "—"}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ProfileSection>
        ) : null}

        <ProfileSection title="Head-to-head" className="mt-4">
          <div className="mt-2 space-y-3">
            {showIndividual ? (
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Individual</p>
                {individualHeadRows.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {individualHeadRows.slice(0, 8).map((row) => (
                      <li key={row.oid} className="flex items-center justify-between rounded-lg bg-eid-surface/45 px-2 py-1.5">
                        <Link href={`/perfil/${encodeURIComponent(row.oid)}?from=${encodeURIComponent(nextPath)}`} className="truncate text-[11px] font-semibold text-eid-fg hover:text-eid-primary-300">
                          {row.nome}
                        </Link>
                        <span className="shrink-0 text-[10px] font-bold text-eid-text-secondary">{row.v}V · {row.d}D · {row.e}E ({row.jogos})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[11px] text-eid-text-secondary">Sem confrontos individuais suficientes para comparativo.</p>
                )}
              </div>
            ) : null}

            {(showDupla || showTime) ? (
              <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Dupla/Time</p>
                {coletivoHeadRows.filter((r) => (r.modalidade === "dupla" ? showDupla : showTime)).length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {coletivoHeadRows
                      .filter((r) => (r.modalidade === "dupla" ? showDupla : showTime))
                      .slice(0, 10)
                      .map((row) => (
                        <li key={row.key} className="flex items-center justify-between rounded-lg bg-eid-surface/45 px-2 py-1.5">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-eid-fg">{row.formacao} vs {row.oponenteNome}</p>
                            <p className="text-[9px] uppercase text-eid-text-secondary">{row.modalidade}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-eid-text-secondary">{row.v}V · {row.d}D · {row.e}E ({row.jogos})</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[11px] text-eid-text-secondary">Sem confrontos coletivos suficientes para comparativo.</p>
                )}
              </div>
            ) : null}
          </div>
        </ProfileSection>
      </main>
  );
}
