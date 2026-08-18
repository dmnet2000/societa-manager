import type { Metadata } from "next";
import { createAdminClient } from "@/lib/auth-admin/client";
import {
  leggiNomeSettore,
  NOME_SETTORE_FALLBACK,
} from "@/lib/configurazione-applicazione";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration";
import "./globals.css";

// Nessun font caricato da Google Fonts (review fix, Story 8.1): DESIGN.md
// impone "nessun font viene caricato, si usa solo lo stack di sistema" -
// --font-system (app/globals.css, Story 5.1) resta l'unico stack
// tipografico, gia' applicato a "body".
// Review Story 14.1: Safari/iOS non legge in modo affidabile icone/display-mode
// dal solo Web App Manifest (app/manifest.ts) - apple-touch-icon e
// apple-mobile-web-app-capable vanno dichiarati qui, unico modo supportato
// dalla Metadata API per generarli in <head>.
// Story 18.21: da `metadata` statico a `generateMetadata` dinamico - title e
// icons.icon dipendono da ConfigurazioneApplicazione/Storage (dati mutabili
// da Admin), invariato tutto il resto (description/appleWebApp/icons.apple,
// fuori scope - vedi Dev Notes della storia).
export async function generateMetadata(): Promise<Metadata> {
  // createAdminClient() (client service-role, @/lib/auth-admin/client), NON
  // createClient() (@/lib/supabase/server): quest'ultimo chiama cookies() da
  // next/headers, una Dynamic API che forza l'intera rotta a renderizzare
  // dinamicamente - dentro generateMetadata del ROOT layout questo
  // "avvelenava" anche le pagine altrimenti statiche del progetto
  // (/recupera-password, /registrati, /_not-found: verificato confrontando
  // l'output di build con/senza questa storia, erano ○ Static, diventavano
  // ƒ Dynamic). Nessuna sessione/cookie necessaria qui (solo lettura di un
  // bucket Storage pubblico e di una riga di configurazione non-RLS) -
  // createAdminClient() e' sincrono, nessuna Dynamic API, stesso pattern
  // gia' stabilito da lib/email/invia-email.ts/lib/facebook-graph.ts per
  // leggere dati da un contesto senza sessione.
  //
  // Review fix: creazione del client avvolta in try/catch - a differenza
  // delle due letture sotto (ciascuna col proprio .catch()), createAdminClient()
  // non aveva alcuna guardia; se le variabili d'ambiente Supabase fossero mai
  // mancanti/malformate lancerebbe sincronamente e romperebbe la generazione
  // dei metadati per OGNI rotta del sito (pubblica e /app), non solo una
  // funzionalita' isolata come gli altri usi di createAdminClient() nel
  // progetto.
  try {
    const supabase = createAdminClient();

    const [nomeSettore, info] = await Promise.all([
      leggiNomeSettore().catch((err) => {
        console.error(err);
        return null;
      }),
      leggiInfoLogo(supabase).catch((err) => {
        console.error(err);
        return { esiste: false, aggiornatoIl: null as string | null };
      }),
    ]);

    return {
      title: nomeSettore ?? NOME_SETTORE_FALLBACK,
      description: "Gestione settore volley — orari, presenze, certificati medici",
      icons: {
        // Logo reale caricato da Admin se esiste (cache-buster ?v= mirror di
        // HeaderPubblico.tsx, evita che il browser mostri una favicon in
        // cache dopo una sostituzione del logo), altrimenti l'asset
        // placeholder statico esistente - mai un'icona rotta/assente.
        icon: info.esiste
          ? `${urlPubblicoLogo(supabase)}?v=${encodeURIComponent(info.aggiornatoIl ?? "")}`
          : "/icons/icon-192.png",
        apple: "/icons/icon-192.png",
      },
      appleWebApp: {
        capable: true,
        title: "Soc. Manager",
        statusBarStyle: "default",
      },
    };
  } catch (err) {
    console.error(err);
    return {
      title: NOME_SETTORE_FALLBACK,
      description: "Gestione settore volley — orari, presenze, certificati medici",
      icons: {
        icon: "/icons/icon-192.png",
        apple: "/icons/icon-192.png",
      },
      appleWebApp: {
        capable: true,
        title: "Soc. Manager",
        statusBarStyle: "default",
      },
    };
  }
}

// Story 18.1 (Epic 18): ridotto al minimo condiviso da sito pubblico ("/")
// e area applicativa autenticata ("/app") - NavBar e il wrapper
// ".shell"/".contenuto" (Story 9.2) erano specifici della dashboard
// interna, spostati in app/app/layout.tsx (nessun motivo per la nuova home
// pubblica di ereditare la sidebar/topBar della dashboard).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
        {/* Story 14.2: componente invisibile, nessun impatto sul layout
            visivo - solo l'effetto collaterale della registrazione del
            Service Worker (AC #2). */}
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
