// Contratto dell'API del tablet (`/api/tablet/v1/*`), AD-13 del referto
// elettronico dei tornei.
//
// FONTE UNICA. Questo file e' copiato byte per byte nell'app (repo
// referto-tornei, `src/contratto/contratto.ts`) con `npm run contratto:genera`;
// la CI dell'app confronta la copia con questo file sul ramo main pubblico.
// Per questo: TypeScript semplice, nessun import, nessuna dipendenza.
// Una modifica qui e' un PR su societa-manager, poi `contratto:genera` e un PR
// sull'app.

/** Header con cui l'app dichiara la propria versione di protocollo (intero positivo). */
export const HEADER_VERSIONE_APP = "X-App-Versione";

/** Codici di errore dell'API del tablet. */
export const CODICI_ERRORE = [
  "NON_AUTENTICATO",
  "FORBIDDEN",
  "RIASSEGNATA",
  "CONFLITTO",
  "GARA_CHIUSA",
  "APP_OBSOLETA",
  "VALIDATION",
  "INTERNAL",
] as const;

export type CodiceErrore = (typeof CODICI_ERRORE)[number];

/** Forma unica degli errori: `{ error: { code, message } }`. */
export interface ErroreApi {
  readonly error: {
    readonly code: CodiceErrore;
    readonly message: string;
  };
}

/**
 * Gara assegnata al tablet (story 2.6). `garaId` e' l'id della partita sul
 * server (AD-15); `epoca` cresce a ogni cambio di tablet (AD-2). `data`
 * (`AAAA-MM-GG`), `ora` (`HH:MM`) e `luogo` sono l'orario locale del torneo e
 * il campo di gioco, `null` se la gara non ha ancora un orario.
 */
export interface Gara {
  readonly garaId: string;
  readonly epoca: number;
  readonly numero: number;
  readonly categoria: string;
  readonly casa: string;
  readonly ospite: string;
  readonly data: string | null;
  readonly ora: string | null;
  readonly luogo: string | null;
}

/** Risposta di `GET /api/tablet/v1/gare`. */
export interface RispostaGare {
  readonly gare: readonly Gara[];
}

function eOggetto(valore: unknown): valore is Readonly<Record<string, unknown>> {
  return typeof valore === "object" && valore !== null && !Array.isArray(valore);
}

function eCodiceErrore(valore: unknown): valore is CodiceErrore {
  return typeof valore === "string" && (CODICI_ERRORE as readonly string[]).includes(valore);
}

/** Legge un corpo JSON come errore del contratto; `undefined` se non lo e'. */
export function leggiErrore(corpo: unknown): ErroreApi["error"] | undefined {
  if (!eOggetto(corpo) || !eOggetto(corpo["error"])) return undefined;
  const { code, message } = corpo["error"];
  if (!eCodiceErrore(code) || typeof message !== "string") return undefined;
  return { code, message };
}

function eTesto(valore: unknown): valore is string {
  return typeof valore === "string" && valore.length > 0;
}

function eTestoONull(valore: unknown): valore is string | null {
  return valore === null || eTesto(valore);
}

// Nomi mostrati (categoria, squadre, luogo): basta che siano testo, anche
// vuoto. Un nome vuoto nel database non deve far rifiutare tutto l'elenco.
function eNome(valore: unknown): valore is string {
  return typeof valore === "string";
}

function eInteroPositivo(valore: unknown): valore is number {
  return typeof valore === "number" && Number.isSafeInteger(valore) && valore >= 1;
}

/** Legge un valore come gara del contratto; `undefined` se un campo manca o ha il tipo sbagliato. */
function leggiGara(valore: unknown): Gara | undefined {
  if (!eOggetto(valore)) return undefined;
  const { garaId, epoca, numero, categoria, casa, ospite, data, ora, luogo } = valore;
  if (
    !eTesto(garaId) ||
    !eInteroPositivo(epoca) ||
    !eInteroPositivo(numero) ||
    !eNome(categoria) ||
    !eNome(casa) ||
    !eNome(ospite) ||
    !eTestoONull(data) ||
    !eTestoONull(ora) ||
    !(luogo === null || eNome(luogo))
  ) {
    return undefined;
  }
  return { garaId, epoca, numero, categoria, casa, ospite, data, ora, luogo };
}

/**
 * Legge un corpo JSON come elenco gare; `undefined` se non lo e', anche quando
 * una sola gara e' malformata (mai un elenco parziale).
 */
