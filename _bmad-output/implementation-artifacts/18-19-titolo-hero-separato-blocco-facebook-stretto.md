---
baseline_commit: eb5e1058ab8abdc0d033f0e7219638be361278d6
---

# Story 18.19: Separare il titolo hero dal blocco Post Facebook, blocco più stretto e più alto

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Secondo giro (2026-08-15, stesso giorno, dopo verifica dal vivo tramite `npm run cf:preview`)

L'utente ha visto dal vivo il primo giro (titolo sopra, blocco 480×420px) e ha dato 4 richieste dirette, tutte implementate:

1. **Titolo "Benvenuti nel [Settore]" rimosso del tutto** — non solo spostato: ridondante col nome del Settore già mostrato nell'header (`HeaderPubblico.tsx`).
2. **CTA "Scopri le squadre" rimosso del tutto** — ridondante con la voce "Squadre" già presente nel menu di navigazione in alto (`NavPubblica.tsx`).
3. **Blocco Facebook centrato sullo schermo** (prima era allineato a sinistra, mirror del vecchio blocco titolo).
4. **Blocco Facebook a 600px di larghezza**, altezza in **proporzione** (non un valore fisso indipendente) per non deformare/ritagliare eccessivamente le foto — implementato con `aspect-ratio: 4/3` invece di `min-height` fisso, così l'effetto resta coerente anche su mobile (richiesta esplicita dell'utente) senza bisogno di una seconda misura hardcoded.
5. **Didascalia del post spostata in basso alla foto** — verificando il codice per implementare questo punto è emerso un **bug reale introdotto dal primo giro**: `.infoPost` (testo del post) era rimasta `position:relative` invece che ancorata al fondo del blocco. Poiché `.heroFotoPost` (la foto) è `position:absolute` (fuori dal flusso), `.infoPost` finiva per essere l'unico contenuto in flusso normale di `.heroBlocco` e si posizionava in **alto**, non in basso — esattamente il punto meno leggibile dello scrim (il gradiente `.heroFotoPost::after` è più scuro in **basso**). Risolto: `.infoPost` ora `position:absolute` ancorata a `bottom:0`.

Poiché il titolo/CTA sono stati rimossi, anche `leggiNomeSettore()` (la lettura DB che alimentava solo quel testo) è stata rimossa da `app/page.tsx` — non serviva più a nient'altro in questo file (verificato).

Le sezioni AC/Tasks/Dev Notes sotto restano come testimonianza del primo giro (già implementato e poi superato dalle richieste sopra) — vedi Completion Notes per il resoconto esatto del secondo giro.

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

## Tasks / Subtasks — secondo giro (titolo/CTA rimossi, blocco centrato 600px proporzionale)

- [x] Task 7: Rimuovere titolo e CTA dal markup e dalla lettura dati
  - [x] `app/page.tsx`: rimosso `<div className={styles.heroContenuto}><h1>...</h1><Link ...>Scopri le squadre</Link></div>`.
  - [x] Rimossa `leggiNomeSettore()` dal `Promise.all` e la variabile `nomeVisualizzato` — non più usate da nient'altro nel file (verificato con grep).
  - [x] Rimossi gli import ormai inutilizzati: `leggiNomeSettore` (da `lib/configurazione-applicazione`) e `Link` (da `next/link`, nessun altro `<Link>` nel file).
  - [x] `home-pubblica.module.css`: rimosse `.heroContenuto`, `.heroContenuto h1`, `.heroCta` (+ `:hover`/`:focus-visible`/`prefers-reduced-motion`), e la media query mobile `.heroContenuto`/`.heroContenuto h1`.

- [x] Task 8: Blocco Facebook centrato, 600px, altezza proporzionale
  - [x] `.hero`: `justify-content: flex-end` → `center`, aggiunto `align-items: center` (nessun altro contenuto da ancorare in fondo, il blocco va centrato in entrambi gli assi).
  - [x] `.heroBlocco`: `max-width: 480px` → `600px`; `width: 100%` aggiunto (si restringe fluidamente su schermi stretti fino al tetto di 600px); `min-height: 420px` → `aspect-ratio: 4 / 3` (altezza proporzionale alla larghezza, non un valore assoluto — copre anche il caso mobile senza una seconda misura hardcoded); margine orizzontale asimmetrico (48px) rimosso, centratura delegata al genitore.
  - [x] Rimossa la media query mobile che ridefiniva `max-width`/`min-height` di `.heroBlocco` — non più necessaria, `width:100%`+`aspect-ratio` si adattano già fluidamente.

