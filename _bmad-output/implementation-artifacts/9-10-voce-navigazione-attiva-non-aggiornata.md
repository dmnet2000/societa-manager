---
baseline_commit: 1b0b365fc1aa15afbefe31fbcc43c99ba43dcbf7
---

# Story 9.10: La voce di navigazione attiva non si aggiorna durante la navigazione

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente autenticato che naviga tra le pagine dell'app,
I want che la voce evidenziata nella barra di navigazione (laterale su desktop, drawer su mobile) rifletta sempre la pagina che sto effettivamente visitando,
so that ho sempre un riferimento visivo corretto di dove mi trovo nell'app.

**Note aggiuntive:** segnalato dall'utente dal vivo (2026-07-27): la voce evidenziata resta ferma sulla prima pagina visitata (es. "Palestre") anche navigando altrove con i link della barra stessa.

## Acceptance Criteria

1. **Given** un Utente autenticato su una qualunque pagina dell'app **When** clicca una voce diversa della barra di navigazione **Then** la voce appena selezionata diventa quella evidenziata come attiva, quella precedente non lo è più
2. **Given** l'Utente naviga con il pulsante "indietro"/"avanti" del browser **When** la pagina cambia **Then** la voce attiva riflette comunque la pagina effettivamente visualizzata
3. **And** nessuna regressione sul resto del comportamento della barra di navigazione (apertura/chiusura drawer mobile, menu profilo, logoff) — stesso vincolo di test invariati delle altre storie di questo epic

## Tasks / Subtasks

