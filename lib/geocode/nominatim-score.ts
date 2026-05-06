/** Normaliza número para comparar resultados de geocodificação (ex.: "0123" vs "123"). */
export function normalizeHouseNumberToken(raw: string): string {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!t) return "";
  const digits = t.replace(/\D/g, "");
  return digits || t;
}

/** Pontua linhas do Nominatim; favorece casas com número batendo e penaliza só CEP. */
export function scoreNominatimRow(row: Record<string, unknown>, wantNum: string): number {
  const importance = Number((row as { importance?: number }).importance ?? 0);
  let s = importance * 8;
  const type = String((row as { type?: string }).type ?? "");
  const klass = String((row as { class?: string }).class ?? "");
  const addrType = String((row as { addresstype?: string }).addresstype ?? "");

  if (type === "house" || type === "building") s += 28;
  if (klass === "place" && type === "house") s += 18;
  if (type === "postcode" || addrType === "postcode") s -= 70;

  const addr = (row as { address?: { house_number?: string } }).address;
  const hn = normalizeHouseNumberToken(String(addr?.house_number ?? ""));
  const wn = normalizeHouseNumberToken(wantNum);
  if (wn && hn) {
    if (hn === wn) s += 130;
    else if (hn.includes(wn) || wn.includes(hn)) s += 45;
    else s -= 85;
  }

  return s;
}

export function pickBestNominatimRow(
  rows: Array<Record<string, unknown>>,
  wantNum: string
): Record<string, unknown> | null {
  if (!rows?.length) return null;
  let best = rows[0];
  let bestScore = scoreNominatimRow(best, wantNum);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const sc = scoreNominatimRow(r, wantNum);
    if (sc > bestScore) {
      best = r;
      bestScore = sc;
    }
  }
  return best;
}