export function leggiGare(corpo: unknown): RispostaGare | undefined {
  if (!eOggetto(corpo) || !Array.isArray(corpo["gare"])) return undefined;
  const gare: Gara[] = [];
  for (const valore of corpo["gare"] as unknown[]) {
    const gara = leggiGara(valore);
    if (gara === undefined) return undefined;
    gare.push(gara);
  }
  return { gare };
}

/**
 * Parametri del formato di una gara (AD-5), tutti interi. `versione` e' la
 * versione della forma dell'oggetto (oggi 1).
 */
export interface ParametriFormato {
  readonly versione: number;
  readonly setPerVincere: number;
  readonly puntiSet: number;
  readonly puntiSetDecisivo: number;
  readonly scartoMinimo: number;
  readonly cambiPerSet: number;
  readonly timeoutPerSet: number;
  readonly liberiMin: number;
  readonly liberiMax: number;
  readonly rosaMax: number;
}

/** Risposta di `GET /api/tablet/v1/gare/{garaId}/parametri?epoca=N`. */
export interface RispostaParametri {
  readonly parametri: ParametriFormato;
}

/**
 * Legge un valore come parametri del formato; `undefined` se un campo manca,
 * non e' un intero positivo, `scartoMinimo` < 1 (gia' coperto) o
 * `liberiMin` > `liberiMax`.
 */
function leggiParametriFormato(valore: unknown): ParametriFormato | undefined {
  if (!eOggetto(valore)) return undefined;
  const {
    versione,
    setPerVincere,
    puntiSet,
    puntiSetDecisivo,
    scartoMinimo,
    cambiPerSet,
    timeoutPerSet,
    liberiMin,
    liberiMax,
    rosaMax,
  } = valore;
  if (
    !eInteroPositivo(versione) ||
    !eInteroPositivo(setPerVincere) ||
    !eInteroPositivo(puntiSet) ||
    !eInteroPositivo(puntiSetDecisivo) ||
    !eInteroPositivo(scartoMinimo) ||
    !eInteroPositivo(cambiPerSet) ||
    !eInteroPositivo(timeoutPerSet) ||
    !eInteroPositivo(liberiMin) ||
    !eInteroPositivo(liberiMax) ||
    !eInteroPositivo(rosaMax) ||
    liberiMin > liberiMax
  ) {
    return undefined;
  }
  return {
    versione,
    setPerVincere,
    puntiSet,
    puntiSetDecisivo,
    scartoMinimo,
    cambiPerSet,
    timeoutPerSet,
    liberiMin,
    liberiMax,
    rosaMax,
  };
}

/** Legge un corpo JSON come risposta dei parametri; `undefined` se non lo e'. */
export function leggiParametri(corpo: unknown): RispostaParametri | undefined {
  if (!eOggetto(corpo)) return undefined;
  const parametri = leggiParametriFormato(corpo["parametri"]);
  return parametri === undefined ? undefined : { parametri };
}

/**
 * Dominio dell'email sintetica di un utente tablet (AD-12). `.invalid` e' un
 * dominio riservato: nessuna email puo' mai arrivare a un tablet.
 */
export const DOMINIO_TABLET = "tablet.invalid";

/** Regola del nome del tablet: lettera iniziale, poi `a-z`, `0-9`, `-`; da 3 a 30 caratteri. */
const NOME_TABLET_VALIDO = /^[a-z][a-z0-9-]{2,29}$/;

/**
 * Normalizza il nome di un tablet: toglie lo spazio ai bordi e porta in
 * minuscolo. `undefined` se il risultato non rispetta la regola del nome.
 */
export function normalizzaNomeTablet(valore: string | null | undefined): string | undefined {
  if (typeof valore !== "string") return undefined;
  const nome = valore.trim().toLowerCase();
  return NOME_TABLET_VALIDO.test(nome) ? nome : undefined;
}

/**
 * Email sintetica dell'utente tablet: `<nome>@tablet.invalid`, col nome
 * normalizzato. `undefined` se il nome non e' valido.
 */
export function emailDaNomeTablet(valore: string | null | undefined): string | undefined {
  const nome = normalizzaNomeTablet(valore);
  return nome === undefined ? undefined : `${nome}@${DOMINIO_TABLET}`;
}

/**
 * Legge il valore dell'header di versione: un intero positivo scritto solo con
 * cifre, senza zeri iniziali. Tutto il resto (assente, vuoto, `abc`, `0`,
 * `-1`, `1.5`, `1e3`) e' `undefined`.
 */
