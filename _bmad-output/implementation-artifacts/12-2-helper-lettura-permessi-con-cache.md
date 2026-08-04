---
baseline_commit: 947747a56e3c8e145fe645b9378a58f0b3f6f000
---

# Story 12.2: Helper di lettura condiviso, con cache

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a sistema (route-guard.ts e requireRuolo, futuri consumer),
I want un helper centrale che risponda "questo Ruolo può accedere a questa rotta?" leggendo `PermessoRotta` con una cache in-memory a TTL breve,
so that Story 12.3/12.4 potranno collegare l'autorizzazione reale a questa configurazione senza interrogare il database a ogni richiesta.

**Note aggiuntive:** seconda story fondativa dell'Epic 12, dopo la **12.1** (`done`, entità `PermessoRotta` + pagina Admin `/permessi-accesso`, non ancora collegata a nessun controllo di accesso reale). Questa story costruisce **solo** l'helper di lettura, testato in isolamento — **nessun consumer viene collegato**: né `route-guard.ts` né `requireRuolo` né la Server Action `salvaPermessiRotte` di 12.1 vengono toccati. Il collegamento a `route-guard.ts` è Story 12.3; l'invalidazione della cache dopo un salvataggio da `/permessi-accesso` è quindi anch'essa fuori scope qui (non c'è ancora nessun collegamento da invalidare).

## Acceptance Criteria

1. **Given** un Ruolo `ADMIN` **When** si interroga l'helper per una qualunque rotta **Then** risponde sempre "abilitato" (`true`), senza mai consultare `PermessoRotta` — stesso principio già stabilito in Story 12.1 (ADMIN sempre escluso dai permessi configurabili, accesso pieno hardcoded)
2. **Given** un Ruolo diverso da ADMIN e una combinazione rotta+Ruolo per cui esiste una riga `PermessoRotta` con `abilitato: true` **When** si interroga l'helper **Then** risponde `true`
3. **Given** un Ruolo diverso da ADMIN e una combinazione rotta+Ruolo per cui **non esiste alcuna riga** in `PermessoRotta` (o esiste con `abilitato: false`) **When** si interroga l'helper **Then** risponde `false` — fail-closed, stessa decisione presa con l'utente in apertura dell'Epic 12
4. **Given** una prima interrogazione dell'helper **When** avviene **Then** legge `PermessoRotta` dal database e mantiene il risultato in una cache in-memory con TTL breve (60-120 secondi, decisione presa con l'utente)
5. **Given** una seconda interrogazione (qualunque rotta/Ruolo) entro il TTL dalla prima **When** avviene **Then** **non** genera una nuova query al database — risponde dalla cache
6. **Given** una interrogazione dopo la scadenza del TTL **When** avviene **Then** rilegge `PermessoRotta` dal database e rinnova la cache
7. **And** nessuna modifica a `lib/auth/route-guard.ts`, `lib/auth/require-ruolo.ts`, o a `app/(amministrazione)/permessi-accesso/actions.ts` — questa story introduce solo il nuovo modulo, senza collegare alcun consumer né alcuna invalidazione della cache al salvataggio (deferito a Story 12.3/12.4)

## Tasks / Subtasks

