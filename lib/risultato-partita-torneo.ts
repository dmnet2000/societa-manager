// Story 20.3 (Epic 20, Torneo Memorial): unica fonte di verita' per la
// validazione strutturale "al meglio dei 3 set" e per il calcolo di
// esito/punti di una PartitaTorneo - nessun import "server-only" qui
// (funzioni pure, senza IO), riusate sia lato server (Server Action,
// lib/classifica-girone-torneo.ts) sia lato client (anteprima del terzo set
// necessario in RisultatoPartitaTorneoForm.tsx).
//
// Nessuna regola di punteggio pallavolistico reale (margine di 2 punti,
// minimo 25/15 nei primi due set, 15 nel terzo) - decisione esplicita
// (spec-20-3 Boundaries "Never"): qui si valida solo la coerenza
// strutturale del "al meglio dei 3 set", non il regolamento pallavolistico
// completo.
export type RisultatoSet = { casa: number; ospite: number };

// Review fix (Blind Hunter, Story 20.4): questa predicate ("set1 e set2
// entrambi valorizzati") era duplicata in 5 punti diversi del progetto
// (lib/classifica-girone-torneo.ts, lib/classifica-finale-torneo.ts,
// app/app/(torneo)/torneo/actions.ts, RisultatoPartitaTorneoForm.tsx,
// tabellone/page.tsx), ciascuna commentata come "duplicazione deliberata" -
// estratta qui come unica fonte di verita', riusata ovunque (mirror di
// terzoSetNecessario sopra, stesso principio, stessa story che lo ha
// introdotto per il primo caso analogo).
export function haRisultatoCompleto(partita: {
  set1Casa: number | null;
  set1Ospite: number | null;
  set2Casa: number | null;
  set2Ospite: number | null;
}): boolean {
  return (
    partita.set1Casa !== null &&
    partita.set1Ospite !== null &&
    partita.set2Casa !== null &&
    partita.set2Ospite !== null
  );
}

// Un set "pari" (stesso punteggio per entrambe le squadre) non ha un
// vincitore - non valido in nessun caso, restituisce null.
function vincitoreSet(set: RisultatoSet): "casa" | "ospite" | null {
  if (set.casa === set.ospite) return null;
  return set.casa > set.ospite ? "casa" : "ospite";
}

// Valida la coerenza strutturale di un risultato "al meglio dei 3 set":
// - nessun set pari (set1/set2 sempre presenti, set3 se presente);
// - il terzo set c'e' se e solo se le prime due squadre si sono spartite i
//   primi due set (1-1) - se una squadra vince entrambi i primi due set
//   (2-0), il terzo set non deve esistere;
// - "mai una squadra con piu' di 2 set vinti" e' garantito strutturalmente
//   da queste due regole (2-0 chiude subito, 1-1 forza esattamente un terzo
//   set che decide 2-1), nessun controllo aggiuntivo necessario.
export function risultatoValido(
  set1: RisultatoSet,
  set2: RisultatoSet,
  set3?: RisultatoSet
): boolean {
  const vincitore1 = vincitoreSet(set1);
  const vincitore2 = vincitoreSet(set2);
  if (vincitore1 === null || vincitore2 === null) return false;

  const primiDuePariteggiati = vincitore1 !== vincitore2;

  if (primiDuePariteggiati) {
    if (!set3) return false;
    return vincitoreSet(set3) !== null;
  }

  // Le prime due squadre hanno gia' deciso l'incontro (2-0) - un terzo set
  // qui sarebbe strutturalmente incoerente ("mai una squadra con più di 2
  // set vinti", spec-20-3 Boundaries).
  return !set3;
}

// Review fix (Blind Hunter, Story 20.3): estratta da RisultatoPartitaTorneoForm.tsx,
// che reimplementava a mano la stessa regola "vincitore1 !== vincitore2" -
// un'unica fonte di verita' per "serve il terzo set", riusata sia
// dall'anteprima lato client sia da qualunque futuro chiamante server-side,
// mai due copie da tenere allineate manualmente. Restituisce `false` (non
// necessario) se uno dei due set e' pari - lo stesso input verrebbe
// comunque respinto da risultatoValido al salvataggio.
export function terzoSetNecessario(set1: RisultatoSet, set2: RisultatoSet): boolean {
  const vincitore1 = vincitoreSet(set1);
  const vincitore2 = vincitoreSet(set2);
  if (vincitore1 === null || vincitore2 === null) return false;
  return vincitore1 !== vincitore2;
}

