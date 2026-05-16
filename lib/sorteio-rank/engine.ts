// ============================================================
// Sorteio de Ranking Mensal — engine do algoritmo de pareamento
// ============================================================
//
// REGRAS IMPLEMENTADAS
// 1. Raio máximo de 30 km entre os dois lados do par.
// 2. Mesmo esporte + mesma modalidade (garantido pela query de entrada).
// 3. Prioridade de gênero:
//    a. Tenta parear dentro do mesmo gênero (masculino×masculino,
//       feminino×feminino).
//    b. Se algum gênero tiver < 2 candidatos sem par, o ciclo inteiro
//       passa para modo "misto" — o algoritmo roda novamente com todos.
// 4. Ordem de preferência do par: menor diferença de rank +
//    menor diferença de EID (score combinado ponderado).
// 5. Evita repetir pares recentes (últimos 2 meses), mas se não houver
//    outra opção, pode repetir. Repetição não conta na carência.
// 6. Mínimo de 2 candidatos elegíveis para realizar o sorteio.
// ============================================================

import { distanciaKm } from "@/lib/geo/distance-km";
import type {
  SorteioCandidato,
  SorteioAlgoritmoResultado,
  SorteioPar,
  SorteioModoGenero,
} from "./types";

/** Par histórico recente para evitar repetição. Formato "menor_id:maior_id". */
export type ParRecente = string;

const RAIO_MAX_KM = 30;

/** Gera chave canônica de par (ordem não importa). */
function chaveParCandidatos(a: SorteioCandidato, b: SorteioCandidato): string {
  const idA = a.timeId != null ? `t${a.timeId}` : `u${a.usuarioId}`;
  const idB = b.timeId != null ? `t${b.timeId}` : `u${b.usuarioId}`;
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/** Score de "proximidade de nível": quanto menor, mais bem pareado. */
function scorePareamento(
  a: SorteioCandidato,
  b: SorteioCandidato,
  distKm: number
): number {
  const normRank = Math.abs(a.pontosRanking - b.pontosRanking);
  const normEid = Math.abs(a.notaEid - b.notaEid) * 100; // EID escala menor, amplifica
  const normDist = distKm; // km (já garantido ≤ 30)
  // Ponderação: rank > EID > distância
  return normRank * 2 + normEid * 1.5 + normDist * 0.5;
}

/** Filtra candidatos pelo mesmo grupo de gênero. */
function filtrarPorGenero(
  candidatos: SorteioCandidato[],
  genero: string
): SorteioCandidato[] {
  return candidatos.filter(
    (c) => c.genero.trim().toLowerCase() === genero.toLowerCase()
  );
}

/** Executa o algoritmo guloso de pareamento sobre um pool de candidatos. */
function pararPool(
  pool: SorteioCandidato[],
  paresRecentes: Set<ParRecente>,
  modoGenero: SorteioModoGenero,
  log: string[]
): { pares: SorteioPar[]; restantes: SorteioCandidato[] } {
  const disponiveis = new Set(pool.map((_, i) => i));
  const pares: SorteioPar[] = [];

  // Ordena por pontos de ranking decrescente (mais fortes primeiro)
  // para tentar parear candidatos de níveis semelhantes.
  const sorted = [...pool].sort((a, b) => b.pontosRanking - a.pontosRanking);
  const sortedDisp = new Set(sorted.map((_, i) => i));

  for (let i = 0; i < sorted.length; i++) {
    if (!sortedDisp.has(i)) continue;

    const candidato = sorted[i];
    let melhorJ = -1;
    let melhorScore = Infinity;
    let melhorDist = 0;
    let repetindo = false;

    // 1ª passada: candidatos sem par recente
    for (let j = i + 1; j < sorted.length; j++) {
      if (!sortedDisp.has(j)) continue;

      const outro = sorted[j];
      const dist = distanciaKm(candidato.lat, candidato.lng, outro.lat, outro.lng);
      if (dist > RAIO_MAX_KM) continue;

      const chave = chaveParCandidatos(candidato, outro);
      if (paresRecentes.has(chave)) continue; // evita repetição

      const sc = scorePareamento(candidato, outro, dist);
      if (sc < melhorScore) {
        melhorScore = sc;
        melhorJ = j;
        melhorDist = dist;
        repetindo = false;
      }
    }

    // 2ª passada: se não achou sem repetição, aceita repetição
    if (melhorJ === -1) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (!sortedDisp.has(j)) continue;

        const outro = sorted[j];
        const dist = distanciaKm(candidato.lat, candidato.lng, outro.lat, outro.lng);
        if (dist > RAIO_MAX_KM) continue;

        const sc = scorePareamento(candidato, outro, dist);
        if (sc < melhorScore) {
          melhorScore = sc;
          melhorJ = j;
          melhorDist = dist;
          repetindo = true;
        }
      }
    }

    if (melhorJ === -1) {
      // Nenhum par viável para este candidato
      log.push(
        `Sem par: ${candidato.nome} (${candidato.localizacao ?? "?"}) — nenhum oponente a ≤${RAIO_MAX_KM}km no mesmo esporte/modalidade/gênero.`
      );
      continue;
    }

    const parceiro = sorted[melhorJ];
    sortedDisp.delete(i);
    sortedDisp.delete(melhorJ);

    const dr = Math.abs(candidato.pontosRanking - parceiro.pontosRanking);
    const de = Math.abs(candidato.notaEid - parceiro.notaEid);

    pares.push({
      lado1: candidato,
      lado2: parceiro,
      distanciaKm: melhorDist,
      deltaRank: dr,
      deltaEid: de,
      modoGenero,
    });

    log.push(
      `Par${repetindo ? " (repetição)" : ""}: ${candidato.nome} × ${parceiro.nome} | ${melhorDist.toFixed(1)} km | ΔRank ${dr} | ΔEID ${de.toFixed(2)} | modo=${modoGenero}`
    );
  }

  // Restantes sem par
  const restantes: SorteioCandidato[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sortedDisp.has(i)) restantes.push(sorted[i]);
  }

  // Também adicionar os que não estavam no sorted mas eram elegíveis
  const sortedIds = new Set(sorted.map((c) => c.timeId ?? c.usuarioId));
  for (const c of pool) {
    if (!sortedIds.has(c.timeId ?? c.usuarioId)) restantes.push(c);
  }

  return { pares, restantes };
}

