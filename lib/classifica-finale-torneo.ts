import type { PartitaTorneo, SquadraTorneo } from "@prisma/client";
import { esitoPartita, haRisultatoCompleto } from "./risultato-partita-torneo";

// Story 20.4 (Epic 20, Torneo Memorial): calcolo puro della classifica
// finale 1°-8° - MAI persistita (nessuna colonna/tabella "classifica
// finale" in prisma/schema.prisma), sempre ricalcolata al volo da qui a
// partire dalle 4 PartitaTorneo di finale, stesso principio di
// calcolaClassificaGirone (lib/classifica-girone-torneo.ts). Nessun import
// "server-only": funzione pura, senza IO.
export type PartitaTorneoConSquadre = PartitaTorneo & {
  squadraCasa: SquadraTorneo;
  squadraOspite: SquadraTorneo;
};

export type RigaClassificaFinale = {
  posizione: number;
  squadra: SquadraTorneo;
};

// Deriva vincitore/perdente di UNA finale gia' completa (chiamante
// verifica haRisultatoCompleto prima) - riusa esitoPartita
// (lib/risultato-partita-torneo.ts), nessuna seconda implementazione.
function vincitoreEPerdente(
  partita: PartitaTorneoConSquadre
): { vincitore: SquadraTorneo; perdente: SquadraTorneo } {
  const { setVintiCasa, setVintiOspite } = esitoPartita(
    { casa: partita.set1Casa as number, ospite: partita.set1Ospite as number },
    { casa: partita.set2Casa as number, ospite: partita.set2Ospite as number },
    partita.set3Casa !== null && partita.set3Ospite !== null
      ? { casa: partita.set3Casa, ospite: partita.set3Ospite }
      : undefined
  );

  return setVintiCasa > setVintiOspite
    ? { vincitore: partita.squadraCasa, perdente: partita.squadraOspite }
    : { vincitore: partita.squadraOspite, perdente: partita.squadraCasa };
}

// Review fix (Verification Gap Reviewer, Story 20.4): la firma originale
// prendeva due array gia' separati per tabellone dal chiamante
// (partiteTabellone1_4/partiteTabellone5_8, posizionali) - uno scambio dei
// due argomenti al call site (o un filtro sbagliato a monte) avrebbe
// silenziosamente invertito la classifica 1°-4° con la 5°-8°, senza che
// nessun test sulla funzione pura se ne accorgesse (i suoi stessi test
// passano sempre gli array gia' etichettati correttamente). Ora la funzione
// prende UN solo array con tutte le PartitaTorneo della Categoria (qualunque
// fase/tabellone, non importa) e deriva da sola quali righe appartengono a
// quale tabellone leggendo il campo "tabellone" dei dati stessi - lo scambio
// non e' piu' possibile perche' non c'e' piu' alcun argomento posizionale da
// scambiare. FINALE_VINCENTI di un tabellone decide 1°/2° posto di quel
// tabellone (5°/6° per il tabellone 5°-8°), FINALE_PERDENTI decide 3°/4°
// (7°/8°) - stesso schema letterale dell'AC di epics.md Story 20.4.
// spec-20-26 (formato 6, Epic 20): il tabellone 5°-8° in formato 6 non ha
// mai una FINALE_PERDENTI (spec-20-26 Boundaries "Always" - la finalina
// diretta e' l'UNICA partita di quel tabellone) - la sua assenza TOTALE
// nell'array e' quindi il segnale univoco del formato 6, distinto da
// "esiste ma incompleta" (formato 8, ancora in corso -> null). Restituisce
// una classifica 1-6 nel primo caso (formato 6, le altre 3 finali
// complete), null finche' le finali rilevanti per il formato effettivo non
// sono TUTTE complete, 1-8 quando anche FINALE_PERDENTI di POSIZIONI_5_8
// esiste ed e' completa (formato 8, comportamento invariato).
export function calcolaClassificaFinale(
  partite: PartitaTorneoConSquadre[]
): RigaClassificaFinale[] | null {
  const finaleVincenti1_4 = partite.find(
    (p) => p.tabellone === "POSIZIONI_1_4" && p.fase === "FINALE_VINCENTI"
  );
  const finalePerdenti1_4 = partite.find(
    (p) => p.tabellone === "POSIZIONI_1_4" && p.fase === "FINALE_PERDENTI"
  );
  const finaleVincenti5_8 = partite.find(
    (p) => p.tabellone === "POSIZIONI_5_8" && p.fase === "FINALE_VINCENTI"
  );
  const finalePerdenti5_8 = partite.find(
    (p) => p.tabellone === "POSIZIONI_5_8" && p.fase === "FINALE_PERDENTI"
  );

  if (
    !finaleVincenti1_4 ||
    !haRisultatoCompleto(finaleVincenti1_4) ||
    !finalePerdenti1_4 ||
    !haRisultatoCompleto(finalePerdenti1_4) ||
    !finaleVincenti5_8 ||
    !haRisultatoCompleto(finaleVincenti5_8)
  ) {
    return null;
  }

  const { vincitore: primo, perdente: secondo } = vincitoreEPerdente(finaleVincenti1_4);
  const { vincitore: terzo, perdente: quarto } = vincitoreEPerdente(finalePerdenti1_4);
  const { vincitore: quinto, perdente: sesto } = vincitoreEPerdente(finaleVincenti5_8);

  // Formato 6: nessuna FINALE_PERDENTI di POSIZIONI_5_8 esiste affatto per
  // questa Categoria - la finalina diretta appena risolta sopra e' l'unica
  // partita del tabellone 5°-8°, la classifica finale si ferma quindi al 6°
  // posto.
  if (!finalePerdenti5_8) {
    return [primo, secondo, terzo, quarto, quinto, sesto].map((squadra, index) => ({
      posizione: index + 1,
      squadra,
    }));
  }

  // Formato 8: la riga esiste ma non ha ancora un risultato completo -
  // comportamento invariato, non ancora calcolabile.
  if (!haRisultatoCompleto(finalePerdenti5_8)) {
    return null;
  }

  const { vincitore: settimo, perdente: ottavo } = vincitoreEPerdente(finalePerdenti5_8);

  return [primo, secondo, terzo, quarto, quinto, sesto, settimo, ottavo].map(
    (squadra, index) => ({
      posizione: index + 1,
      squadra,
    })
  );
}
