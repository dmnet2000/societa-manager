// Story 18.22 (review, party mode UI): iniziali per il placeholder foto di
// /staff quando un Allenatore non ha caricato una foto profilo - funzione
// pura, estratta per essere testabile (nessuna pagina di questo progetto
// viene mai testata direttamente, stessa ragione per cui funzioni pure come
// nomeSettoreAbbreviato vivono in lib/ invece che inline nella pagina).
export function inizialiNome(nome: string, cognome: string): string {
  const primaLettera = (valore: string) => valore.trim().charAt(0).toUpperCase();
  return `${primaLettera(nome)}${primaLettera(cognome)}`;
}

// Story 18.24: mirror concettuale di inizialiNome sopra, ma per Atleta, che
// (a differenza di Allenatore) ha un solo campo "nome" - gia' nel formato
// "Cognome Nome" per convenzione pre-esistente dell'anagrafica (vedi
// AtletaTabellaRiga.tsx). Split per spazio: prima lettera dei primi due
// token disponibili, un solo token restituisce una sola lettera (mirror
// del comportamento "cognome vuoto" di inizialiNome).
export function inizialiNomeCompleto(nomeCompleto: string): string {
  const token = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  return token
    .slice(0, 2)
    .map((parola) => parola.charAt(0).toUpperCase())
    .join("");
}