export function leggiVersioneApp(valore: string | null | undefined): number | undefined {
  if (typeof valore !== "string") return undefined;
  const testo = valore.trim();
  if (!/^[1-9][0-9]*$/.test(testo)) return undefined;
  const numero = Number(testo);
  return Number.isSafeInteger(numero) ? numero : undefined;
}

/** Giocatore della rosa di una gara; `id` e' stabile (AD-4). */
export interface GiocatoreRosaGara {
  readonly id: string;
  readonly numero: number;
  readonly nome: string;
  readonly cognome: string;
  readonly capitano: boolean;
  readonly libero: boolean;
}

export const RUOLI_TESSERATO = ["A", "VA", "M", "FT", "D"] as const;
export type RuoloTesseratoGara = (typeof RUOLI_TESSERATO)[number];

/** Tesserato (staff) della rosa di una gara. */
export interface TesseratoRosaGara {
  readonly id: string;
  readonly ruolo: RuoloTesseratoGara;
  readonly nome: string;
}

/** Rosa di un lato della gara; rosa assente = `versione` 0 e liste vuote. */
export interface RosaGara {
  readonly versione: number;
  readonly giocatori: readonly GiocatoreRosaGara[];
  readonly tesserati: readonly TesseratoRosaGara[];
}

/** Risposta di `GET /api/tablet/v1/gare/{garaId}/rose?epoca=N`. */
export interface RispostaRose {
  readonly casa: RosaGara;
  readonly ospite: RosaGara;
}

export interface GiocatoreSalvaRosa {
  readonly numero: number;
  readonly nome: string;
  readonly cognome: string;
  readonly capitano: boolean;
  readonly libero: boolean;
}

export interface TesseratoSalvaRosa {
  readonly ruolo: RuoloTesseratoGara;
  readonly nome: string;
}

/** Corpo di `PUT /api/tablet/v1/gare/{garaId}/rose/{lato}?epoca=N`. */
export interface RichiestaSalvaRosa {
  readonly versioneBase: number;
  readonly idModifica: string;
  readonly giocatori: readonly GiocatoreSalvaRosa[];
  readonly tesserati: readonly TesseratoSalvaRosa[];
}

/** Risposta del salvataggio della rosa. */
export interface RispostaSalvaRosa {
  readonly versione: number;
}

const LUNGHEZZA_MAX_NOME = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function eInteroNonNegativo(valore: unknown): valore is number {
  return typeof valore === "number" && Number.isSafeInteger(valore) && valore >= 0;
}

function eNomePersona(valore: unknown): valore is string {
  return typeof valore === "string" && valore.trim().length > 0 && valore.length <= LUNGHEZZA_MAX_NOME;
}

function eNumeroMaglia(valore: unknown): valore is number {
  return typeof valore === "number" && Number.isInteger(valore) && valore >= 1 && valore <= 99;
}

function eRuolo(valore: unknown): valore is RuoloTesseratoGara {
  return typeof valore === "string" && (RUOLI_TESSERATO as readonly string[]).includes(valore);
}

function leggiGiocatoreSalva(valore: unknown): GiocatoreSalvaRosa | undefined {
  if (!eOggetto(valore)) return undefined;
  const { numero, nome, cognome, capitano, libero } = valore;
  if (
    !eNumeroMaglia(numero) ||
    !eNomePersona(nome) ||
    !eNomePersona(cognome) ||
    typeof capitano !== "boolean" ||
    typeof libero !== "boolean"
  ) {
    return undefined;
  }
  return { numero, nome, cognome, capitano, libero };
}

function leggiTesseratoSalva(valore: unknown): TesseratoSalvaRosa | undefined {
  if (!eOggetto(valore)) return undefined;
  const { ruolo, nome } = valore;
  if (!eRuolo(ruolo) || !eNomePersona(nome)) return undefined;
  return { ruolo, nome };
}

function leggiElenco<T>(valore: unknown, legge: (v: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(valore)) return undefined;
  const risultato: T[] = [];
  for (const v of valore as unknown[]) {
    const letto = legge(v);
    if (letto === undefined) return undefined;
    risultato.push(letto);
  }
  return risultato;
}

