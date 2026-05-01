/** Contagens usadas no servidor da /comunidade e no bridge cliente (polling + diff). */
export type ComunidadePendenciasServerSnapshot = {
  pedidosRec: number;
  pedidosEnv: number;
  sugRec: number;
  sugEnv: number;
  convRec: number;
  convEnv: number;
  candLider: number;
  candMine: number;
};

export function pendenciasSnapshotSignature(s: ComunidadePendenciasServerSnapshot): string {
  return `${s.pedidosRec}|${s.pedidosEnv}|${s.sugRec}|${s.sugEnv}|${s.convRec}|${s.convEnv}|${s.candLider}|${s.candMine}`;
}
