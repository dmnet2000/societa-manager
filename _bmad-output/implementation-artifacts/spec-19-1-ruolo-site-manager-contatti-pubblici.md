---
title: 'Story 19.1: Ruolo Site Manager e accesso ai contatti pubblici'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '1f19db8e6c843da673203f45fa7134fc261388e1'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Non esiste modo di delegare la gestione del sito pubblico senza concedere accesso Admin completo — oggi solo Admin e Dirigente possono salvare i contatti pubblici (`/app/impostazioni`).

**Approach:** Aggiungere un settimo Ruolo `SITE_MANAGER` (schema Prisma + assegnabile da `/app/admin`) e concedergli, in aggiunta ad Admin/Dirigente, l'accesso a `/app/impostazioni` e a `salvaContattiPubbliciAction`.

## Boundaries & Constraints

**Always:** additivo — nessun permesso tolto ad Admin/Dirigente. `SITE_MANAGER` cumulabile con qualsiasi altro Ruolo sullo stesso Utente. Solo `salvaContattiPubbliciAction` e la rotta `/app/impostazioni` vengono estese in questa story.

**Ask First:** nessuna — tutte le decisioni di prodotto sono già state prese (apertura epica + party mode, 2026-08-18).

**Never:** non toccare `salvaEmailSegreteriaAction` (resta `ADMIN`-only), né `salvaUrlPaginaFacebookAction`/`salvaTokenFacebookAction`/`caricaFotoHeroAction`/`caricaLogoPolisportivaAction`/`salvaUrlSitoPolisportivaAction` (stesso file, fuori scope — story separate). Non introdurre RLS su `UtenteRuolo` (non oggetto di questa story).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin assegna SITE_MANAGER | checkbox selezionata in `NuovoUtenteForm`/`UtenteRow` | Ruolo salvato su `UtenteRuolo` + sincronizzato su `app_metadata` | N/A |
| Solo `SITE_MANAGER` apre `/app/impostazioni` | route-guard controlla `ruoliAmmessi` | pagina raggiungibile | N/A |
| Solo `SITE_MANAGER` invia `salvaContattiPubbliciAction` | `requireRuolo` valuta i Ruoli | contatti salvati, `revalidatePath("/impostazioni")` | N/A |
| Utente senza ADMIN/DIRIGENTE/SITE_MANAGER invia la action | `requireRuolo` valuta i Ruoli | invariato rispetto a oggi | `FORBIDDEN` |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma:26-33` -- `enum Ruolo`, aggiungere `SITE_MANAGER`
- `prisma/migrations/<nuova>_add_site_manager_ruolo/migration.sql` -- `ALTER TYPE "Ruolo" ADD VALUE 'SITE_MANAGER';`, unico statement nel file (Postgres richiede che `ADD VALUE` non condivida la transazione con uno statement che lo usa)
- `lib/ruoli.ts:3-10` -- `RUOLI_VALIDI`, aggiungere `"SITE_MANAGER"`
- `app/app/(amministrazione)/admin/NuovoUtenteForm.tsx:7-14` -- array locale `RUOLI` (checkbox), aggiungere `{ value: "SITE_MANAGER", label: "Site manager" }`
- `app/app/(amministrazione)/admin/UtenteRow.tsx:12-19` -- stesso array duplicato (non deriva da `RUOLI_VALIDI`), stessa aggiunta
- `lib/auth/route-guard.ts:211` -- `ruoliAmmessi` di `/app/impostazioni` (oggi `["ADMIN","DIRIGENTE"]`), aggiungere `"SITE_MANAGER"` -- **necessario**: senza questo la action sottostante resta irraggiungibile (redirect prima del form)
- `app/app/(configurazione)/impostazioni/actions.ts:176` -- `requireRuolo(["ADMIN","DIRIGENTE"])` di `salvaContattiPubbliciAction`, aggiungere `"SITE_MANAGER"`. Le altre `requireRuolo` dello stesso file (righe 45, 116, 265, 337, 401, 462) restano invariate
- `lib/auth-admin/sync-roles.ts` -- `sincronizzaRuoliAppMetadata`, generica su `Ruolo[]`, nessuna modifica di codice
- `app/app/(configurazione)/impostazioni/actions.test.ts:377+` -- test esistenti di `salvaContattiPubbliciAction` (mock `@/lib/auth/require-ruolo`), da estendere

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- aggiungere `SITE_MANAGER` a `enum Ruolo` -- settimo Ruolo del sistema
- [x] nuova migrazione Prisma -- `ALTER TYPE "Ruolo" ADD VALUE 'SITE_MANAGER'` -- unico statement, fuori transazione condivisa
- [x] `lib/ruoli.ts` -- aggiungere `"SITE_MANAGER"` a `RUOLI_VALIDI` -- validazione `app_metadata`/input form
- [x] `NuovoUtenteForm.tsx` + `UtenteRow.tsx` -- aggiungere l'opzione Site Manager alle checkbox in entrambi -- assegnabile da `/app/admin`
- [x] `lib/auth/route-guard.ts` -- estendere `ruoliAmmessi` di `/app/impostazioni` -- altrimenti la action è irraggiungibile
- [x] `impostazioni/actions.ts` -- estendere `requireRuolo` di `salvaContattiPubbliciAction` -- unica action toccata, additivo
- [x] `impostazioni/actions.test.ts` -- nuovo test: `SITE_MANAGER` può salvare i contatti pubblici -- copre l'AC del Boundaries & Constraints
- [x] `lib/guida/contenuti.ts` -- non nel Code Map originale, ma necessario: `/app/impostazioni` vi è specchiata (`ruoliAmmessi`) e un test di coerenza (`contenuti.test.ts`) confronta l'insieme con `PROTECTED_ROUTES` -- senza questo `npx vitest run` non sarebbe rimasto verde

**Acceptance Criteria:**
- Given un Utente con solo `SITE_MANAGER`, when tenta di accedere a un'altra rotta admin-only (`/app/admin`, `/app/logo`, `/app/sponsor`), then resta bloccato come oggi — questa story non concede altro
- Given un Utente con `SITE_MANAGER` cumulato ad `ALLENATORE`, when accede alle rotte proprie di `ALLENATORE`, then nessuna regressione
- Given `NuovoUtenteForm`/`UtenteRow`, when un Admin seleziona la checkbox Site Manager, then il Ruolo compare in `UtenteRuolo` e in `app_metadata` dell'Utente (stesso meccanismo già in uso per gli altri 6)

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito

**Manual checks (if no CLI):**
- La migrazione Prisma non è eseguibile dal vivo in questo sandbox (motore Prisma WASM rotto su Windows, verificato in sessioni precedenti) — verificata per sintassi/posizionamento, non applicata; da eseguire e confermare dall'utente in un ambiente funzionante
- Dopo il deploy: un Utente con solo `SITE_MANAGER` vede `/app/impostazioni` in nav e riesce a salvare i contatti pubblici

## Suggested Review Order

**Il nuovo Ruolo**

- Settimo valore dell'enum, punto di partenza di tutta la modifica.
  [`schema.prisma:33`](../../prisma/schema.prisma#L33)

- Unico statement, fuori transazione condivisa — vincolo Postgres su `ADD VALUE`.
  [`20260818000000_add_site_manager_ruolo/migration.sql:7`](../../prisma/migrations/20260818000000_add_site_manager_ruolo/migration.sql#L7)

- Fonte di verità per la validazione dei Ruoli, usata da assegnazione Admin e auto-registrazione.
  [`ruoli.ts:10`](../../lib/ruoli.ts#L10)

**Autorizzazione — dove SITE_MANAGER può davvero entrare**

- Senza questa riga la action sottostante sarebbe irraggiungibile (redirect prima del form).
  [`route-guard.ts:218`](../../lib/auth/route-guard.ts#L218)

- Unica Server Action estesa in questa storia — additivo, le altre restano invariate.
  [`impostazioni/actions.ts:180`](../../app/app/(configurazione)/impostazioni/actions.ts#L180)

**Assegnazione da /app/admin**

- Checkbox aggiunta al form di creazione — array locale, non deriva da `RUOLI_VALIDI`.
  [`NuovoUtenteForm.tsx:14`](../../app/app/(amministrazione)/admin/NuovoUtenteForm.tsx#L14)

- Stesso array duplicato per la riga di un Utente esistente.
  [`UtenteRow.tsx:19`](../../app/app/(amministrazione)/admin/UtenteRow.tsx#L19)

**Mirror di coerenza (verificati da test dedicati)**

- Guida in-app specchia `ruoliAmmessi` di route-guard — un test di coerenza lo impone.
  [`contenuti.ts:185`](../../lib/guida/contenuti.ts#L185)

- Commento sul conteggio dei valori enum aggiornato (6 → 7).
  [`permessi-configurabili.ts:25`](../../lib/auth/permessi-configurabili.ts#L25)

**Test (periferici)**

- Copre il caso limite già visto una volta per Dirigente (Story 18.5): route-guard e action possono divergere silenziosamente.
  [`route-decision.test.ts:190`](../../lib/auth/route-decision.test.ts#L190)

- Verifica che `SITE_MANAGER` compaia nella nav e non "trapeli" verso `/app/admin`.
  [`voci-navigazione.test.ts:60`](../../lib/auth/voci-navigazione.test.ts#L60)

- Test diretto sulla fonte di verità (`RUOLI_VALIDI`/`parseRuoli`), prima priva di copertura.
  [`ruoli.test.ts:8`](../../lib/ruoli.test.ts#L8)

- Percorso FORBIDDEN aggiornato + nuovo caso di successo per il solo `SITE_MANAGER`.
  [`impostazioni/actions.test.ts:397`](../../app/app/(configurazione)/impostazioni/actions.test.ts#L397)
