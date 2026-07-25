# Epic 9 Context: Miglioramenti Post-Rilascio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic aggiunto in corso d'opera (2026-07-25) per raccogliere lacune e miglioramenti puntuali emersi dalla verifica dal vivo in produzione dopo il completamento di Epic 1-8, non pianificati nel PRD originale. A differenza degli epic precedenti, l'elenco delle storie resta **aperto**: vengono aggiunte una alla volta man mano che emergono, non tutte definite in anticipo. Nessuna FR propria finora. Le storie toccano prevalentemente il layout globale/barra di navigazione introdotti in Story 8.1 e alcune piccole lacune di modello dati/UX individuate a posteriori.

## Stories

- Story 9.1: Pulsante di logoff — **done**
- Story 9.2: Navigazione responsive — hamburger su mobile, barra laterale verticale su desktop — **done**
- Story 9.3: Riquadro con larghezza massima per le pagine-form — **done**
- Story 9.4: Menu profilo con logoff e modifica password (sostituisce/estende 9.1) — backlog
- Story 9.5: Campo Cognome per Allenatore (precaricamento) — backlog
- Story 9.6: Geolocalizzazione Palestre — backlog
- Story 9.7: Barra laterale ancora visibile dopo il logoff — backlog

## Requirements & Constraints

- Nessun requisito funzionale (FR) formale copre questo epic: le storie nascono da osservazione diretta in produzione, non dal PRD.
- Ogni storia deve preservare il comportamento esistente delle Server Action/route guard già in produzione: nessuna regressione, suite Vitest esistente deve continuare a passare (stesso vincolo già applicato in Epic 8).
- Le voci di navigazione mostrate devono sempre derivare dalla stessa fonte usata dal route guard per l'autorizzazione (nessuna lista duplicata mantenuta a mano) — vincolo esplicito ereditato da Story 8.1 e riconfermato in 9.2.
- Un logoff deve essere fail-closed: in caso di errore nella terminazione della sessione, il comportamento di default deve comunque impedire l'accesso residuo (lezione già applicata durante il code review di Story 9.1: try/catch fail-closed).
- Dopo il logoff, nessun elemento di navigazione o pagina protetta deve restare visibile/raggiungibile per accesso residuo — né lato server (middleware su URL diretto o tasto "indietro", Story 9.1) né lato client (Story 9.7: la barra/drawer di navigazione stessa non deve sopravvivere visivamente al redirect verso `/accedi`).
- Story 9.5 introduce un'asimmetria nota e accettata (per ora) tra `Allenatore` (avrà `cognome`) e `Atleta` (resta solo `nome`) — non è una FR, è un'osservazione emersa in analisi, esplicitamente fuori perimetro salvo storia futura dedicata.
- Story 9.6 va progettata tenendo conto del riuso imminente in Epic 10 (geolocalizzazione anche per partite in trasferta, potenzialmente non corrispondenti a una Palestra già censita) — preferire la soluzione più semplice compatibile con NFR6 (nessun servizio esterno a pagamento) salvo necessità reale di coordinate precise.

## Technical Decisions

- Errori delle Server Action nel formato `{ error: { code, message } }`; `code: 'FORBIDDEN'` riservato esclusivamente ai rifiuti di autorizzazione (mai `NOT_FOUND` per un dato esistente ma non accessibile).
- Confini per modulo/feature restano validi (AD-2); `Allenatore`/`Palestra` non sono protette da RLS — le modifiche di schema passano da Prisma diretto (AD-9), senza necessità di aggiornare policy.
- Ogni cambio di schema Prisma passa da migrazione (AD-3) — rilevante per Story 9.5 (nuovo campo `Allenatore.cognome`) e Story 9.6 se si sceglie l'opzione con coordinate dedicate.
- `esci()` (Server Action di logoff, introdotta in Story 9.1) va riusata invariata dalle storie successive (9.2, 9.4, 9.7) — non duplicata, non riscritta.
- La sorgente delle voci di navigazione filtrate per ruolo è condivisa con il route guard (`lib/auth/route-guard.ts` / `lib/auth/voci-navigazione.ts`) — qualunque nuova UI di navigazione (drawer mobile, barra laterale, menu profilo) legge da lì.
- Story 9.2 (implementata): navigazione mobile a drawer resa client-side (stato "aperto" gestito in un Client Component separato dal Server Component di navigazione) — introduce una dipendenza da JavaScript sul drawer mobile, accettata come compromesso ragionevole (nessun requisito "nessun JS" nel progetto).
- Story 9.7: il componente di navigazione già ritorna `null` in assenza di sessione (comportamento corretto lato server, invariato da Story 8.1/9.2) — il problema segnalato è che dopo il `redirect()` della Server Action di logoff, la barra/drawer resta visibile su `/accedi` nonostante quel guard-clause. Causa probabile ma **non confermata**: cache di navigazione lato client di Next.js che non ri-richiede il layout radice (di cui la navigazione fa parte) dopo il redirect, mostrando l'ultimo output noto invece di quello aggiornato. Da investigare e confermare in sviluppo, non assumere la causa a priori. Distinto dal gap già noto e deferito per Story 9.1 (bfcache sul tasto "indietro" del browser): quello è navigazione all'indietro, questo è la navigazione in avanti causata dal logoff stesso — soluzioni diverse, non risolvibili con la stessa patch.
- Pattern di errore/validazione dei form: stesso stile già usato nelle altre Server Action del progetto (messaggio chiaro, nessuna chiamata downstream se la validazione fallisce lato server).
- Story 9.4: `supabase.auth.updateUser({ password })` è il meccanismo previsto per il cambio password (nessuna verifica della password attuale richiesta da Supabase); da decidere in sviluppo se aggiungere un campo di conferma lato form e una policy di lunghezza minima.
- Story 9.6: due opzioni aperte, da decidere in sviluppo — (a) link "Naviga" che apre Maps con ricerca testuale sull'`indirizzo` già esistente di `Palestra` (nessuna migrazione, coerente con NFR6), oppure (b) campo coordinate dedicato inserito a mano dall'Admin/Dirigente (richiede migrazione).

