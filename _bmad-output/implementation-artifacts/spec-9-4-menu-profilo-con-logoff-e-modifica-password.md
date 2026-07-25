---
title: 'Story 9.4: Menu profilo con logoff e modifica password'
type: 'feature'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '440ca6984b6de3ca172ae448144194f08335ba94'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Il pulsante "Esci" nella barra di navigazione (Story 9.1/9.2) è isolato, e non esiste nel progetto alcuna funzionalità di modifica password (`supabase.auth.updateUser` non è mai chiamato).

**Approach:** Sostituire il blocco "Esci" con un menu profilo a tendina (trigger = email dell'Utente) contenente "Modifica password" ed "Esci"; nuova pagina + Server Action per il cambio password, implementata con `lib/supabase/server.ts` (mai con `lib/supabase/client.ts`, mai usato nel progetto) per restare coerente col pattern dominante: ogni operazione Supabase Auth passa oggi da una Server Action, mai da un Client Component.

## Boundaries & Constraints

**Always:**
- `esci()` (`app/NavBar.actions.ts`) resta invariata, riusata dal nuovo menu — non duplicata/riscritta.
- Il menu profilo vive nello stesso `<nav id="nav-sidebar">` già condiviso da drawer mobile e barra laterale desktop (Story 9.2) — nessuna duplicazione di markup fra breakpoint.
- Trigger del menu = email dell'Utente (`user.email`), nessuna nuova icona.
- Modifica password = Server Action (`"use server"`, `await createClient()` da `lib/supabase/server.ts`), mai una chiamata diretta dal browser.
- Nuova password: minimo 8 caratteri, campo di conferma obbligatorio che deve coincidere — validato lato server.
- `/modifica-password`: protetta solo da sessione (nessun Ruolo specifico), NON aggiunta a `PROTECTED_ROUTES` né a `voci-navigazione.ts` — raggiunta solo dal menu profilo.
- `DESIGN.md`: nuova voce che chiude la `[NOTA UX APERTA]` (riga 193) sulle superfici sovrapposte transitorie.
- Nessuna regressione sul logoff esistente (redirect, fail-closed, scope globale del signOut).
- Suite Vitest invariata + nuovi test per la Server Action di modifica password.

**Ask First:** nessuna — le due decisioni lasciate aperte da `epics.md` (meccanismo Server Action vs client, campo di conferma + policy minima) sono già risolte sopra con motivazione in Design Notes.

**Never:**
- Non introdurre `lib/supabase/client.ts` in questa storia (resterebbe un consumer artificiale, il Server Action copre lo stesso bisogno).
- Non toccare `voci-navigazione.ts` — il menu profilo non è una voce di quella lista.
- Non toccare drawer/sidebar oltre al punto esatto di sostituzione del blocco "Esci".
- Non usare `role="dialog"`/vera modale per il menu — resta un dropdown ancorato, stesso principio già scelto per il drawer (Story 9.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Successo | nuovaPassword/confermaPassword uguali, ≥8 caratteri | `updateUser` riuscito, messaggio di successo | N/A |
| Password troppo corta | nuovaPassword <8 caratteri | Nessuna chiamata a Supabase | `{error:{code:"VALIDATION", message}}` |
| Conferma non coincide | nuovaPassword ≠ confermaPassword | Nessuna chiamata a Supabase | `{error:{code:"VALIDATION", message}}` |
| Errore Supabase (es. sessione scaduta) | `updateUser` fallisce lato Supabase | Form resta compilabile, nessun redirect | `{error:{code:"AUTH_ERROR", message}}` |
| Accesso diretto non autenticato | nessuna sessione, URL `/modifica-password` diretto | Redirect a `/accedi` (comportamento già esistente, nessuna modifica a route-guard) | N/A |

</frozen-after-approval>

## Code Map

- `app/NavBar.tsx` -- passare `email={user.email ?? "Account"}` come nuova prop a `NavBarClient`
- `app/NavBarClient.tsx:161-165` -- sostituire `<form action={esci}>` con il nuovo menu profilo
- `app/NavBar.module.css` -- rimuovere `.formEsci`, aggiungere le classi del menu profilo
- `app/modifica-password/page.tsx` -- nuova pagina (riusa `.pagina-form`/`.riquadro-form`, Story 9.3)
- `app/modifica-password/ModificaPasswordForm.tsx` -- nuovo Client Component, pattern di `app/(auth)/accedi/AccediForm.tsx`
- `app/modifica-password/actions.ts` -- nuova Server Action `modificaPassword()`
- `app/modifica-password/modifica-password.module.css` -- stesso pattern `.campo`/`.bottone`/`.errore` di `registrati.module.css`
- `app/modifica-password/actions.test.ts` -- nuovi test Vitest
- `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md` -- nuova voce menu-profilo
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `9-4...: review`
- `_bmad-output/implementation-artifacts/deferred-work.md` -- eventuali compromessi

## Tasks & Acceptance

**Execution:**
- [x] `app/NavBar.tsx` -- passare `email` come prop -- il trigger deve mostrare l'email dell'Utente autenticato
- [x] `app/NavBarClient.tsx` -- sostituire il blocco `.formEsci` con: stato `menuProfiloAperto`, ref per click-fuori, handler Escape (stesso pattern del drawer già esistente, righe 98-105), bottone trigger (`aria-haspopup="menu"`, `aria-expanded`) con l'email, tendina (`role="menu"`) con Link a `/modifica-password` (`role="menuitem"`) e il form `esci` esistente invariato (`role="menuitem"`) -- unico punto toccato, resto del componente invariato
- [x] `app/NavBar.module.css` -- `.menuProfilo` (position relative, margin-top:auto come faceva `.formEsci`), `.menuProfiloTrigger` (dimensioni di `.voce`), `.menuProfiloTendina` (sfondo `{colors.surface}`, ombra leggera, position absolute ancorata al trigger), `.voceMenu` (testo scuro su sfondo chiaro — NON riusa i colori chiari di `.voce`, pensati per sfondo navy)
- [x] `app/modifica-password/page.tsx` -- `<main className="pagina-form"><div className="riquadro-form"><h1>Modifica password</h1><ModificaPasswordForm /></div></main>`, nessun controllo di Ruolo aggiuntivo
- [x] `app/modifica-password/ModificaPasswordForm.tsx` -- `useActionState(modificaPassword, undefined)`, campi "Nuova password"/"Conferma nuova password" (`type="password"`, `required`), messaggio di successo su `state?.successo`, errore su `state?.error` (`role="alert"`, stesso pattern di `AccediForm.tsx`)
- [x] `app/modifica-password/actions.ts` -- valida lunghezza ≥8 e coincidenza campi (errore `VALIDATION`, nessuna chiamata a Supabase se fallisce), altrimenti `await createClient()` + `supabase.auth.updateUser({password})`, ritorna `{successo:true}` o `{error:{code:"AUTH_ERROR", message}}`
- [x] `app/modifica-password/modifica-password.module.css` -- stesso pattern `.campo`/`.bottone`/`.errore`/`.successo` del resto del progetto
- [x] `app/modifica-password/actions.test.ts` -- test: password troppo corta, mismatch conferma, successo (mock del client Supabase)
- [x] `DESIGN.md` -- nuova voce `## Componenti` "Menu profilo (dropdown)" che chiude la `[NOTA UX APERTA]` di riga 193 (ombra leggera, `{rounded.sm}`) + entry YAML `components:`
- [x] `sprint-status.yaml` -- `9-4-menu-profilo-con-logoff-e-modifica-password: review` -- aggiornato dal chiamante (workflow orchestrator)

**Acceptance Criteria:**
- Given un Utente autenticato con la barra di navigazione visibile (desktop o mobile), when apre il menu profilo, then vede la propria email come trigger e due voci: "Modifica password" ed "Esci"
- Given il menu profilo aperto, when l'Utente clicca fuori o preme Esc, then il menu si chiude senza eseguire alcuna azione
- Given l'Utente seleziona "Esci" dal menu profilo, when l'azione viene eseguita, then il comportamento è identico a prima (redirect `/accedi`, sessione terminata, fail-closed)
- Given un Utente non autenticato, when tenta `/modifica-password` via URL diretto, then viene reindirizzato a `/accedi`
- Given la suite Vitest esistente, when eseguita dopo la modifica, then passa invariata più i nuovi test della Server Action

## Design Notes

**Perché Server Action e non `updateUser` client-side:** coerenza totale col resto del progetto — ogni chiamata Supabase Auth passa oggi da una Server Action con `lib/supabase/server.ts`; introdurre `lib/supabase/client.ts` (mai usato) per un solo caso d'uso aggiungerebbe un secondo pattern senza reale beneficio, dato che il server client ha già accesso alla sessione dell'Utente via cookie.

**Perché `/modifica-password` non è una voce di navigazione:** raggiunta solo dal menu profilo — non ha bisogno di comparire nella lista principale filtrata per Ruolo (`voci-navigazione.ts` resta invariato).

**Perché nessun `role="dialog"`:** è un dropdown ancorato al trigger, non un vero modale — stesso principio già scelto per il drawer mobile (Story 9.2, `deferred-work.md`).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test passano (492 esistenti + i nuovi della Server Action)
- `npx tsc --noEmit -p tsconfig.json` -- expected: nessun errore
- `npx eslint .` -- expected: nessun nuovo errore rispetto alla baseline

**Manual checks (if no CLI):**
- Verificare a video apertura/chiusura del menu profilo (click, click-fuori, Esc) su desktop e mobile, e che "Modifica password"/"Esci" funzionino correttamente.

## Suggested Review Order

**Menu profilo (sostituisce "Esci" isolato)**

- Entry point: stato/ref del nuovo dropdown, accanto allo stato gemello del drawer (Story 9.2).
  [`NavBarClient.tsx:58`](../../app/NavBarClient.tsx#L58)

- Markup del trigger (email) e della tendina (`role="menu"`), con l'`onBlur` aggiunto in review per l'uscita da tastiera.
  [`NavBarClient.tsx:227`](../../app/NavBarClient.tsx#L227)

- Review fix: chiudere il drawer (hamburger/overlay) ora resetta anche il menu profilo, stesso pattern "adjusting state during render" del cambio pathname sopra.
  [`NavBarClient.tsx:116`](../../app/NavBarClient.tsx#L116)

- Escape e click-fuori dedicati al menu profilo, indipendenti da quelli del drawer.
  [`NavBarClient.tsx:137`](../../app/NavBarClient.tsx#L137),
  [`NavBarClient.tsx:152`](../../app/NavBarClient.tsx#L152)

- Trigger = email dell'Utente, `||` non `??` per coprire anche la stringa vuota (review fix).
  [`NavBar.tsx:91`](../../app/NavBar.tsx#L91)

- Classi del dropdown (sfondo chiaro, ombra) e review fix sull'hover che riusava per errore un token riservato allo sfondo navy.
  [`NavBar.module.css:135`](../../app/NavBar.module.css#L135),
  [`NavBar.module.css:220`](../../app/NavBar.module.css#L220)

**Modifica password (nuova pagina + Server Action)**

- Validazione: lunghezza minima, whitespace e limite di 72 caratteri (i due review fix), prima di qualunque chiamata a Supabase.
  [`modifica-password/actions.ts:35`](../../app/modifica-password/actions.ts#L35)

- Chiamata Supabase vera e propria — `lib/supabase/server.ts`, mai il client browser (decisione di design, vedi Design Notes).
  [`modifica-password/actions.ts:72`](../../app/modifica-password/actions.ts#L72)

- Form: `autoComplete="new-password"` e reset dei campi al successo (entrambi review fix).
  [`modifica-password/ModificaPasswordForm.tsx:1`](../../app/modifica-password/ModificaPasswordForm.tsx#L1)

**Documentazione**

- Voce DESIGN.md che chiude la nota UX aperta sulle superfici sovrapposte transitorie.
  [`DESIGN.md:218`](../planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md#L218)

**Peripherals**

- Test della Server Action, incluse le 2 nuove casistiche aggiunte in review (whitespace, lunghezza massima).
  [`modifica-password/actions.test.ts:26`](../../app/modifica-password/actions.test.ts#L26)

- Note di debito tecnico aggiunte in review (nessun logout globale dopo il cambio password).
  [`deferred-work.md:333`](./deferred-work.md#L333)

- Stato sprint aggiornato a `review`.
  [`sprint-status.yaml:138`](./sprint-status.yaml#L138)
