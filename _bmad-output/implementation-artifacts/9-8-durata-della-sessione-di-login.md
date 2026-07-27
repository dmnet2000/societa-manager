---
baseline_commit: f0fd7fe3bd8a76be6245f8b1ff30923384840190
---

# Story 9.8: Durata della sessione di login

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente autenticato,
I want che l'app mi richieda di nuovo il login dopo un periodo di inattività,
so that una sessione dimenticata aperta non resti valida indefinitamente.

## Acceptance Criteria

1. **Given** un Utente autenticato che non genera alcuna richiesta verso l'app per più di **1 ora** **When** effettua una richiesta successiva (pagina protetta) **Then** la sessione viene terminata (fail-closed, stesso principio di `esci()`) e viene rediretto a `/accedi`, come un Utente non autenticato
2. **Given** un Utente autenticato che usa l'app con normalità (almeno una richiesta ogni meno di 1 ora) **When** naviga **Then** la sessione resta valida indefinitamente — nessun logout forzato per il solo passare del tempo, solo per inattività
3. **Given** un Utente che ha appena effettuato il login **When** naviga per la prima volta dopo il login **Then** non viene disconnesso immediatamente (la soglia di inattività parte da questo momento, non da "sempre scaduta" per un Utente senza tracciamento precedente)
4. **And** nessuna regressione sul comportamento esistente del route guard (Story 1.1): route pubbliche, redirect per Ruolo non autorizzato, esenzioni `/api/cron/*` e `/api/health` invariate

## Tasks / Subtasks

