import type { SupabaseClient } from "@supabase/supabase-js";
import { ComunidadeQuadro } from "@/components/comunidade/comunidade-quadro";
import { ComunidadePedidosEnviados, type ComunidadePedidoEnviadoItem } from "@/components/comunidade/comunidade-pedidos-enviados";
import { ComunidadePedidosMatch, type PedidoMatchItem } from "@/components/comunidade/comunidade-pedidos-match";
import { PedidoMatchFinalidadeSeal } from "@/components/comunidade/pedido-match-finalidade-seal";
import { fetchPedidoRankingPreview, type PedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";

export type ComunidadeStreamDesafioProps = {
  supabase: SupabaseClient;
  viewerUserId: string;
};

export async function ComunidadeStreamDesafio({ supabase, viewerUserId }: ComunidadeStreamDesafioProps) {
  const uidEq = viewerUserId;

  const [{ data: recebidos }, { data: enviadosPendentes }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, modalidade_confronto, data_solicitacao, data_registro, usuario_id, esporte_id, adversario_time_id, finalidade")
      .eq("adversario_id", viewerUserId)
      .eq("status", "Pendente")
      .order("data_registro", { ascending: false })
      .limit(30),
    supabase
      .from("matches")
      .select("id, adversario_id, adversario_time_id, esporte_id, modalidade_confronto, data_solicitacao")
      .eq("usuario_id", viewerUserId)
      .eq("status", "Pendente")
      .order("data_solicitacao", { ascending: false })
      .limit(20),
  ]);
  const receivedSportIds = [
    ...new Set((recebidos ?? []).map((m) => Number(m.esporte_id ?? 0)).filter((id) => Number.isFinite(id) && id > 0)),
  ];

  const uids = [...new Set((recebidos ?? []).map((m) => m.usuario_id).filter(Boolean))] as string[];
  const [{ data: desafiantes }, { data: desafiantesEid }] = await Promise.all([
    uids.length
      ? supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", uids)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null; avatar_url: string | null; localizacao: string | null }> }),
    uids.length > 0 && receivedSportIds.length > 0
      ? supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", uids)
          .in("esporte_id", receivedSportIds)
      : Promise.resolve({ data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> }),
  ]);
  const uMap = new Map((desafiantes ?? []).map((p) => [p.id, p]));
  const desafianteEidMap = new Map(
    (desafiantesEid ?? []).map((row) => [`${String(row.usuario_id)}:${Number(row.esporte_id)}`, Number(row.nota_eid ?? 0)]),
  );

  const eidsRecebidos = (recebidos ?? []).map((m) => m.esporte_id).filter(Boolean) as number[];
  const eidsEnviados = (enviadosPendentes ?? []).map((m) => m.esporte_id).filter(Boolean) as number[];
  const eids = [...new Set([...eidsRecebidos, ...eidsEnviados])] as number[];

  const timeIds = [...new Set((recebidos ?? []).map((m) => m.adversario_time_id).filter(Boolean))] as number[];

  const coletivoRecebidos = (recebidos ?? []).filter((row) => {
    const mod = String(row.modalidade_confronto ?? "").toLowerCase();
    return mod === "dupla" || mod === "time";
  });
  const chLiderUids = [...new Set(coletivoRecebidos.map((row) => String(row.usuario_id ?? "")).filter(Boolean))];
  const chEsporteIdsColetivo = [
    ...new Set(coletivoRecebidos.map((row) => Number(row.esporte_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0)),
  ];

  const [{ data: esportes }, { data: timesRows }, { data: formacoesDesafianteRows }] = await Promise.all([
    eids.length ? supabase.from("esportes").select("id, nome").in("id", eids) : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }> }),
    timeIds.length
      ? supabase.from("times").select("id, nome").in("id", timeIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }> }),
    chLiderUids.length > 0 && chEsporteIdsColetivo.length > 0
      ? supabase
          .from("times")
          .select("id, nome, escudo, localizacao, criador_id, esporte_id, tipo, eid_time, pontos_ranking")
          .in("criador_id", chLiderUids)
          .in("esporte_id", chEsporteIdsColetivo)
      : Promise.resolve({
          data: [] as Array<{
            id?: number;
            nome?: string | null;
            escudo?: string | null;
            localizacao?: string | null;
            criador_id?: string | null;
            esporte_id?: number | null;
            tipo?: string | null;
            eid_time?: number | null;
            pontos_ranking?: number | null;
          }>,
        }),
  ]);
  const espMap = new Map((esportes ?? []).map((e) => [e.id, e.nome]));
  const timeMap = new Map((timesRows ?? []).map((t) => [t.id, t.nome]));
  type FormacaoDesafiantePedido = {
    id: number;
    nome: string | null;
    escudo: string | null;
    localizacao: string | null;
    tipo: "dupla" | "time";
    eidTime: number;
    pontosRanking: number;
  };
  const formacaoDesafianteByChave = new Map<string, FormacaoDesafiantePedido>();
  for (const row of formacoesDesafianteRows ?? []) {
    const tipoRaw = String((row as { tipo?: string | null }).tipo ?? "").trim().toLowerCase();
    if (tipoRaw !== "dupla" && tipoRaw !== "time") continue;
    const tipo = tipoRaw as "dupla" | "time";
    const uid = String((row as { criador_id?: string | null }).criador_id ?? "");
    const esp = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
    if (!uid || !esp) continue;
    const key = `${uid}:${esp}:${tipo}`;
    const id = Number((row as { id?: number }).id ?? 0);
    const prev = formacaoDesafianteByChave.get(key);
    if (!prev || id > prev.id) {
      formacaoDesafianteByChave.set(key, {
        id,
        nome: (row as { nome?: string | null }).nome ?? null,
        escudo: (row as { escudo?: string | null }).escudo ?? null,
        localizacao: (row as { localizacao?: string | null }).localizacao ?? null,
        tipo,
        eidTime: Number((row as { eid_time?: number | null }).eid_time ?? 0),
        pontosRanking: Number((row as { pontos_ranking?: number | null }).pontos_ranking ?? 0),
      });
    }
  }

  const pedidosItemsBase = (recebidos ?? []).map((m) => {
    const mod = String(m.modalidade_confronto ?? "individual").toLowerCase();
    const formacaoDesafianteKey =
      m.usuario_id && (mod === "dupla" || mod === "time") && m.esporte_id
        ? `${String(m.usuario_id)}:${Number(m.esporte_id)}:${mod}`
        : null;
    const formacaoDesafiante = formacaoDesafianteKey ? formacaoDesafianteByChave.get(formacaoDesafianteKey) ?? null : null;
    return {
      id: Number(m.id),
      dataSolicitacao:
        (m as { data_solicitacao?: string | null }).data_solicitacao ??
        (m as { data_registro?: string | null }).data_registro ??
        null,
      desafianteNome: (m.usuario_id ? uMap.get(m.usuario_id)?.nome : null) ?? "Atleta",
      desafianteId: String(m.usuario_id ?? ""),
      desafianteAvatarUrl: (m.usuario_id ? uMap.get(m.usuario_id)?.avatar_url : null) ?? null,
      desafianteLocalizacao: (m.usuario_id ? uMap.get(m.usuario_id)?.localizacao : null) ?? null,
      desafianteNotaEid:
        m.usuario_id && Number.isFinite(Number(m.esporte_id ?? 0))
          ? desafianteEidMap.get(`${String(m.usuario_id)}:${Number(m.esporte_id ?? 0)}`) ?? 0
          : 0,
      esporte: (m.esporte_id ? espMap.get(m.esporte_id) : null) ?? "Esporte",
      esporteId: Number(m.esporte_id ?? 0),
      modalidade: mod === "atleta" ? "individual" : mod,
      formacaoDesafiante,
      timeNome: m.adversario_time_id ? timeMap.get(m.adversario_time_id) ?? null : null,
      adversarioTimeId: m.adversario_time_id != null ? Number(m.adversario_time_id) : null,
      finalidade: (String(m.finalidade ?? "ranking") === "amistoso" ? "amistoso" : "ranking") as "ranking" | "amistoso",
    };
  });

  const pedidosItems: PedidoMatchItem[] = await Promise.all(
    (() => {
      const rankingPosCache = new Map<string, Promise<number | null>>();
      const rankingPontosCache = new Map<string, Promise<number | null>>();
      const rankingPreviewCache = new Map<string, Promise<PedidoRankingPreview | null>>();

      async function getRankingPosicao(item: (typeof pedidosItemsBase)[number]): Promise<number | null> {
        if (item.finalidade !== "ranking" || item.esporteId <= 0) return null;
        const mod = String(item.modalidade ?? "").toLowerCase();

        if (item.formacaoDesafiante && (mod === "dupla" || mod === "time")) {
          const key = `time:${item.esporteId}:${mod}:${item.formacaoDesafiante.pontosRanking}`;
          const cached = rankingPosCache.get(key);
          if (cached) return cached;
          const promise = (async () => {
            const { count } = await supabase
              .from("times")
              .select("id", { count: "exact", head: true })
              .eq("esporte_id", item.esporteId)
              .eq("tipo", mod)
              .gt("pontos_ranking", item.formacaoDesafiante?.pontosRanking ?? 0);
            return Number(count ?? 0) + 1;
          })();
          rankingPosCache.set(key, promise);
          return promise;
        }

        const pontosKey = `${item.desafianteId}:${item.esporteId}`;
        const pontosPromise =
          rankingPontosCache.get(pontosKey) ??
          (async () => {
            const { data: chEid } = await supabase
              .from("usuario_eid")
              .select("pontos_ranking")
              .eq("usuario_id", item.desafianteId)
              .eq("esporte_id", item.esporteId)
              .maybeSingle();
            const pontos = Number(chEid?.pontos_ranking ?? NaN);
            return Number.isFinite(pontos) ? pontos : null;
          })();
        rankingPontosCache.set(pontosKey, pontosPromise);
        const pontos = await pontosPromise;
        if (!Number.isFinite(pontos)) return null;

        const key = `user:${item.esporteId}:${pontos}`;
        const cached = rankingPosCache.get(key);
        if (cached) return cached;
        const promise = (async () => {
          const { count } = await supabase
            .from("usuario_eid")
            .select("id", { count: "exact", head: true })
            .eq("esporte_id", item.esporteId)
            .gt("pontos_ranking", pontos ?? 0);
          return Number(count ?? 0) + 1;
        })();
        rankingPosCache.set(key, promise);
        return promise;
      }

      async function getRankingPreview(item: (typeof pedidosItemsBase)[number]): Promise<PedidoRankingPreview | null> {
        if (item.finalidade !== "ranking" || item.esporteId <= 0) return null;
        const previewKey = `${uidEq}:${item.desafianteId}:${item.esporteId}:${String(item.modalidade ?? "").toLowerCase()}:${Number(item.adversarioTimeId ?? 0)}`;
        const cached = rankingPreviewCache.get(previewKey);
        if (cached) return cached;
        const promise = fetchPedidoRankingPreview(supabase, {
          accepterId: uidEq,
          challengerId: item.desafianteId,
          esporteId: item.esporteId,
          modalidade: item.modalidade,
          adversarioTimeId: item.adversarioTimeId,
        });
        rankingPreviewCache.set(previewKey, promise);
        return promise;
      }

      return pedidosItemsBase.map(async (m) => ({
        ...m,
        rankingPosicao: await getRankingPosicao(m),
        rankingPreview: await getRankingPreview(m),
      }));
    })(),
  );

  const enviadosAdversarioIds = [
    ...new Set((enviadosPendentes ?? []).map((m) => String(m.adversario_id ?? "")).filter(Boolean)),
  ];
  const enviadosEsporteIds = [
    ...new Set((enviadosPendentes ?? []).map((m) => Number(m.esporte_id ?? 0)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const [{ data: enviadosPerfis }, { data: enviadosEids }] = await Promise.all([
    enviadosAdversarioIds.length
      ? supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", enviadosAdversarioIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null; avatar_url: string | null; localizacao: string | null }> }),
    enviadosAdversarioIds.length > 0 && enviadosEsporteIds.length > 0
      ? supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", enviadosAdversarioIds)
          .in("esporte_id", enviadosEsporteIds)
      : Promise.resolve({ data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> }),
  ]);
  const enviadosPerfisMap = new Map((enviadosPerfis ?? []).map((p) => [p.id, p]));
  const enviadosEidMap = new Map(
    (enviadosEids ?? []).map((row) => [`${String(row.usuario_id)}:${Number(row.esporte_id)}`, Number(row.nota_eid ?? 0)]),
  );
  const enviadosAdvTimeIds = [
    ...new Set(
      (enviadosPendentes ?? [])
        .map((row) => Number((row as { adversario_time_id?: number | null }).adversario_time_id ?? 0))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];
  const { data: enviadosFormacaoRows } = enviadosAdvTimeIds.length
    ? await supabase.from("times").select("id, nome, escudo, localizacao, tipo, eid_time").in("id", enviadosAdvTimeIds)
    : { data: [] };
  const enviadosFormacaoMap = new Map((enviadosFormacaoRows ?? []).map((t) => [Number((t as { id: number }).id), t]));
  const pedidosEnviadosItems: ComunidadePedidoEnviadoItem[] = (enviadosPendentes ?? []).map((m) => {
    const mod = String(m.modalidade_confronto ?? "individual").toLowerCase();
    const normalizedMod = mod === "atleta" ? "individual" : mod;
    const advTimeId = Number((m as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    let formacaoAdversaria: {
      id: number;
      nome: string | null;
      escudo: string | null;
      localizacao: string | null;
      tipo: "dupla" | "time";
      eidTime: number;
    } | null = null;
    if (advTimeId > 0 && (normalizedMod === "dupla" || normalizedMod === "time")) {
      const t = enviadosFormacaoMap.get(advTimeId);
      if (t) {
        const tipoRaw = String((t as { tipo?: string | null }).tipo ?? "").trim().toLowerCase();
        if (tipoRaw === "dupla" || tipoRaw === "time") {
          formacaoAdversaria = {
            id: advTimeId,
            nome: (t as { nome?: string | null }).nome ?? null,
            escudo: (t as { escudo?: string | null }).escudo ?? null,
            localizacao: (t as { localizacao?: string | null }).localizacao ?? null,
            tipo: tipoRaw as "dupla" | "time",
            eidTime: Number((t as { eid_time?: number | null }).eid_time ?? 0),
          };
        }
      }
    }
    return {
      id: Number(m.id),
      solicitadoEm: (m as { data_solicitacao?: string | null }).data_solicitacao ?? null,
      adversarioId: String(m.adversario_id ?? ""),
      adversarioNome: enviadosPerfisMap.get(String(m.adversario_id ?? ""))?.nome ?? "Oponente",
      adversarioAvatarUrl: enviadosPerfisMap.get(String(m.adversario_id ?? ""))?.avatar_url ?? null,
      adversarioLocalizacao: enviadosPerfisMap.get(String(m.adversario_id ?? ""))?.localizacao ?? null,
      adversarioNotaEid: enviadosEidMap.get(`${String(m.adversario_id ?? "")}:${Number(m.esporte_id ?? 0)}`) ?? 0,
      esporte: (m.esporte_id ? espMap.get(m.esporte_id) : null) ?? "Esporte",
      esporteId: Number(m.esporte_id ?? 0),
      modalidade: normalizedMod,
      formacaoAdversaria,
    };
  });

  const hasDesafioAcoes = pedidosItems.length > 0 || pedidosEnviadosItems.length > 0;
  if (!hasDesafioAcoes) return null;

  return (
    <section
      id="desafio-pedidos"
      className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0"
    >
      <div className="flex items-center justify-between gap-2 border-b border-transparent bg-eid-surface/40 px-3 py-2.5 md:px-4">
        <div>
          <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Desafio</h2>
          <p className="mt-0.5 hidden text-[11px] text-eid-text-secondary md:block">
            Pedidos de desafio que aguardam aceite ou resposta.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-primary-300">
          Social
        </span>
      </div>
      <div className="px-3 py-3 md:px-4 md:py-4">
        <div className="space-y-4">
          <ComunidadeQuadro
            id="desafio-pedidos-recebidos"
            title="Pedidos recebidos"
            hasPending={pedidosItems.length > 0}
            headerBadgeExtra={
              pedidosItems.length === 1 ? <PedidoMatchFinalidadeSeal finalidade={pedidosItems[0]?.finalidade} /> : null
            }
          >
            <ComunidadePedidosMatch items={pedidosItems} />
          </ComunidadeQuadro>
          <ComunidadeQuadro
            id="desafio-pedidos-enviados"
            title="Pedidos enviados (aguardando resposta)"
            hasPending={pedidosEnviadosItems.length > 0}
          >
            <ComunidadePedidosEnviados items={pedidosEnviadosItems} />
          </ComunidadeQuadro>
        </div>
      </div>
    </section>
  );
}
