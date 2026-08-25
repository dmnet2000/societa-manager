# Epic 20 Context: Torneo Memorial

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dare alla società uno strumento per gestire il torneo annuale "Memorial" che già organizza (tipicamente 2 weekend, 2 categorie a weekend, fino a 8 squadre per categoria): iscrizione di Categorie e Squadre, inserimento risultati per set, calcolo automatico delle classifiche di girone, generazione del tabellone di semifinale/finale e della classifica finale, caricamento del volantino dell'edizione — così da non dover più calcolare a mano punti, spareggi e accoppiamenti durante l'evento. Include anche una sezione pubblica sul sito che mostra classifiche, risultati, tabellone e volantino ai visitatori. Nota: epica aggiunta il 2026-08-19 fuori dal ciclo PRD/architettura originale — nessun documento PRD/architettura/UX tratta il Torneo; le decisioni tecniche sotto vengono dal testo dell'epica stessa (chiarito con l'utente il 2026-08-23) e dalle convenzioni di progetto esistenti.

## Stories

- Story 20.1: Edizione del torneo e Categorie
- Story 20.2: Squadre partecipanti e gironi
- Story 20.3: Risultati di girone e classifica automatica
- Story 20.4: Tabellone semifinali/finali e classifica finale
- Story 20.5: Immagine di sfondo del torneo (volantino)
- Story 20.6: Sezione pubblica del Torneo Memorial

## Requirements & Constraints

- Struttura: un'edizione annuale del torneo contiene Categorie (nome, week 1 o 2, numero massimo squadre fino a 8); ogni Categoria ha Squadre partecipanti ripartite su 2 gironi (A/B).
- Formula di girone: "all'italiana" (tutti contro tutti nello stesso girone), ogni incontro al meglio dei 3 set. Punti per incontro: 3 (vittoria 2-0), 2 (vittoria 2-1), 1 (sconfitta 1-2), 0 (sconfitta 0-2). Classifica di girone ordinata per punti totali; a parità di punti lo spareggio è il numero di set vinti.
- Un punteggio incoerente con "al meglio dei 3 set" (set vinto da entrambe le squadre, più di 3 set, una squadra oltre 2/3 set vinti) è rifiutato con errore esplicito. Modificare un risultato già inserito ricalcola subito la classifica del girone (nessuno stato "congelato").
- Dopo i gironi: tabellone di posizionamento generato solo quando la classifica di entrambi i gironi della Categoria è completa (tutti gli incontri registrati) — un tentativo prima di allora è rifiutato con errore esplicito. Semifinali 1°-4°: 1°girone A-2°girone B, 1°girone B-2°girone A. Semifinali 5°-8°: 3°girone A-4°girone B, 3°girone B-4°girone A. Da ciascuna coppia di semifinali: finale vincenti (1°/2° posto o 5°/6°) e finale perdenti (3°/4° posto o 7°/8°), tutte al meglio dei 3 set. Classifica finale 1°-8° consultabile a tabellone completo.
- Limiti con fail-closed (stesso principio già in uso altrove nel progetto): un'edizione non eliminabile se ha Categorie con squadre iscritte; una Squadra non eliminabile se ha incontri già registrati; iscrizione oltre il numero massimo di squadre impostato per la Categoria rifiutata con errore esplicito.
- Gestione (CRUD edizione/Categorie/Squadre, inserimento risultati, generazione tabellone, upload volantino) riservata a Admin/Dirigente; un Utente senza quei Ruoli non raggiunge le pagine (redirect, pattern standard di route protette del progetto).
- Sezione pubblica senza autenticazione: volantino dell'edizione corrente, elenco Categorie, classifica di girone aggiornata per ciascuna, tabellone/risultati una volta generato, classifica finale. Una Categoria senza risultati ancora registrati mostra solo le squadre iscritte, mai una tabella vuota o un errore.

## Technical Decisions

