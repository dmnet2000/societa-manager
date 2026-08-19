---
title: 'Story 19.6: Modello dati per le voci di menu pubblico'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '333ab4a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Il menu pubblico (`app/NavPubblica.tsx`, array `VOCI` di 5 voci) è oggi hard-coded, nessun modello dati esiste — la parte di maggior impatto architetturale dell'Epic 19 (decisione 4, `epic-19-context.md`).

**Approach:** Introdurre solo la fondazione: una nuova tabella Prisma (`VoceMenuPubblico`) con RLS/REVOKE espliciti (stesso trattamento AD-9 di `Sponsor`/`PermessoRotta`) + funzioni di lettura/scrittura dirette (`lib/menu-pubblico.ts`, mirror di `lib/configurazione-applicazione.ts`). Nessuna UI, nessuna Server Action, nessun collegamento a `NavPubblica.tsx` in questa storia (arrivano con 19.7/19.8) — stesso principio "fondazione senza consumer reale" già seguito per `PermessoRotta` (Story 12.1) e il campo `gruppo` di `route-guard.ts` (Story 15.1).

## Boundaries & Constraints

**Always:** un seed bloccante nella stessa migrazione inserisce le 5 voci attuali (Home/Squadre/Calendario/Staff/Contatti, stesso ordine e URL di `app/NavPubblica.tsx`) — la Story 19.8 potrà attivare la lettura da questa tabella senza un menu vuoto al primo deploy.

**Ask First:** nessuna — scope già deciso in apertura Epic 19 (epics.md, Story 19.6).

**Never:** non toccare `app/NavPubblica.tsx` (continua a leggere l'array hard-coded, nessuna regressione visiva — AC esplicito). Non aggiungere Server Action né rotta di gestione (arrivano con la 19.7). Nessuna migrazione eseguita contro un database reale da questa sessione — solo `migration.sql` scritto a mano (stesso pattern delle migrazioni precedenti dell'Epic 19) + `prisma generate` (solo schema, nessuna connessione DB); l'applicazione della migrazione resta al deploy/all'utente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `elencaVociMenuPubblico()` | tabella con N righe | righe ordinate per `ordine` crescente | N/A |
| `creaVoceMenuPubblico({etichetta, url})` | tabella con righe esistenti | nuova riga con `ordine` = max esistente + 1 | N/A |
| `creaVoceMenuPubblico({etichetta, url})` | tabella vuota | nuova riga con `ordine` = 0 | N/A |
| `aggiornaVoceMenuPubblico(id, {...})` | id esistente | `etichetta`/`url` aggiornati | N/A |
| `impostaVisibileVoceMenuPubblico(id, bool)` | id esistente | `visibile` aggiornato, nessuna cancellazione | N/A |
| `riordinaVociMenuPubblico(idInOrdine)` | array di id nel nuovo ordine | `ordine` riscritto = indice nell'array, transazione singola | N/A |
| Dopo la migrazione | `app/NavPubblica.tsx` | invariato, legge ancora l'array hard-coded | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo model `VoceMenuPubblico` (`id`, `etichetta`, `url`, `ordine` Int, `visibile` Boolean default true, `createdAt`, `updatedAt`), `@@map("voci_menu_pubblico")` -- appeso in fondo al file, dopo `Sponsor`
- `prisma/migrations/20260819000000_add_voce_menu_pubblico/migration.sql` -- `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated` (mirror esatto di `20260809000000_add_sponsor`) + seed delle 5 voci attuali (mirror del pattern `INSERT ... SELECT ... FROM (VALUES ...)` di `20260804000000_add_permesso_rotta`)
- **Nuovo file** `lib/menu-pubblico.ts` -- `elencaVociMenuPubblico`, `creaVoceMenuPubblico`, `aggiornaVoceMenuPubblico`, `impostaVisibileVoceMenuPubblico`, `riordinaVociMenuPubblico` (transazione singola) -- nessuna validazione (vive nel futuro Server Action, Story 19.7), mirror strutturale di `lib/configurazione-applicazione.ts`
- **Nuovo file** `lib/menu-pubblico.test.ts` -- mock di `@/lib/prisma`, un `describe` per funzione

## Tasks & Acceptance

**Execution:**
- [x] `schema.prisma` -- nuovo model `VoceMenuPubblico`
- [x] migrazione -- `CREATE TABLE` + RLS/REVOKE + seed delle 5 voci attuali
- [x] `prisma generate` -- Client rigenerato dallo schema (nessuna connessione DB)
- [x] `lib/menu-pubblico.ts` -- le 5 funzioni di lettura/scrittura
- [x] `lib/menu-pubblico.test.ts` -- copertura di tutte e 5

**Acceptance Criteria:**
- Given lo schema Prisma, when viene introdotta la nuova tabella via migrazione protetta da RLS/REVOKE, then esistono funzioni per elencare/creare/modificare/riordinare/nascondere le voci
- Given `app/NavPubblica.tsx`, when questa storia viene completata, then continua a usare l'array hard-coded esistente — nessuna regressione visiva
- Given la migrazione, when viene applicata, then un seed inserisce le 5 voci attuali come righe iniziali

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run` (dalla root del repo — da `app/` `manifest.test.ts` fallisce per un path relativo a `process.cwd()`, falso negativo non legato a questa storia) -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (if no CLI):**
- Dopo il deploy (migrazione applicata): la tabella `voci_menu_pubblico` esiste con 5 righe (Home/Squadre/Calendario/Staff/Contatti, `ordine` 0-4), la home pubblica e le altre pagine mostrano il menu invariato (nessuna lettura da questa tabella ancora)

## Suggested Review Order

**La migrazione (il più a rischio, nessun test automatico possibile su SQL)**

- RLS + REVOKE, mirror esatto del pattern già stabilito per ogni tabella strutturale dell'Epic 16+.
  [`migration.sql`](../../prisma/migrations/20260819000000_add_voce_menu_pubblico/migration.sql)

- Seed: verificare a occhio che etichette/URL/ordine corrispondano esattamente a `VOCI` in `NavPubblica.tsx`.
  [`NavPubblica.tsx:21`](../../app/NavPubblica.tsx#L21)

**Le funzioni (coperte da test)**

- `riordinaVociMenuPubblico`, l'unica delle 5 con più di una scrittura (transazione).
  [`menu-pubblico.ts`](../../lib/menu-pubblico.ts)

**Nessun impatto su superficie esistente**

- `NavPubblica.tsx` non toccato — nessun diff da rivedere lì.
