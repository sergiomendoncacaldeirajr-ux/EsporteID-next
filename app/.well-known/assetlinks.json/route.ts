import { NextResponse } from "next/server";

/**
 * Digital Asset Links — TWA / verificação de domínio no Android.
 *
 * Configure no ambiente (produção):
 * - ANDROID_ASSET_LINKS_JSON: JSON completo do array (opcional; tem precedência)
 * - ou TWA_ANDROID_PACKAGE_NAME + TWA_SHA256_CERT_FINGERPRINTS (vírgula para várias)
 *
 * Sem variáveis: retorna [] (rota válida, sem statements).
 */
function buildAssetLinks(): unknown[] {
  const raw = process.env.ANDROID_ASSET_LINKS_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const packageName = process.env.TWA_ANDROID_PACKAGE_NAME?.trim();
  const fingerprints =
    process.env.TWA_SHA256_CERT_FINGERPRINTS?.split(",")
      .map((s) => s.trim().replace(/\s+/g, ""))
      .filter(Boolean) ?? [];

  if (!packageName || fingerprints.length === 0) {
    return [];
  }

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}

export async function GET() {
  const body = buildAssetLinks();
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
