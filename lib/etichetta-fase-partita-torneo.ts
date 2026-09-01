import type { FaseTorneo, GironeTorneo, TabelloneTorneo } from "@prisma/client";
import { ETICHETTA_GIRONE } from "./girone-torneo";
import { TABELLONI_TORNEO } from "./tabelloni-torneo";

// Story 20.19 (Epic 20, Torneo Memorial): unica fonte di verita' per
// l'etichetta "Fase/Girone" di un incontro, usata dalla vista tabellare di
// tutti gli incontri di una Categoria (TabellaIncontriCategoria.tsx) - una
// riga di quella tabella copre sia incontri di Girone sia Semifinali/Finali,
// che oggi vivono in sezioni grafiche separate (etichettate rispettivamente
// da girone.label e da .categoria nelle match-card di app/torneo/page.tsx)
// senza un'unica funzione che le derivi insieme da una PartitaTorneo.
// Nessun import "server-only": funzione pura, nessun IO (mirror di
// formattaRisultatoPartitaTorneo, lib/risultato-partita-torneo.ts).
export function etichettaFasePartitaTorneo(partita: {
  fase: FaseTorneo;
  tabellone: TabelloneTorneo | null;
  squadraCasa: { girone: GironeTorneo };
}): string {
  if (partita.fase === "GIRONE") {
    return ETICHETTA_GIRONE[partita.squadraCasa.girone];
  }

  const tabelloneInfo = TABELLONI_TORNEO.find((t) => t.value === partita.tabellone);

  if (partita.fase === "SEMIFINALE") {
    return tabelloneInfo ? `Semifinale (${tabelloneInfo.label})` : "Semifinale";
  }
  if (partita.fase === "FINALE_VINCENTI") {
    return tabelloneInfo?.etichettaVincenti ?? "Finale";
  }
  // FINALE_PERDENTI: unico caso rimasto dell'enum chiuso FaseTorneo.
  return tabelloneInfo?.etichettaPerdenti ?? "Finale";
}
