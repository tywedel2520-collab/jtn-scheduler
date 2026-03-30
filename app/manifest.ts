import type { MetadataRoute } from "next";

const THEME = "#ea580c";
const BG = "#fafaf9";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "JTN Scheduler",
    short_name: "JTN",
    description: "JTN client queue and progress scheduler",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: BG,
    theme_color: THEME,
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/pwa-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/pwa-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/pwa-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
