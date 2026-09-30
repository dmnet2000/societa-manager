// Story 18.32: funzioni pure della vista mensile "stile Google Calendar" di
// /calendario (app/calendario/CalendarioVista.tsx). Tutto in UTC - stesso
// principio di lib/raggruppa-per-settimana.ts e lib/mese-calendario.ts
// (parseDataUtc/Date.UTC, mai il fuso locale del browser o del server), cosi'
// il giorno di una Partita non puo' scivolare di un giorno a seconda di dove
// gira il codice. Separate dal componente per essere testabili senza DOM.
import { giorniDelMese } from "./mese-calendario";
import {
  formattaDataIso,
  lunediDellaSettimana,
  oraInMinuti,
  parseDataUtc,
} from "./raggruppa-per-settimana";

const GIORNO_IN_MS = 24 * 60 * 60 * 1000;

export type GiornoGriglia = {
  data: string; // "YYYY-MM-DD"
  delMese: boolean; // false per i giorni del mese precedente/successivo
};

export type CampionatoLegenda = {
  id: string;
  nome: string;
  colore: string | null;
};

export const CHIAVE_STORAGE_NASCOSTI = "calendario-campionati-nascosti";

// Nomi italiani letterali (non toLocaleDateString): stessa stringa garantita
// su qualunque motore/ICU, niente differenze server/client.
export const NOMI_MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

// Indicizzati come getUTCDay(): 0 = domenica.
const NOMI_GIORNI = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];

// Intestazioni della griglia, lunedi' per primo (convenzione italiana).
export const INTESTAZIONI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

// Righe complete lunedi'-domenica che coprono l'intero mese: i giorni fuori
// mese in testa/coda hanno delMese = false (attenuati nella UI).
export function settimaneDelMese(meseIso: string): GiornoGriglia[][] {
  const giorni = giorniDelMese(meseIso); // valida il formato, lancia se errato
  const giorniDelMeseSet = new Set(giorni);
  const primo = parseDataUtc(giorni[0]);
  const ultimo = parseDataUtc(giorni[giorni.length - 1]);
  const inizio = lunediDellaSettimana(primo);
  const fine = new Date(lunediDellaSettimana(ultimo).getTime() + 6 * GIORNO_IN_MS);

  const settimane: GiornoGriglia[][] = [];
  let riga: GiornoGriglia[] = [];
  for (let t = inizio.getTime(); t <= fine.getTime(); t += GIORNO_IN_MS) {
    const data = formattaDataIso(new Date(t));
    riga.push({ data, delMese: giorniDelMeseSet.has(data) });
    if (riga.length === 7) {
      settimane.push(riga);
      riga = [];
    }
  }
  return settimane;
}

// Data "YYYY-MM-DD" normalizzata, o null se non parsabile (stessa regola di
// raggruppaPerSettimana: una data invalida esclude la Partita, mai un crash).
export function normalizzaData(data: string): string | null {
  const d = parseDataUtc(data);
  return Number.isNaN(d.getTime()) ? null : formattaDataIso(d);
}

// Primo e ultimo mese ("YYYY-MM") che contengono almeno una data valida;
// null se nessuna data e' valida.
export function intervalloMesi(date: string[]): { min: string; max: string } | null {
  let min: string | null = null;
  let max: string | null = null;
  for (const data of date) {
    const normalizzata = normalizzaData(data);
    if (!normalizzata) continue;
    const mese = normalizzata.slice(0, 7);
    if (min === null || mese < min) min = mese;
    if (max === null || mese > max) max = mese;
  }
  return min !== null && max !== null ? { min, max } : null;
}

// "YYYY-MM" e' confrontabile lessicograficamente: il mese corrente se cade
// nell'intervallo, altrimenti il bordo piu' vicino.
export function meseIniziale(oggiMese: string, min: string, max: string): string {
  if (oggiMese < min) return min;
  if (oggiMese > max) return max;
  return oggiMese;
}

