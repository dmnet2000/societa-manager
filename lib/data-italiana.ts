// Story 10.2: estratta da app/(onboarding-import)/import-atlete/parser.ts
// (Story 1.3) - riusata anche da lib/importa-gare/parser.ts, comportamento
// identico, nessun cambio. Le date negli export federali (Atlete, Gare) sono
// stringhe "gg/mm/aaaa", non date native Excel - normalizzate qui prima
// della persistenza. Gestisce difensivamente anche una Date nativa, se
// presente. Valida anche che giorno/mese/anno corrispondano davvero alla
// data costruita (Date.UTC altrimenti farebbe rollover silenzioso di date
// inesistenti come 31/02 - review Story 1.3).
export function parseDataItaliana(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  const testo = String(value).trim();
  if (!testo) {
    return null;
  }
  const match = testo.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, giornoTesto, meseTesto, annoTesto] = match;
  const giorno = Number(giornoTesto);
  const mese = Number(meseTesto);
  const anno = Number(annoTesto);
  const data = new Date(Date.UTC(anno, mese - 1, giorno));

  const eValida =
    data.getUTCFullYear() === anno &&
    data.getUTCMonth() === mese - 1 &&
    data.getUTCDate() === giorno;

  return eValida ? data : null;
}
