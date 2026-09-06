// Story 20.24 (Epic 20, Torneo Memorial): ordinamento a click sulle
// intestazioni della "vista tabellare completa" di una Categoria
// (TabellaIncontriCategoria.tsx, pagina pubblica /torneo, Story 20.19) -
// mirror strutturale di ordina-partite-per-slot.ts (Story 20.17), stessa
// disciplina "funzione pura, testata, nessuna richiesta server-side".
//
// Le colonne fase/risultato NON reimplementano una propria formattazione:
// riusano etichettaFasePartitaTorneo/formattaRisultatoPartitaTorneo (gia'
// esistenti, stesse funzioni chiamate da TabellaIncontriCategoria.tsx per il
// testo di cella) - ordinare sullo stesso testo mostrato, mai una seconda
// fonte di verita' per la stessa stringa (spec-20-24 Boundaries).
import type { FaseTorneo, GironeTorneo, TabelloneTorneo } from "@prisma/client";
import { etichettaFasePartitaTorneo } from "./etichetta-fase-partita-torneo";
import { formattaRisultatoPartitaTorneo, type PartitaConRisultato } from "./risultato-partita-torneo";

export type ColonnaOrdinamentoIncontri =
  | "numero"
  | "fase"
  | "squadraCasa"
  | "squadraOspite"
  | "risultato"
  | "slot";

export type DirezioneOrdinamentoIncontri = "asc" | "desc";

// Unica fonte di verita' per il testo "nessun risultato ancora" - riusata sia
// qui (ordinamento sulla colonna Risultato) sia dalla cella mostrata in
// TabellaIncontriCategoria.tsx, mai due letterali "In programma" da tenere
// allineati a mano.
export const ETICHETTA_RISULTATO_MANCANTE = "In programma";

export type Ordinamento = {
  colonna: ColonnaOrdinamentoIncontri;
  direzione: DirezioneOrdinamentoIncontri;
};

// Review fix (Verification Gap Reviewer, spec-20-24): estratta da
// TabellaIncontriCategoria.tsx (era logica inline dentro l'handler
// `ordinaPer`, non testata) - decide il prossimo stato di ordinamento dato
// lo stato attuale e la colonna appena cliccata (spec-20-24 Boundaries):
// nessun ordinamento attivo o colonna diversa da quella attiva -> nuova
// colonna, crescente; stessa colonna gia' attiva -> toggle della direzione.
// Funzione pura, testata direttamente qui (mirror della stessa disciplina
// gia' in uso in questo file), nessun harness di test per componenti React
// necessario.
export function prossimoOrdinamento(
  attuale: Ordinamento | null,
  colonna: ColonnaOrdinamentoIncontri
): Ordinamento {
  if (attuale?.colonna === colonna) {
    return { colonna, direzione: attuale.direzione === "asc" ? "desc" : "asc" };
  }
  return { colonna, direzione: "asc" };
}

type PartitaOrdinabile = PartitaConRisultato & {
  numero: number;
  fase: FaseTorneo;
  tabellone: TabelloneTorneo | null;
  squadraCasa: { nome: string; girone: GironeTorneo };
  squadraOspite: { nome: string };
  slotTorneo: { data: string; ora: string } | null;
};

// Comparatore dedicato alla colonna "slot" (Quando/Dove): riusa la stessa
// regola "senza Slot sempre in fondo" gia' stabilita da ordinaPartitePerSlot
// (lib/ordina-partite-per-slot.ts) - a differenza delle altre colonne, qui la
// direzione NON si applica invertendo semplicemente il segno del confronto:
// un incontro senza Slot resta sempre ultimo, sia in ordine crescente sia
// decrescente (spec-20-24 Boundaries, riga "Quando/Dove" della I/O matrix).
function confrontaSlot(
  a: PartitaOrdinabile,
  b: PartitaOrdinabile,
  direzione: DirezioneOrdinamentoIncontri
): number {
  if (!a.slotTorneo && !b.slotTorneo) return 0;
  if (!a.slotTorneo) return 1;
  if (!b.slotTorneo) return -1;

  const diffData = a.slotTorneo.data.localeCompare(b.slotTorneo.data);
  const diff = diffData !== 0 ? diffData : a.slotTorneo.ora.localeCompare(b.slotTorneo.ora);
  return direzione === "asc" ? diff : -diff;
}

export function ordinaIncontriPerColonna<T extends PartitaOrdinabile>(
  partite: T[],
  colonna: ColonnaOrdinamentoIncontri,
  direzione: DirezioneOrdinamentoIncontri
): T[] {
  const segno = direzione === "asc" ? 1 : -1;

  return [...partite].sort((a, b) => {
    switch (colonna) {
      case "numero":
        return segno * (a.numero - b.numero);
      case "fase":
        return (
          segno *
          etichettaFasePartitaTorneo(a).localeCompare(etichettaFasePartitaTorneo(b), "it")
        );
      case "squadraCasa":
        return segno * a.squadraCasa.nome.localeCompare(b.squadraCasa.nome, "it");
      case "squadraOspite":
        return segno * a.squadraOspite.nome.localeCompare(b.squadraOspite.nome, "it");
      case "risultato":
        return (
          segno *
          (formattaRisultatoPartitaTorneo(a) ?? ETICHETTA_RISULTATO_MANCANTE).localeCompare(
            formattaRisultatoPartitaTorneo(b) ?? ETICHETTA_RISULTATO_MANCANTE,
            "it"
          )
        );
      case "slot":
        return confrontaSlot(a, b, direzione);
      default: {
        const _mai: never = colonna;
        return _mai;
      }
    }
  });
}
