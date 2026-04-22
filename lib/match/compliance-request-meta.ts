/** Metadados de requisição para registro de confirmação etária (LGPD / provas de consentimento). */
export function buildMaioridadeComplianceMeta(headersList: { get(name: string): string | null }) {
  const forwarded = headersList.get("x-forwarded-for") ?? "";
  const ipCliente = forwarded.split(",")[0]?.trim() || headersList.get("x-real-ip") || "";
  const userAgent = headersList.get("user-agent") ?? "";
  const acceptLanguage = headersList.get("accept-language") ?? "";
  const referer = headersList.get("referer") ?? "";
  const host = headersList.get("host") ?? "";
  const pais =
    headersList.get("cf-ipcountry") ??
    headersList.get("x-vercel-ip-country") ??
    headersList.get("cloudfront-viewer-country") ??
    "";

  return {
    ip_cliente: ipCliente || null,
    user_agent: userAgent || null,
    accept_language: acceptLanguage || null,
    referer: referer || null,
    host: host || null,
    pais_inferido: pais || null,
    detalhes_json: {
      x_forwarded_for: forwarded || null,
      cf_ray: headersList.get("cf-ray") ?? null,
      vercel_id: headersList.get("x-vercel-id") ?? null,
    } as Record<string, unknown>,
  };
}
