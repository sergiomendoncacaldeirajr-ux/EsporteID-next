import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_UA = "EsporteID/1.0 (+https://www.esporteid.com.br; contato via site)";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat")?.trim();
  const lon = req.nextUrl.searchParams.get("lon")?.trim();
  if (!lat || !lon) {
    return NextResponse.json({ error: "missing lat or lon" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": NOMINATIM_UA },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "upstream", status: res.status }, { status: 502 });
  }

  const data = (await res.json()) as Record<string, unknown>;
  return NextResponse.json(data);
}
