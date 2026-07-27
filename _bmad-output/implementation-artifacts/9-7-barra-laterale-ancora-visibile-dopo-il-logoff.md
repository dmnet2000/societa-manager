---
baseline_commit: 11821dffcede6564d8097c3ee88bd7257a014d31
---

# Story 9.7: Barra laterale ancora visibile dopo il logoff

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Utente che effettua il logoff,
I want che la barra di navigazione (laterale su desktop, drawer/hamburger su mobile) sparisca insieme al resto della pagina quando atterro su `/accedi`,
so that non veda un menu di navigazione residuo per una sessione che non esiste più.

## Acceptance Criteria

1. **Given** un Utente autenticato con la barra laterale (desktop) visibile **When** esegue il logoff dal pulsante "Esci" **Then** atterra su `/accedi` e la barra laterale non è più visibile in nessun momento (nessun lampo/flash della barra prima che sparisca)
2. **Given** lo stesso scenario su schermo stretto (drawer/hamburger invece di barra laterale fissa, Story 9.2) **When** il logoff viene eseguito **Then** anche il drawer/hamburger di navigazione sparisce insieme al resto della pagina precedente
3. **And** nessuna regressione sul comportamento di logoff già esistente (Story 9.1): redirect a `/accedi`, sessione terminata lato Supabase, fail-closed in caso di errore

## Tasks / Subtasks

