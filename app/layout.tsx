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
        <NavBar />
        {children}
      </body>
    </html>
  );
}
