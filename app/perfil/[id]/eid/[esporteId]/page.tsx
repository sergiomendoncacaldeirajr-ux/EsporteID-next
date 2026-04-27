import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EidIndividualPartidaRow } from "@/components/perfil/eid-individual-partida-row";
import { EidConfrontoResumoModal } from "@/components/perfil/eid-confronto-resumo-modal";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import {
  PROFILE_CARD_BASE,
  PROFILE_CARD_PAD_MD,
  PROFILE_HERO_PANEL_CLASS,
  PROFILE_PUBLIC_MAIN_CLASS,
} from "@/components/perfil/profile-ui-tokens";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  fmtDataPtBr,
  formatLinhaExperienciaEid,
  partidaEncerradaParaHistorico,
  resultadoColetivo,
  resultadoPartidaIndividual,
  type PartidaColetivaRow,
} from "@/lib/perfil/formacao-eid-stats";
import { sportIconEmoji } from "@/lib/perfil/sport-icon-emoji";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string; esporteId: string }>;
  searchParams?: Promise<{ from?: string; embed?: string; view?: string }>;
};

type EidView = "individual" | "dupla" | "time";

function parseEsporteId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

function parseEidView(raw: string | undefined): EidView {
  if (raw === "individual" || raw === "dupla" || raw === "time") return raw;
  return "individual";
}

function membroTimeAtivo(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "ativo" || s === "aceito" || s === "aprovado";
}

const INDIVIDUAL_HISTORICO_PREVIEW = 4;