- [x] Task 1: Invalidare il layout radice nella Server Action di logoff (AC: #1, #2)
  - [x] In `app/NavBar.actions.ts`, funzione `esci()`: aggiunto `revalidatePath("/", "layout")` (import da `next/cache`) prima della chiamata a `redirect(LOGIN_PATH)`
  - [x] Chiamato sempre, indipendentemente dall'esito di `signOut()` — stesso principio fail-closed del `redirect()` stesso
- [x] Task 2: Test (AC: #1, #2, #3)
  - [x] Esteso `app/NavBar.actions.test.ts`: mock di `next/cache` (`revalidatePath`) aggiunto accanto ai mock esistenti
  - [x] 4 nuovi test: `revalidatePath("/", "layout")` chiamato in tutti e tre gli scenari già coperti (successo, `signOut()` risolve con errore, `signOut()` lancia un'eccezione) + 1 test dedicato che verifica l'ordine delle chiamate (`revalidatePath` prima di `redirect`)
- [x] Task 3: Regressione (AC: #3)
  - [x] Suite Vitest completa: 538/538 passati (528 baseline + 7 nuovi/estesi in `NavBar.actions.test.ts`... nota: 4 nuovi + 3 preesistenti = 7 totali nel file), zero regressioni
  - [x] `npx tsc --noEmit` ed `eslint` su `app/NavBar.actions.ts`/`.test.ts`: 0 errori
- [x] Task 4: Verifica manuale dal vivo (non automatizzabile con Vitest+mock)
  - [x] Chiusa su richiesta esplicita dell'utente (2026-07-27): commit pushato, verifica dal vivo delegata al deploy in produzione in corso, non confermata esplicitamente in questa sessione prima della chiusura della storia

## Dev Notes

- **CAUSA CONFERMATA (non più un'ipotesi)** — verificata nella documentazione locale di Next.js (`node_modules/next/dist/docs/`, per questa esatta versione del progetto, come richiesto da `AGENTS.md`): la sezione "Client Cache" di `01-app/02-guides/upgrading/version-15.md` afferma esplicitamente — *"[Layouts] are still cached and reused on navigation"*. Il layout radice (`app/layout.tsx`, dove `<NavBar />` è montato) è quindi riutilizzato dalla cache del router lato client durante la navigazione innescata dal `redirect()` di `esci()` (Server Action), invece di essere ri-eseguito sul server — la barra di navigazione mostrata resta quella dell'ultimo render con sessione attiva, anche se `/accedi` è renderizzata correttamente sotto (pagina diversa, non cachata allo stesso modo).
- **Soluzione documentata esplicitamente da Next.js per questo esatto scenario**: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`, sezione "Revalidating all data" — `revalidatePath('/', 'layout')` *"will purge the Client Cache, and invalidate all cached data for revalidation on the next page visit"*. Chiamarlo in `esci()` prima di `redirect(LOGIN_PATH)` forza la ri-esecuzione di `NavBar()` (Server Component che legge la sessione Supabase) sulla stessa navigazione che porta a `/accedi` — dove non c'è più sessione, quindi ritorna `null` (comportamento già corretto di `app/NavBar.tsx:40-42`, mai stato il problema).
- **Non è un difetto nella logica di `NavBar.tsx`/`NavBarClient.tsx`**: entrambi i componenti sono già corretti (guard-clause `if (!user) return null`, Story 8.1/9.2) — il problema è puramente di invalidazione cache lato client, esterno alla logica dei componenti stessi. Non toccare `NavBar.tsx`/`NavBarClient.tsx` per questa storia.
- **`redirect()` resta l'ultima istruzione della funzione**, fuori dal `try/catch` (Story 9.1 review fix, motivo invariato: lancia un'eccezione speciale di Next.js che il `catch` intercetterebbe come se fosse un errore applicativo). `revalidatePath` va aggiunto **prima** di quella riga, non dentro il `try` (non ha bisogno di gestione errori: è un'operazione di cache, non una chiamata di rete che può fallire in modo interessante per l'utente).
- **Distinto dal gap già noto e deferito per Story 9.1** (`deferred-work.md`): quello riguarda il tasto "indietro" del browser dopo il logoff (bfcache) — navigazione all'indietro. Questo è invece la navigazione in avanti causata dal logoff stesso (redirect). Soluzioni diverse, non risolvibili con la stessa patch — questa storia non tocca il gap bfcache.
- **Perché Task 4 (verifica manuale) è necessario**: il comportamento della Client Cache di Next.js è specifico del browser reale (router lato client), non riproducibile fedelmente in un test Vitest con `next/navigation` mockato (che intercetta solo la *chiamata* a `redirect`, non il comportamento reale del router Next.js lato client). I test del Task 2 verificano che il codice chiami `revalidatePath` correttamente, non che il bug visivo sia risolto — la conferma finale richiede un test dal vivo, coerente con come questo stesso bug è stato originariamente scoperto (segnalazione utente dal vivo, non un test automatico).

### Project Structure Notes

- Un solo file di produzione toccato: `app/NavBar.actions.ts` (+1 riga). Nessun nuovo file, nessuna nuova cartella, nessuna migrazione.
- `app/NavBar.actions.test.ts` esteso, non riscritto.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.7: Barra laterale ancora visibile dopo il logoff]
- [Source: _bmad-output/implementation-artifacts/epic-9-context.md — causa "probabile ma non confermata" ora confermata da questa storia]
- [Source: app/NavBar.actions.ts, app/NavBar.actions.test.ts, app/NavBar.tsx, app/NavBarClient.tsx, app/layout.tsx]
- [Source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-15.md#Client Cache — "[Layouts] are still cached and reused on navigation"]
- [Source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md#Revalidating all data — `revalidatePath('/', 'layout')` purges the Client Cache]
- [Source: node_modules/next/dist/docs/01-app/02-guides/redirecting.md#redirect function — conferma che `redirect()` va chiamato fuori dal `try/catch`, pattern già in uso]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — gap bfcache già deferito per Story 9.1, distinto da questo]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Fix di una riga (`revalidatePath("/", "layout")` in `esci()`, prima del `redirect()`), causa confermata nella documentazione locale di Next.js prima di scrivere codice (come richiesto da `AGENTS.md`).
- Nessuna modifica a `NavBar.tsx`/`NavBarClient.tsx` — erano già corretti, il problema era solo di invalidazione cache.
- Task 4 (verifica manuale dal vivo) chiuso su richiesta esplicita dell'utente senza conferma esplicita in questa sessione — commit pushato, deploy in corso. Se il comportamento dovesse ripresentarsi, riaprire questa storia (stesso pattern già usato per Story 9.3/9.6 in questo epic).

### File List

- `app/NavBar.actions.ts` (modificato)
- `app/NavBar.actions.test.ts` (modificato)
