/**
 * Catálogo de formatos e critérios para torneios (multi-esporte).
 * Valores salvos em `torneios.formato_competicao`, `criterio_desempate` e em `regras_placar_json`.
 */

export const STATUS_TORNEIO = [
  { id: "aberto", label: "Aberto (inscrições)" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "encerrado", label: "Encerrado" },
  { id: "cancelado", label: "Cancelado" },
] as const;

/** Formatos de disputa — cobrem raquetes, campo, pista, equipes etc. */
export const FORMATOS_COMPETICAO = [
  {
    id: "mata_mata_simples",
    label: "Mata-mata (eliminação simples)",
    descricao: "Perdeu, está fora. Chave única até a final.",
  },
  {
    id: "mata_mata_duplo",
    label: "Mata-mata duplo (repescagem)",
    descricao: "Chave superior e inferior; uma segunda chance após a primeira derrota.",
  },
  {
    id: "grupos_mata_mata",
    label: "Fase de grupos + mata-mata",
    descricao: "Todos contra todos (ou rodízio) em grupos; classificados seguem para eliminatória.",
  },
  {
    id: "todos_contra_todos",
    label: "Todos contra todos (pontos corridos)",
    descricao: "Uma única fase em liga; ranking por pontos.",
  },
  {
    id: "suico",
    label: "Sistema suíço",
    descricao: "Rodadas em que adversários têm campanha semelhante; comum em xadrez e e-sports.",
  },
  {
    id: "melhor_de_3_final",
    label: "Fase de grupos + melhor de 3 na decisão",
    descricao: "Combina grupos ou tabela com séries curtas nas fases finais.",
  },
  {
    id: "personalizado",
    label: "Personalizado (descrever no regulamento)",
    descricao: "Use o regulamento para detalhar o formato específico do evento.",
  },
] as const;

/** Critérios de desempate — esportes de rede costumam usar sets/games; campo: saldo de gols etc. */
export const CRITERIOS_DESEMPATE = [
  { id: "sets", label: "Sets / games (tênis, beach, vôlei…)" },
  { id: "games", label: "Games (tênis)" },
  { id: "pontos_corridos", label: "Pontos corridos (vitória/empate/derrota)" },
  { id: "saldo_gols", label: "Saldo de gols / gols marcados" },
  { id: "confronto_direto", label: "Confronto direto entre empatados" },
  { id: "sorteio", label: "Sorteio (último critério)" },
  { id: "misto_regulamento", label: "Conforme regulamento do torneio" },
] as const;

export const MODALIDADES_PARTICIPACAO = [
  { id: "individual", label: "Individual", descricao: "Um atleta por inscrição." },
  { id: "dupla", label: "Duplas", descricao: "Duplas fixas (beach tênis, vôlei de praia…)." },
  { id: "equipe", label: "Equipe / times", descricao: "Times com elenco (futebol, basquete…)." },
] as const;

export const MELHOR_DE_PARTIDA = [
  { id: "1", label: "Partida única" },
  { id: "3", label: "Melhor de 3" },
  { id: "5", label: "Melhor de 5" },
] as const;

export function labelFormato(id: string | null | undefined): string {
  if (!id) return "—";
  const f = FORMATOS_COMPETICAO.find((x) => x.id === id);
  return f?.label ?? id;
}

export function labelCriterio(id: string | null | undefined): string {
  if (!id) return "—";
  const c = CRITERIOS_DESEMPATE.find((x) => x.id === id);
  return c?.label ?? id;
}

export function labelModalidade(id: string | null | undefined): string {
  if (!id) return "—";
  const m = MODALIDADES_PARTICIPACAO.find((x) => x.id === id);
  return m?.label ?? id;
}

export function labelStatusTorneio(id: string | null | undefined): string {
  if (!id) return "—";
  const s = STATUS_TORNEIO.find((x) => x.id === id);
  return s?.label ?? id;
}