// Frecce disattivate ai bordi della stagione (e sempre, se nessuna data e'
// valida).
export function bordiNavigazione(
  meseIso: string,
  intervallo: { min: string; max: string } | null
): { primo: boolean; ultimo: boolean } {
  return {
    primo: intervallo === null || meseIso <= intervallo.min,
    ultimo: intervallo === null || meseIso >= intervallo.max,
  };
}

// Partite dei soli Campionati non nascosti dalla legenda.
export function filtraVisibili<T extends { campionato: { id: string } }>(
  partite: T[],
  nascosti: string[]
): T[] {
  const setNascosti = new Set(nascosti);
  return partite.filter((p) => !setNascosti.has(p.campionato.id));
}

export function meseAdiacente(meseIso: string, delta: 1 | -1): string {
  const [anno, mese] = meseIso.split("-").map(Number);
  const d = new Date(Date.UTC(anno, mese - 1 + delta, 1));
  return formattaDataIso(d).slice(0, 7);
}

export function etichettaMese(meseIso: string): string {
  const [anno, mese] = meseIso.split("-").map(Number);
  return `${NOMI_MESI[mese - 1]} ${anno}`;
}

// Es. "martedì 14 ottobre" - etichetta accessibile della cella.
export function etichettaGiorno(data: string): string {
  const d = parseDataUtc(data);
  return `${NOMI_GIORNI[d.getUTCDay()]} ${d.getUTCDate()} ${NOMI_MESI[d.getUTCMonth()]}`;
}

