import type { Metadata } from "next";
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
export const metadata: Metadata = {
  title: "Società Manager",
  description: "Gestione settore volley — orari, presenze, certificati medici",
  icons: {
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Soc. Manager",
    statusBarStyle: "default",
  },
};

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
