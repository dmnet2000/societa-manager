# Epic 11 Context: Bug di Produzione

<!-- Compilato dagli artefatti di pianificazione. Modificabile liberamente. -->

## Goal

Epic aggiunto in corso d'opera (2026-07-27) su richiesta dell'utente per raccogliere difetti reali osservati in produzione (log di errore, comportamento scorretto) — a differenza di Epic 9 (miglioramenti/richieste dell'utente), qui ogni storia nasce da un sintomo/evidenza osservata (log, screenshot, segnalazione), non da un requisito. L'elenco resta **aperto**: le storie vengono aggiunte una alla volta man mano che un bug viene segnalato, non tutte definite in anticipo. Nessuna FR propria.

## Stories

- Story 11.1: Errore interno al precaricamento Allenatore (POST /precaricamento-allenatori) — **done**
- Story 11.2: Errore 500 sulla pagina Palestre (GET /palestre) — **done**
- Story 11.3: "Invalid login" sull'invio email (POST /smtp) — **done**

## Requirements & Constraints

- Nessun requisito funzionale (FR) formale copre questo epic: le storie nascono da evidenza diretta in produzione (log, comportamento scorretto), non dal PRD.
- **La causa di ogni bug va confermata in fase di sviluppo, mai assunta a priori** — stesso principio già applicato ai gap "causa probabile ma non confermata" di Epic 9 (es. Story 9.7). Un'ipotesi di causa documentata in una storia è un punto di partenza per l'indagine, non una diagnosi definitiva.
- Ogni correzione deve preservare il comportamento esistente delle Server Action/route guard già in produzione: nessuna regressione, suite Vitest esistente deve continuare a passare (stesso vincolo di Epic 8/9).
- Story 11.1: log di produzione fornito dall'utente è minificato (`worker.js`, nessuna sourcemap) — non identifica la riga di codice applicativo reale, solo che un'eccezione è stata sollevata e catturata durante la gestione della richiesta. Va trattato come indizio, non come stack trace leggibile.

## Technical Decisions

- Story 11.1: causa **confermata** (2026-07-27) — l'ipotesi iniziale era corretta: la migrazione `20260727000000_add_cognome_allenatore` (Story 9.5, colonna `Allenatore.cognome` `NOT NULL`) non era ancora stata applicata al database di produzione nel momento in cui il codice di Story 9.5 era già live, causando il fallimento dell'`INSERT` in `precaricaAllenatore` (catturato dal `try/catch` esistente, da cui `level: error` nei log con `statusCode: 200`). Risolto lanciando `DIRECT_URL="..." npx prisma migrate deploy` (Session pooler, `?sslmode=require`, vedi `docs/deploy-produzione.md` Fase 3) sul DB di produzione — precaricamento riprovato con successo, nessun nuovo errore. **Lezione per le prossime storie con migrazione**: applicare la migrazione al DB di produzione **prima o contestualmente** al deploy del codice che la richiede, non dopo — l'ordine seguito per Story 9.5 (codice deployato, migrazione lanciata solo in un secondo momento) ha causato questo bug.

- Story 11.2: causa **confermata** (2026-07-27) — seconda occorrenza della stessa classe di problema di Story 11.1: la migrazione `20260727010000_add_coordinate_palestra` (Story 9.6 estensione, colonne `Palestra.latitudine`/`longitudine`) non era stata applicata al database di produzione mentre il codice/Prisma Client rigenerato in build la richiedeva già — `/palestre/page.tsx` esegue `prisma.palestra.findMany(...)` senza alcun `try/catch`, quindi l'errore Postgres non è stato catturato ed è risultato in un vero 500 (a differenza di Story 11.1, dove l'errore era catturato dentro una Server Action). Risolto lanciando `prisma migrate deploy` in produzione, confermato dall'utente. **Essendosi ripetuto due volte di fila**, aggiunto un promemoria esplicito in `docs/deploy-produzione.md` (nuova Fase 3bis) per non ripeterlo una terza volta.

- Story 11.3: causa **confermata** (2026-07-27) — diversa classe dai bug precedenti (11.1/11.2, entrambi problemi di migrazione non applicata): due cause di configurazione in sequenza, nessun difetto di codice. Prima credenziali SMTP sbagliate ("Invalid login", AUTH rifiutato); corrette quelle, l'"Indirizzo mittente" configurato non coincideva con l'account SMTP autenticato ("Utente"), causando il rifiuto del comando `MAIL FROM`. Risolto dall'utente correggendo entrambi i campi in `/smtp`.

## Cross-Story Dependencies

- Story 11.1 è collegata a Story 9.5 (Campo Cognome per Allenatore, Epic 9) per l'ipotesi di causa — non ne dipende funzionalmente, ma la correzione (se la causa fosse confermata) potrebbe richiedere di rivedere l'ordine deploy-codice/migrazione seguito per quella storia, rilevante anche per future storie con migrazione.
- Story 11.2 è collegata a Story 9.6 (Geolocalizzazione Palestre, estensione, Epic 9) per la stessa ragione — seconda occorrenza sospetta della stessa classe di problema già vista in Story 11.1 (Story 9.5).
