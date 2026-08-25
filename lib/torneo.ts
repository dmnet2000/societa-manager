import "server-only";
import { prisma } from "@/lib/prisma";
import type { SettimanaTorneo, GironeTorneo, FaseTorneo, TabelloneTorneo } from "@prisma/client";

// Story 20.1 (Epic 20, Torneo Memorial): funzioni di lettura/scrittura per
// EdizioneTorneo/CategoriaTorneo (prisma/schema.prisma) - tabelle
// strutturali (AD-9), nessuna RLS/policy, accesso solo via Prisma diretto.
// Nessuna validazione qui (anno numerico, settimana 1|2, range 2-8): stessa
// separazione dei livelli gia' stabilita da lib/menu-pubblico.ts, la
// validazione vive nella Server Action che chiama queste funzioni
// (app/app/(torneo)/torneo/actions.ts).
// Review fix (Blind Hunter, Story 20.1): le Boundaries della spec dicevano
// esplicitamente "lettura/scrittura" qui, ma la prima implementazione aveva
// lasciato le scritture (create/update/delete) direttamente in actions.ts -
// spostate qui per allinearsi al vero precedente (lib/menu-pubblico.ts, che
// possiede anche le sue scritture), non solo al testo della spec.

// Pagina /app/torneo: elenco delle Edizioni con il conteggio delle
// Categorie collegate - permette all'Utente di capire a colpo d'occhio
// perche' una Edizione non e' eliminabile (guardia applicata nella Server
// Action, non qui), senza una seconda query separata per riga.
export async function elencaEdizioniTorneo() {
  return prisma.edizioneTorneo.findMany({
    orderBy: { anno: "desc" },
    include: { _count: { select: { categorie: true } } },
  });
}

export async function trovaEdizioneTorneoPerId(id: string) {
  return prisma.edizioneTorneo.findUnique({ where: { id } });
}

// Story 20.6: "Edizione corrente" per la sezione pubblica del Torneo (nuova
// nozione, nessun campo "corrente" esplicito in EdizioneTorneo) - stesso
// criterio "anno piu' alto" gia' implicito nell'ordinamento di
// elencaEdizioniTorneo sopra (orderBy anno desc), qui findFirst invece di
// findMany (una sola Edizione, non l'elenco). null se nessuna Edizione e'
// mai stata creata - il chiamante (app/torneo/page.tsx) mostra un messaggio
// esplicito in quel caso, mai un errore.
export async function trovaEdizioneTorneoCorrente() {
  return prisma.edizioneTorneo.findFirst({ orderBy: { anno: "desc" } });
}

export async function creaEdizioneTorneo(anno: number) {
  return prisma.edizioneTorneo.create({ data: { anno } });
}

// Cancellazione atomica (deleteMany con where composto, non
// findUnique+delete separati) - stesso identico pattern anti-TOCTOU di
// cancellaSlot (app/(orari-palestre)/slot/actions.ts). Il chiamante
// distingue "bloccata da Categorie collegate" da "non esiste più" con una
// findUnique separata solo quando count === 0.
export async function cancellaEdizioneTorneo(id: string) {
  return prisma.edizioneTorneo.deleteMany({
    where: { id, categorie: { none: {} } },
  });
}

// Review fix (Verification Gap, Story 20.1): raggruppata per settimana
// prima che per nome - un ordinamento solo alfabetico mescolava le
// Categorie di Settimana 1 e Settimana 2, perdendo il raggruppamento
// centrale al dominio ("2 categorie per week").
export async function elencaCategorieTorneo(edizioneTorneoId: string) {
  return prisma.categoriaTorneo.findMany({
    where: { edizioneTorneoId },
    orderBy: [{ settimana: "asc" }, { nome: "asc" }],
  });
}

// Story 20.2: serve alla Server Action per disambiguare, su un
// cancellaCategoriaTorneo con count 0, "Categoria non trovata" da
// "bloccata da Squadre collegate" - stesso identico ruolo di
// trovaEdizioneTorneoPerId per cancellaEdizioneTorneoAction sopra.
export async function trovaCategoriaTorneoPerId(id: string) {
  return prisma.categoriaTorneo.findUnique({ where: { id } });
}

export async function creaCategoriaTorneo(dati: {
  nome: string;
  settimana: SettimanaTorneo;
  numeroMassimoSquadre: number;
  edizioneTorneoId: string;
}) {
  return prisma.categoriaTorneo.create({ data: dati });
}