export default async function PerfilEidEsportePage({ params, searchParams }: Props) {
  const { id: profileId, esporteId: esporteRaw } = await params;
  const sp = (await searchParams) ?? {};
  const isEmbed = sp.embed === "1";
  const view = parseEidView(typeof sp.view === "string" ? sp.view : undefined);
  const backHref = resolveBackHref(sp.from, `/perfil/${profileId}`);

  const esporteId = parseEsporteId(esporteRaw);
  if (esporteId == null) notFound();

  const eidQuery = new URLSearchParams();
  if (typeof sp.from === "string" && sp.from) eidQuery.set("from", sp.from);
  eidQuery.set("view", view);
  if (isEmbed) eidQuery.set("embed", "1");
  const eidPageHref = `/perfil/${encodeURIComponent(profileId)}/eid/${esporteId}${eidQuery.toString() ? `?${eidQuery.toString()}` : ""}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(eidPageHref)}`);
  const nextPath = eidPageHref;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nome, username, avatar_url, foto_capa, localizacao, tempo_experiencia")
    .eq("id", profileId)
    .maybeSingle();
  if (!perfil) notFound();

  const { data: ue } = await supabase
    .from("usuario_eid")
    .select(
      "id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, interesse_match, modalidade_match, modalidades_match, posicao_rank, categoria, tempo_experiencia, esportes(nome)"
    )
    .eq("usuario_id", profileId)
    .eq("esporte_id", esporteId)
    .maybeSingle();

  if (!ue) notFound();
  const { data: rankingRows } = await supabase
    .from("usuario_eid")
    .select("usuario_id, pontos_ranking, nota_eid")
    .eq("esporte_id", esporteId)
    .order("pontos_ranking", { ascending: false })
    .order("nota_eid", { ascending: false });
  const rankPosicaoCalculada = (() => {
    const rows = rankingRows ?? [];
    const idx = rows.findIndex((r) => String(r.usuario_id ?? "") === profileId);
    return idx >= 0 ? idx + 1 : null;
  })();
  const rankPosicaoFinal =
    rankPosicaoCalculada != null && rankPosicaoCalculada > 0 ? rankPosicaoCalculada : ue.posicao_rank != null ? Number(ue.posicao_rank) : null;

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
        "id, time1_id, time2_id, placar_1, placar_2, vencedor_id, status, status_ranking, torneio_id, modalidade, data_resultado, data_registro, tipo_partida, local_str, local_espaco_id, data_partida, mensagem"
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
    return partidaEncerradaParaHistorico(p);
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
  const escudoOponenteTime = new Map<number, string | null>();
  if (opponentTeamIds.size > 0) {
    const { data: oppT } = await supabase.from("times").select("id, nome, escudo").in("id", [...opponentTeamIds]);
    for (const r of oppT ?? []) {
      if (r.id != null) {
        nomeOponenteTime.set(Number(r.id), String(r.nome ?? `Equipe #${r.id}`));
        escudoOponenteTime.set(Number(r.id), r.escudo ?? null);
      }
    }
  }

  const { data: partidas } = await supabase
    .from("partidas")
    .select(
      "id, esporte_id, modalidade, jogador1_id, jogador2_id, placar_1, placar_2, status, status_ranking, torneio_id, data_resultado, data_registro, tipo_partida, local_str, local_espaco_id, data_partida, mensagem"
    )
    .eq("esporte_id", esporteId)
    .or(`jogador1_id.eq.${profileId},jogador2_id.eq.${profileId}`)
    .order("data_registro", { ascending: false })
    .limit(120);

  const lista = (partidas ?? []).filter((p) => {
    if (p.jogador1_id !== profileId && p.jogador2_id !== profileId) return false;
    if (!p.jogador1_id || !p.jogador2_id) return false;
    return partidaEncerradaParaHistorico(p);
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
  const oponenteInfo = new Map<string, { nome: string; avatar_url: string | null; nota_eid: number | null }>();
  if (opponentIds.length > 0) {
    const { data: opRows } = await supabase.from("profiles").select("id, nome, avatar_url").in("id", opponentIds);
    const { data: opEidRows } = await supabase
      .from("usuario_eid")
      .select("usuario_id, nota_eid")
      .eq("esporte_id", esporteId)
      .in("usuario_id", opponentIds);
    const opEidMap = new Map<string, number | null>();
    for (const eidRow of opEidRows ?? []) {
      if (!eidRow.usuario_id) continue;
      opEidMap.set(eidRow.usuario_id, eidRow.nota_eid != null ? Number(eidRow.nota_eid) : null);
    }
    for (const r of opRows ?? []) {
      if (r.id) {
        oponenteInfo.set(r.id, {
          nome: r.nome ?? "Atleta",
          avatar_url: r.avatar_url ?? null,
          nota_eid: opEidMap.get(r.id) ?? null,
        });
      }
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

  const individualHeadRows = Array.from(
    lista.reduce((acc, p) => {
      const oid = p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id;
      if (!oid) return acc;
      const bucket = acc.get(oid) ?? { oid, nome: oponenteInfo.get(oid)?.nome ?? "Atleta", jogos: 0, v: 0, d: 0, e: 0 };
      bucket.jogos += 1;
      const r = resultadoPartidaIndividual(profileId, p).label;
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
          formacaoId: f.id,
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
    }, new Map<string, { key: string; formacaoId: number; formacao: string; modalidade: "dupla" | "time"; oponenteId: number; oponenteNome: string; jogos: number; v: number; d: number; e: number }>())
  )
    .map(([, v]) => v)
    .sort((a, b) => b.jogos - a.jogos);

  const showIndividual = view === "individual";
  const showDupla = view === "dupla";
  const showTime = view === "time";
  const esporteIcon = sportIconEmoji(nomeEsporte);
  const filteredFormationList = formationList.filter((f) => {
    const tipo = String(f.tipo ?? "time").toLowerCase();
    if (tipo === "dupla") return showDupla;
    return showTime;
  });
  const showDuplasSemTime = showDupla && duplasSemTime.length > 0;

  const listaIndividualPreview = lista.slice(0, INDIVIDUAL_HISTORICO_PREVIEW);
  const temMaisPartidasIndividuais = lista.length > listaIndividualPreview.length;
  const historicoIndividualQuery = new URLSearchParams();
  historicoIndividualQuery.set("from", eidPageHref);
  if (isEmbed) historicoIndividualQuery.set("embed", "1");
  const historicoIndividualHref = `/perfil/${encodeURIComponent(profileId)}/eid/${esporteId}/historico?${historicoIndividualQuery.toString()}`;

  const selectedTipo: "dupla" | "time" | null = view === "dupla" ? "dupla" : view === "time" ? "time" : null;
  const selectedFormations = selectedTipo
    ? formationList.filter((f) => String(f.tipo ?? "").trim().toLowerCase() === selectedTipo)
    : [];
  const selectedFormationIds = new Set(selectedFormations.map((f) => Number(f.id)));
  const coletivoPartidasMap = new Map<number, { partida: PartidaColetivaRow; formacaoId: number }>();
  for (const f of selectedFormations) {
    for (const p of listaColetivoPorTime.get(f.id) ?? []) {
      const pid = Number(p.id);
      if (!Number.isFinite(pid)) continue;
      if (!coletivoPartidasMap.has(pid)) coletivoPartidasMap.set(pid, { partida: p, formacaoId: f.id });
    }
  }
  const coletivoPartidasSelecionadas = [...coletivoPartidasMap.values()];
  let coletivoVit = 0;
  let coletivoDer = 0;
  let coletivoEmp = 0;
  for (const row of coletivoPartidasSelecionadas) {
    const res = resultadoColetivo(row.formacaoId, row.partida);
    if (res.label === "V") coletivoVit += 1;
    else if (res.label === "D") coletivoDer += 1;
    else if (res.label === "E") coletivoEmp += 1;
  }
  const coletivoDecisoes = coletivoVit + coletivoDer;
  const coletivoWinRate = coletivoDecisoes > 0 ? Math.round((coletivoVit / coletivoDecisoes) * 100) : null;
  const coletivoEidMedio =
    selectedFormations.length > 0
      ? selectedFormations.reduce((acc, f) => acc + Number(f.eid_time ?? 0), 0) / selectedFormations.length
      : 0;
  const historicoColetivoSelecionado = historicoColetivoRows
    .filter((h) => selectedFormationIds.has(Number(h.time_id ?? 0)))
    .map((h) => Number(h.nota_nova ?? NaN))
    .filter((n) => Number.isFinite(n));
  const trendPointsAtivos: [number, number, number] =
    view === "individual"
      ? trendPoints
      : historicoColetivoSelecionado.length >= 3
        ? [
            historicoColetivoSelecionado[historicoColetivoSelecionado.length - 3]!,
            historicoColetivoSelecionado[historicoColetivoSelecionado.length - 2]!,
            historicoColetivoSelecionado[historicoColetivoSelecionado.length - 1]!,
          ]
        : historicoColetivoSelecionado.length === 2
          ? [historicoColetivoSelecionado[0]!, historicoColetivoSelecionado[1]!, coletivoEidMedio]
          : historicoColetivoSelecionado.length === 1
            ? [historicoColetivoSelecionado[0]!, coletivoEidMedio, coletivoEidMedio]
            : [coletivoEidMedio, coletivoEidMedio, coletivoEidMedio];
  const datasAtivas = (
    view === "individual"
      ? lista.map((p) => p.data_resultado ?? p.data_registro)
      : coletivoPartidasSelecionadas.map((r) => r.partida.data_resultado ?? r.partida.data_registro)
  )
    .filter((x): x is string => Boolean(x))
    .map((x) => new Date(x))
    .filter((d) => !Number.isNaN(d.getTime()));
  const primeiraAtiva = datasAtivas.length
    ? new Date(Math.min(...datasAtivas.map((d) => d.getTime()))).toISOString()
    : null;
  const resumoAtivo =
    view === "individual"
      ? {
          eid: eidNum,
          pontos: Number(ue.pontos_ranking ?? 0),
          vit,
          der,
          jogos: Number(ue.partidas_jogadas ?? 0),
          winRate,
          posicao: rankPosicaoFinal,
          pointsLabel: "Pontos",
          trendFooterCount: Number(historicoEid?.length ?? 0),
          experienceLabel: formatLinhaExperienciaEid(ue.tempo_experiencia, primeiraAtiva),
        }
      : {
          eid: coletivoEidMedio,
          pontos: null as number | null,
          vit: coletivoVit,
          der: coletivoDer,
          jogos: coletivoPartidasSelecionadas.length,
          winRate: coletivoWinRate,
          posicao: null as number | null,
          pointsLabel: "Pontos (equipe)",
          trendFooterCount: historicoColetivoSelecionado.length,
          experienceLabel:
            selectedFormations.length > 0
              ? `${selectedFormations.length} formação(ões) em ${view} neste esporte`
              : `Sem formações de ${view} neste esporte`,
        };

  const trendPointsColetivo = (timeId: number, eidAtual: number): [number, number, number] => {
    const nh = notasColetivoPorTime.get(timeId) ?? [];
    if (nh.length >= 3)
      return [nh[nh.length - 3]!, nh[nh.length - 2]!, nh[nh.length - 1]!];
    if (nh.length === 2) return [nh[0]!, nh[1]!, eidAtual];
    if (nh.length === 1) return [nh[0]!, eidAtual, eidAtual];
    return [eidAtual, eidAtual, eidAtual];
  };

  return (
      <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        {!isEmbed ? <PerfilBackLink href={backHref} label="Voltar ao perfil" /> : null}

        <div className={`mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS}`}>
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-eid-action-400">
              <span aria-hidden>{esporteIcon}</span>
              {nomeEsporte}
            </p>
            <h1 className="mt-1 text-base font-black leading-tight text-eid-fg sm:text-lg">{perfil.nome ?? "Atleta"}</h1>
            <p className="mt-1 text-[10px] leading-relaxed text-eid-text-secondary">
              {resumoAtivo.experienceLabel}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-2 text-center shadow-[0_8px_20px_-14px_rgba(37,99,235,0.55)]">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Nota EID</p>
                <p className="mt-0.5 text-xl font-black tabular-nums text-eid-fg">{resumoAtivo.eid.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-eid-action-500/30 bg-eid-surface/55 px-2 py-2 text-center">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">{resumoAtivo.pointsLabel}</p>
                <p className="mt-0.5 text-xl font-black tabular-nums text-eid-fg">
                  {resumoAtivo.pontos == null ? "—" : resumoAtivo.pontos}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2 py-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-emerald-400">{resumoAtivo.vit}</p>
              </div>
              <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-2 py-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
                <p className="mt-0.5 text-lg font-black tabular-nums text-rose-400">{resumoAtivo.der}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-3 overflow-hidden ${PROFILE_CARD_BASE}`}>
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Tendência EID</p>
            <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-primary-300">
              Histórico
            </span>
          </div>
          <ProfileSportsMetricsCard
            sportName={nomeEsporte}
            eidValue={resumoAtivo.eid}
            rankValue={resumoAtivo.pontos ?? 0}
            eidLabel="Nota atual"
            rankLabel={resumoAtivo.pointsLabel}
            showScoreTiles={false}
            trendLabel="Evolução da nota (histórico)"
            trendPoints={trendPointsAtivos}
            footer={
              (resumoAtivo.trendFooterCount ?? 0) === 0 ? (
                <span>Sem registros em histórico de EID para este esporte — a linha reflete a nota atual.</span>
              ) : (
                <span>{resumoAtivo.trendFooterCount} alterações registradas no histórico.</span>
              )
            }
          />
        </div>

        <div className={`mt-3 overflow-hidden ${PROFILE_CARD_BASE}`}>
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Ver estatísticas</p>
            <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-action-400">
              Modalidade
            </span>
          </div>
          <div className="p-2">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              { id: "individual", label: "Individual" },
              { id: "dupla", label: "Dupla" },
              { id: "time", label: "Time" },
            ] as const).map((opt) => (
              <Link
                key={opt.id}
                href={`/perfil/${encodeURIComponent(profileId)}/eid/${esporteId}?from=${encodeURIComponent(backHref)}${isEmbed ? "&embed=1" : ""}&view=${opt.id}`}
                className={`inline-flex h-[1.6rem] shrink-0 items-center justify-center rounded-md px-2.5 text-[9px] font-semibold uppercase leading-none tracking-[0.02em] transition-all duration-200 ${
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
        </div>

        <ProfileSection title="Panorama" className="mt-4">
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className={`overflow-hidden ${PROFILE_CARD_BASE}`}>
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Aproveitamento (V+D)</p>
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-400">
                  Performance
                </span>
              </div>
              <div className={PROFILE_CARD_PAD_MD}>
                <p className="mt-1 text-2xl font-black text-eid-fg">
                  {resumoAtivo.winRate != null ? `${resumoAtivo.winRate}%` : "—"}
                </p>
                <div className="mt-1 inline-flex items-center rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[10px] font-bold">
                  <span className="text-emerald-400">{resumoAtivo.vit}V</span>
                  <span className="mx-1 text-eid-text-secondary">·</span>
                  <span className="text-rose-400">{resumoAtivo.der}D</span>
                  <span className="mx-1 text-eid-text-secondary">·</span>
                  <span className="text-eid-text-secondary">{resumoAtivo.jogos} jogos</span>
                </div>
              </div>
            </div>
            <div className={`overflow-hidden ${PROFILE_CARD_BASE}`}>
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Posição no ranking</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-action-400">
                  Rank
                </span>
              </div>
              <div className={PROFILE_CARD_PAD_MD}>
                <p className="mt-1 text-2xl font-black text-eid-fg">
                  {resumoAtivo.posicao != null ? `#${resumoAtivo.posicao}` : "—"}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed font-semibold text-eid-text-secondary">
                  {resumoAtivo.posicao != null ? "Posição atual no esporte" : "Sem posição disponível"}
                </p>
              </div>
            </div>
            {view === "individual" && ue.categoria ? (
              <div className={`overflow-hidden ${PROFILE_CARD_BASE}`}>
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Categoria</p>
                  <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-primary-300">
                    Nível
                  </span>
                </div>
                <div className={PROFILE_CARD_PAD_MD}>
                  <p className="text-[12px] font-semibold text-eid-fg">{ue.categoria}</p>
                </div>
              </div>
            ) : null}
          </div>
        </ProfileSection>

        {filteredFormationList.length > 0 || showDuplasSemTime ? (
          <ProfileSection title="Equipes e duplas neste esporte" className="mt-4">
            {showDuplasSemTime ? (
              <div className={`mt-2 overflow-hidden ${PROFILE_CARD_BASE}`}>
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Duplas sem time ativo</p>
                  <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-action-400">
                    Atenção
                  </span>
                </div>
                <div className="space-y-2 p-3">
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
                    className={`overflow-hidden ${PROFILE_CARD_BASE}`}
                  >
                    <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Formação</span>
                      <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-action-400">
                        {tipoLabel}
                      </span>
                    </div>
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
                          const origemLabel =
                            p.torneio_id != null || String(p.tipo_partida ?? "").toLowerCase() === "torneio"
                              ? "Torneio"
                              : "Ranking";
                          const confrontosMesmos = partidasForm.filter((h) => {
                            const h1 = h.time1_id != null ? Number(h.time1_id) : null;
                            const h2 = h.time2_id != null ? Number(h.time2_id) : null;
                            if (oppId == null || h1 == null || h2 == null) return false;
                            return (h1 === f.id && h2 === oppId) || (h2 === f.id && h1 === oppId);
                          });
                          let saldoV = 0;
                          let saldoD = 0;
                          let saldoE = 0;
                          for (const h of confrontosMesmos) {
                            const rr = resultadoColetivo(f.id, h).label;
                            if (rr === "V") saldoV += 1;
                            else if (rr === "D") saldoD += 1;
                            else if (rr === "E") saldoE += 1;
                          }
                          const saldoResumo =
                            `Saldo: ${f.nome} ${saldoV}V · ${onome} ${saldoD}V` +
                            (saldoE > 0 ? ` · ${saldoE} empate${saldoE !== 1 ? "s" : ""}` : "");
                          const ultimosConfrontos = confrontosMesmos.slice(0, 5).map((h) => {
                            const hOrigem: "Ranking" | "Torneio" =
                              h.torneio_id != null || String(h.tipo_partida ?? "").toLowerCase() === "torneio"
                                ? "Torneio"
                                : "Ranking";
                            const dataHora = new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(h.data_partida ?? h.data_resultado ?? h.data_registro ?? Date.now()));
                            const placar = `${Number(h.placar_1 ?? 0)} × ${Number(h.placar_2 ?? 0)}`;
                            return {
                              id: h.id,
                              dataHora,
                              local: h.local_str ?? null,
                              localHref:
                                h.local_espaco_id != null && Number(h.local_espaco_id) > 0
                                  ? `/local/${Number(h.local_espaco_id)}`
                                  : null,
                              placar,
                              origem: hOrigem,
                              confronto: `${f.nome} vs ${onome}`,
                            };
                          });
                          const dataHoraConfronto = new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(p.data_partida ?? p.data_resultado ?? p.data_registro ?? Date.now()));
                          return (
                            <EidConfrontoResumoModal
                              key={`c-${f.id}-${p.id}`}
                              titulo={`${f.nome} vs ${onome}`}
                              subtitulo={p.modalidade ? `Modalidade: ${p.modalidade}` : undefined}
                              ladoA={f.nome}
                              ladoB={onome}
                              ladoAAvatarUrl={f.escudo ?? null}
                              ladoBAvatarUrl={oppId != null ? (escudoOponenteTime.get(oppId) ?? null) : null}
                              ladoAProfileHref={
                                f.duplaRegistroIds[0]
                                  ? `/perfil-dupla/${f.duplaRegistroIds[0]}?from=${encodeURIComponent(nextPath)}`
                                  : `/perfil-time/${f.id}?from=${encodeURIComponent(nextPath)}`
                              }
                              ladoBProfileHref={oppId != null ? `/perfil-time/${oppId}?from=${encodeURIComponent(nextPath)}` : null}
                              origem={origemLabel}
                              dataHora={dataHoraConfronto}
                              local={p.local_str ?? null}
                              localHref={
                                p.local_espaco_id != null && Number(p.local_espaco_id) > 0
                                  ? `/local/${Number(p.local_espaco_id)}`
                                  : null
                              }
                              placarBase={`${Number(p.placar_1 ?? 0)} × ${Number(p.placar_2 ?? 0)}`}
                              mensagem={p.mensagem ?? null}
                              totalConfrontos={confrontosMesmos.length}
                              saldoResumo={saldoResumo}
                              ultimosConfrontos={ultimosConfrontos}
                              asListItem
                              rowClassName={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} relative flex items-center gap-2 cursor-pointer`}
                            >
                              <span className={`absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${res.tone} bg-eid-surface/90`}>
                                {res.label}
                              </span>
                              {oppId != null ? (
                                <Link
                                  href={`/perfil-time/${oppId}?from=${encodeURIComponent(nextPath)}`}
                                  data-no-modal="1"
                                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:text-eid-primary-200"
                                  aria-label={`Abrir perfil da equipe ${onome}`}
                                >
                                  {onome.trim().slice(0, 1).toUpperCase() || "E"}
                                </Link>
                              ) : (
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300">
                                  {onome.trim().slice(0, 1).toUpperCase() || "E"}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate pr-7 text-[11px] font-bold text-eid-fg">
                                  vs{" "}
                                  {oppId != null ? (
                                    <Link
                                      href={`/perfil-time/${oppId}?from=${encodeURIComponent(nextPath)}`}
                                      data-no-modal="1"
                                      className="text-eid-primary-400 hover:underline"
                                    >
                                      {onome}
                                    </Link>
                                  ) : (
                                    onome
                                  )}
                                </p>
                                <p className="text-[10px] text-eid-text-secondary">
                                  {p.modalidade ? `${p.modalidade} · ` : ""}
                                  <span
                                    className={
                                      origemLabel === "Torneio"
                                        ? "font-bold text-eid-action-400"
                                        : "font-bold text-eid-primary-300"
                                    }
                                  >
                                    {origemLabel}
                                  </span>
                                  {" · "}
                                  {when}
                                  {torNome ? (
                                    <span className="text-eid-action-400"> · {torNome}</span>
                                  ) : p.torneio_id ? (
                                    <span className="text-eid-action-400"> · Torneio #{p.torneio_id}</span>
                                  ) : null}
                                  {p.tipo_partida ? ` · ${p.tipo_partida}` : ""}
                                </p>
                              </div>
                              <div className="text-right pr-7">
                                <p className="text-sm font-black tabular-nums text-eid-fg">
                                  {Number.isFinite(Number(p.placar_1)) && Number.isFinite(Number(p.placar_2))
                                    ? `${p.placar_1} × ${p.placar_2}`
                                    : "—"}
                                </p>
                                <p className="text-[9px] uppercase text-eid-text-secondary">{p.status ?? "—"}</p>
                              </div>
                            </EidConfrontoResumoModal>
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
            <p className="mt-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-surface)_12%)] p-3 text-[11px] text-eid-text-secondary">
              Sem partidas individuais para exibir neste esporte. Quando houver jogos válidos no ranking, eles aparecem
              aqui com placar e adversário.
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-2">
                {listaIndividualPreview
                  .filter((p) => {
                    const oid = p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id;
                    return !!oid;
                  })
                  .map((p) => {
                  const oid = (p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id) as string;
                  const op = oponenteInfo.get(oid);
                  const res = resultadoPartidaIndividual(profileId, p);
                  const torLabel = p.torneio_id ? torneioNome.get(Number(p.torneio_id)) ?? `Torneio #${p.torneio_id}` : null;
                  const origemLabel: "Ranking" | "Torneio" =
                    p.torneio_id != null || String(p.tipo_partida ?? "").toLowerCase() === "torneio"
                      ? "Torneio"
                      : "Ranking";
                  const confrontosMesmos = lista.filter((h) => {
                    const hOid = h.jogador1_id === profileId ? h.jogador2_id : h.jogador1_id;
                    return hOid === oid;
                  });
                  let saldoV = 0;
                  let saldoD = 0;
                  let saldoE = 0;
                  for (const h of confrontosMesmos) {
                    const rr = resultadoPartidaIndividual(profileId, h).label;
                    if (rr === "V") saldoV += 1;
                    else if (rr === "D") saldoD += 1;
                    else if (rr === "E") saldoE += 1;
                  }
                  const saldoResumo =
                    `Saldo: ${(perfil.nome ?? "Você")} ${saldoV}V · ${(op?.nome ?? "Oponente")} ${saldoD}V` +
                    (saldoE > 0 ? ` · ${saldoE} empate${saldoE !== 1 ? "s" : ""}` : "");
                  const ultimosConfrontos = confrontosMesmos.slice(0, 5).map((h) => {
                    const hOrigem: "Ranking" | "Torneio" =
                      h.torneio_id != null || String(h.tipo_partida ?? "").toLowerCase() === "torneio"
                        ? "Torneio"
                        : "Ranking";
                    const dataHora = new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(h.data_partida ?? h.data_resultado ?? h.data_registro ?? Date.now()));
                    const placar = `${Number(h.placar_1 ?? 0)} × ${Number(h.placar_2 ?? 0)}`;
                    return {
                      id: h.id,
                      dataHora,
                      local: h.local_str ?? null,
                      localHref:
                        h.local_espaco_id != null && Number(h.local_espaco_id) > 0
                          ? `/local/${Number(h.local_espaco_id)}`
                          : null,
                      placar,
                      origem: hOrigem,
                      confronto: `${perfil.nome ?? "Atleta"} vs ${op?.nome ?? "Atleta"}`,
                    };
                  });
                  return (
                    <EidIndividualPartidaRow
                      key={p.id}
                      partida={p}
                      selfNome={perfil.nome ?? "Atleta"}
                      selfAvatarUrl={perfil.avatar_url ?? null}
                      selfProfileHref={`/perfil/${encodeURIComponent(profileId)}?from=${encodeURIComponent(nextPath)}`}
                      opponentId={oid}
                      opponentNome={op?.nome ?? "Atleta"}
                      opponentAvatarUrl={op?.avatar_url ?? null}
                      opponentNotaEid={op?.nota_eid ?? null}
                      res={res}
                      profileLinkFrom={eidPageHref}
                      torneioLabel={torLabel}
                      origemLabel={origemLabel}
                      esporteLabel={nomeEsporte}
                      modalidadeLabel={String(p.modalidade ?? "individual")}
                      totalConfrontos={confrontosMesmos.length}
                      saldoResumo={saldoResumo}
                      ultimosConfrontos={ultimosConfrontos}
                    />
                  );
                })}
              </ul>
              {temMaisPartidasIndividuais ? (
                <div className="mt-3 flex justify-center">
                  <Link
                    href={historicoIndividualHref}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-4 text-[11px] font-bold uppercase tracking-[0.06em] text-eid-fg transition hover:scale-[1.01] hover:bg-eid-primary-500/18"
                  >
                    Ver mais
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </ProfileSection>
        ) : null}

        <ProfileSection title="Head-to-head" className="mt-4">
          <div className="mt-2 space-y-3">
            {showIndividual ? (
              <div className={`overflow-hidden ${PROFILE_CARD_BASE}`}>
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Individual</p>
                  <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-primary-300">
                    Top confrontos
                  </span>
                </div>
                {individualHeadRows.length > 0 ? (
                  <ul className="space-y-1.5 p-2.5">
                    {individualHeadRows.slice(0, 8).map((row) => (
                      <li
                        key={row.oid}
                        className="flex items-center justify-between rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-surface)_12%)] px-2.5 py-2"
                      >
                        <Link
                          href={`/perfil/${encodeURIComponent(row.oid)}?from=${encodeURIComponent(nextPath)}`}
                          className="min-w-0 truncate text-[11px] font-semibold text-eid-fg hover:text-eid-primary-300"
                        >
                          {row.nome}
                        </Link>
                        <span className="shrink-0 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold text-eid-fg">
                          <span className="text-emerald-400">{row.v}V</span>
                          <span className="mx-1 text-eid-text-secondary">·</span>
                          <span className="text-rose-400">{row.d}D</span>
                          <span className="mx-1 text-eid-text-secondary">·</span>
                          <span className="text-eid-primary-300">{row.e}E</span>
                          <span className="ml-1 text-eid-text-secondary">({row.jogos})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`${PROFILE_CARD_PAD_MD} text-[11px] text-eid-text-secondary`}>
                    Sem confrontos individuais suficientes para comparativo.
                  </p>
                )}
              </div>
            ) : null}

            {(showDupla || showTime) ? (
              <div className={`overflow-hidden ${PROFILE_CARD_BASE}`}>
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Dupla/Time</p>
                  <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eid-action-400">
                    Histórico direto
                  </span>
                </div>
                {coletivoHeadRows.filter((r) => (r.modalidade === "dupla" ? showDupla : showTime)).length > 0 ? (
                  <ul className="space-y-1.5 p-2.5">
                    {coletivoHeadRows
                      .filter((r) => (r.modalidade === "dupla" ? showDupla : showTime))
                      .slice(0, 10)
                      .map((row) => (
                        <li
                          key={row.key}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-surface)_12%)] px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-eid-fg">
                              <Link
                                href={`/perfil-time/${row.formacaoId}?from=${encodeURIComponent(nextPath)}`}
                                className="text-eid-fg hover:text-eid-primary-300 hover:underline"
                              >
                                {row.formacao}
                              </Link>{" "}
                              vs{" "}
                              <Link
                                href={`/perfil-time/${row.oponenteId}?from=${encodeURIComponent(nextPath)}`}
                                className="text-eid-fg hover:text-eid-primary-300 hover:underline"
                              >
                                {row.oponenteNome}
                              </Link>
                            </p>
                            <p className="mt-0.5 inline-flex rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.08em] text-eid-action-400">
                              {row.modalidade}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold text-eid-fg">
                            <span className="text-emerald-400">{row.v}V</span>
                            <span className="mx-1 text-eid-text-secondary">·</span>
                            <span className="text-rose-400">{row.d}D</span>
                            <span className="mx-1 text-eid-text-secondary">·</span>
                            <span className="text-eid-primary-300">{row.e}E</span>
                            <span className="ml-1 text-eid-text-secondary">({row.jogos})</span>
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className={`${PROFILE_CARD_PAD_MD} text-[11px] text-eid-text-secondary`}>
                    Sem confrontos coletivos suficientes para comparativo.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </ProfileSection>
      </main>
  );
}
