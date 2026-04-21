export const PROFESSOR_OBJETIVOS_PLATAFORMA = [
  "gerir_alunos",
  "somente_exposicao",
  "ambos",
] as const;

export const PROFESSOR_TIPOS_ATUACAO = [
  "aulas",
  "treinamento",
  "consultoria",
] as const;

export const PROFESSOR_MODO_ESPORTIVO = [
  "atleta",
  "professor",
  "ambos",
] as const;

export type ProfessorObjetivoPlataforma =
  (typeof PROFESSOR_OBJETIVOS_PLATAFORMA)[number];

export type ProfessorTipoAtuacao = (typeof PROFESSOR_TIPOS_ATUACAO)[number];

export type ProfessorModoEsportivo = (typeof PROFESSOR_MODO_ESPORTIVO)[number];

export function isProfessorObjetivoPlataforma(
  value: string
): value is ProfessorObjetivoPlataforma {
  return (PROFESSOR_OBJETIVOS_PLATAFORMA as readonly string[]).includes(value);
}

export function isProfessorTipoAtuacao(
  value: string
): value is ProfessorTipoAtuacao {
  return (PROFESSOR_TIPOS_ATUACAO as readonly string[]).includes(value);
}

export function isProfessorModoEsportivo(
  value: string
): value is ProfessorModoEsportivo {
  return (PROFESSOR_MODO_ESPORTIVO as readonly string[]).includes(value);
}

export function esporteModoTemAtleta(modo: ProfessorModoEsportivo): boolean {
  return modo === "atleta" || modo === "ambos";
}

export function esporteModoTemProfessor(modo: ProfessorModoEsportivo): boolean {
  return modo === "professor" || modo === "ambos";
}
