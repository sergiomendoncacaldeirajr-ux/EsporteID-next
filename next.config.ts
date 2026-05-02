import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    /* Next 15: padrão dynamic=0 refaz RSC em toda navegação. Cache curto no cliente acelera voltar/reabrir rotas sem afetar realtime (Supabase). */
    staleTimes: {
      /* Mais segundos = menos refetch de RSC ao trocar de rota (shell já veio no layout). */
      dynamic: 90,
      static: 300,
    },
    /* Tree-shake de imports amplo (ícones só entram se usados na rota). */
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
