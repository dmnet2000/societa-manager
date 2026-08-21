// Story 19.13 (Epic 19, Ruolo Site Manager): unica fonte di verita' per gli
// insiemi chiusi di allineamento (testo/immagini) - condivisa tra il lato
// client (app/app/(configurazione)/pagine-pubbliche/tiptap-estensioni.ts,
// dove parseHTML rifiuta un data-align fuori da questo insieme prima
// ancora del salvataggio) e il sanitizzatore server-side
// (lib/sanitizza-html.ts, il vero cancello - review fix, Blind Hunter +
// Verification Gap Reviewer, trovato indipendentemente: prima erano due
// array letterali duplicati, a rischio di divergenza silenziosa in una
// modifica futura). Nessun "server-only" qui: sono solo costanti, importate
// sia da un modulo client sia da uno server-only.
export const ALLINEAMENTI_TESTO_CONSENTITI = ["left", "center", "right", "justify"] as const;
export const ALLINEAMENTI_IMMAGINE_CONSENTITI = ["left", "center", "right"] as const;
