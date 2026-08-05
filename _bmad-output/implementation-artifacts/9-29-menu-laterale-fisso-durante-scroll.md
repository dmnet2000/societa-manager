---
baseline_commit: 11407e3fe2eb64131d7f8b0d6728617880b5b6a1
---

# Story 9.29: Menu laterale fisso durante lo scroll della pagina

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente su desktop,
I want che il menu laterale di navigazione resti bloccato a sinistra invece di scorrere insieme al contenuto della pagina,
so that i link di navigazione restino sempre raggiungibili senza dover risalire la pagina.

## Acceptance Criteria

1. **Given** un Utente su desktop (>=880px) con una pagina di contenuto più lunga del viewport **When** scorre la pagina verso il basso **Then** il menu laterale resta visibile e bloccato a sinistra, senza scorrere via con il contenuto
2. **Given** un Ruolo con molte voci di navigazione/sotto-menu espansi contemporaneamente (es. Admin, che oggi vede 3 gruppi accordion — Atleti, Orari/Palestre, Accounting — più 6 voci dirette) **When** il contenuto della navigazione supera l'altezza del viewport **Then** il menu laterale resta comunque bloccato, con le proprie voci eventualmente scorribili internamente (non l'intera pagina che lo trascina via)
3. **And** nessuna regressione sul comportamento mobile esistente (drawer overlay, hamburger, Story 9.2) — il fix riguarda solo la sidebar desktop (breakpoint >=880px)

## Tasks / Subtasks

