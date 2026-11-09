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

/** Gara assegnata al tablet. Vuota nel tracer: i campi arrivano con la story 2.5. */
export type Gara = Readonly<Record<string, unknown>>;

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

/** Legge un corpo JSON come elenco gare; `undefined` se non lo e'. */
export function leggiGare(corpo: unknown): RispostaGare | undefined {
  if (!eOggetto(corpo) || !Array.isArray(corpo["gare"])) return undefined;
  const gare: unknown[] = corpo["gare"];
  if (!gare.every(eOggetto)) return undefined;
  return { gare: gare as readonly Gara[] };
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
