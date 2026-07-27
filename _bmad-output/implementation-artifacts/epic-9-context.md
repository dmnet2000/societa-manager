# Epic 9 Context: Miglioramenti Post-Rilascio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic aggiunto in corso d'opera (2026-07-25) per raccogliere lacune e miglioramenti puntuali emersi dalla verifica dal vivo in produzione dopo il completamento di Epic 1-8, non pianificati nel PRD originale. A differenza degli epic precedenti, l'elenco delle storie resta **aperto**: vengono aggiunte una alla volta man mano che emergono, non tutte definite in anticipo. Nessuna FR propria. Le storie toccano prevalentemente il layout globale/barra di navigazione introdotti in Story 8.1 e alcune piccole lacune di modello dati/UX individuate a posteriori.

## Stories

- Story 9.1: Pulsante di logoff — **done**
- Story 9.2: Navigazione responsive — hamburger su mobile, barra laterale verticale su desktop — **done**
- Story 9.3: Riquadro con larghezza massima per le pagine-form — **done**
- Story 9.4: Menu profilo con logoff e modifica password (sostituisce/estende 9.1) — **done**
- Story 9.5: Campo Cognome per Allenatore (precaricamento) — **done**
- Story 9.6: Geolocalizzazione Palestre — **done**
- Story 9.7: Barra laterale ancora visibile dopo il logoff — backlog
- Story 9.8: Durata della sessione di login — backlog
- Story 9.9: Gestione Allenatori precaricati (vista, modifica, cancellazione) — backlog

## Requirements & Constraints

- Nessun requisito funzionale (FR) formale copre questo epic: le storie nascono da osservazione diretta in produzione, non dal PRD.
- Ogni storia deve preservare il comportamento esistente delle Server Action/route guard già in produzione: nessuna regressione, suite Vitest esistente deve continuare a passare.
- Le voci di navigazione mostrate devono sempre derivare dalla stessa fonte usata dal route guard per l'autorizzazione (nessuna lista duplicata mantenuta a mano) — vincolo ereditato da Story 8.1, riconfermato in 9.2 e 9.4.
- Un logoff deve essere fail-closed: in caso di errore nella terminazione della sessione, il comportamento di default deve comunque impedire l'accesso residuo.
- Dopo il logoff, nessun elemento di navigazione o pagina protetta deve restare visibile/raggiungibile per accesso residuo — né lato server (middleware su URL diretto o tasto "indietro", già coperto da 9.1) né lato client (Story 9.7: la barra/drawer di navigazione stessa non deve sopravvivere visivamente al redirect verso `/accedi`).
- Story 9.5 introduce un'asimmetria nota e accettata (per ora) tra `Allenatore` (avrà `cognome`) e `Atleta` (resta solo `nome`) — esplicitamente fuori perimetro salvo storia futura dedicata.
- Story 9.6 va progettata tenendo conto del riuso imminente in Epic 10 (geolocalizzazione anche per partite in trasferta, potenzialmente non corrispondenti a una Palestra già censita) — preferire la soluzione più semplice compatibile con NFR6 (nessun servizio esterno a pagamento) salvo necessità reale di coordinate precise.
- Story 9.8: segnalato dall'utente dal vivo — chiudendo l'applicazione e riaprendola anche a distanza di un giorno intero, l'accesso avviene direttamente senza richiedere di nuovo la login. Va definita una durata massima di sessione (e/o un timeout per inattività) oltre la quale l'Utente deve ri-autenticarsi.

## Technical Decisions

