import type { MetadataRoute } from "next";
import { EID_PWA_BACKGROUND } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "EsporteID",
    short_name: "EsporteID",
    description:
      "Plataforma esportiva: perfil, partidas, torneios e ranking — com privacidade e LGPD.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: EID_PWA_BACKGROUND,
    theme_color: EID_PWA_BACKGROUND,
    categories: ["sports", "social", "productivity"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
