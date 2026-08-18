import type { MetadataRoute } from "next";
import {
  leggiNomeSettore,
  NOME_SETTORE_FALLBACK,
  nomeSettoreAbbreviato,
} from "@/lib/configurazione-applicazione";

// Story 14.1: Next.js serve automaticamente questo file a
// /manifest.webmanifest e lo collega in <head> - nessuna modifica a
// layout.tsx necessaria (AC #3). Icone in public/icons/ (Task 1) - vedi
// Dev Notes della storia per l'origine (placeholder a tinta unita,
// decisione presa con l'utente, non il logo reale del club). Story 18.21:
// le icone restano questo stesso placeholder quadrato, non il logo Admin
// (che non ha vincoli di dimensione/formato, incompatibile con le
// dimensioni fisse richieste dallo standard PWA) - solo name/short_name
// diventano dinamici.
// background_color/theme_color da DESIGN.md (colors.surface/colors.navy),
// stessi colori gia' usati per lo sfondo pagina/sidebar nel resto dell'app.
// Story 18.1 (Epic 18): start_url punta a /app (la dashboard interna), non
// piu' "/" - da quando "/" e' diventata la home pubblica del sito, un
// Utente che ha installato la PWA per lavorare sulla dashboard deve
// continuare ad aprirla, non atterrare sul sito pubblico.
// Review fix (Edge Case Hunter): "scope" esplicito - senza, lo scope di
// default dello standard Web App Manifest e' la cartella di start_url con
// l'ultimo segmento rimosso, cioe' "/" (l'intero dominio, sito pubblico
// incluso) per uno start_url "/app" senza slash finale. Con "scope"
// esplicito la PWA installata resta confinata alla dashboard.
// Story 18.21: da funzione sincrona a async - stesso meccanismo di route
// handler cacheable di generateMetadata/icon.tsx (node_modules/next/dist/docs),
// name/short_name letti da ConfigurazioneApplicazione invece che statici.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const nomeSettore = await leggiNomeSettore().catch((err) => {
    console.error(err);
    return null;
  });
  const nomeVisualizzato = nomeSettore ?? NOME_SETTORE_FALLBACK;

  return {
    name: nomeVisualizzato,
    short_name: nomeSettoreAbbreviato(nomeVisualizzato),
    start_url: "/app",
    scope: "/app/",
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
