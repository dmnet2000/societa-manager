import { elencaVociMenuPubblicoVisibili } from "@/lib/menu-pubblico";
import { NavPubblicaClient } from "./NavPubblicaClient";

// Story 19.8 (Epic 19, Ruolo Site Manager): da array hard-coded (VOCI, 5
// voci fisse) a lettura da VoceMenuPubblico (Story 19.6/19.7) - Server
// Component (non piu' "use client", spostato in NavPubblicaClient.tsx
// insieme a tutta l'interattivita' hamburger/drawer) perche' VoceMenuPubblico
// non ha RLS/policy (AD-9, solo Prisma diretto con connessione privilegiata,
// REVOKE esplicito da "anon"/"authenticated" - vedi la migrazione di Story
// 19.6), irraggiungibile da un componente client.
//
// AC (Story 19.8): tabella vuota (nessuna voce visibile - caso limite, es.
// errore di migrazione) e' un errore esplicito e loggato, non un fallback
// silenzioso sulle 5 voci hard-coded di prima - un fallback permanente
// creerebbe due fonti di verita' del menu da tenere sincronizzate per
// sempre (rischio di drift silenzioso se le voci cambiassero e il fallback
// non venisse aggiornato di conseguenza). La Story 19.6 garantisce, tramite
// seed, che la tabella non sia mai vuota dopo un deploy corretto - il throw
// qui propaga fino al piu' vicino Error Boundary (app/error.tsx, Story
// 14.2, l'unico gia' presente nel progetto), che lo logga di nuovo lato
// client e mostra un messaggio esplicito al Visitatore invece di una
// schermata bianca o un menu silenziosamente incompleto.
export async function NavPubblica() {
  const voci = await elencaVociMenuPubblicoVisibili();

  if (voci.length === 0) {
    const errore = new Error(
      "NavPubblica: nessuna voce di menu pubblico visibile trovata (tabella vuota o tutte le voci nascoste) - verificare la migrazione/seed di VoceMenuPubblico."
    );
    console.error(errore);
    throw errore;
  }

  return (
    <NavPubblicaClient
      voci={voci.map((voce) => ({ href: voce.url, label: voce.etichetta }))}
    />
  );
}
