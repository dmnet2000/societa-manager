import type { GiocatoreSalvaRosa, TesseratoSalvaRosa } from "@/lib/api-tablet/contratto";

// Referto elettronico, story 3.9: lettura pura del modulo "Rosa" del sito.
// Campi indicizzati: g<i>_numero, g<i>_nome, g<i>_cognome, g<i>_capitano,
// g<i>_libero, t<i>_ruolo, t<i>_nome. Una riga tutta vuota si ignora. Nessun
// accesso al database; mai nomi nei log. Le etichette di errore usano la
// posizione della riga nel modulo (indice + 1).

export const RUOLI_TESSERATO = ["A", "VA", "M", "FT", "D"] as const;
export const LUNGHEZZA_MAX_NOME = 60;

export type RigaGiocatoreTesto = {
  numero: string;
  nome: string;
  cognome: string;
  capitano: boolean;
  libero: boolean;
};
export type RigaTesseratoTesto = { ruolo: string; nome: string };

export type InseritiRosa = { giocatori: RigaGiocatoreTesto[]; tesserati: RigaTesseratoTesto[] };

export type EsitoModuloRosa =
  | { giocatori: GiocatoreSalvaRosa[]; tesserati: TesseratoSalvaRosa[]; inseriti: InseritiRosa }
  | { errori: string[]; inseriti: InseritiRosa };

type Lettore = { keys(): Iterable<string>; get(nome: string): unknown };

function indici(formData: Lettore, prefisso: "g" | "t"): number[] {
  const re = new RegExp(`^${prefisso}([0-9]+)_`);
  const trovati = new Set<number>();
  for (const k of formData.keys()) {
    const m = re.exec(k);
    if (m) trovati.add(Number(m[1]));
  }
  return [...trovati].sort((a, b) => a - b);
}

function testo(formData: Lettore, nome: string): string {
  const v = formData.get(nome);
  return typeof v === "string" ? v : "";
}

export function leggiModuloRosa(formData: Lettore): EsitoModuloRosa {
  const inseriti: InseritiRosa = { giocatori: [], tesserati: [] };
  const giocatori: GiocatoreSalvaRosa[] = [];
  const tesserati: TesseratoSalvaRosa[] = [];
  const errori: string[] = [];

  for (const i of indici(formData, "g")) {
    const riga: RigaGiocatoreTesto = {
      numero: testo(formData, `g${i}_numero`),
      nome: testo(formData, `g${i}_nome`),
      cognome: testo(formData, `g${i}_cognome`),
      capitano: formData.get(`g${i}_capitano`) !== null,
      libero: formData.get(`g${i}_libero`) !== null,
    };
    const nome = riga.nome.trim();
    const cognome = riga.cognome.trim();
    const numeroTesto = riga.numero.trim();
    const vuota = !numeroTesto && !nome && !cognome && !riga.capitano && !riga.libero;
    inseriti.giocatori.push(riga);
    if (vuota) continue;
    const etichetta = `Giocatore ${i + 1}`;
    const numero = /^\d{1,2}$/.test(numeroTesto) ? Number(numeroTesto) : NaN;
    let ok = true;
    if (!(numero >= 1 && numero <= 99)) {
      errori.push(`${etichetta}: il numero di maglia deve essere da 1 a 99.`);
      ok = false;
    }
    if (nome.length < 1 || nome.length > LUNGHEZZA_MAX_NOME) {
      errori.push(`${etichetta}: il nome è obbligatorio (massimo ${LUNGHEZZA_MAX_NOME} caratteri).`);
      ok = false;
    }
    if (cognome.length < 1 || cognome.length > LUNGHEZZA_MAX_NOME) {
      errori.push(`${etichetta}: il cognome è obbligatorio (massimo ${LUNGHEZZA_MAX_NOME} caratteri).`);
      ok = false;
    }
    if (ok) giocatori.push({ numero, nome, cognome, capitano: riga.capitano, libero: riga.libero });
  }

  for (const i of indici(formData, "t")) {
    const riga: RigaTesseratoTesto = {
      ruolo: testo(formData, `t${i}_ruolo`),
      nome: testo(formData, `t${i}_nome`),
    };
    const nome = riga.nome.trim();
    inseriti.tesserati.push(riga);
    // Una riga si ignora solo se ruolo e nome sono entrambi vuoti.
    if (!nome && riga.ruolo === "") continue;
    const etichetta = `Tesserato ${i + 1}`;
    let ok = true;
    if (!(RUOLI_TESSERATO as readonly string[]).includes(riga.ruolo)) {
      errori.push(`${etichetta}: il ruolo non è valido.`);
      ok = false;
    }
    if (nome.length < 1 || nome.length > LUNGHEZZA_MAX_NOME) {
      errori.push(`${etichetta}: il nome è obbligatorio (massimo ${LUNGHEZZA_MAX_NOME} caratteri).`);
      ok = false;
    }
    if (ok) tesserati.push({ ruolo: riga.ruolo as TesseratoSalvaRosa["ruolo"], nome });
  }

  if (errori.length > 0) return { errori, inseriti };
  return { giocatori, tesserati, inseriti };
}