- [x] Task 1: Spostare il calcolo della voce attiva da server a client (AC: #1, #2)
  - [x] In `app/NavBar.tsx` (Server Component): rimosso il blocco `vociConStato` — passata a `NavBarClient` la prop `voci` grezza (`VoceNavigazione[]`, senza `attiva`)
  - [x] Lettura di `x-pathname` per il controllo `NON_AUTORIZZATO_PATH` non toccata — resta l'unico uso rimanente del pathname lato server in questo file
  - [x] In `app/NavBarClient.tsx` (Client Component): tipo della prop `voci` cambiato da `VoceConStato[]` a `VoceNavigazione[]` (type alias `VoceConStato` rimosso, non più usato)
  - [x] `attiva` calcolato dentro il render di `voci.map`, usando `pathname` (già letto da `usePathname()`) con la stessa identica logica già rimossa dal server: `pathname === voce.href || pathname.startsWith(\`${voce.href}/\`)`
  - [x] `voci.map((voce) => ...)` aggiornato per usare il valore `attiva` calcolato localmente invece di leggerlo da una prop già arricchita
- [x] Task 2: Test (AC: #1, #2, #3)
  - [x] Confermato: nessun test di rendering esiste per `NavBar.tsx`/`NavBarClient.tsx` (convenzione già stabilita — Story 9.2/9.4/9.7), non introdotta alcuna eccezione
  - [x] Verifica manuale in produzione demandata all'utente dopo il deploy (stesso pattern già seguito per le altre storie di navigazione di questo epic)
- [x] Task 3: Regressione (AC: #3)
  - [x] Suite Vitest completa: 558/558 passati, 0 regressioni (nessun nuovo test previsto da Task 2)
  - [x] `npx tsc --noEmit` ed `eslint` su `app/NavBar.tsx`/`app/NavBarClient.tsx`: 0 errori (1 warning pre-esistente non correlato su `<img>`)

### Review Findings

- [x] [Review][Patch] Il calcolo di `attiva` (`pathname === voce.href || pathname.startsWith(...)`) è logica pura ma resta inline dentro il `.map()` di `NavBarClient.tsx`, non testabile in isolamento senza montare React — proprio questo tipo di stato derivato senza test è la causa della regressione segnalata dall'utente che ha originato questa storia [app/NavBarClient.tsx] — risolto: estratta come `isVoceAttiva(pathname, href)` in `lib/auth/voci-navigazione.ts`, 4 nuovi test unitari.
- [x] [Review][Patch] Nessun `aria-current="page"` sull'elemento di navigazione attivo — comunicato solo tramite classe CSS (`styles.voceAttiva`), nessuna indicazione semantica per screen reader di quale voce corrisponde alla pagina corrente [app/NavBarClient.tsx] — risolto: aggiunto `aria-current={attiva ? "page" : undefined}` sul `<Link>`.
- [x] [Review][Defer] Il controllo `NON_AUTORIZZATO_PATH` in `NavBar.tsx` (righe 50-53) legge ancora il pathname calcolato una sola volta lato server (header `x-pathname`) — stessa identica causa di staleness (Client Cache del layout radice) appena risolta per `attiva` in questa storia, ma esplicitamente escluso dallo scope nei Dev Notes originali [app/NavBar.tsx] — deferred, fuori scope esplicito di questa storia; stesso pattern che ha già generato la Story 9.10 a partire dalla 9.7, potrebbe meritare una story propria se osservato dal vivo
- [x] [Review][Defer] L'elenco `voci` (filtrato per Ruolo in `NavBar.tsx`) soffre della stessa staleness di navigazione se i Ruoli di un Utente cambiano durante una sessione attiva — non toccato da questa storia [app/NavBar.tsx] — deferred, collegato al trade-off già accettato in AD-11 (finestra di autorizzazione stantia, deferred-work.md Story 1.1)

## Dev Notes

- **Causa CONFERMATA, stessa radice di Story 9.7**: `NavBar.tsx` (Server Component, montato nel root layout) calcola `vociConStato` leggendo il pathname lato server (header `x-pathname` impostato dal Proxy, `middleware.ts`) una volta sola quando il componente viene eseguito. Come documentato in Story 9.7 (`node_modules/next/dist/docs/`, `version-15.md#Client Cache`), i layout condivisi restano nella Client Cache del router e **non vengono ri-eseguiti** ad ogni navigazione con lo stesso layout — quindi `vociConStato` calcolato al primo caricamento non si aggiorna mai più lato server. A differenza di Story 9.7 (dove il sintomo appariva solo dopo il `redirect()` del logoff, risolto con `revalidatePath("/", "layout")`), qui il problema si manifesta ad **ogni** navigazione normale tra pagine con lo stesso layout — un `revalidatePath` ad ogni click sarebbe eccessivo/sbagliato (invaliderebbe la cache ad ogni navigazione, vanificando il vantaggio della Client Cache per l'intera app).
- **Soluzione corretta, non `revalidatePath`**: `NavBarClient.tsx` è già un Client Component e legge già `usePathname()` (riga 60) — un hook che si aggiorna automaticamente ad ogni navigazione completata (anche via "indietro"/"avanti" del browser, AC #2), senza dipendere in alcun modo dalla Client Cache del layout. Spostare lì il calcolo di `attiva` rende l'evidenziazione della voce indipendente dal problema di cache che affligge il server, invece di provare a forzare il server a ri-eseguirsi.
- **`VoceNavigazione`** (`lib/auth/voci-navigazione.ts:4`) è già `{ href: string; label: string }`, senza `attiva` — il tipo arricchito `{ ...voce, attiva: boolean }` esiste solo localmente in `NavBar.tsx` (variabile `vociConStato`, mai esportato) e in `NavBarClient.tsx` (type alias `VoceConStato`, riga 14). Nessuna modifica a `voci-navigazione.ts` è necessaria — `filtraVociNavigazione` continua a ritornare `VoceNavigazione[]` grezzo, che ora passa invariato da `NavBar.tsx` a `NavBarClient.tsx`.
- **Attenzione a `voce.href` nel `key` delle `<li>`** (riga 209 di `NavBarClient.tsx`): resta invariato, non dipende da `attiva`.
- **Nessuna regressione sugli altri stati locali** di `NavBarClient.tsx` (drawer mobile `aperto`, menu profilo `menuProfiloAperto`, dipendenza da `usePathname()` già esistente per resettarli in fase di render) — questa storia tocca solo il calcolo di `attiva`, non l'uso già esistente di `pathname` per quei reset, che restano invariati.
- **File NON da toccare**: `middleware.ts` (continua a impostare `x-pathname`, ancora necessario per il controllo `NON_AUTORIZZATO_PATH` in `NavBar.tsx`), `lib/auth/voci-navigazione.ts`, `app/NavBar.actions.ts` (logoff, Story 9.7, invariato).

### Project Structure Notes

- Nessun file nuovo. File modificati: `app/NavBar.tsx` (rimozione calcolo `attiva`), `app/NavBarClient.tsx` (spostamento calcolo `attiva` dentro il componente, usando `pathname` già disponibile).
- Nessuna migrazione, nessuna nuova dipendenza, nessun nuovo test automatico previsto (vedi Task 2 — convenzione già stabilita: nessun test di rendering per componenti di navigazione).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.10: La voce di navigazione attiva non si aggiorna durante la navigazione]
- [Source: _bmad-output/implementation-artifacts/epic-9-context.md — causa probabile collegata a Story 9.7, ipotesi di soluzione client-side]
- [Source: _bmad-output/implementation-artifacts/9-7-barra-laterale-ancora-visibile-dopo-il-logoff.md — causa CONFERMATA della Client Cache dei layout, consultata da node_modules/next/dist/docs/]
- [Source: app/NavBar.tsx — Server Component, righe 50-53 (x-pathname/NON_AUTORIZZATO_PATH, da non toccare), righe 70-73 (vociConStato, da rimuovere)]
- [Source: app/NavBarClient.tsx — Client Component, riga 60 (usePathname già presente), riga 14 (type VoceConStato), righe 208-217 (rendering voci)]
- [Source: lib/auth/voci-navigazione.ts — tipo VoceNavigazione, invariato]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Confermata la causa già ipotizzata in Dev Notes: `NavBar.tsx` calcolava `vociConStato` una sola volta lato server, mai ri-eseguito durante la navigazione normale per via della Client Cache del layout radice (stessa causa già confermata per Story 9.7).
- Fix applicato esattamente come raccomandato: calcolo di `attiva` spostato in `NavBarClient.tsx`, dentro `voci.map`, usando `pathname` da `usePathname()` già presente nel componente — nessun `revalidatePath` introdotto (non necessario/controproducente, avrebbe invalidato la Client Cache ad ogni click).
- Nessun nuovo test di rendering introdotto (Task 2), coerente con la convenzione già stabilita nel progetto per i componenti di navigazione — verifica dal vivo demandata all'utente dopo il deploy.
- Code review (2026-07-28): applicati 2 patch, deferiti 2 elementi (vedi `deferred-work.md`). Patch: calcolo di `attiva` estratto in `isVoceAttiva(pathname, href)` (`lib/auth/voci-navigazione.ts`, 4 nuovi test unitari), `aria-current="page"` aggiunto sulla voce di navigazione attiva. Regressione completa dopo i patch: 562/562 test, `tsc --noEmit` pulito, ESLint pulito (1 warning pre-esistente non correlato).

### File List

- `app/NavBar.tsx` (modificato — rimosso il calcolo di `vociConStato`, passa `voci` grezza a `NavBarClient`)
- `app/NavBarClient.tsx` (modificato — `attiva` calcolato dentro il render con `isVoceAttiva`, tipo prop `voci` cambiato a `VoceNavigazione[]`, rimosso type alias `VoceConStato`, aggiunto `aria-current`)
- `lib/auth/voci-navigazione.ts` (modificato — nuova funzione pura `isVoceAttiva`)
- `lib/auth/voci-navigazione.test.ts` (modificato — 4 nuovi test per `isVoceAttiva`)

## Change Log

- 2026-07-28: Implementata Story 9.10 — voce di navigazione attiva calcolata ora in `NavBarClient.tsx` (client, `usePathname()`) invece che in `NavBar.tsx` (server, non si aggiorna durante la navigazione per via della Client Cache del layout radice). 558/558 test passati, 0 errori tsc/eslint.
- 2026-07-28: Code review chiusa — 2 patch applicati (funzione pura `isVoceAttiva` estratta e testata, `aria-current="page"` aggiunto), 2 elementi deferiti. 562/562 test passati.
