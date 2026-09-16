# Epic 20 Context: Torneo Memorial

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dare alla società uno strumento per gestire il torneo annuale "Memorial": edizioni, categorie, squadre partecipanti (anche esterne, non legate ai Gruppo interni), inserimento risultati (2 set su 3), calcolo automatico delle classifiche di girone, generazione del tabellone di semifinale/finale e classifica finale, un'immagine di sfondo/volantino per edizione, e una sezione pubblica sul sito dove i visitatori seguono il torneo. L'epica nasce da un requisito utente e resta di sviluppo incrementale: la story iniziale (20.1-20.6) copre il nucleo dati→risultati→tabellone→volantino→vetrina pubblica; le story successive (20.7+) sono aggiunte post-apertura richieste dall'utente via verifica dal vivo del deploy (naming edizione, cancellazione partite, slot orari/palestre/campi, numerazione gare, viste tabellari, criteri di spareggio avanzati, allineamento visivo con le altre pagine pubbliche). Nessun documento di pianificazione (PRD/architettura/UX del 2026-07-13/2026-08-13) menziona il torneo: l'intero dominio è stato specificato direttamente nell'epica dopo quei documenti, che restano rilevanti solo per le convenzioni tecniche trasversali del progetto.

## Stories

- Story 20.1: Edizione del torneo e Categorie
- Story 20.2: Squadre partecipanti e gironi
- Story 20.3: Risultati di girone e classifica automatica
- Story 20.4: Tabellone semifinali/finali e classifica finale
- Story 20.5: Immagine di sfondo del torneo (volantino)
- Story 20.6: Sezione pubblica del Torneo Memorial
- Story 20.7: Nome dell'Edizione del Torneo
- Story 20.8: Cancellazione delle partite di una Categoria
- Story 20.9: Slot orari e Palestre per le partite del Torneo
- Story 20.10: Allineamento layout pubblico Torneo alle altre pagine pubbliche
- Story 20.11: Numero progressivo delle gare del Torneo
- Story 20.12: Creazione Slot di girone su tutte le Palestre in un solo passaggio
- Story 20.13: Nome personalizzato delle Settimane del Torneo
- Story 20.14: Contenuti centrati nella pagina pubblica del Torneo
- Story 20.15: Vista tabellare delle squadre iscritte per Girone
- Story 20.16: Punti realizzati nei set e nuovo criterio di spareggio (quoziente set/punti)
- Story 20.17: Sfondo grigio chiaro su `/torneo` e ordinamento delle griglie per Slot
- Story 20.18: Campi delle Palestre nella generazione in blocco degli Slot di girone
- Story 20.19: Vista tabellare di tutti gli incontri di una Categoria su `/torneo`

## Requirements & Constraints

- Formula torneo: 2 gironi all'italiana per Categoria (tutti contro tutti nel proprio girone), incontri al meglio dei 3 set, punti incontro 3 (2-0) / 2 (2-1) / 1 (1-2) / 0 (0-2). Classifica di girone: ordinamento primario per punti; spareggio a parità di punti storicamente per set vinti assoluti (20.3), poi rivisto in quoziente set e, a ulteriore parità, quoziente punti realizzati/subiti nei set (20.16) — denominatore zero da trattare come quoziente massimo, non errore.
- Al termine dei gironi: incrocio incrociato standard per le semifinali (1°A-2°B, 1°B-2°A per il tabellone 1°-4°; 3°A-4°B, 3°B-4°A per il tabellone 5°-8°), poi finali vincenti/perdenti in ciascun tabellone.
- Un punteggio non coerente con "al meglio dei 3" (set vinto da entrambe, più di 3 set, una squadra oltre i set necessari) va rifiutato esplicitamente; modificare un risultato ricalcola subito la classifica (nessuno stato "congelato").
- "Squadra torneo" è un'entità leggera e indipendente dai `Gruppo`/`Atleta`/`Allenatore` interni: il torneo ospita anche club esterni senza alcuna riga nel resto del sistema.
- Eliminazioni fail-closed: un'edizione non si elimina con Categorie/squadre iscritte con incontri; una Squadra non si elimina con incontri registrati; una Categoria non si elimina con Squadre esistenti — pattern coerente col resto del progetto, salvo la via di sblocco esplicita introdotta da 20.8 ("cancella tutte le partite" di una Categoria, operazione distruttiva con conferma).
- Perimetro di gestione: `requireRuolo(["ADMIN","DIRIGENTE"])` su tutta la sezione `/app/torneo` (stesso perimetro di Epic 10 Campionati/Partite) — nessun nuovo Ruolo introdotto per questa epica, a differenza dell'Epic 19.
- Sezione pubblica `/torneo`: sempre coerente col resto del sito pubblico — nessuno stile ad hoc, nessuna tabella/sezione vuota fuorviante quando mancano dati (mostrare "nessuna squadra"/assenza di classifica invece di un errore o un vuoto ambiguo).
- Ogni nuova tabella strutturale (EdizioneTorneo, CategoriaTorneo, SquadraTorneo, PartitaTorneo, SlotTorneo) richiede RLS abilitata + REVOKE espliciti, mai solo un commento — regola permanente del progetto dopo la scoperta di tabelle esposte pubblicamente nel 2026-08-04.
- Validazione/storage dell'immagine volantino: stesso vincolo già in uso per foto sfondo hero (PNG/JPEG, 2MB, `lib/storage/validazione-immagine.ts`), bucket Storage pubblico dedicato (mirror pattern sponsor/foto-hero).