## UX & Interaction Patterns

- Componente `nav-bar` (`DESIGN.md`): sfondo `{colors.navy}`, tipografia `{typography.nav-item}`, voce attiva con `{colors.button-bg}`, contorno di focus `2px solid {colors.focus-ring-on-navy}` (bianco, non lo stesso ring usato su sfondo chiaro) — vincolo riconfermato per ogni nuova forma che la navigazione assume (drawer, barra laterale, menu profilo, e per la correzione richiesta da 9.7).
- **Story 9.2 ha invertito deliberatamente** la decisione precedente di `EXPERIENCE.md` ("nessuna barra laterale o drawer, singola barra orizzontale"); il documento è già stato aggiornato di conseguenza (stesso principio seguito per altre correzioni di rotta, Epic 7/8). Resta invariato solo il vincolo "nessuno stack modale a più di un livello aperti insieme".
- Comportamento drawer (mobile, implementato): barra superiore con solo logo/nome settore + pulsante hamburger; il menu si apre/chiude su selezione voce, tocco fuori, o tasto Esc; ordine di tabulazione logico con focus visibile su ogni elemento. Lacune note e deferite (non bloccanti): nessuna gestione esplicita del focus in apertura/chiusura, nessun `role="dialog"`/`aria-modal`, drawer trattato come landmark `<nav>` + `inert` quando chiuso.
- Comportamento barra laterale (desktop, implementato): sempre visibile/aperta, nessun pulsante toggle, stesse voci/logo/nome settore/logoff della versione mobile, resta fissa al cambio pagina.
- Story 9.7 richiede che questa sparizione sia priva di "flash" visibile (nessun lampo della barra prima che scompaia) sia in versione desktop (barra laterale) sia mobile (drawer/hamburger) — stesso requisito di pulizia visiva su entrambi i breakpoint.
- Pattern "riquadro di larghezza massima" (Story 9.3, implementato): estende come voce riusabile di `DESIGN.md` il pattern `.pagina`/`.riquadro` di `accedi.module.css` in due forme globali — `.pagina-form`/`.riquadro-form` (max-width 480px, pagine-form autonome) e due regole trasversali aggiunte successivamente su feedback utente: `max-width: 1000px` su ogni `<main>` (selettore `.contenuto > main`, nessuna pagina toccata singolarmente) e `max-width: 400px` su ogni input/select/textarea. Si applica sempre; le pagine-tabella (es. `/admin`, `/gruppi`, `/palestre`) restano escluse dal riquadro-form stretto ma beneficiano comunque del vincolo trasversale su `<main>`.
- Guard-clause per elementi opzionali mancanti (es. link "Naviga" assente se la Palestra non ha posizione impostata) segue lo stesso principio già usato per il logo mancante in Story 7.2 — mai un elemento rotto/vuoto mostrato.

## Cross-Story Dependencies

- Story 9.4 sostituisce/estende la Story 9.1 (già done): il pulsante "Esci" isolato va spostato dentro il nuovo menu profilo, non duplicato; la Server Action `esci()` resta invariata.
- Ordine di sviluppo consigliato tra 9.2 e 9.4: **9.2 prima di 9.4** (già rispettato: 9.2 è done), per non dover ricostruire due volte il posizionamento della navigazione/menu profilo.
- Story 9.7 dipende dal risultato di Story 9.1 (Server Action `esci()`, redirect a `/accedi`) e Story 9.2 (componente di navigazione con drawer mobile/barra laterale desktop): il fix va verificato su entrambe le forme di navigazione introdotte da 9.2. Qualunque fix di caching/invalidazione qui adottato va tenuto a mente anche per Story 9.4 (menu profilo), che tocca lo stesso componente.
- Story 9.5 richiede una mappatura di impatto su ogni punto che mostra `allenatore.nome` (es. righe Gruppo, wizard nuova stagione) prima di decidere se concatenare "Nome Cognome" o lasciare invariato.
- Story 9.6 è collegata al futuro Epic 10 (Gestione Partite e Campionati): il meccanismo di geolocalizzazione scelto qui va progettato pensando al riuso per le partite in trasferta, o esplicitamente limitato alle sole Palestre proprie con nota del gap.
