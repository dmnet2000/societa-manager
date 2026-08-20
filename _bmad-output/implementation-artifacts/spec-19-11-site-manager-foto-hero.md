---
title: "Story 19.11: Accesso Site Manager alla foto sfondo hero"
type: 'feature'
created: '2026-08-20'
status: 'planned'
review_loop_iteration: 0
context: []
baseline_commit: 'a58ea99c93c4b97845cf13ca8d4f64e0e5fc5b9f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `SITE_MANAGER` ha già accesso a `/app/impostazioni` (Story 19.1) e quindi vede l'intera pagina hub, inclusa la sezione "Foto sfondo hero" (Story 18.14) — ma il submit fallisce oggi con `FORBIDDEN` perché `caricaFotoHeroAction` ammette solo `ADMIN`/`DIRIGENTE`. Un form visibile ma non utilizzabile è uno stato a metà, stesso gap già trovato e corretto per Pagina Facebook (Story 19.5), logo/nome Settore (19.2) e foto squadra (19.4).

**Approach:** Estendere `SITE_MANAGER` alla sola `caricaFotoHeroAction` (nessuna modifica a route-guard: l'accesso alla rotta è già concesso da Story 19.1). Nessun avviso UI aggiuntivo necessario (a differenza di Story 19.5): la foto hero non ha alcuna dipendenza da un'altra credenziale/configurazione riservata come il Token Facebook.

## Boundaries & Constraints

**Always:** additivo — `ADMIN`/`DIRIGENTE` restano invariati. Riuso diretto di `lib/storage/foto-hero.ts` (nessuna modifica, il perimetro di Ruoli vive solo nella Server Action).

**Ask First:** nessuna — estensione diretta del pattern già stabilito e già scelto con l'utente per 19.2/19.4/19.5 (accesso "affianca", nessun permesso tolto ad Admin/Dirigente, epic-19-context.md punto 3).

**Never:** non toccare `route-guard.ts` (`/app/impostazioni` già ammette `SITE_MANAGER` dalla Story 19.1, nessuna nuova rotta necessaria). Non estendere il logo Polisportiva (`caricaLogoPolisportivaAction`, Story 18.20) né alcuna altra action di `impostazioni/actions.ts` non nominata qui — fuori scope, non richiesto dall'utente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solo `SITE_MANAGER` invia `caricaFotoHeroAction` con un'immagine valida (PNG/JPEG, ≤2MB) | `requireRuolo` esteso | salvataggio riuscito, non `FORBIDDEN` | N/A |
| Solo `SITE_MANAGER` invia `caricaLogoPolisportivaAction` | `requireRuolo` invariato | comportamento identico a oggi | `FORBIDDEN` |
| Admin/Dirigente caricano la foto hero | invariato | comportamento identico a oggi | N/A |
| Utente senza `ADMIN`/`DIRIGENTE`/`SITE_MANAGER` invia `caricaFotoHeroAction` | invariato | resta bloccato come oggi | `FORBIDDEN` |
| Validazione MIME/dimensione/magic-byte (Story 18.14) | invariata | stesso comportamento, indipendente dal Ruolo del chiamante | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `app/app/(configurazione)/impostazioni/actions.ts:274` -- `requireRuolo(["ADMIN", "DIRIGENTE"])` di `caricaFotoHeroAction`, aggiungere `"SITE_MANAGER"`
- `app/app/(configurazione)/impostazioni/actions.test.ts:683` -- `toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"])` nel test FORBIDDEN, aggiornare a 3 Ruoli; nuovo test di successo per `SITE_MANAGER` mirror di quello DIRIGENTE già esistente (righe 759-771)
- `lib/guida/contenuti.ts:228` -- paragrafo "Foto sfondo hero" della voce `/app/impostazioni`, aggiungere una frase che menzioni Site Manager (mirror della frase già presente al paragrafo Pagina Facebook, riga 226: "editabile anche da Site Manager"); nessuna modifica a `ruoliAmmessi` (già `["ADMIN", "DIRIGENTE", "SITE_MANAGER"]` dalla Story 19.1)

## Tasks & Acceptance

**Execution:**
- [ ] `impostazioni/actions.ts` -- estendere `requireRuolo` di `caricaFotoHeroAction`
- [ ] `impostazioni/actions.test.ts` -- aggiornare l'asserzione FORBIDDEN + nuovo test di successo per `SITE_MANAGER`
- [ ] `contenuti.ts` -- aggiornare la prosa del paragrafo "Foto sfondo hero"

**Acceptance Criteria:**
- Given un Utente con solo `SITE_MANAGER`, when carica una foto di sfondo dell'hero da `/app/impostazioni`, then il salvataggio riesce — non `FORBIDDEN`
- Given un Utente senza `ADMIN`/`DIRIGENTE`/`SITE_MANAGER`, when tenta la stessa azione, then resta bloccato come oggi
- Given Admin o Dirigente, when caricano la foto hero, then il comportamento resta identico a oggi (nessuna regressione)

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito

**Manual checks (if no CLI):**
- Dopo il deploy: un Utente con solo `SITE_MANAGER` apre `/app/impostazioni`, carica una foto di sfondo hero, e la vede comparire come sfondo della home pubblica quando non ci sono post Facebook

## Suggested Review Order

**La Server Action (il cancello reale)**

- `requireRuolo` esteso, unico controllo di autorizzazione per questa story.
  [`impostazioni/actions.ts:274`](../../app/app/(configurazione)/impostazioni/actions.ts#L274)

**Test e guida (periferici)**

- Asserzione FORBIDDEN aggiornata + nuovo test di successo.
  [`impostazioni/actions.test.ts`](../../app/app/(configurazione)/impostazioni/actions.test.ts)

- Mirror di prosa, nessun impatto sul test di coerenza (`ruoliAmmessi` già invariato).
  [`contenuti.ts`](../../lib/guida/contenuti.ts)