- Errori delle Server Action nel formato `{ error: { code, message } }`; `code: 'FORBIDDEN'` riservato esclusivamente ai rifiuti di autorizzazione.
- `Allenatore`/`Palestra` non sono protette da RLS — le modifiche di schema passano da Prisma diretto (AD-9), senza policy da aggiornare, ma sempre via migrazione (AD-3) — rilevante per Story 9.5 (`Allenatore.cognome`) e Story 9.6 se si sceglie l'opzione con coordinate dedicate.
- `esci()` (Server Action di logoff, Story 9.1) è riusata invariata da 9.4 (dentro il menu profilo) e va riusata invariata anche da 9.7 — non duplicata, non riscritta.
- La sorgente delle voci di navigazione filtrate per ruolo è condivisa con il route guard (`lib/auth/route-guard.ts` / `lib/auth/voci-navigazione.ts`) — qualunque nuova UI di navigazione legge da lì.
- Drawer mobile (9.2) è client-side (stato "aperto" in un Client Component separato dal Server Component di navigazione) — dipendenza da JavaScript accettata come compromesso ragionevole.
- Story 9.7: il componente di navigazione ritorna già `null` in assenza di sessione (comportamento server corretto). Dopo il `redirect()` della Server Action di logoff la barra/drawer resta comunque visibile su `/accedi`. Causa probabile ma **non confermata**: cache di navigazione lato client di Next.js che non ri-richiede il layout radice dopo il redirect — da confermare in sviluppo. Distinto dal gap deferito per 9.1 (bfcache sul tasto "indietro", navigazione all'indietro): questo è navigazione in avanti causata dal logoff stesso.
- Story 9.6: **estesa post-done (2026-07-27)** su feedback utente dal vivo — la prima versione (opzione (a), solo `indirizzo` testuale) non bastava: l'utente vuole scegliere la posizione da Google Maps e vederla in-app. Scelto: incolla-link (Admin incolla un link di condivisione Google Maps, il server estrae lat/lon — nuove colonne `Palestra.latitudine`/`longitudine` nullable, tabella già popolata) + mappa incorporata via iframe `output=embed` (gratuito, nessuna chiave API) solo in `/palestre`. Scartato un vero selettore mappa interattivo (Google Maps JavaScript API, richiede account di fatturazione, contro NFR6). Fallback su `indirizzo` testuale se nessun link ancora incollato, in tutte le pagine coinvolte.
- Story 9.8: causa probabile ma **non confermata** — `lib/supabase/client.ts`/`server.ts` usano `createBrowserClient`/`createServerClient` di `@supabase/ssr` senza opzioni di scadenza personalizzate; il refresh token di Supabase (default: validità lunga, settimane) viene rinnovato automaticamente ad ogni richiesta autenticata, quindi la sessione resta valida indefinitamente finché l'app viene riaperta prima della scadenza del refresh token. Nessun controllo applicativo di durata massima o di inattività è presente. Due leve possibili, non ancora scelte: (a) ridurre la scadenza JWT/refresh token lato progetto Supabase (dashboard, nessun codice), oppure (b) timeout applicativo (es. timestamp ultima attività in cookie/sessione, logout forzato oltre soglia) — da confermare in sviluppo quale/quali soddisfano l'aspettativa dell'utente.
- Story 9.9: **nessuna entità di questo progetto viene mai cancellata realmente** — il pattern esistente per "rimuovere" qualcosa è un flag `attivo` con disattiva/riattiva (`Utente.attivo`, Story 1.2); `.delete()`/`deleteMany()` è usato solo su righe di giunzione (`UtenteRuolo`, `GruppoVisibileDirigente`), mai su un record di dominio reale. Cancellare un `Allenatore` avrebbe due conseguenze silenziose per via delle FK esistenti: `GruppoAllenatore.allenatoreId` ha `onDelete: Cascade` (rimozione silenziosa dell'assegnazione a un Gruppo) e un `Allenatore` già agganciato (`utenteId` non nullo) verrebbe scollegato silenziosamente dal proprio Utente. Raccomandazione non ancora validata con l'utente: cancellazione libera solo se non agganciato e non assegnato a nessun Gruppo, bloccata (con messaggio) altrimenti — da confermare in sviluppo.

## UX & Interaction Patterns

- Componente `nav-bar` (`DESIGN.md`): sfondo `{colors.navy}`, tipografia `{typography.nav-item}`, voce attiva con `{colors.button-bg}`, contorno di focus `2px solid {colors.focus-ring-on-navy}` (bianco) — vincolo riconfermato per ogni forma della navigazione (drawer, barra laterale, menu profilo) e per la correzione richiesta da 9.7.
- **Story 9.2 ha invertito deliberatamente** la decisione precedente di `EXPERIENCE.md` ("nessuna barra laterale o drawer, singola barra orizzontale"); il documento è già stato aggiornato di conseguenza. Resta invariato solo il vincolo "nessuno stack modale a più di un livello aperti insieme".
- Drawer mobile (implementato): hamburger + apertura/chiusura su selezione voce, tocco fuori o Esc, tabulazione logica con focus visibile. Lacune note e deferite (non bloccanti): nessuna gestione esplicita del focus in apertura/chiusura, nessun `role="dialog"`/`aria-modal`, trattato come landmark `<nav>` + `inert` quando chiuso.
- Barra laterale desktop (implementata): sempre visibile/aperta, nessun toggle, stesse voci/logo/menu profilo della versione mobile, fissa al cambio pagina.
- **Menu profilo (dropdown, `menu-profilo`, Story 9.4)**: trigger = email dell'Utente (nessuna nuova icona), ancorato in fondo alla `nav-bar` (stesso punto del vecchio pulsante "Esci" isolato). Tendina `role="menu"` con due `role="menuitem"` ("Modifica password", "Esci"): `background: {colors.surface}`, testo `{colors.text-primary}`, `{rounded.sm}`, ombra `0 1px 3px rgba(16,24,32,0.08)` (stesso valore di `riquadro-form`) — non riusa i colori chiari della nav-bar perché non condivide lo sfondo navy. Non un vero modale (nessun `role="dialog"`/`aria-modal`, come il drawer mobile): si chiude al click fuori o con Esc senza bloccare il resto della pagina. **Ha risolto** la `[NOTA UX APERTA]` di `DESIGN.md` sulle superfici sovrapposte transitorie: confermata l'ipotesi (ombra leggera + `{rounded.sm}`, mai su card/contenuto pagina); resta aperta solo per un eventuale futuro dialog di conferma modale (mai costruito).
- Story 9.7 richiede che la sparizione della navigazione dopo il logoff sia priva di "flash", sia su desktop (barra laterale, ora comprensiva del menu profilo) sia su mobile (drawer/hamburger).
- Pattern "riquadro di larghezza massima" (Story 9.3, implementato): `.pagina-form`/`.riquadro-form` (max-width 480px, pagine-form autonome) più due regole trasversali: `max-width: 1000px` su ogni `<main>` (`.contenuto > main`) e `max-width: 400px` su input/select/textarea. Le pagine-tabella (es. `/admin`, `/gruppi`, `/palestre`) restano escluse dal riquadro-form ma beneficiano del vincolo su `<main>`.
- Guard-clause per elementi opzionali mancanti (es. link "Naviga" assente se la Palestra non ha posizione impostata) segue lo stesso principio del logo mancante in Story 7.2 — mai un elemento rotto/vuoto mostrato.

## Cross-Story Dependencies

- Story 9.4 ha sostituito/esteso la Story 9.1: il pulsante "Esci" isolato è stato spostato dentro il menu profilo, non duplicato; la Server Action `esci()` resta invariata.
- Story 9.7 dipende dai risultati di Story 9.1 (`esci()`, redirect a `/accedi`), 9.2 (drawer mobile/barra laterale desktop) e 9.4 (menu profilo ora integrato nello stesso componente di navigazione): il fix di caching/invalidazione va verificato su entrambe le forme di navigazione, tenendo conto che la barra/drawer include anche il dropdown del menu profilo.
- Story 9.5 richiede una mappatura di impatto su ogni punto che mostra `allenatore.nome` (es. righe Gruppo, wizard nuova stagione) prima di decidere se concatenare "Nome Cognome" o lasciare invariato.
- Story 9.6 è collegata al futuro Epic 10 (Gestione Partite e Campionati): il meccanismo di geolocalizzazione scelto qui va progettato pensando al riuso per le partite in trasferta, o esplicitamente limitato alle sole Palestre proprie con nota del gap.
