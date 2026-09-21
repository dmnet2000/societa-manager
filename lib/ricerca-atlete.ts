// Ricerca testuale sull'elenco Atlete di /app/conferma-iscrizioni - filtro
// lato client, l'elenco e' gia' interamente caricato dalla pagina. "nome" e'
// un unico campo (cognome e nome insieme, in qualunque ordine l'abbia
// inserito l'import), quindi cercare per cognome o per nome e' la stessa
// ricerca a sottostringa sul campo.

// Minuscolo e senza accenti/diacritici, cosi' "Nicolo" trova "Nicolò".
function normalizza(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Ogni parola della ricerca (separate da spazi) deve comparire nel nome o nel
// codice fiscale (AND): "maria rossi" trova sia "Rossi Maria" sia "Maria
// Rossi", indipendentemente dall'ordine. Ricerca vuota o di soli spazi =
// nessun filtro.
export function corrispondeRicercaAtleta(
  atleta: { nome: string; codiceFiscale: string },
  ricerca: string
): boolean {
  const parole = normalizza(ricerca).split(/\s+/).filter(Boolean);
  if (parole.length === 0) return true;

  const testo = normalizza(`${atleta.nome} ${atleta.codiceFiscale}`);
  return parole.every((parola) => testo.includes(parola));
}
