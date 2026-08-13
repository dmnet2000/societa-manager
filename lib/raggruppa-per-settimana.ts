// Story 10.3: raggruppa un elenco di elementi datati (Partita) in settimane
// lunedì-domenica (convenzione italiana, non domenica-sabato). Genera OGNI
// settimana nell'intervallo tra la prima e l'ultima presente, incluse quelle
// senza alcun elemento (AC #4, "nessuna partita questa settimana") - non
// solo le settimane che contengono almeno un elemento.
export type SettimanaPartite<T> = {
  chiave: string;
  etichetta: string;
  inizio: string;
  fine: string;
  partite: T[];
};

const GIORNO_IN_MS = 24 * 60 * 60 * 1000;

// Review fix: limite difensivo sul numero di settimane generate (~5 anni) -
// una stagione reale ne copre al massimo una quarantina; senza questo
// limite una data valida ma aberrante (es. anno 9999, arrivata da una
// modifica manuale al DB o un bug altrove) genererebbe centinaia di
// migliaia di settimane, con un ciclo che appende la richiesta (verificato
// dal vivo: senza questo limite il test dedicato non terminava).
export const MAX_SETTIMANE = 260;

// "data" e' sempre una stringa "YYYY-MM-DD" (mai un oggetto Date salvato -
// stesso principio di Partita.data, Story 10.2) - il suffisso T00:00:00Z
// forza il parsing in UTC, altrimenti il fuso orario locale del server
// potrebbe far ricadere la data nel giorno prima/dopo. Esportata (review
// fix): riusata anche da app/(partite-campionati)/partite/page.tsx per
// formattare la stessa stringa nella UI, invece di una seconda
// implementazione indipendente dello stesso parsing.
export function parseDataUtc(data: string): Date {
  return new Date(`${data}T00:00:00Z`);
}

// Esportata (review fix, Story 18.3): riusata da app/page.tsx invece di una
// seconda implementazione locale identica - stesso principio gia' applicato
// a lunediDellaSettimana qui sotto.
export function formattaDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

// getUTCDay(): 0 = domenica ... 6 = sabato. Offset dal lunedì della stessa
// settimana: lunedì(1)->0, martedì(2)->1, ..., domenica(0)->6.
// Esportata (Story 18.3): riusata da app/page.tsx (home pubblica) per
// calcolare i confini della sola settimana corrente, senza dover generare
// l'intero intervallo di settimane di una stagione (raggruppaPerSettimana
// sotto presuppone un elenco di Partite già filtrato, non un AnnoAgonistico
// - qui serve il solo calcolo del lunedì, invariato).
export function lunediDellaSettimana(data: Date): Date {
  const giorno = data.getUTCDay();
  const offset = (giorno + 6) % 7;
  return new Date(data.getTime() - offset * GIORNO_IN_MS);
}

// Review fix: timeZone: "UTC" esplicito su entrambe le chiamate - il
// raggruppamento in settimane e' gia' calcolato in UTC (getUTCDay()), ma
// senza ancorare anche la formattazione il fuso orario locale del processo
// Node (se diverso da UTC) potrebbe mostrare una data sfalsata di un giorno
// rispetto ai confini inizio/fine effettivi (verificato forzando
// TZ=America/New_York).
function formattaEtichetta(inizio: Date, fine: Date): string {
  const stessoAnno = inizio.getUTCFullYear() === fine.getUTCFullYear();
  const testoInizio = inizio.toLocaleDateString(
    "it-IT",
    stessoAnno
      ? { day: "numeric", month: "long", timeZone: "UTC" }
      : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
  );
  const testoFine = fine.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${testoInizio} - ${testoFine}`;
}

// Review fix: confronto numerico (minuti da mezzanotte), non lessicografico
// su stringa - l'import (lib/importa-gare/parser.ts, testoCella) valida
// solo la presenza di "Ora", non il formato zero-paddato; un valore come
// "9:00" ordinato come stringa finirebbe dopo "20:30" nello stesso giorno.
// Un formato non riconosciuto va in fondo (Number.MAX_SAFE_INTEGER) invece
// di rompere l'ordinamento delle righe valide.
function oraInMinuti(ora: string): number {
  const match = ora.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const [, oreTesto, minutiTesto] = match;
  return Number(oreTesto) * 60 + Number(minutiTesto);
}

export function raggruppaPerSettimana<T extends { data: string; ora: string }>(
  partiteInput: T[]
): SettimanaPartite<T>[] {
  // Review fix: una data non parsabile (Partita.data e' una colonna String
  // senza vincolo di formato a livello DB - una modifica manuale, uno
  // script, o un futuro percorso di import diverso da parseDataItaliana
  // potrebbero introdurne una) non deve mai abbattere l'intera pagina - la
  // riga viene scartata con un log, il resto continua a funzionare.
  const partite = partiteInput.filter((partita) => {
    const valida = !Number.isNaN(parseDataUtc(partita.data).getTime());
    if (!valida) {
      console.error(
        `raggruppaPerSettimana: Partita con data non valida ignorata: "${partita.data}"`
      );
    }
    return valida;
  });

  if (partite.length === 0) {
    return [];
  }

  const conLunedi = partite.map((partita) => ({
    partita,
    lunedi: lunediDellaSettimana(parseDataUtc(partita.data)),
  }));

  let lunediMinimo = conLunedi[0].lunedi;
  let lunediMassimo = conLunedi[0].lunedi;
  for (const { lunedi } of conLunedi) {
    if (lunedi < lunediMinimo) lunediMinimo = lunedi;
    if (lunedi > lunediMassimo) lunediMassimo = lunedi;
  }

  const settimaneTotali =
    Math.round((lunediMassimo.getTime() - lunediMinimo.getTime()) / (7 * GIORNO_IN_MS)) + 1;
  if (settimaneTotali > MAX_SETTIMANE) {
    console.error(
      `raggruppaPerSettimana: intervallo di ${settimaneTotali} settimane troncato a ${MAX_SETTIMANE}`
    );
    lunediMassimo = new Date(lunediMinimo.getTime() + (MAX_SETTIMANE - 1) * 7 * GIORNO_IN_MS);
  }

  const partitePerChiave = new Map<string, T[]>();
  for (const { partita, lunedi } of conLunedi) {
    const chiave = formattaDataIso(lunedi);
    const lista = partitePerChiave.get(chiave);
    if (lista) {
      lista.push(partita);
    } else {
      partitePerChiave.set(chiave, [partita]);
    }
  }

  const settimane: SettimanaPartite<T>[] = [];
  for (
    let lunedi = lunediMinimo;
    lunedi.getTime() <= lunediMassimo.getTime();
    lunedi = new Date(lunedi.getTime() + 7 * GIORNO_IN_MS)
  ) {
    const chiave = formattaDataIso(lunedi);
    const domenica = new Date(lunedi.getTime() + 6 * GIORNO_IN_MS);
    const partiteSettimana = (partitePerChiave.get(chiave) ?? [])
      .slice()
      .sort((a, b) => {
        if (a.data !== b.data) return a.data < b.data ? -1 : 1;
        return oraInMinuti(a.ora) - oraInMinuti(b.ora);
      });

    settimane.push({
      chiave,
      etichetta: formattaEtichetta(lunedi, domenica),
      inizio: chiave,
      fine: formattaDataIso(domenica),
      partite: partiteSettimana,
    });
  }

  return settimane;
}
