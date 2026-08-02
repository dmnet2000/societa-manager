---
baseline_commit: b66c22acc1fcd7abc29b6a1fd5985eaa8f6f1526
---

# Story 9.22: Rimozione dell'accesso Dirigente al precaricamento Allenatori

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want che solo il Ruolo ADMIN possa precaricare, modificare o cancellare un Allenatore da `/precaricamento-allenatori`,
so that questa funzionalità resti riservata a chi ne ha davvero bisogno, come richiesto esplicitamente dall'utente.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-02). Oggi `/precaricamento-allenatori` (Story 1.4, elenco/modifica/cancellazione aggiunti da Story 9.9) ammette sia ADMIN sia DIRIGENTE, sia a livello di route-guard sia nelle tre Server Action. Questa storia restringe l'accesso al solo Ruolo ADMIN — nessun'altra rotta che ammette DIRIGENTE (`/import-atlete`, `/palestre`, `/gruppi`, `/conferma-iscrizioni`, ecc.) viene toccata. **Soluzione temporanea, esplicitamente confermata dall'utente**: durante la discussione di questa storia è emersa un'idea più ampia (un sistema di permessi configurabile da Admin, invece di hardcoded) — catturata come **Epic 12 "Permessi Configurabili da Admin"** (futuro, non ancora pianificato in dettaglio). Questa storia resta comunque valida e va implementata subito: risolve il problema concreto ora, e sarà naturalmente superata quando/se Epic 12 verrà costruito.

## Acceptance Criteria

1. **Given** un Utente con Ruolo DIRIGENTE (senza anche ADMIN) **When** tenta di visitare `/precaricamento-allenatori` **Then** viene rediretto a `/non-autorizzato`, stesso comportamento già stabilito per ogni altra rotta ADMIN-only (es. `/admin`)
2. **Given** un Utente con Ruolo DIRIGENTE (senza anche ADMIN) **When** invoca direttamente `precaricaAllenatore`, `aggiornaAllenatore` o `cancellaAllenatore` **Then** l'operazione viene rifiutata (`FORBIDDEN`) — difesa in profondità lato Server Action, non solo route-guard
3. **Given** un Utente con Ruolo DIRIGENTE (senza anche ADMIN) **When** visita una qualunque pagina dell'app **Then** la voce di navigazione "Precaricamento allenatori" (Story 8.1) non compare più
4. **And** nessuna regressione per ADMIN (comportamento identico a oggi) né per le altre rotte/funzionalità che ammettono DIRIGENTE — suite Vitest invariata sui casi esistenti non impattati da questa correzione

## Tasks / Subtasks

