import "server-only";
import { prisma } from "@/lib/prisma";
import type { SettimanaTorneo, GironeTorneo, FaseTorneo, TabelloneTorneo } from "@prisma/client";
import { codificaSelezioneSlotGirone } from "@/lib/selezione-slot-girone";

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

// Story 20.13 (Epic 20, Torneo Memorial): mirror semplice di
// prisma.edizioneTorneo.update - nessuno scope-parent da verificare qui,
// EdizioneTorneo e' l'entita' di primo livello (a differenza di
// aggiornaCategoriaTorneo/aggiornaSquadraTorneo sotto, sempre scoped anche
// sul genitore). Il chiamante (Server Action) verifica gia' l'esistenza
// dell'Edizione prima di invocare questa funzione, stesso principio di
// caricaVolantinoTorneoAction.
export async function aggiornaNomiSettimaneTorneo(
  edizioneTorneoId: string,
  dati: { nomeSettimana1: string | null; nomeSettimana2: string | null }
) {
  return prisma.edizioneTorneo.update({ where: { id: edizioneTorneoId }, data: dati });
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

export async function creaEdizioneTorneo(anno: number, nome: string) {
  return prisma.edizioneTorneo.create({ data: { anno, nome } });
}

// Cancellazione atomica (deleteMany con where composto, non
// findUnique+delete separati) - stesso identico pattern anti-TOCTOU di
// cancellaSlot (app/(orari-palestre)/slot/actions.ts). Il chiamante
// distingue "bloccata da Categorie collegate" da "non esiste più" con una
// findUnique separata solo quando count === 0.
// Review fix (Edge Case Hunter, Story 20.9): where esteso con
// "slot: { none: {} } }" - la relazione slot (FK slot_torneo_edizioneTorneoId_fkey,
// ON DELETE RESTRICT) non era coperta da questa guardia: un'Edizione senza
// Categorie ma con Slot ancora presenti (es. mai assegnati a nessuna
// Partita, o rimasti orfani dopo "Cancella tutte le partite", Story 20.8,
// che svuota solo le Partite non gli Slot) falliva a livello DB, intercettata
// solo dal catch generico "Impossibile cancellare l'Edizione. Riprova." -
// nessun indizio che servisse prima cancellare gli Slot da /app/torneo/[id]/slot.
export async function cancellaEdizioneTorneo(id: string) {
  return prisma.edizioneTorneo.deleteMany({
    where: { id, categorie: { none: {} }, slot: { none: {} } },
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
// Story 20.9: include ora anche lo SlotTorneo eventualmente assegnato (con
// la sua Palestra) - serve sia a RisultatoPartitaTorneoForm.tsx (mostrare
// etichetta/data/ora/Palestra dello Slot corrente) sia alla pagina pubblica
// (app/torneo/page.tsx, link "Naviga"). Un solo punto di lettura per tutti i
// chiamanti (risultati/page.tsx, tabellone/page.tsx, torneo/page.tsx,
// generaTabelloneAction/generaFinaliSeCompletate) - mai una seconda query
// separata da tenere allineata.
// Story 20.11: orderBy semplificato a "numero" - dato che numero e' una
// sequenza globale dell'Edizione assegnata per blocchi consecutivi per
// girone/fase (prossimoNumeroPartitaTorneo sotto), ordinare per numero
// produce gia' un raggruppamento naturale equivalente al precedente ordine
// per girone/nome Squadra, con il vantaggio aggiuntivo di riflettere
// l'ordine reale di generazione/gioco.
// Story 20.18: include esteso con "campo: true" accanto a "palestra: true" -
// lo SlotTorneo eventualmente assegnato porta ora anche il proprio Campo
// (opzionale), mostrato ovunque questa funzione alimenta una vista
// (RisultatoPartitaTorneoForm.tsx, app/torneo/page.tsx).
export async function elencaPartiteTorneo(categoriaTorneoId: string) {
  return prisma.partitaTorneo.findMany({
    where: { categoriaTorneoId },
    include: {
      squadraCasa: true,
      squadraOspite: true,
      slotTorneo: { include: { palestra: true, campo: true } },
    },
    orderBy: [{ numero: "asc" }],
  });
}

// Guardia di idempotenza per generaCalendarioGironiAction (spec-20-3
// Boundaries: "generato una sola volta per Categoria") - un conteggio > 0
// blocca la rigenerazione, che perderebbe i risultati eventualmente gia'
// inseriti.
export async function contaPartiteTorneo(categoriaTorneoId: string) {
  return prisma.partitaTorneo.count({ where: { categoriaTorneoId } });
}

// Story 20.11 (Epic 20, Torneo Memorial): prossimo numero di gara
// disponibile in un'Edizione - un'unica sequenza cross-Categoria che non
// riparte mai tra girone e fasi successive (spec-20-11 Boundaries
// "Always"). Legge il massimo numero gia' assegnato nell'Edizione e
// incrementa da li': il chiamante (le 3 generazioni in
// app/app/(torneo)/torneo/actions.ts) assegna poi N numeri consecutivi
// localmente (questo valore, +1, +2, ...) prima di un'unica scrittura in
// blocco - una sola lettura per generazione, mai una query per riga. Il
// vero cancello contro una collisione tra due generazioni concorrenti (questo
// e' un check-then-act non atomico) e' il vincolo @@unique([edizioneTorneoId,
// numero]) a livello DB (prisma/schema.prisma), non questa funzione.
export async function prossimoNumeroPartitaTorneo(edizioneTorneoId: string): Promise<number> {
  const ultima = await prisma.partitaTorneo.findFirst({
    where: { edizioneTorneoId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (ultima?.numero ?? 0) + 1;
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

// Story 20.8: cancella TUTTE le PartitaTorneo di una Categoria (girone e
// tabellone insieme, nessuna cancellazione parziale) - sblocca la catena
// Categoria->Squadre->Partite, oggi bloccata per sempre una volta generato
// un calendario (cancellaSquadraTorneo rifiuta una Squadra con
// partiteCasa/partiteOspite esistenti). Nessuna guardia necessaria: cancellare
// partite non ha alcun impatto su Squadre/Categoria stesse, e count 0 (nessuna
// partita da cancellare) e' un esito valido, non un errore.
export async function cancellaPartiteTorneo(categoriaTorneoId: string) {
  return prisma.partitaTorneo.deleteMany({ where: { categoriaTorneoId } });
}

// Bulk insert del calendario di girone ("tutti contro tutti" dentro
// ciascun girone) - createMany invece di N create() singole, tutte le
// coppie di entrambi i gironi in un'unica scrittura. Story 20.4: fase/
// tabellone opzionali - il default Prisma (GIRONE/null) copre il chiamante
// esistente (generaCalendarioGironiAction, mai passa questi campi);
// generaTabelloneAction/il side-effect di salvaRisultatoPartitaTorneoAction
// li passano esplicitamente per le semifinali/finali. Story 20.11:
// edizioneTorneoId/numero ora obbligatori (mai opzionali) - il chiamante
// calcola sempre entrambi (prossimoNumeroPartitaTorneo sopra +
// categoria.edizioneTorneoId gia' risolto) prima di invocare questa
// funzione, nessun default silenzioso possibile per un numero di gara.
export async function creaPartiteTorneo(
  righe: {
    categoriaTorneoId: string;
    squadraCasaId: string;
    squadraOspiteId: string;
    edizioneTorneoId: string;
    numero: number;
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

// Story 20.9 (Epic 20, Torneo Memorial): funzioni di lettura/scrittura per
// SlotTorneo (prisma/schema.prisma) - stesso trattamento strutturale (AD-9)
// di EdizioneTorneo/CategoriaTorneo/SquadraTorneo/PartitaTorneo sopra,
// nessuna validazione qui (etichetta/data/ora obbligatorie, coerenza
// fase/tabellone): vive nella Server Action (app/app/(torneo)/torneo/actions.ts),
// stessa separazione dei livelli.
// Review fix (Blind Hunter + Edge Case Hunter, convergenti): creaSlotTorneoAction
// verificava esplicitamente l'esistenza dell'Edizione ma non della Palestra
// (Epic 2, dominio diverso ma FK diretta qui) - un palestraId non piu'
// esistente arrivava fino al vincolo FK del database, intercettato solo dal
// catch generico "Impossibile creare lo Slot. Riprova." Mirror dello stesso
// controllo gia' fatto per edizioneTorneoId.
export async function trovaPalestraPerId(id: string) {
  return prisma.palestra.findUnique({ where: { id } });
}

export async function creaSlotTorneo(dati: {
  edizioneTorneoId: string;
  etichetta: string;
  data: string;
  ora: string;
  palestraId: string;
  fase: FaseTorneo;
  tabellone: TabelloneTorneo | null;
}) {
  return prisma.slotTorneo.create({ data: dati });
}

// Story 20.18 (Epic 20, Torneo Memorial): sostituisce
// creaSlotTorneoPerTutteLePalestre (Story 20.12) - un weekend di torneo
// ospita piu' partite in parallelo, ma ora fino a una per CAMPO (non solo
// per Palestra): una Palestra a doppio campo puo' ospitare due Slot
// paralleli sullo stesso orario (spec-20-18 Intent). L'insieme
// Palestra x Campo valido e' SEMPRE ricalcolato qui, server-side - mai
// fidandosi delle "selezioni" inviate dal client (stessa disciplina "mai
// fidarsi del client per lo scoping" gia' applicata in tutta l'epica, Story
// 20.12 inclusa): ogni selezione ricevuta viene scartata silenziosamente se
// non corrisponde a una combinazione Palestra/Campo davvero esistente (id
// inesistente, Campo cancellato nel frattempo, o Campo che non appartiene
// alla Palestra indicata - tampering o dato stantio, mai un errore per
// riga). codificaSelezioneSlotGirone (lib/selezione-slot-girone.ts, stessa
// convenzione "palestraId|campoId" riusata da NuovoSlotTorneoForm.tsx e
// actions.ts) costruisce sia le chiavi dell'insieme valido sia quelle delle
// selezioni ricevute - un'unica fonte di verita' per l'encoding, non tre
// copie della stessa stringa template. Nessuna nuova entita' "gruppo di
// Slot": le righe create restano indipendenti, cancellabili singolarmente
// come ogni altro SlotTorneo (mirror Story 20.12 Design Notes). Review fix
// (Edge Case Hunter): le selezioni sono deduplicate PRIMA del filtro/mapping
// (Map keyed sulla stessa codifica) - una combinazione Palestra/Campo valida
// inviata due volte (form manomesso, doppio submit non impedito lato
// client) produceva altrimenti due righe SlotTorneo identiche invece di una
// sola. { count, nessunaPalestraCensita } invece del solo { count } di
// prima: distingue "0 Palestre esistono affatto" (nessunaPalestraCensita:
// true, messaggio dedicato) da "selezione vuota o interamente scartata dal
// filtro" (nessunaPalestraCensita: false, count: 0) - la causa non e'
// altrimenti recuperabile dal solo conteggio (spec-20-18 Design Notes). Il
// chiamante (creaSlotTorneoAction) traduce entrambi i casi in un errore
// esplicito, mai un salvataggio silenzioso di zero righe.
export async function creaSlotTorneoPerSelezione(dati: {
  edizioneTorneoId: string;
  etichetta: string;
  data: string;
  ora: string;
  selezioni: { palestraId: string; campoId: string | null }[];
}) {
  // Review fix (Verification Gap Reviewer): select invece di include - solo
  // "id" di Palestra e "id" di Campo sono mai letti qui, include avrebbe
  // tirato dentro nome/indirizzo/latitudine/longitudine/createdAt di ogni
  // Palestra per niente.
  const palestre = await prisma.palestra.findMany({
    select: { id: true, campi: { select: { id: true } } },
  });
  if (palestre.length === 0) {
    return { count: 0, nessunaPalestraCensita: true };
  }

  const combinazioniValide = new Set<string>();
  for (const p of palestre) {
    if (p.campi.length === 0) {
      combinazioniValide.add(codificaSelezioneSlotGirone(p.id, null));
    } else {
      for (const c of p.campi) {
        combinazioniValide.add(codificaSelezioneSlotGirone(p.id, c.id));
      }
    }
  }

  // Review fix (Edge Case Hunter): dedup PRIMA del filtro, keyed sulla
  // stessa codifica delle combinazioni valide sopra - una Map preserva la
  // prima occorrenza di ciascuna combinazione, scartando i duplicati esatti
  // senza alterarne l'ordine di invio.
  const selezioniUniche = new Map<string, { palestraId: string; campoId: string | null }>();
  for (const s of dati.selezioni) {
    selezioniUniche.set(codificaSelezioneSlotGirone(s.palestraId, s.campoId), s);
  }

  const righe = Array.from(selezioniUniche.entries())
    .filter(([chiave]) => combinazioniValide.has(chiave))
    .map(([, s]) => ({
      edizioneTorneoId: dati.edizioneTorneoId,
      etichetta: dati.etichetta,
      data: dati.data,
      ora: dati.ora,
      palestraId: s.palestraId,
      campoId: s.campoId,
      fase: "GIRONE" as const,
      tabellone: null,
    }));

  if (righe.length === 0) {
    return { count: 0, nessunaPalestraCensita: false };
  }

  const risultato = await prisma.slotTorneo.createMany({ data: righe });
  return { count: risultato.count, nessunaPalestraCensita: false };
}

// Include la Palestra (nome/indirizzo/lat/lng) e il Campo (Story 20.18,
// opzionale) - servono al chiamante sia per il <select> del form di
// assegnazione sia per il link "Naviga" della pagina pubblica
// (costruisciLinkNaviga, lib/link-naviga-palestra.ts, che legge solo la
// Palestra). Ordinata per data/ora crescenti - stesso criterio
// deterministico usato dall'auto-assegnazione (elencaSlotTorneoLiberi
// sotto).
export async function elencaSlotTorneo(edizioneTorneoId: string) {
  return prisma.slotTorneo.findMany({
    where: { edizioneTorneoId },
    include: { palestra: true, campo: true },
    orderBy: [{ data: "asc" }, { ora: "asc" }],
  });
}

// Serve alla Server Action per disambiguare, su un cancellaSlotTorneo con
// count 0, "Slot non trovato" da "bloccato da una Partita collegata" -
// stesso identico ruolo di trovaSquadraTorneoPerId per
// cancellaSquadraTorneoAction, e per verificare server-side (mai fidandosi
// del client) che lo Slot scelto in assegnaSlotPartitaTorneoAction abbia
// davvero fase/tabellone coerenti con la Partita.
export async function trovaSlotTorneoPerId(id: string) {
  return prisma.slotTorneo.findUnique({ where: { id } });
}

// Delete scoped su id + edizioneTorneoId insieme (stesso pattern
// anti-mismatch di cancellaCategoriaTorneo/cancellaSquadraTorneo sopra),
// guardia "partite: { none: {} } }" - uno Slot gia' assegnato a una Partita
// non e' eliminabile (mirror cancellaSquadraTorneo, che rifiuta una Squadra
// con partiteCasa/partiteOspite collegate).
export async function cancellaSlotTorneo(id: string, edizioneTorneoId: string) {
  return prisma.slotTorneo.deleteMany({
    where: { id, edizioneTorneoId, partite: { none: {} } },
  });
}

// Update scoped su id + categoriaTorneoId insieme (stesso pattern
// anti-mismatch di aggiornaRisultatoPartitaTorneo sopra) - slotTorneoId puo'
// essere null per RIMUOVERE un'assegnazione esistente (spec-20-9 Code Map),
// non solo per assegnarne una nuova.
export async function assegnaSlotPartitaTorneo(
  id: string,
  categoriaTorneoId: string,
  slotTorneoId: string | null
) {
  return prisma.partitaTorneo.updateMany({
    where: { id, categoriaTorneoId },
    data: { slotTorneoId },
  });
}

// Helper per trovare gli Slot liberi (nessuna Partita collegata) di una data
// fase/tabellone, ordinati per data/ora crescenti (spec-20-9 Design Notes:
// "nessuna logica di abbinamento intelligente", solo ordine deterministico
// semplice) - usata sia dall'auto-assegnazione best-effort di
// generaTabelloneAction/generaFinaliSeCompletate (app/app/(torneo)/torneo/actions.ts)
// sia, potenzialmente, per segnalare la disponibilita' nel form manuale.
export async function elencaSlotTorneoLiberi(
  edizioneTorneoId: string,
  fase: FaseTorneo,
  tabellone: TabelloneTorneo | null
) {
  return prisma.slotTorneo.findMany({
    where: { edizioneTorneoId, fase, tabellone, partite: { none: {} } },
    orderBy: [{ data: "asc" }, { ora: "asc" }],
  });
}

// Review fix (Blind Hunter + Edge Case Hunter, convergenti): SlotTorneo e'
// scoped per Edizione, condiviso tra TUTTE le Categorie di quel weekend -
// l'avviso "Slot gia' occupato" nelle pagine di gestione (risultati/tabellone)
// costruiva l'insieme degli occupati solo dalle Partite della Categoria
// APERTA in quel momento, quindi non vedeva mai un'occupazione da parte di
// un'altra Categoria della stessa Edizione. Query cross-Categoria dedicata
// (relazione categoriaTorneo->edizioneTorneoId, non un secondo giro su
// elencaPartiteTorneo per-Categoria) - usata da entrambe le pagine invece
// di derivare l'insieme dalle sole Partite gia' lette per la propria
// Categoria.
export async function elencaSlotOccupatiEdizione(
  edizioneTorneoId: string
): Promise<string[]> {
  const righe = await prisma.partitaTorneo.findMany({
    where: { categoriaTorneo: { edizioneTorneoId }, slotTorneoId: { not: null } },
    select: { slotTorneoId: true },
  });
  return righe
    .map((r) => r.slotTorneoId)
    .filter((id): id is string => id !== null);
}
