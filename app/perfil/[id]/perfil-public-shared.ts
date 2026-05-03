/** Campos alinhados ao `perfilSelect` da rota pública. */
export type PerfilPublicoProfileRow = {
  id: string;
  nome: string | null;
  username: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  localizacao: string | null;
  altura_cm: number | null;
  peso_kg: number | null;
  lado: string | null;
  foto_capa: string | null;
  tipo_usuario: string | null;
  genero: string | null;
  tempo_experiencia: string | null;
  interesse_rank_match: boolean | null;
  interesse_torneio: boolean | null;
  disponivel_amistoso: boolean | null;
  disponivel_amistoso_ate: string | null;
  mostrar_historico_publico: boolean | null;
  estilo_jogo: string | null;
  bio: string | null;
};

export type PerfilPublicoEidRow = Record<string, unknown> & {
  esporte_id?: number | null;
  nota_eid?: number | null;
  vitorias?: number | null;
  derrotas?: number | null;
  pontos_ranking?: number | null;
  partidas_jogadas?: number | null;
  interesse_match?: boolean | null;
  modalidade_match?: string | null;
  posicao_rank?: number | null;
  esportes?: unknown;
};

export function iniciaisPerfilPublico(nome?: string | null): string {
  const n = (nome ?? "").trim();
  if (!n) return "E";
  return n
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