- [x] Task 1: Helper puro per la logica di scadenza (AC: #1, #2, #3)
  - [x] Creato `lib/auth/sessione-inattiva.ts`: `SOGLIA_INATTIVITA_MS` (1 ora), `ULTIMA_ATTIVITA_COOKIE`, `sessioneScaduta(valoreCookie, ora)`
  - [x] `lib/auth/sessione-inattiva.test.ts` (6 test): non scaduta se recente, scaduta oltre soglia, non scaduta esattamente al limite, cookie assente, malformato, stringa vuota
- [x] Task 2: Integrazione in `middleware.ts` (AC: #1, #2, #3, #4)
  - [x] Dopo `getUser()`, se `user` esiste: controlla `sessioneScaduta` sul cookie `ultima-attivita`; se scaduta chiama `signOut()` (try/catch fail-closed) e imposta `user = null`, riusando `getRouteDecision` esistente per il redirect
  - [x] Se non scaduta: rinfresca il cookie `ultima-attivita` su `response` (httpOnly, secure in produzione, sameSite lax, maxAge = soglia)
  - [x] Fix del bug di perdita cookie nel ramo redirect: cookie di `response` copiati su `redirectResponse` prima di ritornarlo, `ultima-attivita` cancellato esplicitamente se la sessione è scaduta per inattività
- [x] Task 3: Regressione (AC: #4)
  - [x] `lib/auth/route-guard.test.ts` invariato, ancora passante (nessuna modifica a `getRouteDecision`)
  - [x] Suite Vitest completa: 544/544 passati (538 baseline + 6 nuovi), zero regressioni
  - [x] `npx tsc --noEmit` ed `eslint` sui file toccati: 0 errori
- [x] Task 4: Verifica manuale dal vivo (non automatizzabile con Vitest+mock su `middleware.ts`, che non ha test diretti nel progetto — solo `route-guard.ts`, la logica pura che invoca, è testata)
  - [x] Chiusa su richiesta esplicita dell'utente (2026-07-27): commit pushato, verifica dal vivo delegata al deploy in produzione in corso, non confermata esplicitamente in questa sessione prima della chiusura della storia — stesso pattern già usato per Story 9.7

## Dev Notes

- **Perché non le impostazioni native Supabase ("Time-box user sessions"/"Inactivity timeout")**: richiedono il piano **Pro** di Supabase — verificato dall'utente dal vivo ("Configuring user sessions is only available on the Pro Plan and above"), in conflitto con NFR6 (nessun budget/hosting dedicato, piani Free). Da qui la scelta di un timeout applicativo lato codice.
- **Soglia scelta con l'utente**: **1 ora** di inattività (non un valore assunto arbitrariamente).
- **Dove si aggancia**: `middleware.ts` (Proxy) — gira già su ogni richiesta, legge già `user` via `supabase.auth.getUser()` (Edge runtime, `runtime: "experimental-edge"`, unica combinazione compatibile con l'adapter Cloudflare, vedi commento in testa al file — **non toccare quella configurazione**). Nessun altro punto del codice ha visibilità su "ogni richiesta autenticata" allo stesso modo.
- **Riusare `getRouteDecision` esistente, non duplicarlo**: il modo più semplice e meno rischioso per forzare il redirect a `/accedi` quando la sessione è scaduta per inattività è impostare `user = null` **prima** di chiamare `getRouteDecision(pathname, !!user, ruoli)` — la funzione pura in `lib/auth/route-guard.ts` (invariata, già testata in `route-guard.test.ts`) gestisce già "non autenticato -> redirect a LOGIN_PATH" per ogni rotta protetta. Non aggiungere una seconda ramificazione di redirect parallela.
- **Il bug di perdita cookie nel ramo redirect è reale e va gestito esplicitamente** (vedi Task 2): `response` (l'oggetto su cui si scrivono i cookie, incluso quello di Supabase stesso via il callback `setAll` passato a `createServerClient`) e l'oggetto ritornato da `NextResponse.redirect(...)` nel ramo `decision.action === "redirect"` sono **due istanze diverse** — già così nel codice attuale, ma finora innocuo perché nessun cookie veniva scritto in quel ramo. Questa storia è la prima a scrivere cookie che devono sopravvivere a un redirect, quindi il problema va risolto ora.
- **Perché il cookie non scaduto/assente non forza mai un logout (AC #3)**: un Utente che ha appena fatto login non ha ancora il cookie `ultima-attivita` — trattarlo come "scaduto" lo disconnetterebbe immediatamente dopo il login, un comportamento chiaramente sbagliato. Lo stesso vale per un Utente già loggato **prima** che questa storia venga deployata (cookie mai esistito) — viene silenziosamente "adottato" nel nuovo meccanismo alla prima richiesta successiva al deploy, senza un logout indesiderato di massa.
- **Nessuna modifica a `app/(auth)/accedi/actions.ts`**: il cookie `ultima-attivita` non va impostato esplicitamente al login — la primissima richiesta autenticata dopo il login lo troverà assente, `sessioneScaduta` ritornerà `false` (AC #3), e verrà scritto lì per la prima volta. Un solo punto di scrittura (`middleware.ts`), non due.
- **Nessuna modifica a `app/NavBar.actions.ts` (`esci()`)**: un logout esplicito già invalida la sessione Supabase; il cookie `ultima-attivita` residuo diventa innocuo (il controllo si applica solo `if (user)`) e scade comunque da solo entro 1 ora (`maxAge`). Aggiungere lì una cancellazione esplicita sarebbe un miglioramento cosmetico non richiesto da alcun AC — non farlo in questa storia.
- **`middleware.ts` non ha test diretti nel progetto** (solo `lib/auth/route-guard.ts`, la logica pura che invoca, è testata in isolamento) — coerente con la convenzione già stabilita, il Task 1 di questa storia segue lo stesso schema: la logica nuova (`sessioneScaduta`) va estratta in un modulo puro testabile, il file `middleware.ts` stesso resta verificato solo dal vivo (Task 4).
- **Nessun impatto su Story 9.7** (`revalidatePath("/", "layout")` in `esci()`): quella storia riguarda il layout dopo un logout esplicito, questa riguarda quando un logout viene forzato dal Proxy per inattività — se il fix di questa storia ha lo stesso problema di "barra ancora visibile" dopo un redirect forzato da `middleware.ts` invece che da una Server Action, sarebbe un caso nuovo, diverso (il redirect qui parte dal Proxy su una richiesta di navigazione normale, non da un `redirect()` dentro una Server Action con `revalidatePath` — la dinamica di Client Cache potrebbe non applicarsi allo stesso modo, dato che è un redirect HTTP a livello di richiesta di pagina, non una Server Action). Da tenere d'occhio nella verifica manuale (Task 4), non assumere che serva lo stesso fix.

### Project Structure Notes

- Nuovo file `lib/auth/sessione-inattiva.ts` (+ test), stesso livello/stile di `lib/auth/route-guard.ts`.
- File toccato: `middleware.ts` (root del progetto, non `app/`). Nessuna migrazione, nessuna nuova Server Action, nessuna dipendenza nuova.

### References

- [Source: _bmad-output/implementation-artifacts/epic-9-context.md — Story 9.8, opzione (a) Supabase dashboard scartata (Piano Pro non disponibile), opzione (b) scelta]
- [Source: middleware.ts — Proxy attuale, Edge runtime, gestione cookie via `createServerClient`]
- [Source: lib/auth/route-guard.ts, lib/auth/route-guard.test.ts — `getRouteDecision`, da riusare invariata]
- [Source: app/NavBar.actions.ts — pattern fail-closed già stabilito per `signOut()` avvolto in try/catch (Story 9.1)]
- [Source: _bmad-output/implementation-artifacts/9-7-barra-laterale-ancora-visibile-dopo-il-logoff.md — Dev Notes su `revalidatePath`/Client Cache, per il confronto esplicito richiesto sopra]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Opzione (a) (impostazioni Supabase) scartata dopo verifica diretta dell'utente sul proprio progetto (richiede piano Pro) — opzione (b) implementata con soglia di 1 ora, valore scelto dall'utente.
- Riusata `getRouteDecision` esistente (`lib/auth/route-guard.ts`) impostando `user = null` quando la sessione è scaduta per inattività — nessuna logica di redirect duplicata, nessuna modifica a quel file/test.
- Corretto un bug di perdita cookie nel ramo redirect di `middleware.ts` (già presente nel codice esistente ma innocuo finora, perché nessun cookie veniva scritto in quel ramo prima di questa storia): i cookie accumulati su `response` vengono ora copiati esplicitamente su `redirectResponse` prima di ritornarlo.
- Nessuna modifica a `app/(auth)/accedi/actions.ts` (login) né a `app/NavBar.actions.ts` (`esci()`) — un solo punto di scrittura del cookie `ultima-attivita` (`middleware.ts`), come da Dev Notes.
- Task 4 (verifica manuale dal vivo) chiuso su richiesta esplicita dell'utente senza conferma esplicita in questa sessione — commit pushato, deploy in corso. Se il comportamento dovesse non funzionare come atteso, riaprire questa storia (stesso pattern già usato per Story 9.3/9.6/9.7 in questo epic).

### File List

- `lib/auth/sessione-inattiva.ts` (nuovo)
- `lib/auth/sessione-inattiva.test.ts` (nuovo)
- `middleware.ts` (modificato)