// Review fix (Blind Hunter + Edge Case Hunter, indipendentemente, Story
// 20.1): update/delete scoped SOLO per id (non anche per edizioneTorneoId)
// avrebbero potuto operare su/revalidare la pagina sbagliata se i due valori
// del form non corrispondessero mai (bug futuro, tampering). updateMany/
// deleteMany con where composto {id, edizioneTorneoId}: count === 0 segnala
// esplicitamente al chiamante "non trovata in questa Edizione" invece di
// un'operazione silenziosamente no-op o su una riga diversa.
export async function aggiornaCategoriaTorneo(
  id: string,
  edizioneTorneoId: string,
  dati: { nome: string; settimana: SettimanaTorneo; numeroMassimoSquadre: number }
) {
  return prisma.categoriaTorneo.updateMany({
    where: { id, edizioneTorneoId },
    data: dati,
  });
}

// Story 20.2: where esteso con "squadre: { none: {} } }" - una Categoria
// con Squadre iscritte non e' piu' eliminabile (obbligo ereditato da
// spec-20-1 Design Notes, assolto qui ora che SquadraTorneo esiste), stesso
// identico pattern anti-TOCTOU di cancellaEdizioneTorneo sopra (deleteMany
// con where composto, non findUnique+delete separati).
export async function cancellaCategoriaTorneo(id: string, edizioneTorneoId: string) {
  return prisma.categoriaTorneo.deleteMany({
    where: { id, edizioneTorneoId, squadre: { none: {} } },
  });
}

// Story 20.2 (Epic 20, Torneo Memorial): funzioni di lettura/scrittura per
// SquadraTorneo (prisma/schema.prisma) - stesso trattamento strutturale
// (AD-9) di EdizioneTorneo/CategoriaTorneo sopra, nessuna validazione qui
// (nome vuoto, girone A|B, numero massimo squadre): vive nella Server
// Action (app/app/(torneo)/torneo/actions.ts), stessa separazione dei
// livelli.
export async function elencaSquadreTorneo(categoriaTorneoId: string) {
  return prisma.squadraTorneo.findMany({
    where: { categoriaTorneoId },
    orderBy: [{ girone: "asc" }, { nome: "asc" }],
  });
}

// Usata dalla Server Action prima di creare una Squadra, per confrontare il
// conteggio con categoria.numeroMassimoSquadre (spec-20-2 Design Notes: "il
// vero cancello e' nella Server Action", non un vincolo DB CHECK che
// richiederebbe una subquery non banale in Postgres).
export async function contaSquadreTorneo(categoriaTorneoId: string) {
  return prisma.squadraTorneo.count({ where: { categoriaTorneoId } });
}

export async function creaSquadraTorneo(dati: {
  nome: string;
  girone: GironeTorneo;
  referente: string | null;
  contatto: string | null;
  categoriaTorneoId: string;
}) {
  return prisma.squadraTorneo.create({ data: dati });
}

// Update/delete scoped su id + categoriaTorneoId insieme (stesso pattern
// anti-mismatch di aggiornaCategoriaTorneo/cancellaCategoriaTorneo sopra):
// un id/categoriaTorneoId non corrispondenti falliscono esplicitamente
// (count 0) invece di operare su/rivalidare la pagina sbagliata.
export async function aggiornaSquadraTorneo(
  id: string,
  categoriaTorneoId: string,
  dati: { nome: string; girone: GironeTorneo; referente: string | null; contatto: string | null }
) {
  return prisma.squadraTorneo.updateMany({
    where: { id, categoriaTorneoId },
    data: dati,
  });
}

export async function trovaSquadraTorneoPerId(id: string) {
  return prisma.squadraTorneo.findUnique({ where: { id } });
}

// Review fix (Blind Hunter + Edge Case Hunter + Verification Gap Reviewer,
// tutti e tre indipendentemente, Story 20.3): where esteso con
// "partiteCasa: { none: {} } }"/"partiteOspite: { none: {} } }" - da quando
// PartitaTorneo referenzia SquadraTorneo con FK Restrict, cancellare una
// Squadra con incontri gia' generati falliva a livello DB, intercettato
// solo dal catch generico della Server Action come INTERNAL "Riprova"
// (fuorviante: un retry non puo' mai riuscire). Ora la guardia e' esplicita
// qui, stesso pattern anti-TOCTOU di cancellaCategoriaTorneo/
// cancellaEdizioneTorneo (deleteMany con where composto).
export async function cancellaSquadraTorneo(id: string, categoriaTorneoId: string) {
  return prisma.squadraTorneo.deleteMany({
    where: { id, categoriaTorneoId, partiteCasa: { none: {} }, partiteOspite: { none: {} } },
  });
}

