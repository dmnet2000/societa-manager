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
  // Story 20.16 (Epic 20, Torneo Memorial): somma dei punteggi-set grezzi
  // (esitoPartita().puntiFattiCasa/puntiFattiOspite) - usati per il terzo
  // criterio di spareggio (quoziente punti), distinti dalla colonna "Punti"
  // esistente (punteggio 3/2/1/0 dell'incontro, invariata).
  puntiFatti: number;
  puntiSubiti: number;
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
      puntiFatti: 0,
      puntiSubiti: 0,
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

    const { setVintiCasa, setVintiOspite, puntiCasa, puntiOspite, puntiFattiCasa, puntiFattiOspite } =
      esitoPartita(
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
    rigaCasa.puntiFatti += puntiFattiCasa;
    rigaCasa.puntiSubiti += puntiFattiOspite;

    rigaOspite.punti += puntiOspite;
    rigaOspite.setVinti += setVintiOspite;
    rigaOspite.setPersi += setVintiCasa;
    rigaOspite.partiteGiocate += 1;
    rigaOspite.puntiFatti += puntiFattiOspite;
    rigaOspite.puntiSubiti += puntiFattiCasa;
  }

  // Story 20.16: quoziente set (setVinti/setPersi) sostituisce i set vinti
  // assoluti come secondo criterio di spareggio, quoziente punti
  // (puntiFatti/puntiSubiti) aggiunto come terzo criterio, prima del
  // fallback alfabetico invariato (Story 20.3). Un denominatore zero rende
  // il quoziente Infinity (mai una divisione per zero non gestita) - il
  // confronto e' per disuguaglianza (!==) prima della sottrazione perche'
  // Infinity - Infinity produce NaN, che romperebbe silenziosamente
  // Array.sort quando entrambe le squadre a confronto hanno denominatore
  // zero sullo stesso criterio (spec-20-16 Design Notes).
  const quozienteSet = (r: RigaClassifica) => (r.setPersi === 0 ? Infinity : r.setVinti / r.setPersi);
  const quozientePunti = (r: RigaClassifica) =>
    r.puntiSubiti === 0 ? Infinity : r.puntiFatti / r.puntiSubiti;

  return [...righePerSquadra.values()].sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti;
    const qsA = quozienteSet(a);
    const qsB = quozienteSet(b);
    if (qsB !== qsA) return qsB - qsA;
    const qpA = quozientePunti(a);
    const qpB = quozientePunti(b);
    if (qpB !== qpA) return qpB - qpA;
    return a.squadra.nome.localeCompare(b.squadra.nome, "it");
  });
}
