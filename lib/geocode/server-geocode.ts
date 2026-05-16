const NOMINATIM_UA = "EsporteID/1.0 (+https://www.esporteid.com.br; contato via site)";

type GeocodeResult = { lat: string; lng: string };

type Params = {
  endereco: string;
  numero: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep?: string;
};

async function nominatimSearch(q: string, structured?: Record<string, string>): Promise<GeocodeResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "pt-BR");
    url.searchParams.set("countrycodes", "br");
    if (q) url.searchParams.set("q", q);
    if (structured) {
      for (const [k, v] of Object.entries(structured)) {
        if (v?.trim()) url.searchParams.set(k, v.trim());
      }
    }
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": NOMINATIM_UA },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first?.lat || !first?.lon) return null;
    return { lat: String(first.lat), lng: String(first.lon) };
  } catch {
    return null;
  }
}

/** Server-side geocode fallback using Nominatim directly (no HTTP round-trip through /api/geocode). */
export async function geocodeAddressServer(params: Params): Promise<GeocodeResult | null> {
  const { endereco, numero, bairro, cidade, estado, cep } = params;
  if (!endereco || !cidade || !estado) return null;

  const qFull = [
    [endereco, numero].filter(Boolean).join(", "),
    bairro,
    cidade,
    estado,
    cep ? cep.replace(/\D/g, "") : "",
    "Brasil",
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(", ");

  // Try free-form first, then structured
  const byFreeForm = await nominatimSearch(qFull);
  if (byFreeForm) return byFreeForm;

  const streetJoined = [numero, endereco].filter(Boolean).join(" ").trim();
  const byStructured = await nominatimSearch("", {
    street: streetJoined || endereco,
    city: cidade,
    state: estado,
    ...(cep ? { postalcode: cep.replace(/\D/g, "") } : {}),
  });
  return byStructured;
}
