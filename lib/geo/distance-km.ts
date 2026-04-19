/** Distância em km (aproximação esférica simples), alinhada ao legado PHP. */
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 99999;
  }
  const degLen = 111.12;
  const x = (lat2 - lat1) * degLen;
  const y = (lng2 - lng1) * degLen * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(x * x + y * y);
}
