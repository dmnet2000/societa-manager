import "server-only";
import { parse } from "node-html-parser";
import type { HTMLElement } from "node-html-parser";
import type {
  RigaGaraImportata,
  RigaScartata,
  RisultatoParsingGare,
} from "@/lib/importa-gare/parser";

// Story 10.11: funzione pura HTML (stringa) -> righe parsate, stesso shape
// di RigaGaraImportata (import-gare Excel, Story 10.2) per riusare
// invariato il percorso di scrittura (upsert) in sincronizza-fipav-actions.ts.
// Isolata dalla Server Action (nessun fetch qui) - stesso principio di
// analizzaFileGare, testabile senza rete con l'HTML reale osservato in
// sessione.

// Selettore esatto verificato dal vivo sulla pagina risultati del portale
// FIPAV/Lega (Design Notes spec-10-11).
const SELETTORE_TABELLA = "table.tbl.tbl-risultati";

// Formato "gg/mm/aa hh:mm" del portale (anno a due cifre, a differenza del
// "gg/mm/aaaa" dell'export Excel - parseDataItaliana non e' riusabile qui).
// Le partite sincronizzate sono sempre di stagioni correnti/future: anno a
// due cifre interpretato come 2000+aa, nessun caso plausibile di secolo
// diverso in questo dominio.
const FORMATO_DATA_ORA_FIPAV =
  /^(\d{2})\/(\d{2})\/(\d{2})\s+((?:[01]\d|2[0-3]):[0-5]\d)$/;

function testo(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const t = value.trim();
  return t === "" ? null : t;
}

function parseDataOraFipav(testoGrezzo: string | null): { data: string; ora: string } | null {
  if (!testoGrezzo) {
    return null;
  }
  const match = testoGrezzo.match(FORMATO_DATA_ORA_FIPAV);
  if (!match) {
    return null;
  }
  const [, giornoTesto, meseTesto, annoTesto, ora] = match;
  const giorno = Number(giornoTesto);
  const mese = Number(meseTesto);
  const anno = 2000 + Number(annoTesto);

  // Stesso controllo di rollover di parseDataItaliana (lib/data-italiana.ts)
  // - una data inesistente come 31/02 non deve passare silenziosamente.
  const dataCostruita = new Date(Date.UTC(anno, mese - 1, giorno));
  const eValida =
    dataCostruita.getUTCFullYear() === anno &&
    dataCostruita.getUTCMonth() === mese - 1 &&
    dataCostruita.getUTCDate() === giorno;
  if (!eValida) {
    return null;
  }

  return { data: dataCostruita.toISOString().slice(0, 10), ora };
}

// Il title dell'icona info_16 arriva gia' decodificato (HTML-entity decode
// e' comportamento standard di parsing degli attributi) come stringa HTML
// letterale: "<p><b>Nome</b><br/>Citta' PR<br/>Indirizzo</p>". Ri-parsata
// come frammento HTML per separare nome (dentro <b>) dal resto (righe dopo
// <br/>, unite con ", " per formare indirizzoImpianto).
// Riusata sia per l'indirizzo (righe separate da <br/> dentro il title
// dell'icona info) sia per lo stato gara (stesso pattern osservato dal vivo
// per una gara "designata": "da disputare<br />Arbitro designato" - senza
// questo split il tag <br/> resterebbe letterale nella stringa salvata).
function righeDaFrammentoHtml(frammentoHtml: string): string[] {
  return frammentoHtml
    .split(/<br\s*\/?>/i)
    .map((frammento) => testo(parse(frammento).text))
    .filter((riga): riga is string => riga !== null);
}

function estraiImpiantoIndirizzo(titleHtml: string): {
  impianto: string | null;
  indirizzoImpianto: string | null;
} {
  const nodo = parse(titleHtml);
  const nomeEl = nodo.querySelector("b");
  const impianto = testo(nomeEl?.text);

  const contenitore = nodo.querySelector("p") ?? nodo;
  const righe = righeDaFrammentoHtml(contenitore.innerHTML);
  // Review fix (Blind Hunter + Edge Case Hunter): righe[0] va scartata SOLO
  // se corrisponde davvero al nome gia' estratto da <b> sopra - se il title
  // non ha un <b> (formato leggermente diverso da quello osservato dal
  // vivo), la prima riga e' gia' dato utile (es. la prima riga
  // dell'indirizzo) e non va persa.
  const indirizzoImpianto = (nomeEl ? righe.slice(1) : righe).join(", ") || null;

  return { impianto, indirizzoImpianto };
}

