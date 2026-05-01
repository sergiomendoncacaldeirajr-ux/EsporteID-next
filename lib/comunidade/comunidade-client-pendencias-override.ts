import type { ComunidadePendenciasServerSnapshot } from "@/lib/comunidade/pendencias-snapshot";

/** Ajusta só as contagens de convite para o diff do sync não pedir refresh global quando o cliente já refez a lista. */
export type ComunidadePendenciasClientOverride = Partial<
  Pick<ComunidadePendenciasServerSnapshot, "convRec" | "convEnv">
>;

let override: ComunidadePendenciasClientOverride = {};

export function setComunidadePendenciasOverride(patch: ComunidadePendenciasClientOverride) {
  override = { ...override, ...patch };
}

export function clearComunidadePendenciasOverride() {
  override = {};
}

export function applyClientOverride(snap: ComunidadePendenciasServerSnapshot): ComunidadePendenciasServerSnapshot {
  return {
    ...snap,
    ...(override.convRec !== undefined ? { convRec: override.convRec } : {}),
    ...(override.convEnv !== undefined ? { convEnv: override.convEnv } : {}),
  };
}
