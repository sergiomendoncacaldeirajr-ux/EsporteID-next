/**
 * Regra de negócio para desafio 1x1 (perfil atleta / radar individual).
 * Módulo sem dependência de servidor — pode ser importado por `radar-snapshot` usado no cliente.
 */

/** Esportes puramente coletivos (futebol, basquete, vôlei) ficam fora do desafio individual. */
export function isEsportePermitidoDesafioPerfilIndividual(
  tipo: string | null | undefined,
  permiteIndividual: boolean | null | undefined
): boolean {
  if (String(tipo ?? "").trim().toLowerCase() === "coletivo") return false;
  return permiteIndividual === true;
}
