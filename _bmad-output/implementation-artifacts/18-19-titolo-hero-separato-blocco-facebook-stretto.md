---
baseline_commit: eb5e1058ab8abdc0d033f0e7219638be361278d6
---

# Story 18.19: Separare il titolo hero dal blocco Post Facebook, blocco più stretto e più alto

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Decisione presa con l'utente prima di scrivere questa storia

`epics.md` lasciava esplicitamente aperto un punto di dettaglio: il titolo va **sopra** o **sotto** il blocco Facebook una volta separati? **Chiesto all'utente**, che ha scelto: **titolo sopra** (ordine di lettura naturale) — non riaprire questa scelta durante lo sviluppo. Le altre due misure ("più stretto", "più alto") restano a giudizio di sviluppo come già indicato in `epics.md` ("da concordare in apertura sviluppo") — vedi Dev Notes per i valori scelti e la motivazione.

## Story

As a Visitatore che visita la home pubblica,
I want che il titolo "Benvenuti nel [Settore]" sia un blocco separato e leggibile, non sovrapposto alle foto dei post Facebook, e che il blocco dei post Facebook sia più stretto e più alto di adesso,
so that sia il titolo sia i post Facebook restino chiari e non si scontrino visivamente.

## Acceptance Criteria

1. **Given** un Visitatore **When** visita la home pubblica con post Facebook disponibili **Then** il titolo "Benvenuti nel [Settore]" e il CTA "Scopri le squadre" sono un blocco visivamente separato dal blocco che mostra i post Facebook, non sovrapposti alla foto del post — il titolo compare **sopra** il blocco Facebook, in quest'ordine di lettura.
2. **And** il blocco Post Facebook occupa una larghezza ridotta rispetto alla piena larghezza dell'hero attuale — `max-width: 480px` (contro i 720px del blocco titolo, chiaramente più stretto).
3. **And** il blocco Post Facebook è più alto di quanto non fosse nella prima versione boxed (280px, Story 18.13 originale) — `min-height: 420px` (desktop), le foto dei post non appaiono eccessivamente schiacciate/ritagliate.
4. **And** nessuna regressione sulle altre regole già validate: fail-soft se non ci sono post (placeholder "FOTO AZIONE" torna a comparire, ora confinato al blocco stretto invece che a piena pagina), gating sul consenso cookie (Story 18.6, invariato — non tocca `app/page.tsx` oltre al markup del blocco), fallback foto hero caricata quando non ci sono post (Story 18.14, stesso principio, ora confinato al blocco), touch target 44px sui controlli del carosello, pausa/ripresa automatica (WCAG 2.2.2, `HeroPostFacebook.tsx` non toccato — solo il CSS/markup di `app/page.tsx`/`home-pubblica.module.css` cambia).
5. **And** su mobile (`max-width: 900px`, stesso breakpoint già in uso in questo file) il blocco resta leggibile e proporzionato, non semplicemente ridimensionato in automatico — vedi Dev Notes per i valori scelti.

## Tasks / Subtasks

