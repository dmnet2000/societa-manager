---
title: 'Story 9.42: Dopo il logoff, atterrare sulla home pubblica invece che su /accedi'
type: 'feature'
created: '2026-09-03'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Story 9.42: Dopo il logoff, atterrare sulla home pubblica invece che su /accedi

## Intent

**Problem:** `esci()` (Server Action di logoff, `app/NavBar.actions.ts`, Story 9.1) reindirizza sempre a `/accedi` dopo aver terminato la sessione Supabase - comportamento antecedente a Story 18.1, che ha introdotto la home pubblica su `"/"` come vetrina del sito, oggi raggiunta solo da chi non ha mai avuto sessione.

**Approach:** cambiare la sola destinazione del `redirect()` finale da `LOGIN_PATH` (`/accedi`) a `HOME_PATH` (`"/"`, nuova costante condivisa in `lib/auth/route-guard.ts`, mirror di `LOGIN_PATH`) - stesso identico percorso fail-closed di prima (chiamato sia sul successo sia sull'errore di `signOut()`), nessun'altra modifica di comportamento.

## Suggested Review Order

**Destinazione del redirect**

- Entry point: `esci()` rediretta a `HOME_PATH` invece di `LOGIN_PATH`, stesso percorso fail-closed di prima.
  [`NavBar.actions.ts:54`](../../app/NavBar.actions.ts#L54)

- Review fix (Blind Hunter): nuova costante `HOME_PATH` in `route-guard.ts`, unica fonte di verità riusata sia qui sia da `PUBLIC_ROUTES` - mirror del trattamento già riservato a `LOGIN_PATH`.
  [`route-guard.ts:4`](../../lib/auth/route-guard.ts#L4)

- `PUBLIC_ROUTES` riusa la stessa costante invece del letterale `"/"`.
  [`route-guard.ts:44`](../../lib/auth/route-guard.ts#L44)

- Review fix (Blind Hunter): commento di `esci()` che citava ancora `/accedi` come destinazione, non più accurato dopo il cambio - riallineato.
  [`NavBar.actions.ts:16`](../../app/NavBar.actions.ts#L16)

**Test**

- 3 asserzioni aggiornate da `/accedi` a `"/"` (successo, `signOut()` con errore, `signOut()` che lancia) - stesso schema fail-closed a 3 vie già in uso.
  [`NavBar.actions.test.ts:33`](../../app/NavBar.actions.test.ts#L33)

- Review fix (Blind Hunter): titolo del `describe` esteso a Story 9.42 - i singoli `it()` la citavano già, l'intestazione del blocco no.
  [`NavBar.actions.test.ts:25`](../../app/NavBar.actions.test.ts#L25)