- [x] Task 9: Ancorare la didascalia del post in basso (bug del primo giro)
  - [x] `.infoPost`: `position: relative` → `absolute`, aggiunto `left:0; right:0; bottom:0` — prima era l'unico contenuto in flusso normale di `.heroBlocco` (la foto è `position:absolute`, fuori flusso) e finiva ancorata in alto, il punto meno scuro dello scrim.

- [x] Task 10: Verifica finale secondo giro
  - [x] Confermato: le 3 condizioni di rendering del blocco (Facebook/foto caricata/placeholder) restano testualmente identiche.
  - [x] Confermato: `HeroPostFacebook.tsx`, `HeaderPubblico.tsx`, `FooterPubblico.tsx`, `CookieBanner.tsx` non toccati.
  - [x] `npx vitest run` (1182/1182), `npx tsc --noEmit` (0 errori), `npm run lint` (0 errori, nessun `no-unused-vars` residuo dopo la rimozione di `nomeSettore`/`Link`), `npm run build` (riuscita, `/` presente nell'output).

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
- Verifica visiva dal vivo del primo giro effettuata dall'utente con `npm run cf:preview` (bypassa il noto limite del motore Prisma WASM di `next dev` in locale) — prima volta in questo Epic con un giro di conferma visiva intermedia reale, non solo demandata a fine storia.

**Secondo giro (stesso giorno)**: su feedback diretto dell'utente dopo la verifica col preview, titolo e CTA rimossi del tutto (non solo separati — ridondanti con header/menu), blocco Facebook centrato e portato a 600px con altezza proporzionale (`aspect-ratio:4/3` invece di `min-height` fisso, gestisce anche il caso mobile senza una seconda misura). Durante l'implementazione del punto "didascalia in basso" è emerso un bug reale introdotto dal primo giro: `.infoPost` non era ancorata al fondo del blocco (era l'unico contenuto in flusso normale essendo `.heroFotoPost` `position:absolute`), risultando in alto invece che in basso — proprio il punto meno scuro dello scrim. Risolto con `position:absolute;bottom:0`. `leggiNomeSettore()` rimossa da `app/page.tsx` (non più usata da nulla in questo file dopo la rimozione del titolo), insieme agli import ormai inutilizzati (`leggiNomeSettore`, `Link`). 1182/1182 test Vitest passati, 0 errori tsc/eslint (nessun `no-unused-vars` residuo), build produzione riuscita.

- **Terzo giro (stesso giorno)**: verificato di nuovo dal vivo con `npm run cf:preview` — l'utente ha confermato che l'effetto piace, chiedendo solo di aumentare la larghezza del blocco da 600px a 700px. Un solo valore cambiato (`max-width: 600px` → `700px` in `.heroBlocco`), altezza ancora automaticamente proporzionale grazie ad `aspect-ratio:4/3` (nessun secondo valore da ricalcolare a mano). Aggiornati anche i 2 commenti sorgente che citavano il vecchio valore 600px. 1182/1182 test Vitest passati, 0 errori tsc/eslint.
- **Quarto giro (stesso giorno)**: l'utente ha giudicato l'altezza "ancora piccola, andrebbe allungata" nonostante l'aumento a 700px di larghezza. `aspect-ratio` portato da `4/3` (orizzontale, 700×525px) a `1/1` (quadrato, 700×700px) — chiaramente più alto, coerente col principio già scelto nel secondo giro di un solo numero da regolare (nessuna misura assoluta indipendente dalla larghezza). 1182/1182 test Vitest passati, 0 errori tsc/eslint.
- **Quinto giro (stesso giorno)**: l'utente ha chiesto di "ridurre lo zoom... visualizzare il post integralmente senza tagliarlo" — `.heroFotoPost` da `background-size: cover` (ritaglia per riempire il riquadro) a `background-size: contain` (mostra la foto intera, eventuali bande vuote quando le proporzioni non coincidono con 700×700). Aggiunto `background-repeat: no-repeat` (necessario con `contain`: senza, il default CSS `repeat` avrebbe piastrellato l'immagine nello spazio vuoto). Nessun colore di sfondo aggiunto — le bande vuote mostrano correttamente lo sfondo scuro di `.hero` (`#0F2438`) già dietro, `.heroBlocco` non ha un proprio background. 1182/1182 test Vitest passati, 0 errori tsc/eslint.

### File List

- `app/page.tsx`
- `app/home-pubblica.module.css`

### Change Log

- 2026-08-15: File di story creato (create-story workflow) — punto aperto (titolo sopra/sotto) risolto con l'utente prima della scrittura: titolo sopra. Status: backlog → ready-for-dev.
- 2026-08-15: Implementata Story 18.19 (dev-story workflow) — titolo hero separato dal blocco Post Facebook (ora più stretto e più alto, 480px/420px). 1182/1182 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: ready-for-dev → review.
- 2026-08-15: Secondo giro, stesso giorno, su feedback diretto dell'utente dopo verifica dal vivo con `npm run cf:preview` — titolo e CTA rimossi del tutto, blocco Facebook centrato a 600px con altezza proporzionale (`aspect-ratio`), corretto un bug reale del primo giro (didascalia del post ancorata in alto invece che in basso). 1182/1182 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status resta review.
- 2026-08-15: Terzo giro, stesso giorno, su ulteriore feedback dopo nuova verifica con `npm run cf:preview` ("mi piace l'effetto, aumenterei a 700px") — larghezza `.heroBlocco` 600px → 700px, unico valore cambiato. 1182/1182 test Vitest passati, 0 errori tsc/eslint. Status resta review.
- 2026-08-15: Quarto giro, stesso giorno ("l'altezza è ancora piccola, andrebbe allungata") — `aspect-ratio` di `.heroBlocco` da `4/3` a `1/1` (quadrato, 700×700px). 1182/1182 test Vitest passati, 0 errori tsc/eslint. Status resta review.
- 2026-08-15: Quinto giro, stesso giorno ("ridurre lo zoom... visualizzare il post integralmente senza tagliarlo") — `.heroFotoPost` da `background-size: cover` a `contain` + `background-repeat: no-repeat`. 1182/1182 test Vitest passati, 0 errori tsc/eslint. Status resta review.
- 2026-08-15: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor, in parallelo con la review della Story 18.20) — 5 patch applicate, 0 difetti bloccanti rimasti aperti. 1208/1208 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review → done.

