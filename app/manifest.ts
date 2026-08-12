import type { MetadataRoute } from "next";

// Story 14.1: Next.js serve automaticamente questo file a
// /manifest.webmanifest e lo collega in <head> - nessuna modifica a
// layout.tsx necessaria (AC #3). Icone in public/icons/ (Task 1) - vedi
// Dev Notes della storia per l'origine (placeholder a tinta unita,
// decisione presa con l'utente, non il logo reale del club).
// background_color/theme_color da DESIGN.md (colors.surface/colors.navy),
// stessi colori gia' usati per lo sfondo pagina/sidebar nel resto dell'app.
// Story 18.1 (Epic 18): start_url punta a /app (la dashboard interna), non
// piu' "/" - da quando "/" e' diventata la home pubblica del sito, un
// Utente che ha installato la PWA per lavorare sulla dashboard deve
// continuare ad aprirla, non atterrare sul sito pubblico.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Società Manager",
    short_name: "Soc. Manager",
    start_url: "/app",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#312682",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
