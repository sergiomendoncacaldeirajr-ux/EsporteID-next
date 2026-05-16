// ============================================================
// Sorteio de Ranking Mensal — queries (service role)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SorteioCandidato, SorteioModalidade, SorteioPar, SorteioAlgoritmoLog } from "./types";
import { chaveParIds, toIsoDate, ultimoDiaDoMes, type ParRecente } from "./engine";

// ── Candidatos elegíveis ─────────────────────────────────────

/**
 * Busca candidatos individuais elegíveis para o sorteio:
 * - têm o esporte cadastrado com interesse em rank_match
 * - têm lat/lng preenchidos
 * - sorteio_rank_ativo = true
 * - papel atleta
 */
export async function buscarCandidatosIndividual(
  supabase: SupabaseClient,
  esporteId: number,
  mesRef: Date
): Promise<SorteioCandidato[]> {
  // Busca usuários com EID no esporte + interesse em match + sorteio ativo
  // interesse_rank_match fica em profiles (não em usuario_eid)
  const { data, error } = await supabase
    .from("usuario_eid")
    .select(
      `usuario_id,
       nota_eid,
       pontos_ranking,
       profiles!inner(
         id, nome, genero, lat, lng, localizacao,
         sorteio_rank_ativo, interesse_rank_match
       )`
    )
    .eq("esporte_id", esporteId)
    .limit(500);

  if (error) throw new Error(`buscarCandidatosIndividual: ${error.message}`);

  const candidatos: SorteioCandidato[] = [];
  const mesRefStr = mesRef.toISOString().slice(0, 7); // "YYYY-MM"

  for (const row of data ?? []) {
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!prof) continue;
    if (!prof.sorteio_rank_ativo) continue;
    if (prof.interesse_rank_match === false) continue; // excluir quem desativou interesse

    const lat = Number(prof.lat);
    const lng = Number(prof.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;

    const genero = String(prof.genero ?? "").trim().toLowerCase() || "misto";

    candidatos.push({
      usuarioId: String(prof.id),
      timeId: null,
      modalidade: "individual",
      genero,
      lat,
      lng,
      pontosRanking: Number(row.pontos_ranking ?? 0),
      notaEid: Number(row.nota_eid ?? 1),
      nome: String(prof.nome ?? "Atleta"),
      localizacao: prof.localizacao ?? null,
    });
  }

  void mesRefStr; // usado em versões futuras para verificar slot já usado
  return candidatos;
}

/**
 * Busca candidatos de formações (dupla ou time) elegíveis:
 * - formação no esporte correto
 * - interesse_rank_match = true
 * - sorteio_rank_ativo do líder = true
 * - lat/lng preenchidos
 */
export async function buscarCandidatosFormacao(
  supabase: SupabaseClient,
  esporteId: number,
  modalidade: "dupla" | "time"
): Promise<SorteioCandidato[]> {
  const tipo = modalidade === "dupla" ? "dupla" : "time";

  const { data, error } = await supabase
    .from("times")
    .select(
      `id, nome, tipo, lat, lng, localizacao, genero,
       pontos_ranking, eid_time, interesse_rank_match, criador_id,
       profiles!times_criador_id_fkey(id, sorteio_rank_ativo)`
    )
    .eq("esporte_id", esporteId)
    .ilike("tipo", tipo)
    .eq("interesse_rank_match", true)
    .limit(500);

  if (error) throw new Error(`buscarCandidatosFormacao: ${error.message}`);

  const candidatos: SorteioCandidato[] = [];

  for (const row of data ?? []) {
    const latRaw = row.lat;
    const lngRaw = row.lng;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 && lng === 0) continue;

    // Verifica se o líder optou por participar
    const liderProf = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    if (liderProf && liderProf.sorteio_rank_ativo === false) continue;

    const genero =
      String(row.genero ?? "").trim().toLowerCase() || "misto";

    candidatos.push({
      usuarioId: String(row.criador_id),
      timeId: Number(row.id),
      modalidade,
      genero,
      lat,
      lng,
      pontosRanking: Number(row.pontos_ranking ?? 0),
      notaEid: Number(row.eid_time ?? 1),
      nome: String(row.nome ?? "Formação"),
      localizacao: row.localizacao ?? null,
    });
  }

  return candidatos;
}

/** Dispatcher: retorna candidatos conforme modalidade. */
export async function buscarCandidatos(
  supabase: SupabaseClient,
  esporteId: number,
  modalidade: SorteioModalidade
): Promise<SorteioCandidato[]> {
  if (modalidade === "individual") {
    return buscarCandidatosIndividual(supabase, esporteId, new Date());
  }
  return buscarCandidatosFormacao(supabase, esporteId, modalidade);
}

