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