export type EsitoPartita = {
  setVintiCasa: number;
  setVintiOspite: number;
  puntiCasa: number;
  puntiOspite: number;
  // Story 20.16 (Epic 20, Torneo Memorial): somma dei punteggi-set grezzi
  // (es. set1Casa+set2Casa+(set3Casa ?? 0)) - nuovo criterio di spareggio
  // "quoziente punti" in calcolaClassificaGirone, distinto dal punteggio
  // dell'incontro (puntiCasa/puntiOspite sopra, 3/2/1/0).
  puntiFattiCasa: number;
  puntiFattiOspite: number;
};

// Deriva l'esito (2-0/2-1/1-2/0-2) e i punti dell'incontro (3/2/1/0) SOLO da
// un risultato gia' validato - non richiama risultatoValido internamente
// (spec-20-3 Code Map): il chiamante valida prima. Su un input non valido
// il comportamento non e' garantito (nessun contratto qui).
export function esitoPartita(
  set1: RisultatoSet,
  set2: RisultatoSet,
  set3?: RisultatoSet
): EsitoPartita {
  const set = [set1, set2, set3].filter((s): s is RisultatoSet => s !== undefined);

  let setVintiCasa = 0;
  let setVintiOspite = 0;
  let puntiFattiCasa = 0;
  let puntiFattiOspite = 0;
  for (const s of set) {
    if (s.casa > s.ospite) {
      setVintiCasa += 1;
    } else {
      setVintiOspite += 1;
    }
    puntiFattiCasa += s.casa;
    puntiFattiOspite += s.ospite;
  }

  // Punti dell'incontro secondo il regolamento citato in epics.md Story
  // 20.3: 2-0 -> 3/0, 2-1 -> 2/1, 1-2 -> 1/2, 0-2 -> 0/3.
  let puntiCasa: number;
  let puntiOspite: number;
  if (setVintiCasa === 2 && setVintiOspite === 0) {
    puntiCasa = 3;
    puntiOspite = 0;
  } else if (setVintiCasa === 2 && setVintiOspite === 1) {
    puntiCasa = 2;
    puntiOspite = 1;
  } else if (setVintiCasa === 1 && setVintiOspite === 2) {
    puntiCasa = 1;
    puntiOspite = 2;
  } else {
    puntiCasa = 0;
    puntiOspite = 3;
  }

  return { setVintiCasa, setVintiOspite, puntiCasa, puntiOspite, puntiFattiCasa, puntiFattiOspite };
}

// Story 20.6 (Epic 20, Torneo Memorial): estratta da RisultatoPartitaTorneoForm.tsx
// (funzione locale "formattaRisultato", non esportata) - unica fonte di
// verita' riusabile sia dal form interno sia dalla nuova pagina pubblica
// (app/torneo/page.tsx), stessa disciplina DRY gia' applicata sopra a
// haRisultatoCompleto/terzoSetNecessario. Stessa firma/logica esatta,
// nessuna modifica comportamentale.
export type PartitaConRisultato = {
  set1Casa: number | null;
  set1Ospite: number | null;
  set2Casa: number | null;
  set2Ospite: number | null;
  set3Casa: number | null;
  set3Ospite: number | null;
};

export function formattaRisultatoPartitaTorneo(partita: PartitaConRisultato): string | null {
  if (!haRisultatoCompleto(partita)) return null;

  const parziali = [
    `${partita.set1Casa}-${partita.set1Ospite}`,
    `${partita.set2Casa}-${partita.set2Ospite}`,
  ];
  const set3Presente = partita.set3Casa !== null && partita.set3Ospite !== null;
  if (set3Presente) {
    parziali.push(`${partita.set3Casa}-${partita.set3Ospite}`);
  }

  const { setVintiCasa, setVintiOspite, puntiCasa, puntiOspite } = esitoPartita(
    { casa: partita.set1Casa as number, ospite: partita.set1Ospite as number },
    { casa: partita.set2Casa as number, ospite: partita.set2Ospite as number },
    set3Presente
      ? { casa: partita.set3Casa as number, ospite: partita.set3Ospite as number }
      : undefined
  );

  return `${setVintiCasa}-${setVintiOspite} (${parziali.join(", ")}) — ${puntiCasa}-${puntiOspite} punti`;
}
