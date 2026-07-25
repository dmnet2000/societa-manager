# Epic 9 Context: Miglioramenti Post-Rilascio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic aggiunto in corso d'opera (2026-07-25) per raccogliere lacune e miglioramenti puntuali emersi dalla verifica dal vivo in produzione dopo il completamento di Epic 1-8, non pianificati nel PRD originale. A differenza degli epic precedenti, l'elenco delle storie resta **aperto**: vengono aggiunte una alla volta man mano che emergono, non tutte definite in anticipo. Nessuna FR propria finora (da aggiornare se una storia futura ne introduce). Le storie toccano prevalentemente il layout globale/barra di navigazione introdotti in Story 8.1 e alcune piccole lacune di modello dati/UX individuate a posteriori.

## Stories

- Story 9.1: Pulsante di logoff — **done**
- Story 9.2: Navigazione responsive — hamburger su mobile, barra laterale verticale su desktop — **review**
- Story 9.3: Riquadro con larghezza massima per le pagine-form — backlog
- Story 9.4: Menu profilo con logoff e modifica password (sostituisce/estende 9.1) — backlog
- Story 9.5: Campo Cognome per Allenatore (precaricamento) — backlog
- Story 9.6: Geolocalizzazione Palestre — backlog

## Requirements & Constraints

- Nessun requisito funzionale (FR) formale copre questo epic: le storie nascono da osservazione diretta in produzione, non dal PRD.
- Ogni storia deve preservare il comportamento esistente delle Server Action/route guard già in produzione: nessuna regressione, suite Vitest esistente deve continuare a passare (stesso vincolo già applicato in Epic 8).
- Le voci di navigazione mostrate devono sempre derivare dalla stessa fonte usata dal route guard per l'autorizzazione (nessuna lista duplicata mantenuta a mano) — vincolo esplicito ereditato da Story 8.1 e riconfermato in 9.2.
- Un logoff deve essere fail-closed: in caso di errore nella terminazione della sessione, il comportamento di default deve comunque impedire l'accesso residuo (lezione già applicata durante il code review di Story 9.1: try/catch fail-closed).
- Dopo il logoff, il middleware deve rifiutare l'accesso a pagine protette anche via cache/tasto "indietro" del browser — nessun accesso residuo lato client.
- Story 9.5 introduce un'asimmetria nota e accettata (per ora) tra `Allenatore` (avrà `cognome`) e `Atleta` (resta solo `nome`) — non è una FR, è un'osservazione emersa in analisi, esplicitamente fuori perimetro salvo storia futura dedicata.
- Story 9.6 va progettata tenendo conto del riuso imminente in Epic 10 (geolocalizzazione anche per partite in trasferta, potenzialmente non corrispondenti a una Palestra già censita) — preferire la soluzione più semplice compatibile con NFR6 (nessun servizio esterno a pagamento) salvo necessità reale di coordinate precise.

## Technical Decisions

- Errori delle Server Action nel formato `{ error: { code, message } }`; `code: 'FORBIDDEN'` riservato esclusivamente ai rifiuti di autorizzazione (mai `NOT_FOUND` per un dato esistente ma non accessibile).
- Confini per modulo/feature restano validi (AD-2); `Allenatore`/`Palestra` non sono protette da RLS — le modifiche di schema passano da Prisma diretto (AD-9), senza necessità di aggiornare policy.
- Ogni cambio di schema Prisma passa da migrazione (AD-3) — rilevante per Story 9.5 (nuovo campo `Allenatore.cognome`) e Story 9.6 se si sceglie l'opzione con coordinate dedicate.
- `esci()` (Server Action di logoff, introdotta in Story 9.1 in `app/NavBar.actions.ts`) va riusata invariata dalle storie successive (9.2, 9.4) — non duplicata.
- La sorgente delle voci di navigazione filtrate per ruolo è condivisa con il route guard (`lib/auth/route-guard.ts` / `lib/auth/voci-navigazione.ts`) — qualunque nuova UI di navigazione (hamburger, barra laterale, menu profilo) deve leggere da lì.
- Pattern di errore/validazione dei form: stesso stile già usato nelle altre Server Action del progetto (messaggio chiaro, nessuna chiamata downstream se la validazione fallisce lato server).
- Story 9.4: `supabase.auth.updateUser({ password })` è il meccanismo previsto per il cambio password (nessuna verifica della password attuale richiesta da Supabase); da decidere in sviluppo se aggiungere un campo di conferma lato form e una policy di lunghezza minima.
- Story 9.6: due opzioni aperte, da decidere in sviluppo — (a) link "Naviga" che apre Maps con ricerca testuale sull'`indirizzo` già esistente di `Palestra` (nessuna migrazione, coerente con NFR6), oppure (b) campo coordinate dedicato inserito a mano dall'Admin/Dirigente (richiede migrazione).

