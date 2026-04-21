import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    viewTransition: true,
  },
};

export default nextConfig;
