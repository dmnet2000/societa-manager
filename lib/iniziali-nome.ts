// Story 18.22 (review, party mode UI): iniziali per il placeholder foto di
// /staff quando un Allenatore non ha caricato una foto profilo - funzione
// pura, estratta per essere testabile (nessuna pagina di questo progetto
// viene mai testata direttamente, stessa ragione per cui funzioni pure come
// nomeSettoreAbbreviato vivono in lib/ invece che inline nella pagina).
export function inizialiNome(nome: string, cognome: string): string {
  const primaLettera = (valore: string) => valore.trim().charAt(0).toUpperCase();
  return `${primaLettera(nome)}${primaLettera(cognome)}`;
}
