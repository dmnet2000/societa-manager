// Story 18.35 (review): tipi e mappature pure della "riga partita" Match Week
// (app/RigaPartita.tsx). Le mappature riga -> props vivono qui, non inline
// nelle pagine, per essere testabili senza DB ne' render: una props
// scambiata (es. risultato al posto dello stato, indirizzo al posto del nome
// palestra) verrebbe altrimenti notata solo dal vivo.
import type { RisultatoSettimanaScorsa } from "./sincronizza-gare-fipav/vista-home-live";

// Default storico della match-card quando il Campionato non ha un colore
// (o ne ha uno in un formato inatteso).
export const COLORE_DEFAULT_RIGA = "#2e6f99";

export type DestraRigaPartita =
  | { tipo: "ora"; valore: string }
  | {
      tipo: "risultato";
      risultato: string | null;
      stato: string | null;
      // Orario della gara, mostrato in piccolo sotto il risultato.
      ora?: string | null;
    };

export type RigaPartitaProps = {
  data: string;
  campionatoNome: string;
  colore: string | null;
  squadraCasa: string;
  squadraOspite: string;
  impianto?: string | null;
  indirizzoImpianto?: string | null;
  destra: DestraRigaPartita;
};

// Normalizza Campionato.colore prima di usarlo come sfondo E per
// testoScuroSuSfondo, cosi' i due non possono divergere (es. " #FFF" con
// spazi: prima lo style inline lo accettava come bianco, mentre
// testoScuroSuSfondo lo rifiutava -> testo bianco su bianco).
// Accetta solo "#rrggbb" o "#rgb" (espanso), in minuscolo; altrimenti il
// default.
export function normalizzaColoreCampionato(colore: string | null | undefined): string {
  const valore = colore?.trim().toLowerCase() ?? "";
  if (/^#[0-9a-f]{6}$/.test(valore)) return valore;
  const breve = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(valore);
  if (breve) {
    const [, r, g, b] = breve;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return COLORE_DEFAULT_RIGA;
}

// Testo "significativo" o null: stringhe vuote o di soli spazi valgono come
// dato assente (fallback in piccolo nella colonna destra).
export function testoOppureNull(valore: string | null | undefined): string | null {
  const t = valore?.trim();
  return t ? t : null;
}

// Stessi campi del select Prisma di /calendario e della home "Partite della
// settimana" (tipo strutturale, nessun import di Prisma qui).
export type PartitaPerRiga = {
  data: string;
  ora: string;
  squadraCasa: string;
  squadraOspite: string;
  impianto: string | null;
  indirizzoImpianto: string | null;
  campionato: { nome: string; colore: string | null };
  // Richiesta utente 2026-10-01: /calendario (vista Elenco) e la home
  // "Partite della settimana" mostrano il risultato delle partite gia'
  // giocate. Opzionali: assenti = si mostra l'orario.
  risultato?: string | null;
  statoDescrizione?: string | null;
};

export function propsRigaDaPartita(partita: PartitaPerRiga): RigaPartitaProps {
  // Risultato presente (scritto dalla sincronizzazione FIPAV) -> a destra il
  // risultato a contorno con l'orario in piccolo sotto, come nei Risultati
  // della home; altrimenti l'orario. Nessun confronto con la data di oggi:
  // una partita passata senza risultato resta con l'orario.
  const destra: RigaPartitaProps["destra"] = testoOppureNull(partita.risultato)
    ? {
        tipo: "risultato",
        risultato: partita.risultato ?? null,
        stato: partita.statoDescrizione ?? null,
        ora: partita.ora,
      }
    : { tipo: "ora", valore: partita.ora };
  return {
    data: partita.data,
    campionatoNome: partita.campionato.nome,
    colore: partita.campionato.colore,
    squadraCasa: partita.squadraCasa,
    squadraOspite: partita.squadraOspite,
    impianto: partita.impianto,
    indirizzoImpianto: partita.indirizzoImpianto,
    destra,
  };
}

// Home "Risultati della settimana scorsa": dato live FIPAV, nessuna
// palestra/indirizzo.
export function propsRigaDaRisultato(riga: RisultatoSettimanaScorsa): RigaPartitaProps {
  return {
    data: riga.data,
    campionatoNome: riga.campionatoNome,
    colore: riga.campionatoColore,
    squadraCasa: riga.squadraCasa,
    squadraOspite: riga.squadraOspite,
    destra: {
      tipo: "risultato",
      risultato: riga.risultato,
      stato: riga.statoDescrizione,
      ora: riga.ora,
    },
  };
}
