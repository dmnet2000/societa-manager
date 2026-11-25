import { isMinorenne } from "@/lib/eta";

// Story 27.1: dati gia' salvati di un Genitore/Tutore, pronti per i
// defaultValue del form (dataNascita troncata a yyyy-mm-dd, come
// DatiAnagraficiAtleta.dataNascita).
export type TutoreSalvato = {
  posizione: 1 | 2;
  nome: string;
  codiceFiscale: string;
  luogoNascita: string | null;
  dataNascita: string | null;
  indirizzo: string | null;
  cap: string | null;
  localitaResidenza: string | null;
  provinciaResidenza: string | null;
  email: string | null;
  telefono: string | null;
  intestatarioRicevuta: boolean;
  utenteId: string | null;
};

// Utenti Genitore gia' collegati all'Atleta (GenitoreAtleta, autoAggancio
// false) - unici account selezionabili come "account collegato".
export type GenitoreCollegato = {
  utenteId: string;
  email: string;
};

export type DatiGenitoriTutori = {
  tutori: TutoreSalvato[];
  genitoriCollegati: GenitoreCollegato[];
  // true = Atleta maggiorenne con Genitori/Tutori ancora salvati (es.
  // compiuti 18 anni dopo l'inserimento): il form permette solo di
  // rimuoverli, salvaTutoriAtletaAction rifiuta qualunque altro invio.
  soloRimozione: boolean;
};

// Riga come restituita da elencaTutori (lib/db-rls/tutore-atleta.ts):
// "id" e "atletaId" non vengono passati al client.
type RigaTutore = TutoreSalvato & {
  id?: string;
  atletaId: string;
};

type RigaGenitoreCollegato = {
  atletaId: string;
  utenteId: string;
  utente: { email: string };
};

// Story 27.1: costruisce, per /app/gruppi, i dati del form "Genitori" per
// Atleta. Una voce esiste solo per un'Atleta minorenne (form completo) o
// per una maggiorenne che ha ancora Genitori/Tutori salvati (sola
// rimozione); assenza di voce = nessun pulsante "Genitori".
export function costruisciGenitoriTutoriPerAtleta(
  atlete: Array<{ id: string; dataNascita: string }>,
  tutori: RigaTutore[],
  genitoriCollegati: RigaGenitoreCollegato[],
  oggi: Date
): Map<string, DatiGenitoriTutori> {
  const tutoriPerAtleta = new Map<string, TutoreSalvato[]>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const { id, atletaId, dataNascita, ...resto } of tutori) {
    const elenco = tutoriPerAtleta.get(atletaId) ?? [];
    elenco.push({ ...resto, dataNascita: dataNascita ? dataNascita.slice(0, 10) : null });
    tutoriPerAtleta.set(atletaId, elenco);
  }

  const genitoriPerAtleta = new Map<string, GenitoreCollegato[]>();
  for (const g of genitoriCollegati) {
    const elenco = genitoriPerAtleta.get(g.atletaId) ?? [];
    elenco.push({ utenteId: g.utenteId, email: g.utente.email });
    genitoriPerAtleta.set(g.atletaId, elenco);
  }

  const risultato = new Map<string, DatiGenitoriTutori>();
  for (const a of atlete) {
    const tutoriAtleta = tutoriPerAtleta.get(a.id) ?? [];
    const minorenne = isMinorenne(a.dataNascita, oggi);
    if (!minorenne && tutoriAtleta.length === 0) continue;
    risultato.set(a.id, {
      tutori: tutoriAtleta,
      genitoriCollegati: genitoriPerAtleta.get(a.id) ?? [],
      soloRimozione: !minorenne,
    });
  }
  return risultato;
}