- Nuove tabelle Prisma: `EdizioneTorneo` (anno, timestamp), `CategoriaTorneo` (nome, edizione, week 1|2, numero massimo squadre), `SquadraTorneo` (nome, categoria, girone A|B, referente, contatto). Ogni tabella strutturale nuova va comunque messa in RLS ENABLE + REVOKE espliciti anche quando non "protetta" ai sensi della regola RLS-a-runtime del progetto — vale per queste come per ogni altra tabella.
- `SquadraTorneo` è un'entità indipendente da `Gruppo`/`Atleta`/`Allenatore`: il torneo ospita anche club esterni senza alcuna riga nel modello interno. Nessun riuso diretto del modello Campionato/Partita di Epic 10 (Gestione Partite e Campionati) — stessi concetti di dominio (partite, risultati, classifiche) ma presupposti diversi (squadra esterna vs Gruppo interno, nessun concetto di girone/categoria-torneo/edizione in Epic 10); trattarlo come riferimento di pattern (struttura risultato/parziali), non come base di riuso.
- Multi-edizione: se serve archiviare/consultare edizioni passate fin dalla prima story, il pattern di riferimento è l'Anno Agonistico (partizione temporale con helper "stagione corrente" condiviso) — da confermare in apertura story 20.1; in alternativa singola edizione "corrente" per ora, modello esteso più avanti.
- Volantino (20.5): stesso pattern di validazione (PNG/JPEG, 2MB, `lib/storage/validazione-immagine.ts`) e stesso messaggio di errore già in uso per la foto sfondo hero del sito pubblico; storage in un bucket Supabase Storage pubblico dedicato (mirror del pattern sponsor/foto-hero/logo); un nuovo upload sostituisce quello esistente per l'edizione, mai accumulo di file.
- Convenzioni di progetto da rispettare: modelli Prisma in italiano, PascalCase singolare; route/file kebab-case; Server Action con verbo esplicito (es. `generaTabellone`); ogni mutazione via Server Action, mai scrittura diretta dal client; errori come `{ error: { code, message } }`, con `code: 'FORBIDDEN'` riservato esclusivamente ai rifiuti di autorizzazione (mai per un dato semplicemente non trovato).
- Perimetro Ruoli: stesso di Epic 10 (Admin/Dirigente) — nessuna nuova entità Ruolo introdotta per questa epica, a differenza dell'Epic 19.
- Punti aperti da confermare in apertura story, non bloccanti per iniziare 20.1: ripartizione esatta delle squadre nei due gironi (paritaria 4+4 o variabile) e conferma dell'assunzione "incrocio standard" per gli accoppiamenti di tabellone.

## UX & Interaction Patterns

- La sezione pubblica del torneo segue il sistema di design "Poster Sportivo" (registro energico da manifesto/stadio) già in uso nel resto del sito pubblico: blocchi di contenuto in blu-carbone (header/hero/footer) su fondo prevalentemente bianco/grigio-chiaro — non un sito dark-mode; tagli diagonali (`clip-path`) invece di angoli arrotondati; tipografia condensata peso 900 maiuscola (via CSS, mai testo sorgente maiuscolo) per titoli; nessun webfont.
- Incontri/risultati: riusare il pattern visivo già stabilito per le partite del sito pubblico (blocco colore pieno dedicato, taglio diagonale asimmetrico, nomi squadra allineati a sinistra con "vs" evidenziato, metadati data/luogo in tono chiaro dedicato) invece di introdurre un nuovo stile.
- Pulsanti (es. "Genera tabellone", azioni di gestione) riusano il pulsante primario del sistema: blocco pieno azzurro, testo blu-carbone, nessun radius, hover sfondo bianco + sollevamento.
- Volantino: mostrato come immagine a piena area per l'edizione corrente; nessun placeholder testuale improvvisato se assente — coerente col trattamento fotografico intenzionale già in uso altrove sul sito pubblico.
- Categoria senza risultati ancora registrati: mostrare solo le squadre iscritte, mai una tabella vuota o un errore — stesso principio "nessuna area vuota fuorviante" già applicato ad altre sezioni del sito pubblico.
- Nessuna decorazione non essenziale (parallax, caroselli automatici, animazioni di ingresso pagina) — solo micro-animazioni di stato, coerente col resto del sistema.

## Cross-Story Dependencies

- 20.2 dipende da 20.1: la Categoria e il suo numero massimo di squadre devono esistere prima di iscrivere Squadre.
- 20.3 dipende da 20.2: il calendario di girone si genera dalle Squadre già assegnate ai gironi A/B.
- 20.4 dipende da 20.3: il tabellone si genera solo a classifica di entrambi i gironi completa.
- 20.5 (upload volantino sull'edizione di 20.1) è indipendente dalle story 20.2-20.4.
- 20.6 dipende da tutte le precedenti (20.1-20.5): la sezione pubblica consuma edizione, Categorie, Squadre, risultati/classifiche, tabellone e volantino già costruiti dalle altre story.