## Review Findings

- [x] [Review][Patch] `<h1>` mancante nell'hero dopo la rimozione del titolo (secondo giro) — regressione di accessibilità/SEO: nessuna intestazione di primo livello nel document outline (`HeaderPubblico.tsx` mostra il nome del Settore in uno `<span>`, non un heading). Risolto con `<h1 className={styles.srOnly}>Benvenuti nel {nomeVisualizzato}</h1>` (nuova utility `.srOnly`, pattern clip standard) — struttura semantica ripristinata senza reintrodurre testo visibile, `leggiNomeSettore()`/`nomeVisualizzato` ripristinati in `app/page.tsx` solo per questo scopo.
- [x] [Review][Patch] `.heroBlocco` senza sfondo proprio — le bande vuote lasciate da `background-size:contain` (quinto giro) potevano mostrare `.heroDiagonale` (accento decorativo, z-index:1) invece di uno sfondo scuro piatto su schermi larghi. Risolto aggiungendo `background: #0f2438` a `.heroBlocco` (stesso valore di `.hero`).
- [x] [Review][Patch] `.heroBlocco` con `width:100%` + margine orizzontale non nullo — il margine si somma FUORI dal box, quindi il blocco eccedeva sempre la larghezza disponibile della quantità del margine (non solo in un range ristretto come inizialmente riportato dall'Edge Case Hunter, verificato con calcolo manuale), venendo tagliato dall'`overflow:hidden` di `.hero`. Risolto con `width: calc(100% - 96px)` (desktop) / `calc(100% - 40px)` (mobile), sottraendo esplicitamente il margine.
- [x] [Review][Patch] Commento obsoleto in `app/page.tsx` che citava ancora "object-fit cover" per lo sfondo del blocco, mentre il quinto giro era già passato a `background-size:contain`. Aggiornato per riflettere lo stato attuale.
- [x] [Review][Patch] Commento obsoleto in `app/HeroPostFacebook.tsx` (righe 10-21) che descriveva ancora il vecchio layout con "titolo/CTA sovrapposti sopra" e "in coda al gruppo titolo+CTA" — entrambi rimossi dal secondo giro. Aggiornato, nessuna modifica alla logica di rendering.
