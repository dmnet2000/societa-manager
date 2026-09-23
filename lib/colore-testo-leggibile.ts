// Richiesta utente (2026-09-24): l'intero sfondo della match-card usa il
// colore scelto per il Campionato - a differenza del precedente pallino
// decorativo, qui il testo (bianco su sfondo scuro di default) potrebbe
// diventare illeggibile su un colore chiaro scelto dall'utente. Calcola la
// luminanza relativa (formula WCAG) del colore per decidere se la card deve
// passare a una tavolozza di testo scuro invece di quella chiara di
// default - non garantisce AA per ogni singolo colore possibile (un colore
// a luminanza intermedia resta un compromesso), ma evita il caso peggiore
// (testo bianco su sfondo bianco o quasi).
export function testoScuroSuSfondo(colore: string): boolean {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colore);
  if (!m) return false; // formato inatteso: mai passare a testo scuro alla cieca

  const [, r, g, b] = m;
  const canale = (esadecimale: string) => {
    const c = parseInt(esadecimale, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminanza = 0.2126 * canale(r) + 0.7152 * canale(g) + 0.0722 * canale(b);

  // Soglia 0.5: il blu di default (#2e6f99) ha luminanza ~0.16 (testo
  // chiaro, comportamento invariato) - un giallo/bianco chiaro supera 0.5
  // (testo scuro).
  return luminanza > 0.5;
}
