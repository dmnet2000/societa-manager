// Story 27.1: "minorenne" = meno di 18 anni compiuti alla data "oggi".
// Funzione pura (nessun new Date() interno) - il chiamante passa la data di
// riferimento, cosi' resta testabile e coerente tra pagina e Server Action.
// dataNascita arriva da Atleta.dataNascita, salvata come mezzanotte UTC del
// giorno di nascita (ISO "yyyy-mm-ddT00:00:00.000Z"): giorno/mese/anno letti
// in UTC per entrambe le date, mai nel fuso locale del runtime.
// Nato il 29 febbraio: negli anni non bisestili gli anni si compiono il
// 1 marzo (il 28 febbraio il compleanno non e' ancora arrivato) - regola
// scelta per semplicita' e prudenza (mai "maggiorenne" un giorno prima).
export function isMinorenne(dataNascita: Date | string, oggi: Date): boolean {
  const nascita = typeof dataNascita === "string" ? new Date(dataNascita) : dataNascita;
  if (Number.isNaN(nascita.getTime())) {
    return false;
  }

  let anni = oggi.getUTCFullYear() - nascita.getUTCFullYear();
  const meseOggi = oggi.getUTCMonth();
  const meseNascita = nascita.getUTCMonth();
  if (
    meseOggi < meseNascita ||
    (meseOggi === meseNascita && oggi.getUTCDate() < nascita.getUTCDate())
  ) {
    anni -= 1;
  }

  return anni < 18;
}