function leggiRosaGara(valore: unknown): RosaGara | undefined {
  if (!eOggetto(valore)) return undefined;
  const versione = valore["versione"];
  if (!eInteroNonNegativo(versione)) return undefined;
  const giocatori = leggiElenco<GiocatoreRosaGara>(valore["giocatori"], (v) => {
    if (!eOggetto(v)) return undefined;
    const id = v["id"];
    const g = leggiGiocatoreSalva(v);
    return eTesto(id) && g !== undefined ? { id, ...g } : undefined;
  });
  const tesserati = leggiElenco<TesseratoRosaGara>(valore["tesserati"], (v) => {
    if (!eOggetto(v)) return undefined;
    const id = v["id"];
    const t = leggiTesseratoSalva(v);
    return eTesto(id) && t !== undefined ? { id, ...t } : undefined;
  });
  if (giocatori === undefined || tesserati === undefined) return undefined;
  return { versione, giocatori, tesserati };
}

/** Legge un corpo JSON come risposta delle rose; `undefined` se non lo e'. */
export function leggiRose(corpo: unknown): RispostaRose | undefined {
  if (!eOggetto(corpo)) return undefined;
  const casa = leggiRosaGara(corpo["casa"]);
  const ospite = leggiRosaGara(corpo["ospite"]);
  return casa === undefined || ospite === undefined ? undefined : { casa, ospite };
}

/** Legge un corpo JSON come richiesta di salvataggio della rosa; `undefined` se non lo e'. */
export function leggiRichiestaSalvaRosa(corpo: unknown): RichiestaSalvaRosa | undefined {
  if (!eOggetto(corpo)) return undefined;
  const { versioneBase, idModifica } = corpo;
  if (!eInteroNonNegativo(versioneBase) || typeof idModifica !== "string" || !UUID.test(idModifica)) {
    return undefined;
  }
  const giocatori = leggiElenco(corpo["giocatori"], leggiGiocatoreSalva);
  const tesserati = leggiElenco(corpo["tesserati"], leggiTesseratoSalva);
  if (giocatori === undefined || tesserati === undefined) return undefined;
  return { versioneBase, idModifica, giocatori, tesserati };
}

/** Legge un corpo JSON come risposta del salvataggio; `undefined` se non lo e'. */
export function leggiRispostaSalvaRosa(corpo: unknown): RispostaSalvaRosa | undefined {
  if (!eOggetto(corpo)) return undefined;
  const versione = corpo["versione"];
  return eInteroNonNegativo(versione) ? { versione } : undefined;
}

/**
 * Corpo di `PUT /api/tablet/v1/gare/{garaId}/risultati-set/{numeroSet}?epoca=N`
 * (story 4.1): risultato di un set chiuso. `seqFinale` e' il `seq` dell'evento
 * `FINE_SET` nel registro `registroId`; il server tiene il piu' alto.
 */
export interface RichiestaRisultatoSet {
  readonly registroId: string;
  readonly casa: number;
  readonly ospite: number;
  readonly seqFinale: number;
}

/** Risposta dell'invio: la riga salvata sul server (puo' essere piu' recente di quella inviata). */
export interface RispostaRisultatoSet {
  readonly numeroSet: number;
  readonly casa: number;
  readonly ospite: number;
  readonly seqFinale: number;
}

function ePunteggio(valore: unknown): valore is number {
  return typeof valore === "number" && Number.isSafeInteger(valore) && valore >= 0 && valore <= 99;
}

/** Legge un corpo JSON come richiesta di risultato del set; `undefined` se non lo e'. */
export function leggiRichiestaRisultatoSet(corpo: unknown): RichiestaRisultatoSet | undefined {
  if (!eOggetto(corpo)) return undefined;
  const { registroId, casa, ospite, seqFinale } = corpo;
  if (
    typeof registroId !== "string" ||
    !UUID.test(registroId) ||
    !ePunteggio(casa) ||
    !ePunteggio(ospite) ||
    !eInteroPositivo(seqFinale)
  ) {
    return undefined;
  }
  return { registroId, casa, ospite, seqFinale };
}

/** Legge un corpo JSON come risposta del risultato del set; `undefined` se non lo e'. */
export function leggiRispostaRisultatoSet(corpo: unknown): RispostaRisultatoSet | undefined {
  if (!eOggetto(corpo)) return undefined;
  const { numeroSet, casa, ospite, seqFinale } = corpo;
  if (
    !eInteroPositivo(numeroSet) ||
    numeroSet > 5 ||
    !ePunteggio(casa) ||
    !ePunteggio(ospite) ||
    !eInteroPositivo(seqFinale)
  ) {
    return undefined;
  }
  return { numeroSet, casa, ospite, seqFinale };
}