## UX & Interaction Patterns

- Componente `nav-bar` (`DESIGN.md`): sfondo `{colors.navy}`, tipografia `{typography.nav-item}`, voce attiva con `{colors.button-bg}`, contorno di focus `2px solid {colors.focus-ring-on-navy}` (bianco, non lo stesso ring usato su sfondo chiaro) — vincolo riconfermato per ogni nuova forma che la navigazione assume (hamburger, barra laterale, menu profilo).
- **Story 9.2 inverte deliberatamente una decisione precedente di `EXPERIENCE.md`** (riga 69: "nessuna barra laterale o drawer, singola barra orizzontale"), già implementata fedelmente in Story 8.1. La storia richiede di aggiornare anche `EXPERIENCE.md` per non lasciarlo in contraddizione col comportamento reale, come già fatto per altre correzioni di rotta (Epic 7/8). Resta invariato solo il vincolo "nessuno stack modale a più di un livello aperti insieme".
- Comportamento hamburger (mobile): barra superiore con solo logo/nome settore + pulsante hamburger; il menu si apre/chiude su selezione voce, tocco fuori, o tasto Esc; ordine di tabulazione logico con focus visibile su ogni elemento.
- Comportamento barra laterale (desktop, sopra breakpoint da scegliere in sviluppo): sempre visibile/aperta (assunzione da confermare in sviluppo, nessun pulsante toggle), stesse voci/logo/nome settore/logoff della versione mobile, resta fissa al cambio pagina.
- Pattern "riquadro di larghezza massima" (Story 9.3): estende come voce riusabile di `DESIGN.md` il pattern già esistente `.pagina`/`.riquadro` di `accedi.module.css` — si applica solo alle pagine il cui contenuto principale è un form autonomo (non tabelle/liste, anche se contengono form secondari inline); su schermo stretto il riquadro resta `width: 100%` + `max-width`, senza scorrimento orizzontale.
- Guard-clause per elementi opzionali mancanti (es. link "Naviga" assente se la Palestra non ha posizione impostata) segue lo stesso principio già usato per il logo mancante in Story 7.2 — mai un elemento rotto/vuoto mostrato.

## Cross-Story Dependencies

- Story 9.4 sostituisce/estende la Story 9.1 (già done): il pulsante "Esci" isolato va spostato dentro il nuovo menu profilo, non duplicato; la Server Action `esci()` resta invariata.
- Ordine di sviluppo consigliato tra 9.2 e 9.4: **9.2 prima di 9.4**, per non dover ricostruire due volte il posizionamento della navigazione/menu profilo.
- Story 9.5 richiede una mappatura di impatto su ogni punto che mostra `allenatore.nome` (es. righe Gruppo, wizard nuova stagione) prima di decidere se concatenare "Nome Cognome" o lasciare invariato.
- Story 9.6 è collegata al futuro Epic 10 (Gestione Partite e Campionati): il meccanismo di geolocalizzazione scelto qui va progettato pensando al riuso per le partite in trasferta, o esplicitamente limitato alle sole Palestre proprie con nota del gap.