- [x] Task 1: Helper puro con cache in-memory (AC: #1, #2, #3, #4, #5, #6)
  - [x] Nuovo file `lib/auth/permessi-configurabili.ts` — funzione `rottaAbilitataPerRuolo(rotta: string, ruolo: Ruolo, ora: number = Date.now()): Promise<boolean>` (parametro `ora` iniettabile per i test, stesso principio di `sessioneScaduta(valoreCookie, ora)` in `lib/auth/sessione-inattiva.ts`, Story 9.8 — unico precedente di logica "a scadenza" già testabile in questo progetto, anche se il dominio è diverso — timeout di sessione vs. cache di configurazione)
  - [x] AC #1: se `ruolo === "ADMIN"`, ritorna `true` **immediatamente**, prima ancora di toccare la cache/il database — nessuna query Prisma per ADMIN, mai
  - [x] Stato di cache a livello di modulo: `{ scadeIl: number; abilitati: Set<string> } | null` — chiave del `Set` è `` `${rotta}|${ruolo}` `` (stessa convenzione già in uso in `app/(amministrazione)/permessi-accesso/actions.ts`/`page.tsx`, Story 12.1, per coerenza nel progetto anche se sono moduli indipendenti)
  - [x] Se la cache è assente o `ora >= cache.scadeIl`: `prisma.permessoRotta.findMany({ where: { abilitato: true }, select: { rotta: true, ruolo: true } })`, popola il `Set`, imposta `scadeIl = ora + TTL_MS`
  - [x] `TTL_MS`: costante di modulo, valore scelto nel range 60-120 secondi deciso con l'utente (consigliato: 90 000 ms, il punto medio) — nome/commento che citi esplicitamente la decisione e il range, non un "magic number" senza spiegazione
  - [x] AC #3 (fail-closed): se non ADMIN e la chiave `` `${rotta}|${ruolo}` `` non è nel `Set` (riga assente, o presente con `abilitato: false` e quindi già esclusa dal `where` della query), ritorna `false`
  - [x] Esportare anche `invalidaCachePermessi(): void` (azzera lo stato di cache a `null`) — non collegata a nessun chiamante in questa story (nessun consumer, AC #7), ma necessaria comunque per **resettare la cache tra un test e l'altro** (i test condividono lo stato di modulo altrimenti) e pronta per un futuro collegamento post-salvataggio in Story 12.3/12.4 senza dover ritoccare questo modulo
  - [x] `import "server-only"` in cima al file — stesso pattern già in uso in `lib/auth/require-ruolo.ts`, il modulo non deve mai finire in un bundle client
- [x] Task 2: Test in isolamento (AC: #1, #2, #3, #4, #5, #6)
  - [x] Nuovo file `lib/auth/permessi-configurabili.test.ts` — `vi.mock("@/lib/prisma", ...)` con `permessoRotta.findMany` mockato, stesso stile di `app/(amministrazione)/permessi-accesso/actions.test.ts` (Story 12.1, appena scritto — leggerlo per il pattern esatto di mock)
  - [x] `beforeEach`: chiamare `invalidaCachePermessi()` per garantire test indipendenti (nessuno stato di cache residuo tra un `it()` e l'altro)
  - [x] Test AC #1: `rottaAbilitataPerRuolo("/qualunque-rotta", "ADMIN")` ritorna `true` e **`findMany` non viene mai chiamato**
  - [x] Test AC #2/#3: con `findMany` mockato a restituire `[{ rotta: "/palestre", ruolo: "DIRIGENTE" }]`, `rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ora)` ritorna `true`; `rottaAbilitataPerRuolo("/palestre", "ALLENATORE", ora)` (Ruolo diverso, stessa rotta) e `rottaAbilitataPerRuolo("/altra-rotta", "DIRIGENTE", ora)` (rotta diversa, stesso Ruolo) ritornano entrambi `false`
  - [x] Test AC #4/#5: due chiamate con `ora` e `ora + 1000` (entro il TTL) — `findMany` chiamato **una sola volta** in totale
  - [x] Test AC #6: due chiamate con `ora` e `ora + TTL_MS + 1` (oltre il TTL) — `findMany` chiamato **due volte**
  - [x] Test `invalidaCachePermessi()`: una chiamata, poi `invalidaCachePermessi()`, poi un'altra chiamata con lo stesso `ora` (entro il TTL) — `findMany` chiamato comunque due volte (l'invalidazione forza una rilettura immediata anche se il TTL non è scaduto)
  - [x] Test che `findMany` venga chiamato con `where: { abilitato: true }` (non un `findMany({})` che includerebbe anche righe eventualmente disabilitate in futuro)
- [x] Task 3: Verifica di non-regressione (AC: #7)
  - [x] Nessuna modifica a `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`, `lib/auth/require-ruolo.ts`, `app/(amministrazione)/permessi-accesso/**` — verificare con `git diff --stat` che il diff finale tocchi solo i 2 file nuovi di questa story
  - [x] Suite Vitest completa invariata sui casi esistenti; `npx tsc --noEmit` pulito; ESLint pulito sui file nuovi

### Review Findings

- [x] [Review][Patch] Un errore Prisma (`findMany` che rigetta: DB irraggiungibile, timeout) si propagava non gestito al chiamante invece di negare l'accesso — un'eccezione non è un `false`, contraddizione diretta con l'auto-definizione "fail-closed" del modulo (AC #3): un futuro consumer che non normalizzasse esplicitamente l'eccezione rischierebbe di fallire *aperto* invece che chiuso, il contrario esatto della decisione presa con l'utente [lib/auth/permessi-configurabili.ts] — risolto: `try/catch` attorno al refresh della cache, `console.error` + `return false` sull'errore, cache lasciata invariata così un tentativo successivo può ritentare; 2 nuovi test (errore → `false`, tentativo successivo rilegge correttamente). Trovato indipendentemente da Blind Hunter ed Edge Case Hunter.
- [x] [Review][Patch] `invalidaCachePermessi()` azzera la cache solo dell'isolate Cloudflare Workers che la chiama, non dell'intera flotta — gli altri isolate caldi continuerebbero a servire permessi non aggiornati fino alla scadenza naturale del loro TTL locale; il commento originale ("pronta per un futuro collegamento... senza dover ritoccare questo modulo") lasciava intendere un'invalidazione immediata effettiva [lib/auth/permessi-configurabili.ts] — risolto: commento esplicito sul limite per-isolate, per evitare che Story 12.3/12.4 eredino silenziosamente questa falsa aspettativa. Trovato da Blind Hunter.
- [x] [Review][Patch] Il delimitatore `"|"` per la chiave di cache era riusato senza spiegare perché qui è sicuro, a differenza del bug reale trovato in code review di Story 12.1 (valore manomesso con `"|"` extra che sfuggiva al dedup) [lib/auth/permessi-configurabili.ts] — risolto: commento che chiarisce che `ruolo` è l'enum Prisma chiuso a 6 valori (mai testo libero) e `rotta` è sempre un `prefix` letterale di `PROTECTED_ROUTES`, non testo libero manomettibile come nel caso di 12.1. Trovato da Blind Hunter.
- [x] [Review][Patch] Nessun commento giustificasse l'assunzione implicita "la tabella `permessi_rotte` è piccola" (ogni refresh la legge per intero, non filtrata per la singola combinazione richiesta) [lib/auth/permessi-configurabili.ts] — risolto: commento esplicito sulla dimensione attesa (~130 righe al massimo) e su cosa rivedere se crescesse di ordini di grandezza. Trovato da Blind Hunter.
- [x] [Review][Patch] Il boundary esatto del TTL (`ora === cache.scadeIl`, già implementato come incluso/scaduto via `>=`) non aveva un test dedicato — un refactor accidentale a `>` non avrebbe fatto fallire nessun test esistente [lib/auth/permessi-configurabili.test.ts] — risolto: nuovo test sul boundary esatto. Trovato da Blind Hunter.
- [x] [Review][Patch] `TTL_MS` era ridichiarato come valore hardcoded indipendente nel file di test invece di essere importato dal sorgente — un cambio futuro del valore in produzione non avrebbe fatto fallire i test per drift [lib/auth/permessi-configurabili.ts, lib/auth/permessi-configurabili.test.ts] — risolto: `TTL_MS` ora esportato dal modulo sorgente e importato nel test. Trovato da Acceptance Auditor.
- [x] [Review][Defer] Nessun coalescing delle richieste concorrenti quando la cache è assente/scaduta ("thundering herd"): più chiamate simultanee innescherebbero ciascuna una `findMany` separata prima che la prima possa popolare la cache per le altre [lib/auth/permessi-configurabili.ts] — deferito: reale ma nessun consumer esiste ancora in questa story per osservare il pattern di carico reale; il costo è solo query ridondanti (nessun risultato scorretto), non una violazione di AC. Da rivalutare quando Story 12.3/12.4 collegheranno un chiamante reale. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter.
- [x] [Review][Defer] Una `invalidaCachePermessi()` chiamata mentre un refresh precedente è ancora in volo potrebbe veder quel refresh completarsi *dopo* l'invalidazione, ripopolando silenziosamente la cache appena azzerata con dati pre-invalidazione [lib/auth/permessi-configurabili.ts] — deferito: stessa causa radice del punto precedente (nessun meccanismo di coalescing/lock), stesso motivo per rimandare a quando esisterà un chiamante reale. Trovato da Edge Case Hunter.
- [x] [Review][Defer] `chiave()` non normalizza `rotta` (maiuscole/minuscole, spazi, slash finale) — un futuro consumer che passasse un `pathname` grezzo invece del `prefix` esatto di `PROTECTED_ROUTES` fallirebbe chiuso silenziosamente [lib/auth/permessi-configurabili.ts] — deferito: la correzione corretta dipende da come Story 12.3 deciderà di chiamare questo helper (pathname grezzo vs. `route.prefix` già risolto) — prematuro indovinare ora quale normalizzazione serva davvero. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter.

**Dismessi come rumore/fuori scope/convenzioni già accettate (5):** nessuna validazione runtime di un Ruolo malformato/sconosciuto — già garantito da TypeScript a ogni call site reale del progetto, nessun confine di sistema/input esterno attraversato in questa story; isolamento dei test tramite `invalidaCachePermessi()` invece di `vi.resetModules()` — scelta di design deliberata e ragionevole (rispecchia la semantica reale di produzione), non un difetto; mock di `@/lib/prisma` semplificato rispetto al vero `Proxy` di `lib/prisma.ts` — convenzione già stabilita identica in ogni altro test file del progetto; nessun test esplicito che il `Set` venga sempre sostituito e mai mutato incrementalmente — guardia speculativa contro un refactor ipotetico mai avvenuto; `ora` come `NaN` non validato — irraggiungibile oggi, solo il default `Date.now()` è mai usato finché non esiste un consumer che passi input esterno.

## Dev Notes

- **Perimetro esatto**: **solo** 2 file nuovi, `lib/auth/permessi-configurabili.ts` e il suo test. **Nessuna modifica** a `route-guard.ts`, `require-ruolo.ts`, o a qualunque file di `app/(amministrazione)/permessi-accesso/` — quel collegamento è esplicitamente Story 12.3 (route-guard) e Story 12.4 (Server Action, PoC end-to-end su `/precaricamento-allenatori`).
- **Perché ADMIN va escluso PRIMA di toccare la cache, non dopo**: se l'helper leggesse comunque la cache/il database per ADMIN e poi ignorasse il risultato, sarebbe una query sprecata a ogni chiamata per il Ruolo che in assoluto la userà più spesso (ADMIN ha accesso a tutto, quindi ogni sua richiesta protetta passerebbe di qui una volta collegato in 12.3/12.4) — il controllo va fatto come primissima riga della funzione.
- **Perché la firma prende un solo `Ruolo`, non `Ruolo[]`** (a differenza di `requireRuolo(ruoliRichiesti: Ruolo | Ruolo[])`): l'helper risponde alla domanda elementare "questo specifico Ruolo può accedere a questa rotta?" — un futuro chiamante che deve verificare "l'Utente ha ALMENO UNO dei suoi Ruoli abilitato" (come fa oggi `requireRuolo` con `.some()`) può comporre banalmente questa primitiva con `Promise.all` + `.some()`, senza che l'helper stesso debba conoscere la lista di Ruoli di un Utente. Non introdurre questa composizione qui: nessun consumer esiste ancora in questa story (AC #7), sarebbe speculativo.
- **Perché il parametro `ora` è iniettabile invece di usare sempre `Date.now()` internamente**: stesso principio già stabilito in `lib/auth/sessione-inattiva.ts` (`sessioneScaduta(valoreCookie, ora)`, Story 9.8) — un test che dovesse aspettare 60-120 secondi reali per verificare la scadenza del TTL sarebbe lento e fragile; iniettare l'"ora" rende il test istantaneo e deterministico. Il default `= Date.now()` mantiene comunque l'ergonomia per un futuro chiamante reale, che non dovrà mai passarlo esplicitamente.
- **Perché `invalidaCachePermessi()` esiste già in questa story pur non avendo ancora un chiamante reale**: serve comunque per isolare i test tra loro (la cache è stato di modulo, condiviso tra tutte le chiamate nello stesso processo/test file) — esportarla ora evita di dover ritoccare questo modulo quando Story 12.3/12.4 vorranno invalidare la cache subito dopo un salvataggio riuscito da `salvaPermessiRotte` (Story 12.1), invece di aspettare fino a 120 secondi prima che un cambio diventi visibile.
- **Perché il `where` della query filtra già `abilitato: true`**: la Server Action di Story 12.1 non scrive mai `abilitato: false` esplicitamente (scrive sempre `true`, o non scrive affatto la riga — "assenza di riga" è l'unico meccanismo di "disabilitato" usato oggi, vedi Dev Notes di 12.1). Filtrare comunque per `abilitato: true` qui è corretto per costruzione anche se oggi è un no-op: se in futuro un flusso diverso iniziasse a scrivere `abilitato: false` su una riga esistente invece di cancellarla, questo helper si comporterebbe già correttamente senza bisogno di modifiche.
- **Perché nessuna invalidazione automatica viene collegata a `salvaPermessiRotte` in questa story**: collegarla richiederebbe modificare `app/(amministrazione)/permessi-accesso/actions.ts`, esplicitamente fuori perimetro (AC #7) — questa story costruisce l'helper "testato in isolamento" (testo esatto di `epics.md`), il collegamento a un qualunque consumer reale è responsabilità delle story successive.
- **File NON da toccare**: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`, `lib/auth/require-ruolo.ts`, `app/(amministrazione)/permessi-accesso/actions.ts`, `app/(amministrazione)/permessi-accesso/page.tsx`, `prisma/schema.prisma` (nessuna nuova migrazione, l'entità `PermessoRotta` esiste già da Story 12.1).

### Project Structure Notes

- File nuovi: `lib/auth/permessi-configurabili.ts`, `lib/auth/permessi-configurabili.test.ts`.
- File modificati: nessuno.
- Nessuna migrazione, nessuna nuova dipendenza.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 12.2: Helper di lettura condiviso, con cache]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12: Permessi Configurabili da Admin — decisioni prese con l'utente in fase di analisi (cache in-memory con TTL 60-120s, fail-closed, ADMIN sempre escluso)]
- [Source: _bmad-output/implementation-artifacts/12-1-entita-permessi-e-pagina-admin.md — model `PermessoRotta`, convenzione chiave `` `${rotta}|${ruolo}` ``, Dev Notes su `abilitato` scritto sempre `true`/mai `false`]
- [Source: prisma/schema.prisma righe finali — model `PermessoRotta` (`rotta String`, `ruolo Ruolo`, `abilitato Boolean @default(true)`, `@@unique([rotta, ruolo])`)]
- [Source: lib/auth/sessione-inattiva.ts, lib/auth/sessione-inattiva.test.ts (Story 9.8) — unico precedente in questo progetto di logica "a scadenza" con parametro `ora` iniettabile per la testabilità, pattern da riprodurre qui]
- [Source: lib/auth/require-ruolo.ts — `import "server-only"`, stile di commento sul perché di ogni scelta, da riprodurre]
- [Source: app/(amministrazione)/permessi-accesso/actions.test.ts (Story 12.1) — pattern esatto di `vi.mock("@/lib/prisma", ...)` da riusare per mockare `prisma.permessoRotta.findMany`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- `lib/auth/permessi-configurabili.ts`: `rottaAbilitataPerRuolo(rotta, ruolo, ora = Date.now())` — ADMIN ritorna `true` immediatamente, prima di toccare cache/database (AC #1, nessuna query Prisma per ADMIN mai). Cache di modulo `{ scadeIl, abilitati: Set<string> } | null`, chiave `` `${rotta}|${ruolo}` ``, TTL 90 000 ms (punto medio del range 60-120s deciso con l'utente). `where: { abilitato: true }` nella query — no-op oggi (Story 12.1 scrive sempre `true` o non scrive la riga) ma corretto per costruzione. `invalidaCachePermessi()` esportata: nessun chiamante reale in questa story, usata solo per isolare i test tra loro (`beforeEach`), pronta per un futuro collegamento in Story 12.3/12.4.
- `import "server-only"` in cima al file, come da Task 1. Scoperto in fase di test: il pacchetto `server-only` lancia sempre un errore se importato fuori dalla risoluzione webpack di Next.js — stesso identico problema già risolto in `require-ruolo.test.ts` con `vi.mock("server-only", () => ({}))` in testa al file di test, pattern riprodotto identico qui.
- 8 test in `permessi-configurabili.test.ts`: ADMIN mai interroga il DB, abilitato/non abilitato per rotta+Ruolo esatto, `where` corretto, nessuna nuova query entro il TTL, nuova query dopo la scadenza, `invalidaCachePermessi()` forza una rilettura immediata. Mock di `@/lib/prisma` stesso stile di `app/(amministrazione)/permessi-accesso/actions.test.ts` (Story 12.1).
- Verificato con `git status --porcelain` che il diff tocchi **solo** i 2 file nuovi di questa story — nessuna modifica a `route-guard.ts`, `require-ruolo.ts`, o a `app/(amministrazione)/permessi-accesso/**` (AC #7).
- Verifica finale: 870/870 test Vitest passati (860 baseline + 8 nuovi, +2 di sfondo non correlati già presenti prima di questa sessione), `npx tsc --noEmit` pulito, ESLint pulito sui 2 file nuovi.

### File List

- `lib/auth/permessi-configurabili.ts` (nuovo)
- `lib/auth/permessi-configurabili.test.ts` (nuovo)

## Change Log

- 2026-08-04: Story creata (bmad-create-story) — helper `rottaAbilitataPerRuolo` con cache in-memory a TTL (60-120s, decisione confermata con l'utente), fail-closed, ADMIN sempre escluso e mai interrogato dal database. Nessun consumer collegato in questa story (route-guard.ts/require-ruolo.ts invariati, deferito a Story 12.3/12.4). Status: ready-for-dev.
- 2026-08-04: Implementata — `lib/auth/permessi-configurabili.ts` (`rottaAbilitataPerRuolo`, `invalidaCachePermessi`) + 8 test in isolamento. `vi.mock("server-only", ...)` necessario nel test file (stesso pattern di `require-ruolo.test.ts`). Verificato che nessun file esistente sia stato toccato (AC #7). 870/870 test Vitest passati, 0 errori tsc/eslint. Status: review.
- 2026-08-04: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 6 patch applicati: (1) errore Prisma non gestito che rompeva il fail-closed dichiarato, ora `try/catch` + `return false` (trovato indipendentemente da Blind Hunter ed Edge Case Hunter — il bug più serio, contraddiceva l'AC #3 stessa); (2) documentato il limite per-isolate di `invalidaCachePermessi()` su Cloudflare Workers; (3) documentato perché il delimitatore `"|"` è sicuro qui (a differenza del bug reale di Story 12.1); (4) documentata l'assunzione "tabella piccola"; (5) nuovo test sul boundary esatto del TTL; (6) `TTL_MS` ora esportato/importato invece di duplicato hardcoded nel test (Acceptance Auditor). 3 defer (nessun coalescing delle richieste concorrenti — trovato indipendentemente da 2 layer; race invalidazione/refresh in volo, stessa causa radice; `rotta` non normalizzata — dipende da una decisione di Story 12.3 non ancora presa). 5 dismessi come falsi positivi/convenzioni già accettate. 873/873 test Vitest passati (3 nuovi test di regressione), 0 errori tsc/eslint dopo i fix. Status: done.