function analizzaRiga(row: HTMLElement): { riga: RigaGaraImportata } | { motivo: string } {
  const celle = row.querySelectorAll("td");
  if (celle.length < 5) {
    return { motivo: "Riga con celle insufficienti (formato pagina inatteso)" };
  }

  const garaNumero = testo(celle[0].text);
  if (!garaNumero) {
    return { motivo: "Numero gara mancante o vuoto" };
  }

  const giornata = testo(celle[1].text);

  const dataOra = parseDataOraFipav(testo(celle[2].text));
  if (!dataOra) {
    return { motivo: "Data/ora mancante o in formato non riconosciuto" };
  }

  const squadraCasa = testo(celle[3].text);
  if (!squadraCasa) {
    return { motivo: "Squadra Casa mancante o vuota" };
  }

  const squadraOspite = testo(celle[4].text);
  if (!squadraOspite) {
    return { motivo: "Squadra Ospite mancante o vuota" };
  }

  // Selettori per classe (non posizione) per i campi restanti - il numero
  // di colonne/icone puo' variare tra righe (es. una gara futura senza
  // ancora un'icona di stato).
  const cellaRisultato = row.querySelector("td.risultato");
  const risultato = cellaRisultato ? testo(cellaRisultato.text) : null;

  const testiParziali = row
    .querySelectorAll("span.parziali")
    .map((el) => testo(el.text))
    .filter((t): t is string => t !== null);
  const parziali = testiParziali.length > 0 ? testiParziali.join(",") : null;

  // Review fix: le due icone condividono ESATTAMENTE la stessa classe
  // "tips ris-img" nell'HTML reale del portale ("info_16" e' il nome del
  // file dell'icona, src="/img/info_16.png", MAI una classe CSS - verificato
  // sull'HTML scaricato dal vivo in sessione, vedi Design Notes). Un
  // selettore per classe non puo' distinguerle: solo l'attributo alt lo fa
  // ("statogara" per l'icona di stato, "info" per l'icona informativa). Il
  // vecchio selettore "img.tips.info_16" non trovava mai un match - Impianto/
  // IndirizzoImpianto sarebbero sempre stati null in produzione.
  const ultimaCella = celle[celle.length - 1];
  const iconaStato = ultimaCella.querySelector('img[alt="statogara"]');
  const titleStato = iconaStato ? testo(iconaStato.getAttribute("title")) : null;
  // Una gara "designata" ha un title su due righe separate da <br/> (es.
  // "da disputare<br />Arbitro designato") - stesso split di
  // estraiImpiantoIndirizzo, altrimenti il tag resterebbe letterale nel
  // valore salvato.
  const statoDescrizione = titleStato ? righeDaFrammentoHtml(titleStato).join(" - ") || null : null;

  const iconaInfo = ultimaCella.querySelector('img[alt="info"]');
  const titleInfo = iconaInfo ? testo(iconaInfo.getAttribute("title")) : null;
  const { impianto, indirizzoImpianto } = titleInfo
    ? estraiImpiantoIndirizzo(titleInfo)
    : { impianto: null, indirizzoImpianto: null };

  return {
    riga: {
      garaNumero,
      giornata,
      data: dataOra.data,
      ora: dataOra.ora,
      squadraCasa,
      squadraOspite,
      risultato,
      parziali,
      statoDescrizione,
      impianto,
      indirizzoImpianto,
    },
  };
}

// Lancia un errore esplicito solo se la tabella tbl-risultati stessa non e'
// presente (pagina cambiata/non e' quella attesa) - mirror del throw di
// analizzaFileGare per colonne essenziali mancanti. Una tabella presente ma
// senza righe (stagione non ancora iniziata) non e' un errore: risultato
// vuoto, nessuna riga da sincronizzare.
export function analizzaHtmlGareFipav(html: string): RisultatoParsingGare {
  const radice = parse(html);
  const tabella = radice.querySelector(SELETTORE_TABELLA);
  if (!tabella) {
    throw new Error(
      "Tabella dei risultati non trovata nella pagina del portale FIPAV. Il formato della pagina potrebbe essere cambiato."
    );
  }

  const righeHtml = tabella.querySelectorAll("tbody tr");
  const righe: RigaGaraImportata[] = [];
  const scartate: RigaScartata[] = [];

  righeHtml.forEach((row, indice) => {
    const numeroRiga = indice + 1;
    // Review fix (Edge Case Hunter): analizzaRiga puo' in teoria lanciare
    // un'eccezione inattesa su un markup pathologico (non solo restituire
    // {motivo} per i casi noti) - senza questo try/catch una singola riga
    // rovinata farebbe fallire l'intera sincronizzazione, contraddicendo
    // "fail-soft per riga" (Boundaries, spec-10-11).
    try {
      const esito = analizzaRiga(row);
      if ("motivo" in esito) {
        scartate.push({ numeroRiga, motivo: esito.motivo });
        return;
      }
      righe.push(esito.riga);
    } catch (err) {
      scartate.push({
        numeroRiga,
        motivo: err instanceof Error ? `Riga non interpretabile: ${err.message}` : "Riga non interpretabile",
      });
    }
  });

  return { righe, scartate };
}
