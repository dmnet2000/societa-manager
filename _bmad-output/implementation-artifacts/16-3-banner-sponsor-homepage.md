---
baseline_commit: 0b7296fd5348e60810f39804dd85b16792648185
---

# Story 16.3: Banner sponsor in homepage per Atleta/Genitore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Atleta o Genitore,
I want vedere i Banner pubblicitari attivi in evidenza appena entro nell'app,
so that scopra gli sponsor della società senza dover cercare la sezione Sponsor.

## Acceptance Criteria

1. **Given** un Utente con Ruolo Atleta o Genitore **When** visita la homepage (`/`) **Then** vede un carosello dei Banner pubblicitari attivi (`Sponsor.tipo = BANNER`, `attiva = true`), un Banner alla volta (immagine + nome), posizionato in evidenza nella pagina.
2. **And** il carosello avanza automaticamente al Banner successivo dopo qualche secondo, con la possibilità di navigare manualmente avanti/indietro (frecce) o tramite indicatori a pallino.
3. **Given** un Banner con `linkEsterno` impostato **When** l'Utente clicca l'immagine **Then** il link si apre in una nuova scheda — stesso comportamento già implementato per la vetrina `/sponsor` (Story 16.2, estensione post-review "Banner cliccabile").
4. **And** se nessun Banner è attivo, la homepage non mostra alcuna sezione sponsor (nessun carosello vuoto, nessun messaggio placeholder).
5. **And** un Utente con un Ruolo diverso da Atleta/Genitore (Allenatore, Admin, Dirigente, Segreteria) non vede alcuna modifica alla homepage — nessuna sezione sponsor, nessun cambiamento di comportamento rispetto a oggi.

## Tasks / Subtasks

