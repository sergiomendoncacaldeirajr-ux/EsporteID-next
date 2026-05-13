type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
};

type NominatimReverseResponse = {
  address?: NominatimAddress;
};

function pickLocation(address: NominatimAddress | undefined): string {
  if (!address) return "";

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    "";
  const state = address.state || address.region || "";

  if (city && state) return `${city} - ${state}`;
  return city || state;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latRaw = url.searchParams.get("lat");
  const lngRaw = url.searchParams.get("lng") ?? url.searchParams.get("lon");
  const lat = latRaw == null ? NaN : Number(latRaw);
  const lng = lngRaw == null ? NaN : Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "Coordenadas inválidas." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        String(lat)
      )}&lon=${encodeURIComponent(String(lng))}&format=json&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "EsporteID/1.0 (https://esporteid.com.br)",
        },
      }
    );
  } catch {
    return Response.json({ error: "Não foi possível consultar a localização." }, { status: 502 });
  }

  if (!response.ok) {
    return Response.json({ error: "Não foi possível consultar a localização." }, { status: 502 });
  }

  const data = (await response.json()) as NominatimReverseResponse;
  const localizacao = pickLocation(data.address);

  return Response.json({ localizacao });
}