- [x] Task 1: Diagnosi — riprodurre il difetto prima di correggerlo (AC: #1, #2)
  - [x] Letto per intero `app/NavBar.module.css` e `app/globals.css` (già in Dev Notes) — confermato: `.sidebar` desktop ha `position: sticky; top: 0; height: 100vh` ma nessun `overflow-y`, nessun antenato (`.shell`/`body`/`html`) ha un `overflow` esplicito che invaliderebbe il contesto sticky.
  - [x] Conteggio voci per Admin (Ruolo con più gruppi accordion, `lib/auth/route-guard.ts`): 3 gruppi (Atleti 4 figlie, Orari/Palestre 2 figlie, Accounting 3 figlie) + 6 voci dirette (`/gruppi`, `/impostazioni`, `/permessi-certificati`, `/wizard-nuova-stagione`, `/campionati`, `/partite`) + menu profilo = ~21 righe totali se tutti e 3 i gruppi sono espansi contemporaneamente — plausibile superare i 100vh su un viewport di altezza comune (laptop, ridotto ulteriormente dalla chrome del browser), confermando l'ipotesi di causa dei Dev Notes.
  - [x] Verifica dal vivo non eseguibile in questo ambiente sandbox — stesso limite di ogni storia precedente di questa sessione, documentato esplicitamente invece di assunto.
- [x] Task 2: Fix CSS (AC: #1, #2, #3)
  - [x] `app/NavBar.module.css`, dentro la regola `@media (min-width: 880px) { .sidebar { ... } }`: aggiunto `overflow-y: auto` a `.sidebar` — con `height: 100vh` già presente ma senza overflow esplicito, il contenuto della navigazione che supera l'altezza del viewport traboccava invece di scorrere internamente al proprio contenitore sticky. `position: sticky`/`top: 0`/`height: 100vh` lasciati invariati (erano già corretti).
  - [x] Nessuna modifica alla regola `.sidebar` di base (mobile/drawer `position: fixed`) né alla media query stessa — fix scoped al solo blocco `@media (min-width: 880px)` (AC #3, nessuna regressione mobile).
  - [x] Causa confermata coerente con l'ipotesi (nessun antenato con `overflow` che invalidi il contesto sticky, verificato al Task 1) — nessuna causa alternativa emersa, fix applicato come proposto nei Dev Notes.
- [x] Task 3: Verifica (AC: #1, #2, #3)
  - [x] `npx tsc --noEmit`, `npx eslint .` puliti.
  - [x] `npm run build` pulito.
  - [x] Nessun nuovo test automatico previsto — questo progetto non ha convenzione di test per CSS/layout (nessun test di rendering esiste per `NavBarClient.tsx` in nessuna storia precedente, incluse 15.1-15.4 che hanno costruito l'intero meccanismo di accordion). 934/934 test Vitest esistenti passati (nessuna regressione).
  - [x] Verifica dal vivo (scroll di una pagina lunga su desktop, sidebar che resta bloccata, in particolare per un Ruolo con più gruppi espansi) non eseguibile in questo ambiente sandbox — stesso limite di ogni storia precedente di questa sessione.

### Review Findings

- [x] [Review][Patch] **`overflow-x` non impostato esplicitamente** — per spec CSS, un `overflow-y` non-`visible` forza anche `overflow-x` a calcolare `auto` se lasciato `visible`, abilitando potenzialmente uno scroll orizzontale indesiderato non richiesto da nessun contenuto della sidebar (larghezza fissa 220px). [app/NavBar.module.css] — risolto: `overflow-x: hidden` esplicito aggiunto.
- [x] [Review][Patch] **Nessuna riserva di spazio per la scrollbar** — quando il contenuto della nav effettivamente eccede 100vh (il caso che questo fix abilita), la comparsa della scrollbar del browser restringerebbe la larghezza disponibile per le voci proprio nel momento in cui l'utente ci interagisce di più (molti gruppi aperti). [app/NavBar.module.css] — risolto: `scrollbar-gutter: stable` aggiunto, spazio riservato fin da subito indipendentemente dallo stato di overflow.
- [x] [Review][Patch] **Nessun `overscroll-behavior`** — una volta esaurito lo scroll interno della sidebar, il gesto di scroll continuerebbe a scorrere la pagina sottostante, riproducendo (posticipata di un gesto) la stessa sensazione "il menu se ne va" che questa storia doveva eliminare. [app/NavBar.module.css] — risolto: `overscroll-behavior: contain` aggiunto.
- [x] [Review][Patch] **Commento con fatti volatili che marciranno** — il commento originale citava numeri specifici ("~21 righe", "3 sotto-menu ad accordion") che dipendono dallo stato attuale di `route-guard.ts`/`voci-navigazione.ts` e diventeranno fuorvianti al primo cambiamento futuro di Ruoli/gruppi. [app/NavBar.module.css] — risolto: commento riformulato per restare architetturalmente corretto senza numeri specifici che possano marcire.
- [ ] [Review][Defer] **Rischio di clipping del menu profilo (`.menuProfiloTendina`)** — identificato indipendentemente da Acceptance Auditor e Blind Hunter: il dropdown del menu profilo si apre verso l'alto (`position: absolute; bottom: calc(100% + gap)`) ancorato a un trigger che ora vive dentro un contenitore `overflow-y: auto`. Se il contenuto della nav satura interamente i 100vh (scenario Admin con tutti i gruppi espansi), potrebbe non restare spazio sufficiente sopra il trigger per il dropdown, che verrebbe tagliato dal contesto di clipping del contenitore scrollabile invece di traboccare visibilmente come accadeva prima di questo fix. Non verificabile dal vivo in questo ambiente sandbox — impatto reale incerto (dipende da quanto il contenuto eccede effettivamente 100vh sullo schermo reale). [app/NavBar.module.css] — deferito: richiede verifica dal vivo (Admin, tutti e 3 i gruppi espansi, scroll fino in fondo, apertura menu profilo) prima di decidere se serve un fix strutturale (es. posizionamento del dropdown fuori dal contenitore scrollabile).
- [ ] [Review][Defer] Nessuno stile dedicato per la scrollbar del browser su uno sfondo navy 220px — cosmetico, rilevante solo quando lo scroll interno si attiva effettivamente. [app/NavBar.module.css] — deferito: bassa priorità, da riconsiderare se osservato dal vivo dopo il deploy.
- [ ] [Review][Defer] Outline `:focus-visible` (`outline-offset: 2px`) potenzialmente tagliati per una voce esattamente al bordo superiore/inferiore della nuova area di scroll — edge case di accessibilità minore. [app/NavBar.module.css] — deferito: bassa priorità.

**Dismessi come rumore/convenzioni già accettate (3):** "il fix non è verificato dal vivo"/"la claim AC #2 è asserita non dimostrata" — stesso limite già esplicitamente documentato nella story stessa e ripetuto identico in ogni storia di questa sessione, non un'osservazione nuova; nessun test di regressione automatico aggiunto — questo progetto non ha convenzione di test per CSS/layout, coerente con ogni storia precedente (incluso l'intero meccanismo di accordion di Story 15.1-15.4, mai testato a livello di rendering); il commento non fa riferimento incrociato al precedente già esistente sulla sidebar mobile (`overflow-y: auto` già presente lì dalla Story 9.2) — nitpick stilistico, nessun impatto funzionale.

## Dev Notes

### Causa probabile (da confermare in sviluppo, non assumere) e fix proposto

`app/NavBar.module.css` usa **già** `position: sticky; top: 0;` su `.sidebar` per la sidebar desktop (introdotto in Story 9.2, commento esplicito: "resta visibile durante lo scroll di pagine di contenuto lunghe") — la richiesta dell'utente indica che in pratica questo non produce l'effetto voluto. Analisi statica del CSS (nessuna verifica dal vivo possibile in questo ambiente): `.sidebar` ha `height: 100vh` ma **nessun `overflow-y`** — se il contenuto interno (lista voci + eventuali gruppi accordion espansi + menu profilo in fondo) supera i 100vh di altezza, il contenuto trabocca oltre il contenitore invece di scorrere al suo interno, il che è compatibile con l'effetto "il menu scompare/scorre via" osservato. Questo è diventato più probabile **dopo l'Epic 15** (Story 15.1-15.4), che ha introdotto fino a 3 sotto-menu ad accordion (Atleti, Orari/Palestre, Accounting) — un Admin che li avesse tutti espansi vedrebbe oggi molte più voci contemporaneamente rispetto a quando Story 9.2 fu scritta (lista piatta, nessun accordion).

**Fix minimo proposto**: `overflow-y: auto` su `.sidebar` nel blocco `@media (min-width: 880px)`. Effetto: se il contenuto supera 100vh, scorre internamente al riquadro fisso invece di far scorrere la pagina intera o traboccare visivamente — il riquadro stesso resta bloccato a sinistra in ogni caso (comportamento sticky invariato).

### File esistenti da leggere per intero prima di modificare

- **`app/NavBar.module.css`**: contiene sia lo stile mobile (drawer, `position: fixed`, righe 48-64) sia quello desktop (`@media (min-width: 880px)`, righe 299-317) — la sidebar desktop è un elemento sticky nel flusso normale di `.shell` (non un overlay fuori dal flusso come il drawer mobile). Il fix riguarda **solo** il blocco desktop.
- **`app/globals.css`**: `.shell` (flex column su mobile, flex row su desktop via la stessa media query 880px) e `.contenuto` — nessun antenato ha oggi un `overflow` esplicito che dovrebbe invalidare il contesto di sticky positioning di `.sidebar` (verificato in fase di creazione story, ma da riconfermare in sviluppo se il fix proposto non risolvesse).
- **`app/NavBarClient.tsx`**: componente che renderizza la sidebar, incluso il meccanismo di accordion (Story 15.1) — non richiede modifiche per questa storia (il difetto è puramente di layout CSS, non di logica), ma utile per capire quante voci/gruppi un Admin può avere aperti contemporaneamente (il caso che rende il difetto più visibile).

### Project Structure Notes

- Modificato: `app/NavBar.module.css` (1 proprietà CSS aggiunta a una regola esistente).
- Nessuna modifica prevista a `app/NavBarClient.tsx`, `app/globals.css`, `lib/auth/voci-navigazione.ts`, `lib/auth/route-guard.ts` — puramente un fix di layout CSS sulla sidebar già esistente.
- Nessun nuovo file previsto.

### References

- [Source: epics.md#Epic 9: Miglioramenti Post-Rilascio, Story 9.29] — AC originali.
- [Source: app/NavBar.module.css] — regola `.sidebar` (mobile e desktop), letta per intero.
- [Source: app/globals.css] — `.shell`/`.contenuto`, letti per intero per escludere un antenato con `overflow` che interferisca.
- [Source: _bmad-output/implementation-artifacts/15-1-infrastruttura-sotto-menu-navigazione.md] — introduce l'accordion che rende il contenuto della sidebar potenzialmente più alto di 100vh per un Ruolo con più gruppi.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno.

### Completion Notes List

- Confermata l'ipotesi di causa dei Dev Notes: `.sidebar` desktop aveva già `position: sticky; top: 0; height: 100vh` (Story 9.2) ma nessun `overflow-y`, quindi il contenuto della navigazione (fino a ~21 righe per un Admin con i 3 gruppi accordion dell'Epic 15 tutti espansi) traboccava oltre il riquadro sticky invece di scorrere al suo interno.
- Fix a una sola riga: `overflow-y: auto` aggiunto a `.sidebar` nel blocco `@media (min-width: 880px)` di `app/NavBar.module.css`. Nessuna modifica al comportamento mobile (drawer, `position: fixed`), nessuna modifica a `NavBarClient.tsx`/`globals.css`/logica di autorizzazione.
- Nessun test automatico aggiunto — nessuna convenzione di test per CSS/layout in questo progetto (coerente con `NavBarClient.tsx` stesso, mai testato in nessuna storia precedente).
- 934/934 test Vitest passati (nessuna regressione), `eslint`/`tsc --noEmit` puliti, `npm run build` riuscita.
- Verifica dal vivo (scroll di una pagina lunga su desktop) non eseguibile in questo ambiente sandbox — stesso limite delle storie precedenti.

### File List

**Modificati:**
- `app/NavBar.module.css` (`overflow-y: auto` aggiunto a `.sidebar` nel blocco `@media (min-width: 880px)`; review: `overflow-x: hidden`, `scrollbar-gutter: stable`, `overscroll-behavior: contain` aggiunti, commento riformulato)

## Change Log

- 2026-08-05: Story implementata (Task 1-3 completi). Causa confermata: `.sidebar` desktop aveva già `position: sticky`/`top: 0`/`height: 100vh` (Story 9.2) ma nessun `overflow-y`, plausibilmente aggravato dai sotto-menu ad accordion dell'Epic 15 (fino a ~21 righe per un Admin con tutti e 3 i gruppi espansi). Fix: `overflow-y: auto` aggiunto a `.sidebar` nel solo blocco `@media (min-width: 880px)`, nessun impatto sul comportamento mobile. 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: review.
- 2026-08-05: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Nessuna violazione degli AC. 4 patch applicati: `overflow-x: hidden` esplicito (senza, per spec CSS `overflow-y` non-visible forza anche `overflow-x` a calcolare `auto`), `scrollbar-gutter: stable` (evita che la comparsa della scrollbar restringa la larghezza delle voci proprio quando l'utente interagisce di più), `overscroll-behavior: contain` (evita lo scroll-chaining nella pagina sottostante una volta esaurito lo scroll interno — la stessa sensazione "il menu se ne va" posticipata di un gesto), commento riformulato per rimuovere numeri specifici destinati a marcire. 3 defer: rischio di clipping del menu profilo (`.menuProfiloTendina`, apertura verso l'alto) quando il contenuto della nav satura i 100vh — identificato indipendentemente da 2 layer, richiede verifica dal vivo non eseguibile in questo ambiente; nessuno stile scrollbar dedicato per lo sfondo navy; outline `:focus-visible` potenzialmente tagliati al bordo dell'area di scroll. 3 osservazioni dismesse come rumore/convenzioni già accettate. 934/934 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: done.