- [x] Task 1: Funzioni pure di navigazione del carosello (AC: #2)
  - [x] Nuovo file `lib/sponsor/carosello-indice.ts`: `avanti(indice, totale)` e `indietro(indice, totale)` — aritmetica modulare con wraparound corretto in entrambe le direzioni (JS `%` non avvolge i negativi come atteso: `-1 % 3 === -1`, non `2` — usare `(indice - 1 + totale) % totale` per `indietro`). Pure, senza dipendenze da React/DOM — estratte per essere testabili senza montare il componente client (stesso principio già seguito per `raggruppaSponsorPerTipo`/`risolviNomeVoucher`, Story 16.1/16.2).
- [x] Task 2: Componente `SponsorCarosello` (AC: #1, #2, #3)
  - [x] Nuovo file `app/SponsorCarosello.tsx` (root di `app/`, non sotto `app/(sponsor)/` — consumato dalla homepage, non dalla sezione Sponsor; mirror del posizionamento di `app/NavBarClient.tsx`). `"use client"` (primo uso di `setInterval`/avanzamento automatico nel progetto — nessun precedente diretto da riusare, solo `useEffect` per pattern "resetta il form al successo" altrove).
  - [x] Props: elenco Banner già risolti server-side (`{ id, nome, linkEsterno, immagineUrl }[]` — niente fetch client-side, dati passati dal Server Component `page.tsx`, stesso principio del resto del progetto: mai un client fetch quando i dati sono già disponibili lato server).
  - [x] Avanzamento automatico ogni 5 secondi (`setInterval` in un `useEffect`, cleanup con `clearInterval` — **fermare l'intervallo se c'è un solo Banner** o se l'elenco è vuoto, nessun senso a far scorrere un carosello con 0-1 elementi). Frecce prev/next (`aria-label` espliciti, es. "Sponsor precedente"/"Sponsor successivo") e indicatori a pallino cliccabili (uno per Banner, `aria-current`/stato visivo per l'indicatore attivo) — usano `avanti`/`indietro` di Task 1.
  - [x] Immagine cliccabile verso `linkEsterno` se impostato (AC #3) — stesso pattern già implementato in `SponsorVetrinaCard.tsx` (`target="_blank" rel="noopener noreferrer"`, `aria-label` esplicito) — mirror diretto, non reinventare la struttura del link.
  - [x] Nuovo CSS module `app/sponsor-carosello.module.css` (o esteso in `home.module.css` — decidere in sviluppo in base a cosa risulta più pulito; il componente vive fuori da `app/(sponsor)/`, quindi non riusa `sponsor.module.css` di quel route group). Token di DESIGN.md (colori/radius/spaziatura esistenti, nessun nuovo colore introdotto) — carosello "in evidenza" ma senza rompere il registro visivo assertivo/minimale già stabilito (niente pillole, niente colori decorativi nuovi).
- [x] Task 3: Integrazione in homepage con filtro Ruolo (AC: #1, #4, #5)
  - [x] `app/page.tsx`: `parseRuoli(user?.app_metadata?.ruoli)` (stesso pattern già in uso in `/campionati`, `/sponsor`) — se `ruoli.includes("ATLETA") || ruoli.includes("GENITORE")`, leggere `prisma.sponsor.findMany({ where: { tipo: "BANNER", attiva: true }, orderBy: { createdAt: "desc" } })` e, solo se l'elenco non è vuoto (AC #4), renderizzare `<SponsorCarosello>` con i dati risolti (`urlPubblicoImmagineSponsor`, Story 16.1, per ciascun Banner). Per ogni altro Ruolo: nessuna query, nessun cambiamento (AC #5) — query condizionata al Ruolo, non eseguita "a vuoto" per Ruoli che non la useranno mai.
  - [x] Nessuna nuova migrazione, nessuna nuova Server Action, nessuna nuova voce di `route-guard.ts` (la homepage `/` è già raggiungibile da ogni Ruolo autenticato, nessuna restrizione da aggiungere/modificare).
- [x] Task 4: Test
  - [x] `lib/sponsor/carosello-indice.test.ts` (nuovo): `avanti`/`indietro` — avanzamento/retrocessione normale, wraparound in entrambe le direzioni (dall'ultimo al primo e viceversa), caso limite `totale = 1` (resta sempre sullo stesso indice, mai una divisione per zero o un NaN).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.
  - [x] Nessun test diretto su `page.tsx`/`SponsorCarosello.tsx` (Server/Client Component) — coerente con la convenzione già stabilita in questo progetto di non testare `page.tsx` direttamente (confermato anche dall'Acceptance Auditor nella code review di Story 16.2); la logica di navigazione testabile è isolata in Task 1.

## Dev Notes

### Decisioni di analisi (2026-08-09, prese con l'utente — richiesta emersa durante la verifica dal vivo di Story 16.2)

- **Solo `tipo = BANNER`**, mai le Convenzioni — richiesta esplicita dell'utente ("i banner pubblicitari"); le Convenzioni (con "Genera voucher") restano esclusivamente su `/sponsor` (Story 16.2), non duplicate in homepage.
- **Solo Ruoli Atleta e Genitore** — richiesta esplicita; per tutti gli altri Ruoli la homepage resta invariata.
- **Presentazione "accattivante"**: carosello auto-avanzante — scelta di design delegata esplicitamente dall'utente ("trova un modo accattivante"), nessuna libreria esterna (coerente con l'assenza di dipendenze carosello/slider in tutto il progetto — verificato `package.json`), componente client leggero (`useState`/`useEffect`/`setInterval`).
- **Immagine cliccabile** verso `linkEsterno` se impostato — stesso comportamento già implementato nella vetrina `/sponsor` (estensione post-review di Story 16.2, `SponsorVetrinaCard.tsx`), da mirrorare 1:1.
- **Nessuna sezione se non ci sono Banner attivi** — homepage resta quella attuale (nessuna card vuota/carosello vuoto, AC #4).
- **Nessuna nuova migrazione, nessuna nuova Server Action** — solo lettura, riuso diretto di `urlPubblicoImmagineSponsor` (Story 16.1).

### Pattern da riusare (non reinventare)

- **Filtro Ruolo su una pagina condivisa**: mirror di `app/(partite-campionati)/campionati/page.tsx` (`parseRuoli(user?.app_metadata?.ruoli)` + branch condizionale) e di `app/(sponsor)/sponsor/page.tsx` (Story 16.2, `eGestionale`).
- **Immagine cliccabile verso `linkEsterno`**: mirror esatto di `app/(sponsor)/sponsor/SponsorVetrinaCard.tsx` (estensione post-review Story 16.2) — stesso `target="_blank" rel="noopener noreferrer"`, stesso `aria-label`.
- **URL pubblico immagine con cache-busting**: `urlPubblicoImmagineSponsor` (`lib/storage/sponsor.ts`, Story 16.1) + query string `?v=updatedAt` (stesso principio già applicato a `SponsorRow.tsx`/`SponsorVetrinaCard.tsx` — non dimenticarlo qui, era un review-fix reale in Story 16.2).
- **Estrazione di logica pura da un componente altrimenti non testabile**: mirror di `raggruppaSponsorPerTipo`/`risolviNomeVoucher`/`convenzioneVoucherValida` (`lib/sponsor/`, Story 16.2) — stesso principio per `avanti`/`indietro` di Task 1.

### Punto tecnico verificato in apertura — nessun precedente diretto per un carosello auto-avanzante

Nessun componente esistente in questo progetto usa `setInterval`/avanzamento automatico a tempo — ogni `useEffect` esistente gestisce solo il reset di un form dopo un submit riuscito (es. `NuovaPalestraForm.tsx`, `LogoForm.tsx`). Questa storia introduce il primo pattern di "auto-play" del progetto: cleanup dell'intervallo in un `return () => clearInterval(id)` obbligatorio (altrimenti l'intervallo continua a girare dopo che il componente si smonta — non applicabile qui dato che la homepage non fa mai un client-side unmount di questo componente in questo progetto, ma comunque la pratica React corretta da seguire).

### Riferimenti

- [Source: app/page.tsx] — homepage attuale, da leggere per intero prima di modificarla (pagina molto semplice, solo saluto + Ruoli).
- [Source: app/(sponsor)/sponsor/SponsorVetrinaCard.tsx] — pattern immagine cliccabile verso `linkEsterno`, da mirrorare.
- [Source: lib/storage/sponsor.ts] — `urlPubblicoImmagineSponsor`, da riusare invariata.
- [Source: app/(partite-campionati)/campionati/page.tsx] — pattern di filtro Ruolo su una pagina condivisa.
- [Source: _bmad-output/implementation-artifacts/16-2-sponsor-vetrina-voucher.md] — story precedente nello stesso Epic, stesso model `Sponsor`/stesso storage.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 16: Sponsor e Convenzioni, Story 16.3] — decisioni di analisi complete.

### Project Structure Notes

- Nuovo file `lib/sponsor/carosello-indice.ts` (+ test) — stesso route group logico di `lib/sponsor/` (Story 16.2), nessuna dipendenza da Prisma/React.
- Nuovo file `app/SponsorCarosello.tsx` (root di `app/`, non sotto `app/(sponsor)/`) + CSS module dedicato.
- Modificato: `app/page.tsx`.
- Nessuna nuova migrazione, nessuna modifica a `prisma/schema.prisma`, nessuna modifica a `lib/auth/route-guard.ts`.

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff scoped alla sola Story 16.3.

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 5 verificati indipendentemente (filtro Ruolo, query `tipo=BANNER`/`attiva=true`, avanzamento automatico con cleanup, immagine cliccabile mirror di `SponsorVetrinaCard.tsx`, nessuna sezione se vuoto). Due osservazioni soft, non violazioni: `force-dynamic` non scoped al solo Ruolo Atleta/Genitore (funzionalmente inerte, `getUser()` forza già il rendering dinamico) e posizionamento del carosello dopo la card di saluto invece che come primo elemento (scelta UX soggettiva, nessun mockup dedicato per questa story).

- [x] [Review][Patch] Nessun controllo di pausa/stop sul contenuto auto-avanzante — violazione WCAG 2.2.2 (Pause, Stop, Hide), rischio reale non mitigato dato che è il primo componente auto-play del progetto. Trovato dal Blind Hunter. Corretto: pulsante di pausa/ripresa (`aria-pressed`, `aria-label` esplicito), l'intervallo si ferma quando in pausa. [app/SponsorCarosello.tsx]
- [x] [Review][Patch] La navigazione manuale (frecce/pallini) non resetta il timer di avanzamento automatico — un click manuale può essere "risucchiato" in avanti pochi istanti dopo, percepito come un bug. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Corretto: l'effetto dell'intervallo dipende anche da `indice`, si riavvia ad ogni navigazione manuale. [app/SponsorCarosello.tsx]
- [x] [Review][Patch] `banner[indice]` non protetto se l'array si riduce tra un render e l'altro (es. un'Atleta con la home già montata, un Admin disattiva uno Sponsor) — `indice` da uno stato precedente potrebbe puntare oltre la nuova lunghezza, causando un crash su `attuale.nome`/`attuale.linkEsterno`. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Corretto: nuova funzione pura `indiceEntroLimiti` (`lib/sponsor/carosello-indice.ts`, 4 nuovi test) applicata prima di leggere `attuale`. [app/SponsorCarosello.tsx, lib/sponsor/carosello-indice.ts]
- [x] [Review][Patch] CSS morto su `.freccia`/`.pallino`: `width`/`height` espliciti (36px/8px) sono sempre sovrascritti dal `min-width`/`min-height: 44px` più grande (regola CSS box-sizing) — codice fuorviante che suggerisce una dimensione visiva mai realmente applicata. Trovato dal Blind Hunter. Corretto: rimossi i `width`/`height` inerti, mantenuti solo i `min-width`/`min-height` (già sufficienti per il target di tocco 44px) più il pallino visivo 8px via `::after` (invariato). [app/sponsor-carosello.module.css]
- [x] [Review][Patch] `.indicatori` senza `flex-wrap` — con più di una manciata di Banner attivi la riga di pallini trabocca senza andare a capo. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Corretto: `flex-wrap: wrap`. [app/sponsor-carosello.module.css]
- [x] [Review][Patch] `aria-label` sull'immagine del carosello privo di contesto posizionale ("2 di 4"), a differenza dei pallini che già lo includono — incoerenza di accessibilità tra due controlli dello stesso componente. Trovato dal Blind Hunter. Corretto: alt text esteso con la posizione, stesso formato dei pallini. [app/SponsorCarosello.tsx]

- [x] [Review][Defer] `prisma.sponsor.findMany` in `page.tsx` non è avvolto in un try/catch (Edge Case Hunter). Deferred: gap preesistente e trasversale a tutta l'app (nessun `error.tsx`), già loggato ripetutamente fin da Story 1.2. [app/page.tsx]
- [x] [Review][Defer] Nessun `take`/limite sulla query dei Banner attivi — un numero elevato di Sponsor attivi renderebbe il carosello/i pallini eccessivi (Blind Hunter + Edge Case Hunter, trovato indipendentemente da entrambi). Deferred: questione di scala, non un bug — stesso principio già accettato ripetutamente nel progetto per NFR5/NFR6 (piccola società, poche decine di entità al massimo); un limite arbitrario sarebbe una decisione di prodotto, non una correzione tecnica. [app/page.tsx]
- [x] [Review][Defer] Layout shift (CLS) tra slide con immagini di aspect-ratio diversi — `.viewport` non ha un'altezza fissa (Blind Hunter). Deferred: cosmetico, una soluzione richiederebbe una decisione di design (altezza fissa + crop vs `object-fit: contain` attuale), non un difetto univocamente correggibile. [app/sponsor-carosello.module.css]
- [x] [Review][Defer] Nessun fallback `onError` se l'immagine di un Banner non esiste ancora nel bucket (Blind Hunter). Deferred: estende lo stesso gap già deferito due volte (Story 16.1 `SponsorRow`, Story 16.2 `SponsorVetrinaCard`) — qui l'esposizione aumenta (compare automaticamente in homepage invece che in una pagina visitata volontariamente), annotato esplicitamente per una futura story dedicata al fallback immagini se il problema si manifestasse davvero. [app/SponsorCarosello.tsx]
- [x] [Review][Defer] Nessuna copertura di test automatica sul comportamento a runtime di `SponsorCarosello.tsx` (avanzamento dell'intervallo, cleanup allo smontaggio, click manuali) — solo le funzioni pure `avanti`/`indietro` sono testate (Blind Hunter). Deferred: testare un componente React con timer richiederebbe introdurre React Testing Library (nessuna libreria di test di componenti esiste oggi nel progetto, solo Vitest su funzioni pure/Server Action con mock) — nuova dipendenza, decisione da prendere con l'utente, non unilaterale in una code review. [app/SponsorCarosello.tsx]
- [x] [Review][Defer] Il controllo "nessun Banner attivo" è duplicato in due punti (`page.tsx` con `length > 0` e il componente stesso con `if (banner.length === 0) return null`) (Blind Hunter). Deferred: rischio di drift basso, entrambi i controlli sono oggi identici e ridondanti in modo innocuo, non un difetto. [app/page.tsx, app/SponsorCarosello.tsx]

**Dismessi come rumore/convenzioni già accettate (1)**: `getUser()` in `page.tsx` non logga l'eventuale `error` (a differenza di `/sponsor/page.tsx`) (Blind Hunter) — omissione preesistente da prima di questa storia (verificato: la homepage originale non distruttura mai `error`), non introdotta né aggravata da questo diff.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Nessuno - nessun blocco incontrato. Stesso errore benigno preesistente del motore Prisma WASM durante il prerendering statico già osservato in Story 16.1/16.2 (non introdotto/aggravato da questa story) - la build completa comunque con successo.

### Completion Notes List

- Task 1: funzioni pure `avanti`/`indietro` (`lib/sponsor/carosello-indice.ts`) con wraparound corretto in entrambe le direzioni (attenzione esplicita al comportamento di `%` di JS sui negativi) e guardia esplicita per `totale <= 1` (nessuna divisione per zero/NaN). 8 nuovi test.
- Task 2: `app/SponsorCarosello.tsx` (client component, primo `setInterval`/auto-play del progetto) - avanzamento automatico ogni 5s con cleanup dell'intervallo, disattivato con 0-1 Banner; frecce prev/next + indicatori a pallino (touch target 44px via `::after`, stessa lezione già nota nel progetto da Story 15.5/9.30); immagine cliccabile verso `linkEsterno` mirror di `SponsorVetrinaCard.tsx`. Nuovo CSS module `app/sponsor-carosello.module.css`.
- Task 3: `app/page.tsx` esteso con `parseRuoli` + query condizionata (`tipo: "BANNER", attiva: true`) solo per Atleta/Genitore (AC #5: nessuna query per altri Ruoli), `dynamic = "force-dynamic"` aggiunto (dati potenzialmente diversi ad ogni visita, la pagina non lo dichiarava esplicitamente prima). Cache-busting `?v=updatedAt` applicato fin da subito sull'URL immagine (lezione già imparata in code review di Story 16.2, non ripetuto qui come nuovo finding).
- Task 4: 8 nuovi test su `carosello-indice.ts`, nessun test diretto su `page.tsx`/`SponsorCarosello.tsx` (coerente con la convenzione del progetto). 1036/1036 test Vitest passati (era 1028), 0 errori tsc/eslint, build produzione riuscita.
- Verifica dal vivo (carosello reale con più Banner, avanzamento automatico, click su link esterno) non eseguibile in questo sandbox (nessun accesso DB/Storage reale, nessun browser) - demandata all'utente.

### File List

- `lib/sponsor/carosello-indice.ts` (modificato: aggiunta `indiceEntroLimiti`, review fix)
- `lib/sponsor/carosello-indice.test.ts` (modificato: 4 nuovi test per `indiceEntroLimiti`)
- `app/SponsorCarosello.tsx` (nuovo, poi modificato in code review: pulsante pausa, reset timer su navigazione manuale, clamp indice, aria-label posizionale)
- `app/sponsor-carosello.module.css` (nuovo, poi modificato in code review: CSS morto rimosso, flex-wrap, stile pulsante pausa)
- `app/page.tsx` (modificato: carosello Banner condizionato al Ruolo Atleta/Genitore)

## Change Log

- 2026-08-09: File di story creato, stato ready-for-dev.
- 2026-08-09: Implementata - funzioni pure di navigazione carosello, componente client `SponsorCarosello` (auto-play + frecce + indicatori + immagine cliccabile), integrazione in homepage condizionata al Ruolo. 1036/1036 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-09: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor) - nessuna violazione degli AC. 6 patch applicati: pulsante di pausa/ripresa (WCAG 2.2.2), timer riavviato su navigazione manuale, clamp dell'indice per evitare un crash se l'elenco Banner si riduce, rimozione di CSS morto su frecce/pallini, `flex-wrap` sugli indicatori, `aria-label` dell'immagine con contesto posizionale. 6 defer, 1 dismesso come omissione preesistente non introdotta da questa storia. 1040/1040 test Vitest passati (era 1036), 0 errori tsc/eslint, build produzione riuscita. Status: done.
