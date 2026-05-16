// ============================================================
// Sorteio de Ranking Mensal — tipos compartilhados
// ============================================================

export type SorteioModalidade = "individual" | "dupla" | "time";
export type SorteioModoGenero = "mesmo_genero" | "misto";
export type SorteioStatus =
  | "simulacao"
  | "pendente_aprovacao"
  | "publicado"
  | "cancelado";

export type SorteioConfrontoStatus =
  | "pendente"
  | "em_andamento"
  | "concluido"
  | "wo_lado1"
  | "wo_lado2"
  | "wo_duplo"
  | "cancelado";

// ── Candidato para o sorteio ─────────────────────────────────
/** Representa um atleta individual ou formação (dupla/time) elegível. */
export type SorteioCandidato = {
  /** UUID do usuário (individual) ou líder (dupla/time) */
  usuarioId: string;
  /** ID do `times` (null para individual) */
  timeId: number | null;
  /** Modalidade deste candidato */
  modalidade: SorteioModalidade;
  /** Gênero: 'masculino' | 'feminino' | 'misto' */
  genero: string;
  /** Latitude (profiles.lat ou times.lat) */
  lat: number;
  /** Longitude (profiles.lng ou times.lng) */
  lng: number;
  /** Pontos de ranking (usuario_ranking_match ou times.pontos_ranking) */
  pontosRanking: number;
  /** Nota EID (usuario_eid.nota_eid ou times.eid_time) */
  notaEid: number;
  /** Nome para exibição */
  nome: string;
  /** Cidade/localização */
  localizacao: string | null;
};

// ── Par sorteado (resultado do algoritmo) ────────────────────
export type SorteioPar = {
  lado1: SorteioCandidato;
  lado2: SorteioCandidato;
  distanciaKm: number;
  deltaRank: number;
  deltaEid: number;
  modoGenero: SorteioModoGenero;
};

// ── Resultado da execução do algoritmo ───────────────────────
export type SorteioAlgoritmoResultado = {
  pares: SorteioPar[];
  semPar: SorteioCandidato[];
  totalCandidatos: number;
  modoGenero: SorteioModoGenero;
  log: string[];
};

// ── Edição (linha de sorteio_rank_edicoes) ───────────────────
export type SorteioEdicao = {
  id: number;
  esporteId: number;
  esporteNome: string;
  modalidade: SorteioModalidade;
  mesRef: string; // ISO date "YYYY-MM-DD"
  status: SorteioStatus;
  modoGenero: SorteioModoGenero;
  algoritmoLog: SorteioAlgoritmoLog | null;
  criadoEm: string;
  publicadoEm: string | null;
};

export type SorteioAlgoritmoLog = {
  totalCandidatos: number;
  totalPares: number;
  semPar: number;
  modoGenero: SorteioModoGenero;
  log: string[];
  geradoEm: string;
};

// ── Confronto (linha de sorteio_rank_confrontos) ─────────────
export type SorteioConfronto = {
  id: number;
  edicaoId: number;
  lado1UsuarioId: string | null;
  lado1TimeId: number | null;
  lado2UsuarioId: string | null;
  lado2TimeId: number | null;
  partidaId: number | null;
  dataLimite: string; // ISO date
  status: SorteioConfrontoStatus;
  lado1TentouAgendar: boolean;
  lado2TentouAgendar: boolean;
  lado1TentouEm: string | null;
  lado2TentouEm: string | null;
  modoGenero: SorteioModoGenero;
  distanciaKm: number | null;
  deltaRank: number | null;
  deltaEid: number | null;
};

// ── Payload para exibição admin ───────────────────────────────
export type SorteioConfrontoAdmin = SorteioConfronto & {
  lado1Nome: string;
  lado1Genero: string;
  lado1PontosRanking: number;
  lado1NotaEid: number;
  lado2Nome: string;
  lado2Genero: string;
  lado2PontosRanking: number;
  lado2NotaEid: number;
};