/**
 * Executa o algoritmo de sorteio de ranking.
 *
 * Fluxo:
 * 1. Tenta parear por mesmo gênero (masc × masc, fem × fem).
 * 2. Se algum gênero não atingir o mínimo de 2, roda em modo misto.
 * 3. Retorna pares, sem-par e log de execução.
 */
export function executarSorteio(
  candidatos: SorteioCandidato[],
  paresRecentes: Set<ParRecente>
): SorteioAlgoritmoResultado {
  const log: string[] = [];
  log.push(
    `Iniciando sorteio com ${candidatos.length} candidato(s). Raio máx: ${RAIO_MAX_KM} km.`
  );

  if (candidatos.length < 2) {
    log.push("Candidatos insuficientes (< 2). Sorteio não realizado.");
    return {
      pares: [],
      semPar: candidatos,
      totalCandidatos: candidatos.length,
      modoGenero: "mesmo_genero",
      log,
    };
  }

  // ── Tentativa 1: mesmo gênero ────────────────────────────
  const masculinos = filtrarPorGenero(candidatos, "masculino");
  const femininos = filtrarPorGenero(candidatos, "feminino");
  const mistos = candidatos.filter(
    (c) =>
      !["masculino", "feminino"].includes(c.genero.trim().toLowerCase())
  );

  log.push(
    `Grupos: masculino=${masculinos.length}, feminino=${femininos.length}, misto/outro=${mistos.length}.`
  );

  // Se qualquer gênero "puro" não tiver ao menos 2, vai para modo misto
  const temSuficienteMasc = masculinos.length >= 2;
  const temSuficienteFem = femininos.length >= 2;

  // Se ambos têm suficiente, roda por gênero
  if (temSuficienteMasc || temSuficienteFem || mistos.length >= 2) {
    const paresMesmoGenero: SorteioPar[] = [];
    const semParGenero: SorteioCandidato[] = [];

    if (temSuficienteMasc) {
      log.push("Pareando masculinos...");
      const r = pararPool(masculinos, paresRecentes, "mesmo_genero", log);
      paresMesmoGenero.push(...r.pares);
      semParGenero.push(...r.restantes);
    } else {
      semParGenero.push(...masculinos);
      if (masculinos.length > 0) {
        log.push(
          `Masculinos (${masculinos.length}) insuficientes para parear entre si — serão incluídos no misto.`
        );
      }
    }

    if (temSuficienteFem) {
      log.push("Pareando femininas...");
      const r = pararPool(femininos, paresRecentes, "mesmo_genero", log);
      paresMesmoGenero.push(...r.pares);
      semParGenero.push(...r.restantes);
    } else {
      semParGenero.push(...femininos);
      if (femininos.length > 0) {
        log.push(
          `Femininas (${femininos.length}) insuficientes para parear entre si — serão incluídas no misto.`
        );
      }
    }

    // Candidatos sem par + mistos tentam parear em modo misto
    const poolMisto = [...semParGenero, ...mistos];
    let semParFinal: SorteioCandidato[] = [];
    let paresMistos: SorteioPar[] = [];

    if (poolMisto.length >= 2) {
      log.push(
        `Pareando ${poolMisto.length} candidato(s) sem par em modo misto...`
      );
      const r = pararPool(poolMisto, paresRecentes, "misto", log);
      paresMistos = r.pares;
      semParFinal = r.restantes;
    } else {
      semParFinal = poolMisto;
      if (poolMisto.length > 0) {
        log.push(
          `${poolMisto.length} candidato(s) ficou sem par (pool misto insuficiente).`
        );
      }
    }

    const todosOsPares = [...paresMesmoGenero, ...paresMistos];
    const modoGeral: SorteioModoGenero =
      paresMistos.length > 0 ? "misto" : "mesmo_genero";

    log.push(
      `Resultado: ${todosOsPares.length} par(es) formado(s), ${semParFinal.length} sem par.`
    );

    return {
      pares: todosOsPares,
      semPar: semParFinal,
      totalCandidatos: candidatos.length,
      modoGenero: modoGeral,
      log,
    };
  }

  // ── Fallback: todos em modo misto (pool muito pequeno) ───
  log.push("Pool pequeno — rodando em modo totalmente misto.");
  const r = pararPool(candidatos, paresRecentes, "misto", log);
  log.push(
    `Resultado: ${r.pares.length} par(es), ${r.restantes.length} sem par.`
  );

  return {
    pares: r.pares,
    semPar: r.restantes,
    totalCandidatos: candidatos.length,
    modoGenero: "misto",
    log,
  };
}

/** Determina o modo de gênero predominante de uma lista de pares. */
export function resolverModoGeneroEdicao(
  resultado: SorteioAlgoritmoResultado
): SorteioModoGenero {
  const temMisto = resultado.pares.some((p) => p.modoGenero === "misto");
  return temMisto ? "misto" : "mesmo_genero";
}

/** Retorna o último dia do mês de uma data de referência (sempre em UTC). */
export function ultimoDiaDoMes(mesRef: Date): Date {
  return new Date(Date.UTC(mesRef.getUTCFullYear(), mesRef.getUTCMonth() + 1, 0));
}

/** Formata data ISO para "YYYY-MM-DD". */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Chave canônica de par a partir de IDs brutos (para paresRecentes). */
export function chaveParIds(
  lado1UsuarioId: string | null,
  lado1TimeId: number | null,
  lado2UsuarioId: string | null,
  lado2TimeId: number | null
): ParRecente {
  const idA = lado1TimeId != null ? `t${lado1TimeId}` : `u${lado1UsuarioId}`;
  const idB = lado2TimeId != null ? `t${lado2TimeId}` : `u${lado2UsuarioId}`;
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}
