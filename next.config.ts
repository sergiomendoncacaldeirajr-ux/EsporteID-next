import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    /* Tree-shake de imports amplo (ícones só entram se usados na rota). */
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
