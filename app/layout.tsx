import type { Metadata } from "next";
import { NavBar } from "./NavBar";
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
        {/* Story 9.2: ".shell"/".contenuto" (app/globals.css) - colonna su
            mobile (solo la topBar di NavBar occupa spazio, la sidebar e'
            un drawer fuori dal flusso), riga su desktop (sidebar + contenuto
            fianco a fianco). Un <div>, non un altro <main>: ogni page.tsx
            renderizza gia' il proprio <main> - annidarne un secondo qui
            violerebbe l'unicita' semantica dell'elemento. */}
        <div className="shell">
          <NavBar />
          <div className="contenuto">{children}</div>
        </div>
      </body>
    </html>
  );
}
