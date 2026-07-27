// Story 9.6: URL "universal" di Google Maps - accetta testo libero (nessuna
// geocodifica, coerente con NFR6, nessun servizio esterno a pagamento).
// L'apertura app-vs-browser e' gestita dal sistema operativo/browser del
// dispositivo, non da questo codice.
export function costruisciLinkNaviga(indirizzo: string | null | undefined): string | null {
  const indirizzoNormalizzato = indirizzo?.trim();
  if (!indirizzoNormalizzato) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzoNormalizzato)}`;
}
