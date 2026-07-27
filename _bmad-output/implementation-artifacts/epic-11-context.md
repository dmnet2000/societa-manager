# Epic 11 Context: Bug di Produzione

<!-- Compilato dagli artefatti di pianificazione. Modificabile liberamente. -->

## Goal

Epic aggiunto in corso d'opera (2026-07-27) su richiesta dell'utente per raccogliere difetti reali osservati in produzione (log di errore, comportamento scorretto) — a differenza di Epic 9 (miglioramenti/richieste dell'utente), qui ogni storia nasce da un sintomo/evidenza osservata (log, screenshot, segnalazione), non da un requisito. L'elenco resta **aperto**: le storie vengono aggiunte una alla volta man mano che un bug viene segnalato, non tutte definite in anticipo. Nessuna FR propria.

## Stories

- Story 11.1: Errore interno al precaricamento Allenatore (POST /precaricamento-allenatori) — backlog

## Requirements & Constraints

- Nessun requisito funzionale (FR) formale copre questo epic: le storie nascono da evidenza diretta in produzione (log, comportamento scorretto), non dal PRD.
- **La causa di ogni bug va confermata in fase di sviluppo, mai assunta a priori** — stesso principio già applicato ai gap "causa probabile ma non confermata" di Epic 9 (es. Story 9.7). Un'ipotesi di causa documentata in una storia è un punto di partenza per l'indagine, non una diagnosi definitiva.
- Ogni correzione deve preservare il comportamento esistente delle Server Action/route guard già in produzione: nessuna regressione, suite Vitest esistente deve continuare a passare (stesso vincolo di Epic 8/9).
- Story 11.1: log di produzione fornito dall'utente è minificato (`worker.js`, nessuna sourcemap) — non identifica la riga di codice applicativo reale, solo che un'eccezione è stata sollevata e catturata durante la gestione della richiesta. Va trattato come indizio, non come stack trace leggibile.

## Technical Decisions

- Story 11.1: causa probabile ma **non confermata** — la rotta `POST /precaricamento-allenatori` corrisponde alla Server Action `precaricaAllenatore` (`app/(onboarding-import)/precaricamento-allenatori/actions.ts`), modificata da Story 9.5 (nuovo campo `Allenatore.cognome`, `NOT NULL`, migrazione `20260727000000_add_cognome_allenatore`). Ipotesi: una finestra temporale in cui il codice era già deployato ma la migrazione non ancora applicata al database di produzione (o viceversa) farebbe fallire l'`INSERT` (colonna mancante o vincolo NOT NULL); l'eccezione verrebbe catturata dal `try/catch` già esistente in `precaricaAllenatore` (che logga con `console.error` e restituisce un messaggio generico all'Utente) — spiegherebbe sia il `level: error` sia lo `statusCode: 200` osservati nel log. Da confermare in sviluppo: stato della migrazione in produzione, riproducibilità dell'errore ora, e se possibile il testo/stack completo non minificato.

## Cross-Story Dependencies

- Story 11.1 è collegata a Story 9.5 (Campo Cognome per Allenatore, Epic 9) per l'ipotesi di causa — non ne dipende funzionalmente, ma la correzione (se la causa fosse confermata) potrebbe richiedere di rivedere l'ordine deploy-codice/migrazione seguito per quella storia, rilevante anche per future storie con migrazione.
