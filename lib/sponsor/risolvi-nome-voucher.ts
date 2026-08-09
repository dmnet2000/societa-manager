export type IdentitaVoucher = {
  allenatore: { nome: string; cognome: string } | null;
  atletaPropria: { nome: string } | null;
  genitoreDiAtleta: { nome: string } | null;
  email: string;
};

// Story 16.2 (AC #2/#5), decisione presa con l'utente in apertura sviluppo:
// Utente non ha un proprio campo Nome/Cognome (solo email) - la fonte varia
// per Ruolo. Priorita' deterministica quando un Utente ha piu' identita'
// collegate: Allenatore (nome+cognome reali) > Atleta auto-agganciata
// (Story 2.7, nome gia' in formato "Cognome Nome") > Genitore (nessun nome
// proprio, deriva dal nome della prima Atleta collegata) > email (Admin/
// Dirigente/Segreteria, nessuna fonte diretta). Pura, nessun accesso Prisma
// qui - la risoluzione delle identita' resta nella pagina (Server Component,
// stesso principio di il-mio-profilo/page.tsx).
export function risolviNomeVoucher(identita: IdentitaVoucher): string {
  if (identita.allenatore) {
    return `${identita.allenatore.nome} ${identita.allenatore.cognome}`;
  }
  if (identita.atletaPropria) {
    return identita.atletaPropria.nome;
  }
  if (identita.genitoreDiAtleta) {
    return `Genitore di ${identita.genitoreDiAtleta.nome}`;
  }
  // Review fix (2026-08-09, trovato indipendentemente da Blind Hunter, Edge
  // Case Hunter e Acceptance Auditor): senza questo, un'email vuota (nessuna
  // identita' risolta, es. sessione non disponibile) renderizzava il
  // voucher con un nome completamente vuoto invece di un placeholder.
  return identita.email || "Utente";
}
