// Logica pura della verifica di sicurezza dell'API tablet (story 2.8, AD-17).
// Nessun IO qui: il runner (../verifica-sicurezza-tablet.mjs) fa le chiamate
// e passa i risultati a queste funzioni, testate in logica.test.ts.

/** @typedef {"negata" | "vuota" | "non-verificabile" | "letta"} EsitoLettura */

const CODICI_NEGATI = new Set([401, 403, 404]);

/**
 * Classifica una lettura PostgREST di una tabella o vista.
 * - negata: errore HTTP di accesso, o codice Postgres 42501 nel corpo;
 * - letta: almeno una riga restituita (fallimento);
 * - vuota: `[]` mentre nel database la tabella ha righe (RLS che filtra);
 * - non-verificabile: `[]` e tabella vuota, oppure risposta inattesa.
 * @param {{ status: number, corpo: unknown, righeNelDb: number }} lettura
 * @returns {EsitoLettura}
 */
export function classificaLettura({ status, corpo, righeNelDb }) {
  if (Array.isArray(corpo) && status >= 200 && status < 300) {
    if (corpo.length > 0) return "letta";
    return righeNelDb > 0 ? "vuota" : "non-verificabile";
  }
  if (CODICI_NEGATI.has(status)) return "negata";
  if (corpo && typeof corpo === "object" && /** @type {{ code?: unknown }} */ (corpo).code === "42501") {
    return "negata";
  }
  return "non-verificabile";
}

/**
 * Classifica l'elenco degli oggetti di un bucket Storage. Ogni elenco non
 * vuoto e' una lettura riuscita, anche per i bucket marcati pubblici: il flag
 * public riguarda il download per URL, l'elenco dipende dalle policy su
 * storage.objects, che e' proprio cio' che si verifica. Negata solo con
 * 401/403/404 (anche quando Storage li riporta nel corpo con HTTP 400).
 * @param {{ status: number, corpo: unknown, oggettiNelDb: number }} lettura
 * @returns {EsitoLettura}
 */
export function classificaBucket({ status, corpo, oggettiNelDb }) {
  if (Array.isArray(corpo) && status >= 200 && status < 300) {
    if (corpo.length > 0) return "letta";
    return oggettiNelDb > 0 ? "vuota" : "non-verificabile";
  }
  if (CODICI_NEGATI.has(status)) return "negata";
  const codiceNelCorpo =
    corpo && typeof corpo === "object" ? Number(/** @type {{ statusCode?: unknown }} */ (corpo).statusCode) : NaN;
  if (CODICI_NEGATI.has(codiceNelCorpo)) return "negata";
  return "non-verificabile";
}

/**
 * Confronta i garaId restituiti dall'API con quelli assegnati nel database.
 * @param {readonly string[]} api
 * @param {readonly string[]} db
 * @returns {{ ok: boolean, inPiu: string[], mancanti: string[] }}
 */
export function confrontaGare(api, db) {
  const attese = new Set(db);
  const ricevute = new Set(api);
  const inPiu = [...ricevute].filter((id) => !attese.has(id)).sort();
  const mancanti = [...attese].filter((id) => !ricevute.has(id)).sort();
  const duplicate = api.length !== ricevute.size;
  return { ok: inPiu.length === 0 && mancanti.length === 0 && !duplicate, inPiu, mancanti };
}

/**
 * @typedef {{ voce: string, chi: string, esito: EsitoLettura | "ok" | "fallita", dettaglio?: string }} Controllo
 */

/**
 * Fallimenti: letture riuscite e controlli falliti.
 * @param {readonly Controllo[]} controlli
 * @returns {Controllo[]}
 */
export function fallimenti(controlli) {
  return controlli.filter((c) => c.esito === "letta" || c.esito === "fallita");
}

/**
 * 0 senza fallimenti, 1 con almeno un fallimento.
 * @param {readonly Controllo[]} controlli
 */
export function codiceUscita(controlli) {
  return fallimenti(controlli).length === 0 ? 0 : 1;
}

/**
 * Riepilogo testuale: conteggi per esito e l'elenco dei fallimenti e delle
 * voci non verificabili. Mai righe lette, token o password.
 * @param {readonly Controllo[]} controlli
 * @param {readonly string[]} daRivedere funzioni eseguibili dai ruoli client
 * @returns {string}
 */
export function riepilogo(controlli, daRivedere = []) {
  /** @type {Record<string, number>} */
  const conteggi = {};
  for (const c of controlli) conteggi[c.esito] = (conteggi[c.esito] ?? 0) + 1;
  const righe = [
    "RIEPILOGO",
    ...["ok", "negata", "vuota", "non-verificabile", "letta", "fallita"]
      .filter((e) => conteggi[e])
      .map((e) => `  ${e}: ${conteggi[e]}`),
  ];
  const ko = fallimenti(controlli);
  if (ko.length > 0) {
    righe.push("", "FALLIMENTI");
    for (const c of ko) righe.push(`  ${c.voce} [${c.chi}] ${c.esito}${c.dettaglio ? ` - ${c.dettaglio}` : ""}`);
  }
  const nv = controlli.filter((c) => c.esito === "non-verificabile");
  if (nv.length > 0) {
    righe.push("", "NON VERIFICABILI (vuote o risposta inattesa)");
    for (const c of nv) righe.push(`  ${c.voce} [${c.chi}]${c.dettaglio ? ` - ${c.dettaglio}` : ""}`);
  }
  if (daRivedere.length > 0) {
    righe.push("", "FUNZIONI DA RIVEDERE (eseguibili da anon/authenticated, non chiamate)");
    for (const f of daRivedere) righe.push(`  ${f}`);
  }
  righe.push("", ko.length === 0 ? "ESITO: nessuna lettura riuscita" : `ESITO: ${ko.length} fallimenti`);
  return righe.join("\n");
}

/**
 * Legge un file .env: righe CHIAVE=valore, commenti e righe vuote ignorati,
 * \r e virgolette esterne tolti. L'ultima occorrenza vince.
 * @param {string} testo
 * @returns {Record<string, string>}
 */
export function leggiEnv(testo) {
  /** @type {Record<string, string>} */
  const valori = {};
  for (const grezza of testo.split("\n")) {
    const riga = grezza.replace(/\r$/, "").trim();
    if (!riga || riga.startsWith("#")) continue;
    const uguale = riga.indexOf("=");
    if (uguale <= 0) continue;
    const chiave = riga.slice(0, uguale).trim();
    let valore = riga.slice(uguale + 1).trim();
    if (valore.length >= 2 && (valore[0] === '"' || valore[0] === "'") && valore.endsWith(valore[0])) {
      valore = valore.slice(1, -1);
    }
    valori[chiave] = valore;
  }
  return valori;
}

/**
 * Cita un identificatore Postgres ("nome" con le virgolette raddoppiate).
 * @param {string} nome
 */
export function citaIdentificatore(nome) {
  return `"${nome.replace(/"/g, '""')}"`;
}
