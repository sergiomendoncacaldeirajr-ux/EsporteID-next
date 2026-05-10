import { NextResponse } from "next/server";

/**
 * Digital Asset Links — TWA / verificação de domínio no Android.
 *
 * Configure no ambiente (produção):
 * - ANDROID_ASSET_LINKS_JSON: JSON completo do array (opcional; tem precedência)
 * - ou TWA_ANDROID_PACKAGE_NAME + TWA_SHA256_CERT_FINGERPRINTS (vírgula para várias)
 *
 * Sem variáveis: usa o app Android oficial do EsporteID como fallback.
 */
const DEFAULT_ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.esporteid.app",
      sha256_cert_fingerprints: [
        "08:A5:07:68:C8:61:CD:2F:87:7E:E1:0A:FA:54:E6:81:F6:86:1F:5E:D4:49:75:2E:DC:68:16:60:6C:10:E4:00",
      ],
    },
  },
];

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
    return DEFAULT_ASSET_LINKS;
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
