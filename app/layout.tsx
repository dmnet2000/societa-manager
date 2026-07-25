import type { Metadata } from "next";
import { NavBar } from "./NavBar";
import "./globals.css";

// Nessun font caricato da Google Fonts (review fix, Story 8.1): DESIGN.md
// impone "nessun font viene caricato, si usa solo lo stack di sistema" -
// --font-system (app/globals.css, Story 5.1) resta l'unico stack
// tipografico, gia' applicato a "body".
export const metadata: Metadata = {
  title: "Società Manager",
  description: "Gestione settore volley — orari, presenze, certificati medici",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
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
