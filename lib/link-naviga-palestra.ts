// Story 9.6 (estensione): preferisce le coordinate precise (se presenti
// entrambe) sull'indirizzo testuale - piu' preciso, coerente con NFR6
// (nessun servizio esterno a pagamento, solo URL "universal" senza chiave
// API). L'apertura app-vs-browser e' gestita dal sistema operativo/browser
// del dispositivo, non da questo codice.
type Posizione = {
  indirizzo?: string | null;
  latitudine?: number | null;
  longitudine?: number | null;
};

// La virgola tra lat/lng resta non codificata (convenzione delle URL Maps,
// es. `query=45.1,12.6`) - solo il testo libero dell'indirizzo va
// url-encodato (spazi, accenti, virgole dentro l'indirizzo stesso).
// `haCoordinate` calcolato una sola volta qui (review fix: prima era
// ricalcolato separatamente in costruisciLinkMappaIncorporata, stessa
// condizione duplicata in due punti dello stesso file).
function risolviQuery(posizione: Posizione): { query: string; haCoordinate: boolean } | null {
  const { latitudine, longitudine } = posizione;
  if (latitudine != null && longitudine != null) {
    return { query: `${latitudine},${longitudine}`, haCoordinate: true };
  }

  const indirizzoNormalizzato = posizione.indirizzo?.trim();
  if (!indirizzoNormalizzato) {
    return null;
  }
  return { query: encodeURIComponent(indirizzoNormalizzato), haCoordinate: false };
}

export function costruisciLinkNaviga(posizione: Posizione): string | null {
  const risolta = risolviQuery(posizione);
  if (!risolta) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${risolta.query}`;
}

// Mappa incorporata via iframe - formato "classico" `output=embed`, non
// l'ufficiale "Maps Embed API" (che richiederebbe comunque una chiave,
// seppur gratuita): nessuna autenticazione richiesta, funziona sia con
// coordinate sia con testo libero.
export function costruisciLinkMappaIncorporata(posizione: Posizione): string | null {
  const risolta = risolviQuery(posizione);
  if (!risolta) {
    return null;
  }

  const zoom = risolta.haCoordinate ? 16 : 15;
  return `https://maps.google.com/maps?q=${risolta.query}&z=${zoom}&output=embed`;
}
