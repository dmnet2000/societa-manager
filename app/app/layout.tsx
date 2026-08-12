import { NavBar } from "../NavBar";

// Story 18.1 (Epic 18): layout annidato per il segmento /app, che ora
// ospita l'intera dashboard interna autenticata (spostata da "/", libera
// ora per il sito pubblico - vedi app/page.tsx e app/layout.tsx). NavBar +
// wrapper ".shell"/".contenuto" (app/globals.css, Story 9.2) vivevano nel
// root layout - spostati qui perche' la nuova home pubblica non deve
// ereditare la sidebar/topBar della dashboard interna. NavBar.tsx non si
// sposta fisicamente (non e' un file di rotta), solo importato da qui
// invece che dal root layout.
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="shell">
      <NavBar />
      <div className="contenuto">{children}</div>
    </div>
  );
}
