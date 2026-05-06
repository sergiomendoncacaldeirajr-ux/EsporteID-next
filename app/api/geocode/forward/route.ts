import { NextRequest, NextResponse } from "next/server";
import { pickBestNominatimRow, scoreNominatimRow } from "@/lib/geocode/nominatim-score";

const NOMINATIM_UA = "EsporteID/1.0 (+https://www.esporteid.com.br; contato via site)";

type NominatimHit = Record<string, unknown> & {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }
  const numero = req.nextUrl.searchParams.get("numero")?.trim() ?? "";
  const endereco = req.nextUrl.searchParams.get("endereco")?.trim() ?? "";
  const bairro = req.nextUrl.searchParams.get("bairro")?.trim() ?? "";
  const cidade = req.nextUrl.searchParams.get("cidade")?.trim() ?? "";
  const estado = req.nextUrl.searchParams.get("estado")?.trim() ?? "";
  const cep = req.nextUrl.searchParams.get("cep")?.trim() ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || "8");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 10) : 8;

  const baseParams = {
    format: "json",
    limit: String(limit),
    addressdetails: "1",
    "accept-language": "pt-BR",
    countrycodes: "br",
  } as const;

  async function runSearch(extra: Record<string, string>): Promise<NominatimHit[]> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    for (const [k, v] of Object.entries(baseParams)) url.searchParams.set(k, v);
    for (const [k, v] of Object.entries(extra)) {
      if (v?.trim()) url.searchParams.set(k, v.trim());
    }
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": NOMINATIM_UA },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as NominatimHit[];
    return Array.isArray(rows) ? rows : [];
  }

  const merged: NominatimHit[] = [];
  const seen = new Set<string>();
  function pushUnique(rows: NominatimHit[]) {
    for (const row of rows) {
      const key = `${String(row.lat ?? "")}|${String(row.lon ?? "")}|${String(row.display_name ?? "")}`;
      if (!key.trim() || seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
  }

  pushUnique(await runSearch({ q }));
  // Uma busca estruturada (sem `country` no texto — `countrycodes=br` já filtra).
  if (endereco && cidade && estado) {
    const streetJoined = [numero, endereco].filter(Boolean).join(" ").trim();
    if (streetJoined) {
      pushUnique(
        await runSearch({
          street: streetJoined,
          city: cidade,
          state: estado,
          ...(cep ? { postalcode: cep } : {}),
        })
      );
    }
  }

  if (merged.length === 0) {
    return NextResponse.json({ result: null, score: null });
  }

  const best = pickBestNominatimRow(merged as Array<Record<string, unknown>>, numero);
  if (!best?.lat || !best?.lon) {
    return NextResponse.json({ result: null, score: null });
  }

  const score = scoreNominatimRow(best, numero);

  return NextResponse.json({
    result: {
      lat: String(best.lat),
      lng: String(best.lon),
      label: String(best.display_name ?? ""),
    },
    score,
  });
}
