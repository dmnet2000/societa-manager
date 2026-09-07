import type { FaseTorneo, GironeTorneo, TabelloneTorneo } from "@prisma/client";
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
  // Story 20.21 (Epic 20, Torneo Memorial): metadati della riga - identifica
  // univocamente per quale (fase, tabellone, ordinale) reale
  // generaTabelloneAction/generaFinaliSeCompletate creerebbero la
  // PartitaTorneo corrispondente, servono a tabellone/page.tsx per montare
  // il form di prenotazione anticipata dello Slot su quella riga esatta
  // (PrenotaSlotIpoteticoForm.tsx). ordinale e' 1|2 per le due semifinali
  // dello stesso tabellone, null per le finali (un solo Slot, nessuna
  // ambiguita' - spec-20-21 Boundaries "Always"). Tutti e tre undefined
  // SOLO per la finalina diretta del formato 6 (sezionePosizioni5_6Formato6
  // sotto): quella riga non ha oggi alcun percorso di generazione reale
  // (spec-20-20 Never), quindi nessuna prenotazione ha senso li'.
  fase?: FaseTorneo;
  tabellone?: TabelloneTorneo;
  ordinale?: number | null;
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
        fase: "SEMIFINALE",
        tabellone: tabelloneValue,
        ordinale: 1,
      },
      {
        etichetta: "Semifinale 2",
        casa: posizione(posizioneAlta, "GIRONE_B"),
        ospite: posizione(posizioneBassa, "GIRONE_A"),
        fase: "SEMIFINALE",
        tabellone: tabelloneValue,
        ordinale: 2,
      },
    ],
    finali: [
      {
        etichetta: tabellone.etichettaVincenti,
        casa: "Vincente semifinale 1",
        ospite: "Vincente semifinale 2",
        fase: "FINALE_VINCENTI",
        tabellone: tabelloneValue,
        ordinale: null,
      },
      {
        etichetta: tabellone.etichettaPerdenti,
        casa: "Perdente semifinale 1",
        ospite: "Perdente semifinale 2",
        fase: "FINALE_PERDENTI",
        tabellone: tabelloneValue,
        ordinale: null,
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

// Review fix (3-layer review, Story 20.21 - Patch I): unica fonte di
// verita' per la regola "Categoria in formato 8 squadre (4+4)" - prima
// duplicata indipendentemente in tabellone/page.tsx (formatoOttoSquadre
// locale) e in prenotaSlotIpoteticoAction (app/app/(torneo)/torneo/actions.ts,
// controllo "numeroGironeA !== 4 || numeroGironeB !== 4"), stesso principio
// "unica fonte di verita'" gia' seguito da GIRONI_TORNEO/TABELLONI_TORNEO.
// Funzione pura, stesso trattamento di calcolaProspettoIpoteticoTorneo
// sotto (che la riusa) - riceve solo i due conteggi gia' caricati dal
// chiamante, nessuna query propria. Solo questo formato ha oggi un percorso
// di generazione reale del tabellone (spec-20-21 Design Notes:
// generaTabelloneAction richiede sempre >=4 Squadre in ENTRAMBI i gironi
// per generare qualunque riga, non solo il 5°-8°) - la prenotazione
// anticipata di uno Slot per una riga del prospetto ipotetico e' quindi
// disponibile solo qui.
export function formatoOttoSquadre(numeroGironeA: number, numeroGironeB: number): boolean {
  return numeroGironeA === 4 && numeroGironeB === 4;
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
  if (formatoOttoSquadre(numeroGironeA, numeroGironeB)) {
    return [sezionePosizioni1_4(), sezionePosizioni5_8()];
  }
  if (numeroGironeA === 3 && numeroGironeB === 3) {
    return [sezionePosizioni1_4(), sezionePosizioni5_6Formato6()];
  }
  return null;
}
