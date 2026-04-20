/** Edição de conta (pós-onboarding) — telas dedicadas, não reutilizar `/onboarding`. */

export const CONTA_PERFIL_HREF = "/conta/perfil";
export const CONTA_ESPORTES_EID_HREF = "/conta/esportes-eid";

export function contaEditarFormacaoTimeHref(timeId: number) {
  return `/conta/formacao/time/${timeId}`;
}

export function contaEditarDuplaRegistradaHref(duplaId: number) {
  return `/conta/dupla/${duplaId}`;
}

export function contaEditarLocalHref(espacoId: number) {
  return `/conta/local/${espacoId}`;
}

export function contaEditarTorneioHref(torneioId: number) {
  return `/conta/torneio/${torneioId}`;
}
