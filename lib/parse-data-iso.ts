// Story 9.20 code review: estratto da app/(certificati-medici)/conferma-certificati/actions.ts
// perche' caricaCertificato (Story 9.20) ha bisogno esattamente della stessa
// validazione sulle stesse due colonne (dataInizioValidita/dataFineValidita
// di certificati_medici) - stesso principio di estrazione gia' stabilito nel
// progetto (lib/link-naviga-palestra.ts, lib/data-italiana.ts).
export const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Review fix originale (Story 4.4): `new Date("2026-02-30")` non produce un
// Invalid Date - JS normalizza silenziosamente al 2 marzo. Il round-trip
// verso ISO (stesso giorno/mese/anno) e' l'unico modo affidabile per
// rifiutare una data calendarialmente inesistente, il solo controllo di
// formato/regex non basta.
export function parseDataIsoValida(raw: string): Date | null {
  if (!FORMATO_DATA_ISO.test(raw)) {
    return null;
  }
  const data = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== raw) {
    return null;
  }
  return data;
}