// Story 20.3 (Epic 20, Torneo Memorial): funzioni di lettura/scrittura per
// PartitaTorneo (prisma/schema.prisma) - stesso trattamento strutturale
// (AD-9) di EdizioneTorneo/CategoriaTorneo/SquadraTorneo sopra, nessuna
// validazione qui (coerenza "al meglio dei 3 set", numero minimo di
// Squadre per girone, idempotenza della generazione): vive nella Server
// Action (app/app/(torneo)/torneo/actions.ts), stessa separazione dei
// livelli.
//
// Ordinata per girone (via squadraCasa.girone - un incontro e' sempre tra
// due Squadre dello stesso girone, l'ordinamento su una sola delle due
// basta) e poi per nome delle due Squadre, cosi' la pagina puo' raggruppare
// "Girone A poi Girone B" senza un raggruppamento applicativo separato.
export async function elencaPartiteTorneo(categoriaTorneoId: string) {
  return prisma.partitaTorneo.findMany({
    where: { categoriaTorneoId },
    include: { squadraCasa: true, squadraOspite: true },
    orderBy: [
      { squadraCasa: { girone: "asc" } },
      { squadraCasa: { nome: "asc" } },
      { squadraOspite: { nome: "asc" } },
    ],
  });
}

// Guardia di idempotenza per generaCalendarioGironiAction (spec-20-3
// Boundaries: "generato una sola volta per Categoria") - un conteggio > 0
// blocca la rigenerazione, che perderebbe i risultati eventualmente gia'
// inseriti.
export async function contaPartiteTorneo(categoriaTorneoId: string) {
  return prisma.partitaTorneo.count({ where: { categoriaTorneoId } });
}

// Story 20.4: guardia di idempotenza dedicata per generaTabelloneAction
// (spec-20-4 Boundaries: "generato una sola volta per Categoria") - un
// conteggio > 0 (qualunque PartitaTorneo con fase diversa da GIRONE)
// blocca la rigenerazione del tabellone, distinto da contaPartiteTorneo
// sopra che conta anche gli incontri di girone.
export async function contaPartiteTorneoTabellone(categoriaTorneoId: string) {
  return prisma.partitaTorneo.count({
    where: { categoriaTorneoId, fase: { not: "GIRONE" } },
  });
}

// Bulk insert del calendario di girone ("tutti contro tutti" dentro
// ciascun girone) - createMany invece di N create() singole, tutte le
// coppie di entrambi i gironi in un'unica scrittura. Story 20.4: fase/
// tabellone opzionali - il default Prisma (GIRONE/null) copre il chiamante
// esistente (generaCalendarioGironiAction, mai passa questi campi);
// generaTabelloneAction/il side-effect di salvaRisultatoPartitaTorneoAction
// li passano esplicitamente per le semifinali/finali.
export async function creaPartiteTorneo(
  righe: {
    categoriaTorneoId: string;
    squadraCasaId: string;
    squadraOspiteId: string;
    fase?: FaseTorneo;
    tabellone?: TabelloneTorneo;
  }[]
) {
  return prisma.partitaTorneo.createMany({ data: righe });
}

// Story 20.4: riaggiunta (rimossa come codice morto in Story 20.3) - ora
// serve davvero a salvaRisultatoPartitaTorneoAction per rileggere
// server-side la fase/il tabellone reali della PartitaTorneo appena
// salvata, mai fidandosi di un campo inviato dal client (stessa disciplina
// gia' applicata ripetutamente in questa epica).
export async function trovaPartitaTorneoPerId(id: string) {
  return prisma.partitaTorneo.findUnique({ where: { id } });
}

// Update scoped su id + categoriaTorneoId insieme (stesso pattern
// anti-mismatch di aggiornaCategoriaTorneo/aggiornaSquadraTorneo sopra): un
// id/categoriaTorneoId non corrispondenti falliscono esplicitamente
// (count 0) invece di aggiornare/rivalidare l'incontro sbagliato.
// set3Casa/set3Ospite sono null quando l'incontro si e' chiuso 2-0 (nessun
// terzo set) - il chiamante (Server Action) ha gia' validato la coerenza
// strutturale con risultatoValido prima di arrivare qui.
export async function aggiornaRisultatoPartitaTorneo(
  id: string,
  categoriaTorneoId: string,
  dati: {
    set1Casa: number;
    set1Ospite: number;
    set2Casa: number;
    set2Ospite: number;
    set3Casa: number | null;
    set3Ospite: number | null;
  }
) {
  return prisma.partitaTorneo.updateMany({
    where: { id, categoriaTorneoId },
    data: dati,
  });
}