- [x] Task 1: Nuovo contenitore `.heroBlocco` in `home-pubblica.module.css` (AC: #2, #3, #5)
  - [x] Nuova classe `.heroBlocco`: `position: relative; z-index: 2; overflow: hidden; margin: var(--space-4) 48px 48px; max-width: 480px; min-height: 420px;`.
  - [x] Dentro `@media (max-width: 900px)`: `margin: var(--space-3) 20px 32px; max-width: none; min-height: 320px;`.

- [x] Task 2: Spostare `.heroFoto`/`.heroFotoPost` dentro `.heroBlocco` — solo markup, nessun cambio CSS (AC: #1, #2, #3)
  - [x] I 3 rami condizionali spostati dentro `<div className={styles.heroBlocco}>` in `app/page.tsx`, condizioni testualmente identiche.
  - [x] `.heroFoto`/`.heroFotoPost`/`.heroFotoPost::after` non toccati (verificato: nessuna riga modificata in queste 3 regole).
  - [x] `.heroFoto::before` non toccato.

- [x] Task 3: `.heroContenuto` (titolo/CTA) — rimuovere il ruolo di overlay, riordinare il markup (AC: #1)
  - [x] `.heroContenuto` spostato prima di `.heroBlocco` nel markup di `app/page.tsx`.
  - [x] `.heroContenuto` (CSS) non toccato.
  - [x] `.heroContenuto h1`/`.heroCta` non toccati.

- [x] Task 4: `.infoPost` — adattare alla larghezza ridotta di `.heroBlocco` (AC: #2)
  - [x] `padding: 0 48px 32px; max-width: 720px;` → `padding: 0 var(--space-4) var(--space-4);` (max-width rimosso). `HeroPostFacebook.tsx` non toccato.
  - [x] Verificato: padding mobile esistente (`0 20px 24px`) resta adeguato — `.heroBlocco` mobile è già a piena larghezza, nessun secondo aggiustamento necessario.

- [x] Task 5: Verifica AC #4 — nessuna regressione (AC: #4)
  - [x] Confermato: le 3 condizioni di rendering restano testualmente identiche in `app/page.tsx`.
  - [x] Confermato: `HeroPostFacebook.tsx` non toccato.
  - [x] Confermato: `app/HeaderPubblico.tsx`, `app/FooterPubblico.tsx`, `app/CookieBanner.tsx` non toccati.

- [x] Task 6: Test e verifica finale (AC: tutti)
  - [x] Confermato: nessun test importa `app/page.tsx`/`HeroPostFacebook.tsx`.
  - [x] `npx vitest run` (1182/1182), `npx tsc --noEmit` (0 errori), `npm run lint` (0 errori, warning preesistenti invariati), `npm run build` (riuscita, `/` presente nell'output).

## Dev Notes

### Perché questa storia riapre un lavoro fatto poche ore prima

Il carosello Post Facebook (Story 18.13) è stato spostato dentro l'hero, sovrapposto al titolo, su richiesta diretta dell'utente in sessione (non una story formale a sé — un cambio fatto "a caldo" durante lo sviluppo di un'altra storia). Vedendo il risultato descritto (non ancora verificato dal vivo su un dispositivo reale — **nessuna delle due iterazioni di quest'area ha mai avuto un giro di conferma visiva dell'utente prima di richiedere il cambio successivo**), l'utente ha chiesto immediatamente una seconda modifica: titolo fuori dal blocco, blocco più stretto e più alto. Il codice reale di `app/HeroPostFacebook.tsx`/`app/home-pubblica.module.css` è stato riletto interamente per questa storia (non assunto uguale a quanto descritto in `epics.md`, che poteva essere scritto prima di ulteriori aggiustamenti) — confermato invariato rispetto alla descrizione. **Verificare il risultato con l'utente durante lo sviluppo di questa storia, non solo a fine storia** — è la terza iterazione consecutiva della stessa area senza conferma visiva intermedia.

### Come cambia la struttura: da "overlay su foto piena" a "due blocchi impilati"

Oggi `.hero` (flex-column, `justify-content:flex-end`, `min-height:60vh`) ha 2 livelli assolutamente posizionati a piena area (`.heroFoto`/`.heroFotoPost`, z-index:0, e `.heroDiagonale`, z-index:1) più 2 figli flex normali impilati in fondo (`.heroContenuto` poi `.infoPost` da `HeroPostFacebook.tsx`), entrambi z-index:2 sopra la foto. Questa storia introduce un nuovo contenitore `.heroBlocco` (`position:relative`, quindi un proprio contesto di posizionamento) che **diventa il nuovo genitore** dei livelli fotografici — `.heroFoto`/`.heroFotoPost` restano `position:absolute;inset:0` testualmente identici, ma ora si riferiscono ai bordi di `.heroBlocco` (480×420px circa) invece che ai bordi dell'intero hero. `.heroContenuto` (titolo) diventa un blocco normale **fuori** da quest'area, posizionato prima nel markup. Il resto dell'hero (`.hero{background:#0f2438}`, `.heroDiagonale` decorativo, `clip-path` diagonale in fondo) resta invariato — l'area sopra/attorno al blocco più stretto mostra semplicemente lo sfondo blu-carbone dell'hero, non più riempita da una foto a piena pagina.

### Perché 480px/420px (non i valori esatti richiesti letteralmente dall'utente)

L'utente non ha dato misure esatte ("più stretto", "più alto") — `epics.md` lascia esplicitamente il valore a giudizio di sviluppo. 480px è chiaramente più stretto dei 720px di `.heroContenuto` (differenza netta, non marginale) ma resta un blocco sostanzioso, non un riquadro piccolo. 420px è ben oltre i 280px della prima versione boxed (Story 18.13 originale), abbastanza per foto orizzontali tipiche senza ritagli eccessivi. `.hero{min-height:60vh}` è un **minimo**, non un massimo — se titolo+blocco superano 60vh, l'hero cresce per contenerli (flex content-driven), nessun rischio di clipping. **Scelta di giudizio, non specificata a parole dall'utente — verificare dal vivo e aggiustare se non è quello che aveva in mente** (stesso principio già accettato esplicitamente in questa stessa area per la dimensione del font del titolo, Story 18.12).

### Cosa NON cambia in questa storia

Nessuna modifica a `app/HeroPostFacebook.tsx` (il Client Component stesso — solo la classe CSS `.infoPost` che già usa cambia). Nessuna modifica a `lib/storage/foto-hero.ts`, `lib/facebook-graph.ts`, `lib/cookie-consenso.ts`, `app/HeaderPubblico.tsx`, `app/FooterPubblico.tsx`, `app/CookieBanner.tsx`. Nessuna nuova Server Action, nessuna migrazione, nessun nuovo componente. `.heroDiagonale`, `.hero` (background/clip-path/min-height), `.heroContenuto h1`, `.heroCta` restano testualmente invariati.

### Project Structure Notes

- Nessun file nuovo creato.
- File modificati: `app/page.tsx` (solo riordino/annidamento del markup esistente, nessuna nuova condizione), `app/home-pubblica.module.css` (nuova classe `.heroBlocco` + media query mobile, `.infoPost` padding/max-width aggiustati).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.19] — testo originale, punto aperto (sopra/sotto) risolto con l'utente prima di questa storia.
- [Source: app/page.tsx righe 259-317] — markup attuale dell'hero, verificato riga per riga prima di scrivere questa storia (confermato invariato rispetto a quanto descritto in `epics.md`).
- [Source: app/home-pubblica.module.css righe 15-318] — tutte le regole CSS dell'area hero coinvolte, lette per intero.
- [Source: app/HeroPostFacebook.tsx] — componente Client non toccato da questa storia, solo la classe `.infoPost` che rende viene aggiustata.
- [Source: _bmad-output/implementation-artifacts/18-14-foto-sfondo-hero.md] — precedente diretto: introduce il fallback `.heroFotoPost` per la foto caricata da Admin/Dirigente, stesso principio di riuso di questa storia (il blocco più stretto ospita indifferentemente post Facebook, foto caricata, o placeholder).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard, non applicabile (nessuna modifica a routing/Server Action).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (dev-story workflow)

### Debug Log References

Nessuno - implementazione lineare, nessun blocco/HALT incontrato.

### Completion Notes List

- Tutti e 6 i Task completati esattamente come pianificato, nessuna deviazione.
- `home-pubblica.module.css`: nuova classe `.heroBlocco` (480px/420px desktop, piena larghezza/320px mobile sotto 900px), diventa il contesto di posizionamento di `.heroFoto`/`.heroFotoPost` (CSS di quelle 2 regole non toccato, solo il loro genitore nel markup cambia). `.infoPost` adattato alla larghezza ridotta (padding `var(--space-4)`, `max-width:720px` rimosso perché non più raggiungibile).
- `app/page.tsx`: `.heroContenuto` (titolo+CTA) spostato prima nel markup, i 3 rami condizionali del blocco Facebook/foto/placeholder spostati dentro il nuovo `<div className={styles.heroBlocco}>` — condizioni testualmente identiche, solo il contenitore cambia.
- Nessuna modifica a `HeroPostFacebook.tsx`, `HeaderPubblico.tsx`, `FooterPubblico.tsx`, `CookieBanner.tsx`.
- 1182/1182 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita.
- Verifica visiva dal vivo NON eseguibile in questo sandbox — demandata all'utente, con enfasi particolare data la nota nei Dev Notes: è la terza iterazione consecutiva della stessa area hero senza mai un giro di conferma visiva intermedia. Le misure 480px/420px sono una scelta di giudizio (nessun numero fornito dall'utente) — da aggiustare se non corrispondono a quanto aveva in mente.

### File List

- `app/page.tsx`
- `app/home-pubblica.module.css`

### Change Log

- 2026-08-15: File di story creato (create-story workflow) — punto aperto (titolo sopra/sotto) risolto con l'utente prima della scrittura: titolo sopra. Status: backlog → ready-for-dev.
- 2026-08-15: Implementata Story 18.19 (dev-story workflow) — titolo hero separato dal blocco Post Facebook (ora più stretto e più alto, 480px/420px). 1182/1182 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: ready-for-dev → review.