// ── Pares recentes (últimos 2 meses) ─────────────────────────

/**
 * Retorna o conjunto de chaves canônicas de pares já sorteados
 * nos últimos `meses` meses para o mesmo esporte+modalidade.
 * Isso evita repetição imediata, mas não bloqueia (ver engine).
 */
export async function buscarParesRecentes(
  supabase: SupabaseClient,
  esporteId: number,
  modalidade: SorteioModalidade,
  mesRef: Date,
  meses = 2
): Promise<Set<ParRecente>> {
  const limite = new Date(mesRef);
  limite.setMonth(limite.getMonth() - meses);
  const limiteStr = limite.toISOString().slice(0, 10);
  const mesRefStr = mesRef.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("sorteio_rank_confrontos")
    .select(
      `lado1_usuario_id, lado1_time_id, lado2_usuario_id, lado2_time_id,
       sorteio_rank_edicoes!inner(esporte_id, modalidade, mes_ref, status)`
    )
    .eq("sorteio_rank_edicoes.esporte_id", esporteId)
    .eq("sorteio_rank_edicoes.modalidade", modalidade)
    .eq("sorteio_rank_edicoes.status", "publicado")
    .gte("sorteio_rank_edicoes.mes_ref", limiteStr)
    .lt("sorteio_rank_edicoes.mes_ref", mesRefStr)
    .limit(1000);

  const conjunto = new Set<ParRecente>();
  for (const row of data ?? []) {
    const chave = chaveParIds(
      row.lado1_usuario_id,
      row.lado1_time_id,
      row.lado2_usuario_id,
      row.lado2_time_id
    );
    conjunto.add(chave);
  }
  return conjunto;
}

// ── Slots mensais ─────────────────────────────────────────────

/**
 * Verifica se um candidato já tem um slot de sorteio publicado
 * neste mês (impede duplicação).
 */
export async function candidatoJaPossuiSorteioNoMes(
  supabase: SupabaseClient,
  candidato: { usuarioId: string; timeId: number | null },
  esporteId: number,
  modalidade: SorteioModalidade,
  mesRefStr: string // "YYYY-MM-DD"
): Promise<boolean> {
  const filter =
    candidato.timeId != null
      ? `lado1_time_id.eq.${candidato.timeId},lado2_time_id.eq.${candidato.timeId}`
      : `lado1_usuario_id.eq.${candidato.usuarioId},lado2_usuario_id.eq.${candidato.usuarioId}`;

  const { count } = await supabase
    .from("sorteio_rank_confrontos")
    .select(
      "id, sorteio_rank_edicoes!inner(esporte_id, modalidade, mes_ref, status)",
      { count: "exact", head: true }
    )
    .eq("sorteio_rank_edicoes.esporte_id", esporteId)
    .eq("sorteio_rank_edicoes.modalidade", modalidade)
    .eq("sorteio_rank_edicoes.mes_ref", mesRefStr)
    .eq("sorteio_rank_edicoes.status", "publicado")
    .or(filter)
    .not("status", "eq", "cancelado")
    .limit(1);

  return (count ?? 0) > 0;
}

// ── Salvar resultado do sorteio (service role) ────────────────

export type SalvarSorteioArgs = {
  esporteId: number;
  modalidade: SorteioModalidade;
  mesRef: Date;
  pares: SorteioPar[];
  log: SorteioAlgoritmoLog;
  criadoPor: string;
  /** Se true, substitui edição existente (simulacao ou pendente_aprovacao). */
  substituir?: boolean;
};

/**
 * Persiste os pares do sorteio como `status='simulacao'`.
 * Retorna o ID da edição criada/substituída.
 */
