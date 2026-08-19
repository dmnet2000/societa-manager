---
title: 'Story 19.5: Accesso Site Manager all''URL della Pagina Facebook'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '2d905848ecf8077efe7c9acc64d41f613492d77'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `SITE_MANAGER` ha già accesso a `/app/impostazioni` (Story 19.1) e quindi vede l'intera pagina hub, incluso il form "Pagina Facebook" — ma il submit fallisce oggi con `FORBIDDEN` perché `salvaUrlPaginaFacebookAction` ammette solo `ADMIN`/`DIRIGENTE`. Un form visibile ma non utilizzabile è uno stato a metà.

**Approach:** Estendere `SITE_MANAGER` alla sola `salvaUrlPaginaFacebookAction` (nessuna modifica a route-guard: l'accesso alla rotta è già concesso). Aggiungere un avviso esplicito in `PaginaFacebookForm.tsx` dopo un salvataggio riuscito con un URL non vuoto: il Token Facebook (credenziale API, esplicitamente esclusa dall'accesso Site Manager per decisione dell'Epic 19) potrebbe non corrispondere più alla nuova Pagina — Site Manager non può risolverlo da solo, deve sapere di contattare un Admin.

## Boundaries & Constraints

**Always:** additivo — `ADMIN`/`DIRIGENTE` restano invariati. `salvaTokenFacebookAction` **non** viene estesa (decisione esplicita, epic-19-context.md punto 6: credenziale API, resta Admin/Dirigente).

**Ask First:** nessuna — scope già deciso in apertura epica (epics.md, Story 19.5) e in party mode (decisione 8, epic-19-context.md).

**Never:** non toccare `route-guard.ts` (`/app/impostazioni` già ammette `SITE_MANAGER` dalla Story 19.1, nessuna nuova rotta necessaria). Non estendere `salvaTokenFacebookAction` né alcuna altra action di `impostazioni/actions.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solo `SITE_MANAGER` invia `salvaUrlPaginaFacebookAction` con URL valido | `requireRuolo` esteso | salvataggio riuscito, non `FORBIDDEN` | N/A |
| Solo `SITE_MANAGER` invia `salvaTokenFacebookAction` | `requireRuolo` invariato | comportamento identico a oggi | `FORBIDDEN` |
| Site Manager salva un URL non vuoto | submit riuscito | avviso "Token potrebbe non corrispondere più" mostrato in UI | N/A |
| Site Manager svuota il campo (rimuove la configurazione) | submit riuscito, valore vuoto | nessun avviso Token (nessuna nuova Pagina impostata) | N/A |
| Admin/Dirigente salvano un URL | invariato | comportamento identico a oggi (stesso avviso compare anche per loro — il rischio di disallineamento non dipende dal Ruolo di chi salva) | N/A |

</frozen-after-approval>

## Code Map

- `app/app/(configurazione)/impostazioni/actions.ts:116` -- `requireRuolo(["ADMIN","DIRIGENTE"])` di `salvaUrlPaginaFacebookAction`, aggiungere `"SITE_MANAGER"`
- `app/app/(configurazione)/impostazioni/PaginaFacebookForm.tsx` -- dopo un `state.success` con il campo non vuoto (input reso `controlled`, un `ref` letto durante il render viola `react-hooks/refs` - scoperto da `npm run lint`), mostrare un secondo paragrafo (`styles.avviso`, stesso stile già usato in `page.tsx` per gli avvisi soft) con il testo del disallineamento Token
- `lib/guida/contenuti.ts:213` -- paragrafo "Pagina Facebook" della voce `/app/impostazioni`, aggiungere una frase che menzioni Site Manager e il nuovo avviso; nessuna modifica a `ruoliAmmessi` (già `["ADMIN","DIRIGENTE","SITE_MANAGER"]` dalla Story 19.1)
- `app/app/(configurazione)/impostazioni/actions.test.ts:249` -- `toHaveBeenCalledWith(["ADMIN","DIRIGENTE"])` di `salvaUrlPaginaFacebookAction`, aggiornare a 3 Ruoli; aggiungere test di successo per `SITE_MANAGER`

## Tasks & Acceptance

**Execution:**
- [x] `impostazioni/actions.ts` -- estendere `requireRuolo` di `salvaUrlPaginaFacebookAction`
- [x] `PaginaFacebookForm.tsx` -- avviso post-salvataggio sul possibile disallineamento del Token (solo se URL non vuoto)
- [x] `contenuti.ts` -- aggiornare la prosa del paragrafo Pagina Facebook
- [x] `impostazioni/actions.test.ts` -- aggiornare l'asserzione FORBIDDEN + nuovo test di successo per `SITE_MANAGER`

**Acceptance Criteria:**
- Given un Utente con solo `SITE_MANAGER`, when salva/modifica l'URL della Pagina Facebook da `/app/impostazioni`, then il salvataggio riesce — non `FORBIDDEN`
- Given la stessa azione, when tenta invece di salvare il Token Facebook, then resta bloccato — `salvaTokenFacebookAction` invariata
- Given un salvataggio riuscito con un URL non vuoto (da qualunque Ruolo ammesso), when l'interfaccia si aggiorna, then mostra l'avviso esplicito sul possibile disallineamento del Token

## Spec Change Log

- 2026-08-19 (code review Epic 19, post-hoc): `PaginaFacebookForm.tsx` leggeva `valore` (stato live del campo) invece del valore davvero inviato nell'ultimo submit riuscito per condizionare l'avviso Token - un Utente poteva salvare, vedere l'avviso, poi modificare/svuotare il campo senza reinviare e vedere l'avviso sparire pur restando il valore precedente quello davvero salvato. Fix: nuovo state `valoreSalvato`, aggiornato solo `onSubmit`.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito

**Manual checks (if no CLI):**
- Dopo il deploy: un Utente con solo `SITE_MANAGER` apre `/app/impostazioni`, salva un nuovo URL Pagina Facebook, vede l'avviso sul Token, e non riesce a salvare il Token stesso

## Suggested Review Order

**La Server Action (il cancello reale)**

- `requireRuolo` esteso, unico controllo di autorizzazione per questa story.
  [`impostazioni/actions.ts:116`](../../app/app/(configurazione)/impostazioni/actions.ts#L116)

**L'avviso (nessun test diretto possibile — nessun componente del progetto ne ha mai avuto uno)**

- Condizionato al valore non vuoto, verificare a occhio che non compaia su una rimozione.
  [`PaginaFacebookForm.tsx`](../../app/app/(configurazione)/impostazioni/PaginaFacebookForm.tsx)

**Test e guida (periferici)**

- Asserzione FORBIDDEN aggiornata + nuovo test di successo.
  [`impostazioni/actions.test.ts`](../../app/app/(configurazione)/impostazioni/actions.test.ts)

- Mirror di prosa, nessun impatto sul test di coerenza (`ruoliAmmessi` già invariato).
  [`contenuti.ts`](../../lib/guida/contenuti.ts)
