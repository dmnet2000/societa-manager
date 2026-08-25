import type { PartitaTorneo, SquadraTorneo } from "@prisma/client";
import { esitoPartita, haRisultatoCompleto } from "./risultato-partita-torneo";

// Story 20.3 (Epic 20, Torneo Memorial): calcolo puro della classifica di un
// girone - MAI persistita (nessuna colonna/tabella "classifica" in
// prisma/schema.prisma), sempre ricalcolata al volo da qui a partire dalle
// PartitaTorneo con risultato completo (spec-20-3 Boundaries/Design Notes:
// stesso principio "mai una seconda fonte di verita'" gia' seguito nel
// progetto). Nessun import "server-only": funzione pura, senza IO.
export type RigaClassifica = {
  squadra: SquadraTorneo;
  punti: number;
  setVinti: number;
  setPersi: number;
  partiteGiocate: number;
};

// squadre: le Squadre di UN girone (gia' filtrate dal chiamante). partite:
// le PartitaTorneo della stessa Categoria (qualunque fase/girone, non
// importa - filtrate da questa funzione stessa, vedi sotto) - questa
// funzione scarta da sola le partite di fase diversa da GIRONE (Story 20.4:
// semifinali/finali cross-girone non devono mai contaminare una classifica
// di girone), quelle senza risultato completo, e quelle i cui protagonisti
// non sono in "squadre".
export function calcolaClassificaGirone(
  squadre: SquadraTorneo[],
  partite: PartitaTorneo[]
): RigaClassifica[] {
  const righePerSquadra = new Map<string, RigaClassifica>();
  for (const squadra of squadre) {
    righePerSquadra.set(squadra.id, {
      squadra,
      punti: 0,
      setVinti: 0,
      setPersi: 0,
      partiteGiocate: 0,
    });
  }

  for (const partita of partite) {
    // Review fix (Verification Gap Reviewer, Story 20.4): filtro su
    // "fase === GIRONE" spostato QUI dentro (prima viveva solo nella pagina
    // chiamante, senza alcun test capace di intercettare una regressione) -
    // ora la funzione si difende da sola indipendentemente da cosa le passa
    // il chiamante, invece di fidarsi che il filtro a monte sia corretto.
    if (partita.fase !== "GIRONE") continue;
    const rigaCasa = righePerSquadra.get(partita.squadraCasaId);
    const rigaOspite = righePerSquadra.get(partita.squadraOspiteId);
    if (!rigaCasa || !rigaOspite) continue;
    if (!haRisultatoCompleto(partita)) continue;

    const { setVintiCasa, setVintiOspite, puntiCasa, puntiOspite } = esitoPartita(
      { casa: partita.set1Casa as number, ospite: partita.set1Ospite as number },
      { casa: partita.set2Casa as number, ospite: partita.set2Ospite as number },
      partita.set3Casa !== null && partita.set3Ospite !== null
        ? { casa: partita.set3Casa, ospite: partita.set3Ospite }
        : undefined
    );

    rigaCasa.punti += puntiCasa;
    rigaCasa.setVinti += setVintiCasa;
    rigaCasa.setPersi += setVintiOspite;
    rigaCasa.partiteGiocate += 1;

    rigaOspite.punti += puntiOspite;
    rigaOspite.setVinti += setVintiOspite;
    rigaOspite.setPersi += setVintiCasa;
    rigaOspite.partiteGiocate += 1;
  }

  // Ordinamento: punti totali desc, spareggio per set vinti desc (AC di
  // epics.md Story 20.3), poi nome alfabetico come ultimo spareggio
  // deterministico (mirror lib/ordina-certificati-per-stato.ts).
  return [...righePerSquadra.values()].sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti;
    if (b.setVinti !== a.setVinti) return b.setVinti - a.setVinti;
    return a.squadra.nome.localeCompare(b.squadra.nome, "it");
  });
}