- [x] Task 1: Route-guard (AC: #1, #3)
  - [x] `lib/auth/route-guard.ts`: modificata la voce `/precaricamento-allenatori` in `PROTECTED_ROUTES` — `ruoliAmmessi: ["ADMIN"]` (DIRIGENTE rimosso), `navLabel` invariato
  - [x] `lib/auth/route-guard.test.ts`: test riscritti — solo ADMIN ammesso, DIRIGENTE ora esplicitamente rediretto insieme ad ALLENATORE nello stesso test "for other roles"
- [x] Task 2: Server Actions — difesa in profondità (AC: #2)
  - [x] `app/(onboarding-import)/precaricamento-allenatori/actions.ts`: `requireRuolo(["ADMIN", "DIRIGENTE"])` → `requireRuolo(["ADMIN"])` nelle tre Server Action (`precaricaAllenatore`, `aggiornaAllenatore`, `cancellaAllenatore`)
  - [x] `app/(onboarding-import)/precaricamento-allenatori/actions.test.ts`: confermato, nessuna modifica necessaria (nessuna asserzione sul valore passato a `requireRuolo`)
- [x] Task 3: Verifica regressione (AC: #4)
  - [x] Suite Vitest completa: 789/789 test passati (invariato)
  - [x] `npx tsc --noEmit` pulito (0 errori); ESLint pulito sui 3 file modificati
  - [x] Confermato: nessun'altra rotta/Server Action con DIRIGENTE toccata — solo `/precaricamento-allenatori` e le sue 3 Server Action

### Review Findings

- [x] [Review][Patch] Nessun test a livello di Server Action verificava effettivamente la restrizione a solo ADMIN: `actions.test.ts` mocka `requireRuolo` e asserisce solo sul suo valore di ritorno, mai sugli argomenti — la stessa suite sarebbe rimasta verde anche se `requireRuolo(["ADMIN"])` fosse stato lasciato/reintrodotto come `requireRuolo(["ADMIN", "DIRIGENTE"])`. Stesso pattern di verifica (`toHaveBeenCalledWith`) già stabilito altrove nel progetto (`import-atlete/actions.test.ts:123`) non applicato qui. [app/(onboarding-import)/precaricamento-allenatori/actions.test.ts] — risolto: aggiunta `expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN"])` nel percorso di successo delle tre Server Action (`precaricaAllenatore`/`aggiornaAllenatore`/`cancellaAllenatore`).
- [x] [Review][Patch] I titoli dei tre test FORBIDDEN ("...caller is not Admin/Dirigente") erano diventati fuorvianti: DIRIGENTE non è più un chiamante "valido ma escluso da questo test", è ora sempre rifiutato. [app/(onboarding-import)/precaricamento-allenatori/actions.test.ts] — risolto: rinominati in "...caller is not Admin (Story 9.22: Dirigente rimosso)".
- [x] [Review][Patch] `route-guard.test.ts` non copriva il caso di un Utente con **entrambi** i Ruoli ADMIN e DIRIGENTE su `/precaricamento-allenatori` (plausibile in una piccola società) — nessun test garantiva che l'intersezione booleana (`.some`) continuasse a permettere l'accesso in quel caso. [lib/auth/route-guard.test.ts] — risolto: aggiunto un test esplicito per `["ADMIN", "DIRIGENTE"]` → `allow`.
- [x] [Review][Defer] Nessun test copre `getRouteDecision` con un array di Ruoli vuoto (Utente autenticato ma senza alcun Ruolo) su questa rotta — gap pre-esistente e trasversale a ogni voce di `PROTECTED_ROUTES`, non introdotto da questa storia. [lib/auth/route-guard.test.ts]
- [x] [Review][Dismiss] Commento di rationale ("Story 9.22... vedi Epic 12 futuro") duplicato verbatim in due file — stesso stile di duplicazione di commenti contestuali già accettato ovunque nel progetto (nessun meccanismo di commenti condivisi esiste), non un difetto.
- [x] [Review][Dismiss] Nessun messaggio d'errore specifico per un Dirigente che perde l'accesso a metà sessione ("Non autorizzato" generico) — stesso comportamento identico di ogni altra rotta Admin-only del progetto, non una regressione introdotta qui.
- [x] [Review][Dismiss] Riferimento a Epic 12 (non ancora pianificato) nei commenti, rischio di diventare obsoleto in futuro — già esplicitamente accettato nella storia stessa come soluzione temporanea nota.
- [x] [Review][Dismiss] La correzione aggiunge un altro array di Ruoli hardcoded, lo stesso pattern che Epic 12 vuole sostituire — decisione già esplicitamente presa con l'utente in fase di creazione (soluzione hardcoded intenzionale, non un errore).
- [x] [Review][Dismiss] Ipotesi che un altro componente di navigazione renderizzi indipendentemente la voce "Precaricamento allenatori" — verificato dall'Acceptance Auditor: un solo punto di derivazione (`voci-navigazione.ts`), nessun altro riferimento nel codice.

## Dev Notes

- **Perimetro esatto, verificato in fase di creazione storia** (ricerca esaustiva nel codice): `requireRuolo(["ADMIN", "DIRIGENTE"])` per questa funzionalità compare **solo** in 3 punti di `app/(onboarding-import)/precaricamento-allenatori/actions.ts` (righe 23, 89, 156), e la voce di route-guard è **una sola** in `lib/auth/route-guard.ts` (righe 27-31). Nessun altro file referenzia queste Server Action o questa rotta.
- **La pagina `page.tsx` non ha alcun controllo di Ruolo proprio** — si affida interamente al route-guard (middleware/Proxy) per l'accesso GET e alle Server Action per le mutazioni. Nessuna modifica necessaria a `app/(onboarding-import)/precaricamento-allenatori/page.tsx`.
- **AC #3 (voce di navigazione) è un effetto automatico di Task 1, non un task separato**: dalla Story 8.1/9.10, `lib/auth/voci-navigazione.ts` deriva le voci mostrate a un Ruolo direttamente da `PROTECTED_ROUTES` (stessa fonte di verità, commento esplicito in `route-guard.ts` riga 20-23) — togliere `"DIRIGENTE"` da `ruoliAmmessi` basta, non serve toccare `voci-navigazione.ts` né i suoi test (verificato: `voci-navigazione.test.ts` non referenzia `/precaricamento-allenatori` né `PROTECTED_ROUTES` direttamente, testa una funzione pura con input mockati).
- **Nessuna migrazione, nessuna nuova entità** — questa storia è una modifica di sola autorizzazione (due file di codice + un file di test).
- **File NON da toccare**: `app/(onboarding-import)/precaricamento-allenatori/page.tsx`, `NuovoAllenatoreForm.tsx`, `AllenatoreRow.tsx` (nessun comportamento cambia per ADMIN, solo l'accesso di DIRIGENTE viene rimosso a monte), `lib/auth/voci-navigazione.ts` (derivazione automatica, vedi sopra), ogni altra voce di `PROTECTED_ROUTES` che ammette DIRIGENTE.
- **Relazione con Epic 12**: questa storia è deliberatamente una soluzione hardcoded, temporanea per design — non introdurre qui alcuna astrazione di "permessi configurabili" (fuori scope, richiederebbe l'epic dedicato). Un singolo cambio mirato, coerente con ogni altra voce statica di `route-guard.ts`.

### Project Structure Notes

- File modificati: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`, `app/(onboarding-import)/precaricamento-allenatori/actions.ts`.
- Nessun file nuovo, nessun file eliminato.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.22: Rimozione dell'accesso Dirigente al precaricamento Allenatori]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12: Permessi Configurabili da Admin — idea più ampia catturata come epic futuro distinto]
- [Source: lib/auth/route-guard.ts righe 24-31 — PROTECTED_ROUTES, voce /precaricamento-allenatori da modificare; riga 25 — pattern ADMIN-only già esistente per /admin da replicare]
- [Source: lib/auth/route-guard.test.ts righe 70-83 — test esistenti da aggiornare]
- [Source: app/(onboarding-import)/precaricamento-allenatori/actions.ts righe 23, 89, 156 — le tre chiamate requireRuolo(["ADMIN","DIRIGENTE"]) da restringere]
- [Source: lib/auth/voci-navigazione.ts — derivazione automatica delle voci di navigazione da PROTECTED_ROUTES, nessuna modifica necessaria]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Task 1: `/precaricamento-allenatori` in `PROTECTED_ROUTES` ora `ruoliAmmessi: ["ADMIN"]` (DIRIGENTE rimosso). Test riscritti: solo ADMIN ammesso, DIRIGENTE esplicitamente rediretto insieme ad ALLENATORE.
- Task 2: le tre Server Action (`precaricaAllenatore`, `aggiornaAllenatore`, `cancellaAllenatore`) ora `requireRuolo(["ADMIN"])`. Nessuna modifica ad `actions.test.ts` (nessuna asserzione sul valore passato a `requireRuolo`, confermato) — **rivisto in code review**, vedi sotto.
- Task 3: 789/789 test passati (invariato), `tsc --noEmit` pulito, ESLint pulito sui 3 file modificati (`route-guard.ts`, `route-guard.test.ts`, `actions.ts`). Nessun'altra rotta/funzionalità con DIRIGENTE toccata.
- Nessuna modifica a `voci-navigazione.ts`/`page.tsx`/`NuovoAllenatoreForm.tsx`/`AllenatoreRow.tsx`, come previsto dai Dev Notes (AC #3 automatico).
- Code review (2026-08-02): Blind Hunter + Edge Case Hunter + Acceptance Auditor — 0 decision-needed, 3 patch applicati (asserzione `toHaveBeenCalledWith(["ADMIN"])` aggiunta al percorso di successo delle 3 Server Action in `actions.test.ts`, che prima non verificava affatto la restrizione a livello di Server Action; titoli dei 3 test FORBIDDEN aggiornati, erano diventati fuorvianti; nuovo test dual-role ADMIN+DIRIGENTE in `route-guard.test.ts`), 1 defer (nessun test per Ruoli vuoti su questa rotta, gap pre-esistente trasversale), 6 scartati come rumore/già accettati esplicitamente nella storia (commento duplicato, UX generica del redirect, riferimento a Epic 12, pattern hardcoded intenzionale, ipotesi su altri componenti nav verificata falsa). 790/790 test passati, 0 errori tsc/eslint dopo i fix.

### File List

- `lib/auth/route-guard.ts` (modificato — `/precaricamento-allenatori` ora ADMIN-only)
- `lib/auth/route-guard.test.ts` (modificato — test aggiornati per il nuovo comportamento + nuovo test dual-role)
- `app/(onboarding-import)/precaricamento-allenatori/actions.ts` (modificato — `requireRuolo(["ADMIN"])` nelle 3 Server Action)
- `app/(onboarding-import)/precaricamento-allenatori/actions.test.ts` (modificato in code review — asserzioni sul valore di `requireRuolo` + titoli test aggiornati)

## Change Log

- 2026-08-02: Implementata Story 9.22 — accesso a `/precaricamento-allenatori` ristretto al solo Ruolo ADMIN (DIRIGENTE rimosso, sia a livello di route-guard sia nelle 3 Server Action). Soluzione temporanea hardcoded, confermata esplicitamente dall'utente (l'idea di un sistema di permessi configurabile è stata catturata come Epic 12 futuro). 789/789 test passati, 0 errori tsc/eslint.
- 2026-08-02: Code review completata — 3 patch applicati (copertura di test mancante a livello di Server Action per la restrizione ADMIN-only, titoli test obsoleti, test dual-role mancante), 1 defer, 6 scartati come rumore. 790/790 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
