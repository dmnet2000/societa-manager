// Controllo di formato base (16 caratteri alfanumerici) - non implementa
// l'algoritmo completo di validazione/omocodia del Codice Fiscale italiano,
// sufficiente per evitare che un valore palesemente non valido occupi
// permanentemente uno slot univoco (review Story 1.4).
const FORMATO_CODICE_FISCALE = /^[A-Z0-9]{16}$/;

export function isCodiceFiscaleValido(codiceFiscale: string): boolean {
  return FORMATO_CODICE_FISCALE.test(codiceFiscale);
}
