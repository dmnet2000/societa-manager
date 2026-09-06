import type { GironeTorneo } from "@prisma/client";
import { ETICHETTA_GIRONE } from "./girone-torneo";
import { TABELLONI_TORNEO } from "./tabelloni-torneo";

// Story 20.20 (Epic 20, Torneo Memorial): prospetto ipotetico di sola
// lettura mostrato nel ramo "tabellone non ancora generato" di
// tabellone/page.tsx - MAI una PartitaTorneo creata/modificata, MAI una
// chiamata a generaTabelloneAction (spec-20-20 Boundaries "Always").
// Funzione pura, nessun import "server-only": riceve solo i due conteggi
// di Squadre per Girone (gia' caricati dal chiamante), nessuna query
// propria.
export type AccoppiamentoIpotetico = {
  etichetta: string;
  casa: string;
  ospite: string;
};

export type SezioneProspettoIpotetico = {
  titolo: string;
  // Vuoto per la finalina diretta del formato 6 (nessuna semifinale in
  // quel caso, spec-20-20 Design Notes).
  semifinali: AccoppiamentoIpotetico[];
  finali: AccoppiamentoIpotetico[];
};

// Placeholder testuale di posizione ("1° Girone A" ecc.) - riusa
// ETICHETTA_GIRONE (lib/girone-torneo.ts), mai una stringa letterale
// "Girone A"/"Girone B" duplicata qui. Review fix (Verification Gap
// Reviewer): il parametro usa GironeTorneo (@prisma/client), lo stesso tipo
// gia' usato da ETICHETTA_GIRONE per le stesse chiavi, invece di un union
// letterale locale che potrebbe disallinearsi dall'enum Prisma.
function posizione(n: number, girone: GironeTorneo): string {
  return `${n}° ${ETICHETTA_GIRONE[girone]}`;
}

// Review fix (Blind Hunter): cerca la riga per .value, MAI per indice - un
// riordino futuro di TABELLONI_TORNEO (lib/tabelloni-torneo.ts) non deve
// poter etichettare silenziosamente il tabellone sbagliato.
function trovaTabellone(value: "POSIZIONI_1_4" | "POSIZIONI_5_8") {
  const tabellone = TABELLONI_TORNEO.find((t) => t.value === value);
  if (!tabellone) {
    throw new Error(`Tabellone "${value}" non trovato in TABELLONI_TORNEO.`);
  }
  return tabellone;
}

// Review fix (Blind Hunter): sezionePosizioni1_4/sezionePosizioni5_8Formato8
// erano quasi identiche (stessa forma - 2 semifinali da 2 coppie di
// posizione, 2 finali da etichettaVincenti/etichettaPerdenti - diverse solo
// per il tabellone di riferimento e i numeri di posizione) - accorpate in
// un unico helper parametrizzato. Incrocio letterale mirror di
// generaTabelloneAction (app/app/(torneo)/torneo/actions.ts): SF1
// posizioneAlta°A-posizioneBassa°B, SF2 posizioneAlta°B-posizioneBassa°A
// (1/2 per il tabellone 1°-4°, 3/4 per il 5°-8°); poi Finale vincenti tra i
// vincitori ipotetici delle 2 semifinali, Finale perdenti tra i perdenti
// ipotetici - etichette sempre riusate da TABELLONI_TORNEO (stessa fonte
// della vista reale), mai una stringa duplicata qui.
function sezioneTabelloneFormato8(
  tabelloneValue: "POSIZIONI_1_4" | "POSIZIONI_5_8",
  posizioneAlta: number,
  posizioneBassa: number
): SezioneProspettoIpotetico {
  const tabellone = trovaTabellone(tabelloneValue);
  return {
    titolo: tabellone.label,
    semifinali: [
      {
        etichetta: "Semifinale 1",
        casa: posizione(posizioneAlta, "GIRONE_A"),
        ospite: posizione(posizioneBassa, "GIRONE_B"),
      },
      {
        etichetta: "Semifinale 2",
        casa: posizione(posizioneAlta, "GIRONE_B"),
        ospite: posizione(posizioneBassa, "GIRONE_A"),
      },
    ],
    finali: [
      {
        etichetta: tabellone.etichettaVincenti,
        casa: "Vincente semifinale 1",
        ospite: "Vincente semifinale 2",
      },
      {
        etichetta: tabellone.etichettaPerdenti,
        casa: "Perdente semifinale 1",
        ospite: "Perdente semifinale 2",
      },
    ],
  };
}

// Tabellone 1°-4°: identico nei due formati (3 o 4 Squadre/Girone), perche'
// dipende solo dal 1°/2° classificato di ciascun Girone - posizioni che
// esistono in entrambi (spec-20-20 Design Notes).
function sezionePosizioni1_4(): SezioneProspettoIpotetico {
  return sezioneTabelloneFormato8("POSIZIONI_1_4", 1, 2);
}

// Formato 8 (4+4 Squadre): tabellone 5°-8° completo, stesso schema di
// generaTabelloneAction.
function sezionePosizioni5_8(): SezioneProspettoIpotetico {
  return sezioneTabelloneFormato8("POSIZIONI_5_8", 3, 4);
}

// Formato 6 (3+3 Squadre): con 3 Squadre/Girone non esiste un 4°
// classificato - il 5°-6° posto e' quindi gia' una finale diretta tra le
// sole due terze classificate, nessuna semifinale (spec-20-20 Design
// Notes). "Finalina 5°/6° posto" e' una nuova etichetta locale, non un
// TabelloneTorneo DB-backed (spec-20-20 Boundaries "Always") - questo
// formato non genera mai un vero tabellone a 6 (story futura).
function sezionePosizioni5_6Formato6(): SezioneProspettoIpotetico {
  const etichetta = "Finalina 5°/6° posto";
  return {
    titolo: etichetta,
    semifinali: [],
    finali: [{ etichetta, casa: posizione(3, "GIRONE_A"), ospite: posizione(3, "GIRONE_B") }],
  };
}

// spec-20-20 Boundaries "Always": formato dedotto SOLO dal conteggio
// Squadre per Girone - entrambi con esattamente 4 -> formato 8, entrambi
// con esattamente 3 -> formato 6, qualunque altra combinazione (gironi
// sbilanciati, altri conteggi, iscrizioni incomplete) -> null (nessun
// prospetto mostrato).
export function calcolaProspettoIpoteticoTorneo(
  numeroGironeA: number,
  numeroGironeB: number
): SezioneProspettoIpotetico[] | null {
  if (numeroGironeA === 4 && numeroGironeB === 4) {
    return [sezionePosizioni1_4(), sezionePosizioni5_8()];
  }
  if (numeroGironeA === 3 && numeroGironeB === 3) {
    return [sezionePosizioni1_4(), sezionePosizioni5_6Formato6()];
  }
  return null;
}
