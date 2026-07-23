export type PuntoGrafico = { x: number; y: number };

export type DimensioniGrafico = {
  larghezza: number;
  altezza: number;
  padding: number;
};

// Story 6.2 (AC #1/#2): converte una serie di valori in coordinate SVG.
// Posizione X per indice (spaziatura equidistante), non per data - nessuna
// aritmetica sulle stringhe "data" richiesta (coerente con la convenzione
// gia' stabilita nel progetto, Story 2.5/3.1/6.1). Posizione Y scalata su
// min/max della SOLA serie ricevuta (mai tra grafici diversi, AC #2: assi
// indipendenti per tipo).
export function calcolaCoordinateGrafico(
  valori: number[],
  dimensioni: DimensioniGrafico
): PuntoGrafico[] {
  if (valori.length === 0) {
    return [];
  }

  const { larghezza, altezza, padding } = dimensioni;
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  // min === max (es. un solo valore ripetuto): evita la divisione per zero,
  // disegna una linea piatta a meta' altezza.
  const scalaVerticale = max === min ? 0 : (altezza - 2 * padding) / (max - min);

  const passoOrizzontale =
    valori.length === 1 ? 0 : (larghezza - 2 * padding) / (valori.length - 1);

  return valori.map((valore, indice) => ({
    x: padding + indice * passoOrizzontale,
    // Origine SVG in alto a sinistra: un valore piu' alto deve avere una y
    // piu' piccola, quindi si sottrae dall'altezza invece di sommare.
    y:
      max === min
        ? altezza / 2
        : altezza - padding - (valore - min) * scalaVerticale,
  }));
}