// Un Campionato per id, ordinati per nome (legenda).
export function campionatiDistinti(
  partite: { campionato: CampionatoLegenda }[]
): CampionatoLegenda[] {
  const perId = new Map<string, CampionatoLegenda>();
  for (const { campionato } of partite) {
    if (!perId.has(campionato.id)) {
      perId.set(campionato.id, {
        id: campionato.id,
        nome: campionato.nome,
        colore: campionato.colore,
      });
    }
  }
  return [...perId.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

// Valore grezzo di localStorage -> id dei Campionati nascosti. Qualunque
// valore inatteso (null, JSON corrotto, non-array, elementi non stringa)
// equivale a "nessuno nascosto" (tutti selezionati); gli id non piu'
// presenti in stagione vengono scartati.
export function leggiNascosti(raw: string | null, idValidi: string[]): string[] {
  const validi = new Set(idValidi);
  return idSalvati(raw).filter((id) => validi.has(id));
}

// Tutti gli id stringa (senza duplicati) di un valore salvato; [] per
// qualunque valore inatteso.
function idSalvati(raw: string | null): string[] {
  if (raw === null) return [];
  let valore: unknown;
  try {
    valore = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(valore)) return [];
  const risultato: string[] = [];
  for (const id of valore) {
    if (typeof id === "string" && !risultato.includes(id)) {
      risultato.push(id);
    }
  }
  return risultato;
}

// Valore da scrivere in localStorage: i nascosti correnti di questa
// stagione PIU' gli id gia' salvati che non sono Campionati di questa
// stagione (preferenze di Campionati che potrebbero ricomparire, da non
// cancellare solo perche' oggi non hanno Partite). Gli id salvati che sono
// Campionati di questa stagione seguono invece la selezione corrente.
export function unisciNascostiDaSalvare(
  rawPrecedente: string | null,
  nascostiCorrenti: string[],
  idValidi: string[]
): string[] {
  const validi = new Set(idValidi);
  const risultato = idSalvati(rawPrecedente).filter((id) => !validi.has(id));
  for (const id of nascostiCorrenti) {
    if (!risultato.includes(id)) risultato.push(id);
  }
  return risultato;
}

// Partite raggruppate per giorno "YYYY-MM-DD", ordinate per ora; quelle con
// data non parsabile sono escluse.
export function partitePerGiorno<T extends { data: string; ora: string }>(
  partite: T[]
): Map<string, T[]> {
  const mappa = new Map<string, T[]>();
  for (const partita of partite) {
    const giorno = normalizzaData(partita.data);
    if (!giorno) continue;
    const lista = mappa.get(giorno);
    if (lista) lista.push(partita);
    else mappa.set(giorno, [partita]);
  }
  for (const lista of mappa.values()) {
    lista.sort((a, b) => oraInMinuti(a.ora) - oraInMinuti(b.ora));
  }
  return mappa;
}

// Seguito Story 18.32: dettaglio della Partita nel popup della vista Mese.
// Parziali salvati come "25-20,22-25" (lib/sincronizza-gare-fipav/parser.ts):
// resi "25-20, 22-25"; null se assenti/vuoti.
export function formattaParziali(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const set = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return set.length > 0 ? set.join(", ") : null;
}

// Campi del popup: sempre presenti nell'oggetto (null quando mancano sulla
// Partita), cosi' un campo dimenticato nella proiezione e' un errore di tipo.
export type CampiDettaglioPartita = {
  data: string;
  ora: string;
  giornata: string | null;
  impianto: string | null;
  indirizzoImpianto: string | null;
  statoDescrizione: string | null;
  risultato: string | null;
  parziali: string | null;
};

// Campi che servono alla griglia (striscia + legenda).
export type CampiGrigliaPartita = {
  id: string;
  data: string;
  ora: string;
  squadraCasa: string;
  squadraOspite: string;
  campionato: CampionatoLegenda;
};

// Partita come la riceve il client della vista Mese: griglia + popup.
export type PartitaVistaMese = CampiGrigliaPartita & CampiDettaglioPartita;

// Proiezione di una riga Prisma (che puo' avere campi in piu') sui soli
// campi serializzati al client della vista Mese.
export function partitaPerVistaMese(riga: PartitaVistaMese): PartitaVistaMese {
  return {
    id: riga.id,
    data: riga.data,
    ora: riga.ora,
    squadraCasa: riga.squadraCasa,
    squadraOspite: riga.squadraOspite,
    impianto: riga.impianto,
    indirizzoImpianto: riga.indirizzoImpianto,
    giornata: riga.giornata,
    statoDescrizione: riga.statoDescrizione,
    risultato: riga.risultato,
    parziali: riga.parziali,
    campionato: {
      id: riga.campionato.id,
      nome: riga.campionato.nome,
      colore: riga.campionato.colore,
    },
  };
}

export type RigaDettaglio = {
  chiave: "quando" | "giornata" | "palestra" | "indirizzo" | "stato" | "risultato" | "parziali";
  etichetta: string;
  valore: string;
};

function valorizzato(valore: string | null | undefined): string | null {
  const pulito = valore?.trim();
  return pulito ? pulito : null;
}

// Righe etichetta/valore dei soli campi presenti, in ordine fisso (Campionato
// e squadre stanno in intestazione/titolo del popup, non qui). Un campo
// opzionale assente viene omesso, mai un "non disponibile".
export function righeDettaglioPartita(partita: CampiDettaglioPartita): RigaDettaglio[] {
  const righe: RigaDettaglio[] = [];
  const giorno = normalizzaData(partita.data);
  const ora = valorizzato(partita.ora);
  const quando = [giorno ? `${etichettaGiorno(giorno)} ${giorno.slice(0, 4)}` : null, ora ? `ore ${ora}` : null]
    .filter(Boolean)
    .join(", ");
  if (quando) righe.push({ chiave: "quando", etichetta: "Quando", valore: quando });

  const campi: [RigaDettaglio["chiave"], string, string | null][] = [
    ["giornata", "Giornata", valorizzato(partita.giornata)],
    ["palestra", "Palestra", valorizzato(partita.impianto)],
    ["indirizzo", "Indirizzo", valorizzato(partita.indirizzoImpianto)],
    ["stato", "Stato", valorizzato(partita.statoDescrizione)],
    ["risultato", "Risultato", valorizzato(partita.risultato)],
    ["parziali", "Parziali", formattaParziali(partita.parziali)],
  ];
  for (const [chiave, etichetta, valore] of campi) {
    if (valore) righe.push({ chiave, etichetta, valore });
  }
  return righe;
}