export async function salvarSorteioSimulacao(
  supabase: SupabaseClient,
  args: SalvarSorteioArgs
): Promise<number> {
  const mesRefStr = toIsoDate(
    new Date(args.mesRef.getFullYear(), args.mesRef.getMonth(), 1)
  );
  const dataLimite = toIsoDate(ultimoDiaDoMes(args.mesRef));

  // Remove edição anterior neste mês (se substituir=true)
  if (args.substituir) {
    await supabase
      .from("sorteio_rank_edicoes")
      .delete()
      .eq("esporte_id", args.esporteId)
      .eq("modalidade", args.modalidade)
      .eq("mes_ref", mesRefStr)
      .in("status", ["simulacao", "pendente_aprovacao"]);
  }

  // Cria edição
  const modoGenero =
    args.pares.some((p) => p.modoGenero === "misto")
      ? "misto"
      : "mesmo_genero";

  const { data: edicao, error: eErr } = await supabase
    .from("sorteio_rank_edicoes")
    .insert({
      esporte_id: args.esporteId,
      modalidade: args.modalidade,
      mes_ref: mesRefStr,
      status: "simulacao",
      modo_genero: modoGenero,
      algoritmo_log: args.log,
      criado_por: args.criadoPor,
    })
    .select("id")
    .single();

  if (eErr || !edicao) {
    throw new Error(`Erro ao salvar edição: ${eErr?.message ?? "sem dados"}`);
  }

  const edicaoId = Number(edicao.id);

  // Cria confrontos
  if (args.pares.length > 0) {
    const confrontos = args.pares.map((par) => ({
      edicao_id: edicaoId,
      lado1_usuario_id: par.lado1.timeId == null ? par.lado1.usuarioId : null,
      lado1_time_id: par.lado1.timeId ?? null,
      lado2_usuario_id: par.lado2.timeId == null ? par.lado2.usuarioId : null,
      lado2_time_id: par.lado2.timeId ?? null,
      data_limite: dataLimite,
      status: "pendente",
      modo_genero: par.modoGenero,
      distancia_km: par.distanciaKm,
      delta_rank: par.deltaRank,
      delta_eid: par.deltaEid,
    }));

    const { error: cErr } = await supabase
      .from("sorteio_rank_confrontos")
      .insert(confrontos);

    if (cErr) {
      throw new Error(`Erro ao salvar confrontos: ${cErr.message}`);
    }
  }

  return edicaoId;
}

// ── Listar edições (admin) ────────────────────────────────────

export type EdicaoComContagem = {
  id: number;
  esporte_id: number;
  esporte_nome: string;
  modalidade: string;
  mes_ref: string;
  status: string;
  modo_genero: string;
  total_confrontos: number;
  criado_em: string;
  publicado_em: string | null;
  algoritmo_log: SorteioAlgoritmoLog | null;
};

export async function listarEdicoesAdmin(
  supabase: SupabaseClient,
  limite = 30
): Promise<EdicaoComContagem[]> {
  const { data: edicoes } = await supabase
    .from("sorteio_rank_edicoes")
    .select(
      `id, esporte_id, modalidade, mes_ref, status, modo_genero,
       algoritmo_log, criado_em, publicado_em,
       esportes(nome)`
    )
    .order("mes_ref", { ascending: false })
    .order("id", { ascending: false })
    .limit(limite);

  if (!edicoes?.length) return [];

  const ids = edicoes.map((e) => e.id);
  const { data: conts } = await supabase
    .from("sorteio_rank_confrontos")
    .select("edicao_id")
    .in("edicao_id", ids);

  const cntMap = new Map<number, number>();
  for (const c of conts ?? []) {
    const eid = Number(c.edicao_id);
    cntMap.set(eid, (cntMap.get(eid) ?? 0) + 1);
  }

  return edicoes.map((e) => {
    const esp = Array.isArray(e.esportes) ? e.esportes[0] : e.esportes;
    return {
      id: Number(e.id),
      esporte_id: Number(e.esporte_id),
      esporte_nome: String((esp as { nome?: string })?.nome ?? e.esporte_id),
      modalidade: String(e.modalidade),
      mes_ref: String(e.mes_ref),
      status: String(e.status),
      modo_genero: String(e.modo_genero),
      total_confrontos: cntMap.get(Number(e.id)) ?? 0,
      criado_em: String(e.criado_em),
      publicado_em: e.publicado_em ? String(e.publicado_em) : null,
      algoritmo_log: (e.algoritmo_log as SorteioAlgoritmoLog) ?? null,
    };
  });
}

export async function listarConfrontosEdicao(
  supabase: SupabaseClient,
  edicaoId: number
) {
  const { data } = await supabase
    .from("sorteio_rank_confrontos")
    .select(
      `id, edicao_id, lado1_usuario_id, lado1_time_id,
       lado2_usuario_id, lado2_time_id, partida_id,
       data_limite, status, modo_genero, distancia_km,
       delta_rank, delta_eid,
       lado1_tentou_agendar, lado2_tentou_agendar,
       lado1_tentou_em, lado2_tentou_em`
    )
    .eq("edicao_id", edicaoId)
    .order("id");

  return data ?? [];
}