## Technical Decisions

- Split di accesso ai dati del progetto (AD-9): le tabelle protette da RLS si leggono/scrivono a runtime tramite client Supabase (`supabase-js`), non Prisma diretto, perché solo così i claim del JWT arrivano a PostgREST e le policy RLS si applicano; Prisma resta proprietario di schema/migrazioni per tutte le tabelle e viene usato a runtime con connessione privilegiata solo per le tabelle esplicitamente non protette da RLS (es. Palestra, Campo, Slot, Gruppo, Allenatore). Le nuove entità del torneo vanno collocate consapevolmente in uno dei due mondi.
- Ruoli: letti da `app_metadata` Supabase nel middleware (AD-11), con Prisma/UtenteRuolo come fonte di verità sincronizzata — nessuna logica di autorizzazione nuova per questa epica, solo riuso di `requireRuolo`.
- Riuso diretto di entità esistenti, mai nuove anagrafiche parallele: `Palestra`/`Campo` (Epic 2) per gli Slot torneo, `costruisciLinkNaviga`/`lib/link-naviga-palestra.ts` per il link "Naviga" già in uso su `/calendario`.
- `SlotTorneo` (20.9) è scoped per `EdizioneTorneo` (non per Categoria, un weekend ospita più Categorie in parallelo): `etichetta`, `data`, `ora`, `palestraId` (FK Palestra), `fase` (riuso enum `FaseTorneo`), `tabellone` (riuso `TabelloneTorneo?`) con lo stesso vincolo CHECK `fase = GIRONE ⟺ tabellone IS NULL` già in produzione su `PartitaTorneo`. `PartitaTorneo.slotTorneoId` è l'unico campo nuovo lì — la palestra si legge sempre per transito dallo Slot, mai duplicata. Nessun placeholder/squadra fantasma: `squadraCasaId`/`squadraOspiteId` restano sempre obbligatori. Assegnazione mista: manuale per il girone, automatica best-effort (primo Slot libero) per semifinali/finali al momento della generazione, sempre modificabile a mano dopo; nessun vincolo di unicità DB su uno Slot occupato, solo un avviso esplicito in Server Action prima di sovrascrivere; nessun blocco se mancano Slot.
- `SlotTorneo.campoId` (20.18, nullable, FK `Campo`) estende solo il flusso di generazione in blocco per la fase GIRONE (20.12): una riga selezionabile per ciascun Campo di ciascuna Palestra, preselezionate di default, lette sempre server-side; il form di singolo Slot per semifinali/finali resta legato solo a Palestra.
- Numerazione progressiva delle gare (20.11): scope per Edizione (unica sequenza cross-categoria), semifinali/finali proseguono la stessa sequenza, mai editabile a mano, vincolo unico a livello DB per le collisioni da generazione concorrente (race accettata a basso rischio, pattern già in uso altrove nell'epica).
- Nome Edizione (20.7) e nomi personalizzati Settimana 1/2 (20.13) sono campi testuali opzionali/obbligatori su `EdizioneTorneo` con fallback all'etichetta generica esistente — stesso pattern, nessuna migrazione dati distruttiva.
- Formato errori Server Action del progetto: `{ error: { code, message } }`, con `code: 'FORBIDDEN'` riservato ai soli rifiuti di autorizzazione.

## UX & Interaction Patterns

- Le pagine pubbliche del sito seguono il sistema di design "Poster Sportivo" (DESIGN.md/EXPERIENCE.md, finalizzato 2026-08-13): sfondo bianco prevalente, con `{colors.grigio-chiaro}` (`#F2F5F7`) riservato a sezioni specifiche per separarle leggermente (già usato da `/squadre`) — `/torneo` adotta questo stesso grigio chiaro (20.17), non un riquadro bianco con ombra per Categoria (rimosso in 20.10, mirror strutturale di `.sezioneSettimana` in `/calendario`).
- Nessuna pagina pubblica del sito applicava, prima di questa epica, un contenitore centrato a livello di intera pagina; `/torneo` introduce questo pattern per sé (20.14) come caso limitato, non un retrofit automatico delle altre pagine pubbliche.
- Interazioni di riordino/gestione liste nel gestionale non usano librerie drag-and-drop: pattern bottoni Su/Giù con persistenza immediata (riferimento da Epic 19, riusabile se pertinente a liste del torneo).
- Le griglie di incontri (girone/semifinali) vanno ordinate per data/ora dello Slot assegnato quando presente, con gli incontri senza Slot sempre in coda (20.17).
- Viste tabellari aggiuntive (squadre per girone in colonne, 20.15; tutti gli incontri di una Categoria in un'unica tabella dietro un pulsante "mostra", 20.19) affiancano sempre la vista grafica a card esistente, senza mai sostituirla o nasconderla di default.

## Cross-Story Dependencies

- 20.2 dipende da 20.1 (Categoria/numero massimo squadre); 20.3 dipende dalle squadre/gironi di 20.2; 20.4 dipende dalla classifica completa di entrambi i gironi da 20.3; 20.6 (vetrina pubblica) dipende dai dati di 20.1-20.5.
- 20.8 (cancellazione partite) sblocca a catena le cancellazioni già vincolate da 20.1/20.2: Squadre non cancellabili con incontri, Categoria non cancellabile con Squadre — 20.8 rimuove le partite per riaprire quella catena, senza modificare la logica di generazione di 20.3/20.4.
- 20.9 (Slot) si aggancia automaticamente alla generazione di 20.4 (semifinali/finali) e resta senza effetto se non ci sono mai Slot creati (nessuna regressione su 20.3/20.4 preesistenti). 20.12 e 20.18 estendono solo il flusso di generazione in blocco di 20.9 per la fase GIRONE.
- 20.11 (numerazione) si aggancia sia a `generaCalendarioGironiAction` sia a `generaTabelloneAction` (20.3/20.4), mantenendo un'unica sequenza per Edizione.
- 20.16 riapre e sostituisce esplicitamente il criterio di spareggio "set vinti assoluti" stabilito da 20.3, in entrambe le viste (pubblica e admin) contemporaneamente — nessuna delle due può restare sulla vecchia logica.
- 20.10 → 20.14 → 20.17: tre story successive sullo stesso file pubblico (`app/torneo/torneo-pubblico.module.css`/`page.tsx`), ciascuna verificata dal vivo dopo il deploy della precedente (dev locale rotto su questa macchina, nessuna verifica visiva in sandbox) — 20.14 riapre parzialmente una decisione di 20.10 ("niente max-width centrato") su richiesta esplicita dell'utente dopo il deploy reale.
- 20.13 dipende dallo stesso pattern di campo testuale già introdotto da 20.7 su `EdizioneTorneo`, e i suoi nomi di Settimana devono propagarsi sia alla pagina admin sia a `/torneo` ovunque `SettimanaTorneo` è oggi mostrato.
