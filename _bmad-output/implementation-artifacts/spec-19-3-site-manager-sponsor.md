---
title: 'Story 19.3: Accesso Site Manager a Sponsor'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '2066aa0aba5286b414ee9580a8233ce81a5900d0'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/app/sponsor` è una pagina duale (vetrina pubblica per tutti e 6 i Ruoli + pannello di gestione visibile solo ad Admin/Dirigente, Story 16.2). `SITE_MANAGER` non compare in nessuno dei tre gate coinvolti — non vede nemmeno la pagina.

**Approach:** Estendere `SITE_MANAGER` a **tre** livelli distinti, tutti necessari: la rotta (route-guard, altrimenti nemmeno la vetrina è raggiungibile), il rendering del pannello di gestione (`eGestionale` in `page.tsx`, un terzo gate specifico di questa pagina duale, separato da rotta e Server Action), e le 3 Server Action di gestione.

## Boundaries & Constraints

**Always:** additivo — Admin/Dirigente/gli altri 5 Ruoli restano invariati sulla vetrina pubblica. I tre livelli (rotta, `eGestionale`, Server Action) vengono estesi insieme — un Site Manager che raggiunge la pagina ma non vede il pannello, o lo vede ma le action falliscono, è uno stato a metà da evitare (stesso principio già applicato in Story 19.1 per `/app/impostazioni`).

**Ask First:** nessuna — decisioni già chiuse nell'apertura dell'Epic 19.

**Never:** non toccare la generazione voucher (altro ramo della stessa pagina, per gli altri 5 Ruoli) né la logica di attivazione/disattivazione oltre al Ruolo ammesso.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solo `SITE_MANAGER` apre `/app/sponsor` | route-guard controlla `ruoliAmmessi` | pagina raggiungibile | N/A |
| Solo `SITE_MANAGER` sulla pagina | `eGestionale` valuta i Ruoli | pannello di gestione visibile | N/A |
| Solo `SITE_MANAGER` invia `creaSponsor`/`aggiornaSponsor`/`impostaAttivaSponsor` | `requireRuolo` esteso su tutte e 3 | operazione riuscita | N/A |
| Utente senza `ADMIN`/`DIRIGENTE`/`SITE_MANAGER` invia una delle 3 action | `requireRuolo` valuta i Ruoli | invariato rispetto a oggi | `FORBIDDEN` |
| Altro Ruolo (es. `ATLETA`) sulla pagina | `eGestionale` valuta i Ruoli | pannello resta nascosto, vetrina invariata | N/A |

</frozen-after-approval>

## Code Map

- `lib/auth/route-guard.ts:279` -- `ruoliAmmessi` di `/app/sponsor` (oggi i 6 Ruoli storici), aggiungere `"SITE_MANAGER"` -- altrimenti la pagina è del tutto irraggiungibile per lui, nemmeno come vetrina
- `app/app/(sponsor)/sponsor/page.tsx:31` -- `eGestionale = ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE")`, aggiungere `|| ruoli.includes("SITE_MANAGER")` -- **terzo gate distinto**, separato da rotta e Server Action: senza questo il pannello di gestione resta nascosto anche se la pagina è raggiungibile e le action passano
- `app/app/(sponsor)/sponsor/actions.ts:133,186,243` -- le 3 `requireRuolo(["ADMIN","DIRIGENTE"])` (`creaSponsor`, `aggiornaSponsor`, `impostaAttivaSponsor`), aggiungere `"SITE_MANAGER"` a tutte e 3
- `lib/guida/contenuti.ts:27` (+ prosa riga 31, "Se sei Admin o Dirigente...") -- mirror di `ruoliAmmessi`, richiesto dal test di coerenza; prosa da aggiornare per menzionare anche Site Manager
- `lib/auth/route-decision.test.ts:727` -- `it.each` esistente sui 6 Ruoli storici per `/app/sponsor`, aggiungere `"SITE_MANAGER"` alla lista
- `app/app/(sponsor)/sponsor/actions.test.ts:114,~342,~419` -- le 3 asserzioni `toHaveBeenCalledWith(["ADMIN","DIRIGENTE"])`, aggiornare alla forma a 3 Ruoli; nuovi test di successo per `SITE_MANAGER` su ciascuna delle 3 action

## Tasks & Acceptance

**Execution:**
- [x] `route-guard.ts` -- estendere `ruoliAmmessi` di `/app/sponsor` -- accesso alla pagina
- [x] `sponsor/page.tsx` -- estendere `eGestionale` -- visibilità del pannello di gestione
- [x] `sponsor/actions.ts` -- estendere `requireRuolo` su tutte e 3 le action -- additivo
- [x] `contenuti.ts` -- mirror di `ruoliAmmessi` + aggiornamento prosa -- richiesto dal test di coerenza e dalla convenzione del progetto
- [x] `route-decision.test.ts` -- aggiungere `SITE_MANAGER` all'`it.each` di `/app/sponsor`
- [x] `sponsor/actions.test.ts` -- aggiornare le 3 asserzioni FORBIDDEN + aggiungere test di successo per `SITE_MANAGER` su ciascuna action

**Acceptance Criteria:**
- Given un Utente con solo `SITE_MANAGER`, when apre `/app/sponsor`, then vede sia la vetrina sia il pannello di gestione (non solo uno dei due)
- Given un Utente con un Ruolo tra i 5 rimanenti (es. `ATLETA`), when apre `/app/sponsor`, then vede solo la vetrina, nessuna regressione
- Given un Utente con solo `SITE_MANAGER`, when tenta un'altra rotta admin-only (`/app/admin`, `/app/gruppi`), then resta bloccato come oggi

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito

**Manual checks (if no CLI):**
- Dopo il deploy: un Utente con solo `SITE_MANAGER` vede il pannello di gestione Sponsor e riesce a creare/modificare/disattivare uno Sponsor

## Suggested Review Order

**Il terzo gate (il più a rischio, unico non coperto da test)**

- `eGestionale` — nessun test diretto su questa pagina (nessuna pagina del progetto ne ha mai avuto uno, deferred).
  [`sponsor/page.tsx:35`](../../app/app/(sponsor)/sponsor/page.tsx#L35)

**Rotta e Server Action (coperti da test)**

- `ruoliAmmessi` di `/app/sponsor` esteso a 7 Ruoli.
  [`route-guard.ts:281`](../../lib/auth/route-guard.ts#L281)

- Le 3 Server Action di gestione, stesso pattern additivo.
  [`sponsor/actions.ts:134`](../../app/app/(sponsor)/sponsor/actions.ts#L134)

**Review fix: un quarto gate scoperto durante la review**

- `/app/guida` non includeva ancora SITE_MANAGER — dopo 19.1/19.2/19.3 avrebbe avuto 3 pagine di gestione ma non l'indice della guida stessa.
  [`route-guard.ts:299`](../../lib/auth/route-guard.ts#L299)

**Test e coerenza (periferici)**

- Mirror obbligatorio per il test di coerenza con la guida in-app, prosa aggiornata.
  [`contenuti.ts:29`](../../lib/guida/contenuti.ts#L29)

- Caso aggiunto all'`it.each` esistente sui 6 Ruoli storici.
  [`route-decision.test.ts:728`](../../lib/auth/route-decision.test.ts#L728)
