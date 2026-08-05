// Story 15.5: icone inline scritte a mano (nessuna libreria - decisione presa
// in fase di analisi dell'Epic 15), inizialmente locali a SlotRow.tsx.
// Story 9.30: estratte qui - secondo consumer reale (AllenatoreRow.tsx),
// soglia per condividerle superata invece di duplicarle una seconda volta.
// aria-hidden sull'<svg> perche' il <button> che lo contiene ha gia' un
// aria-label esplicito, che da solo e' gia' un nome accessibile completo -
// marcare anche l'icona interna evita che uno screen reader provi a
// descriverne il contenuto grafico oltre al nome del bottone (pattern
// diverso da GraficoMisurazione.tsx, unico altro <svg> inline "primitivo"
// del progetto: li' l'<svg> non e' dentro un <button> e usa <title>+role="img"
// come proprio nome accessibile, non aria-hidden).
export function IconaModifica() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2.5a1.5 1.5 0 0 1 2 2l-9 9-3 1 1-3 9-9Z" />
    </svg>
  );
}

export function IconaCancella() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h12M8 6V4h4v2M6 6l.5 10h7L14 6M8.5 9v4M11.5 9v4" />
    </svg>
  );
}
