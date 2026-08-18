---
title: 'Story 19.2: Accesso Site Manager a logo e nome Settore'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'aa24bb6906988398c4b55a5a991988dd5ea126a8'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/app/logo` (caricamento logo + nome Settore) è oggi riservato ad `ADMIN`, additivo per gli altri Ruoli sensibili già estesi (Story 19.1).

**Approach:** Estendere `SITE_MANAGER` sia alla rotta sia alle due Server Action, con doppia estensione per `caricaLogoAction`: il controllo applicativo (`requireRuolo`) **e** la policy RLS del bucket Storage (Story 7.2, difesa in profondità a livello database) — `salvaNomeSettoreAction` non ha RLS, solo `requireRuolo`.

## Boundaries & Constraints

**Always:** additivo — `ADMIN` resta invariato. Entrambe le difese di `caricaLogoAction` (app + RLS) vengono estese insieme, mai una sola (altrimenti l'upload fallirebbe silenziosamente per un Site Manager che ha superato il controllo applicativo ma viene rifiutato dal database).

**Ask First:** nessuna — decisioni già chiuse nell'apertura dell'Epic 19 e nel party mode.

**Never:** non toccare `caricaFotoHeroAction`/`caricaLogoPolisportivaAction`/`salvaUrlSitoPolisportivaAction`/`salvaTokenFacebookAction` (altre action, fuori scope di questa story). Non rimuovere/allentare il vincolo `name = 'logo'` della policy RLS (Story 7.2 review fix) — solo il Ruolo ammesso si allarga, il resto della policy resta identico.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solo `SITE_MANAGER` apre `/app/logo` | route-guard controlla `ruoliAmmessi` | pagina raggiungibile | N/A |
| Solo `SITE_MANAGER` invia `caricaLogoAction` (PNG/JPEG valido) | `requireRuolo` + RLS entrambi estesi | upload riuscito, `revalidatePath` | N/A |
| Solo `SITE_MANAGER` invia `salvaNomeSettoreAction` | `requireRuolo` esteso | nome salvato | N/A |
| Utente senza `ADMIN`/`SITE_MANAGER` invia una delle due action | `requireRuolo` valuta i Ruoli | invariato rispetto a oggi | `FORBIDDEN` |

</frozen-after-approval>

## Code Map

- `lib/auth/route-guard.ts:229` -- `ruoliAmmessi` di `/app/logo` (oggi `["ADMIN"]`), aggiungere `"SITE_MANAGER"` -- stesso pattern additivo già usato per `/app/impostazioni` in Story 19.1
- `app/app/(configurazione)/logo/actions.ts:34` -- `requireRuolo("ADMIN")` di `caricaLogoAction` → `requireRuolo(["ADMIN","SITE_MANAGER"])` (forma array, come già in uso altrove nel progetto)
- `app/app/(configurazione)/logo/actions.ts:101` -- stesso cambio per `salvaNomeSettoreAction`, **nessuna RLS coinvolta qui** (vedi commento riga 91-96 del file: `configurazione_applicazione` non è protetta da RLS)
- **Nuova migrazione Prisma** -- `DROP POLICY`/`CREATE POLICY` su `admin_logo_insert`/`admin_logo_update` (`storage.objects`, bucket `logo-applicazione`) per aggiungere la condizione `OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'SITE_MANAGER'` accanto al controllo `ADMIN` esistente — il vincolo `name = 'logo'` (Story 7.2 review fix) resta identico. Mirror esatto della struttura di `prisma/migrations/20260718090000_logo_bucket_restrict_path/migration.sql`
- `lib/guida/contenuti.ts:207` -- `ruoliAmmessi` della voce `/app/logo` (oggi `["ADMIN"]`), stesso mirror obbligatorio già visto in Story 19.1 (test di coerenza con `PROTECTED_ROUTES`)
- `app/app/(configurazione)/logo/actions.test.ts:87,212` -- i due test FORBIDDEN asseriscono `toHaveBeenCalledWith("ADMIN")`, da aggiornare alla forma array; nuovi test per il percorso di successo `SITE_MANAGER`
- `lib/auth/route-decision.test.ts:428-443` -- test esistente "allows only Admin on /logo" (titolo da correggere, non più vero), aggiungere caso `SITE_MANAGER` → `allow`
- Reachability: `app/app/(configurazione)/impostazioni/page.tsx` costruisce il link a `/app/logo` da `PROTECTED_ROUTES` senza filtrare per Ruolo (già così oggi per Dirigente su `/app/impostazioni`) -- **nessuna modifica necessaria lì**, il link diventa utilizzabile automaticamente una volta esteso route-guard

## Tasks & Acceptance

**Execution:**
- [x] `route-guard.ts` -- estendere `ruoliAmmessi` di `/app/logo` -- accesso alla pagina
- [x] `logo/actions.ts` -- estendere `requireRuolo` di entrambe le action -- forma array, additivo
- [x] Nuova migrazione -- estendere le due policy RLS del bucket `logo-applicazione` -- senza questa, l'upload fallirebbe comunque per un Site Manager
- [x] `contenuti.ts` -- mirror di `ruoliAmmessi` per `/app/logo` -- richiesto dal test di coerenza esistente
- [x] `logo/actions.test.ts` -- aggiornare i 2 test FORBIDDEN + aggiungere test di successo per `SITE_MANAGER` su entrambe le action
- [x] `route-decision.test.ts` -- aggiungere/correggere il caso `SITE_MANAGER` su `/app/logo`

**Acceptance Criteria:**
- Given un Utente con solo `SITE_MANAGER`, when tenta un'altra rotta admin-only (`/app/admin`, `/app/sponsor`, `/app/gruppi`), then resta bloccato come oggi
- Given la policy RLS estesa, when un Utente con un Ruolo diverso da `ADMIN`/`SITE_MANAGER` tentasse comunque una scrittura diretta sul bucket (bypassando l'app), then la policy la rifiuta ugualmente

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito

**Manual checks (if no CLI):**
- La migrazione RLS non è applicabile dal vivo in questo sandbox (motore Prisma WASM rotto, limite noto) — verificata per sintassi, da applicare e confermare dall'utente in un ambiente funzionante
- Dopo il deploy: un Utente con solo `SITE_MANAGER` riesce a caricare un logo reale (non solo a passare i controlli mockati)

## Suggested Review Order

**La doppia difesa**

- Migrazione RLS — la vera autorità sull'upload, indipendente dal controllo applicativo. Policy rinominate (review fix, non più fuorvianti).
  [`20260818010000_logo_bucket_site_manager/migration.sql:16`](../../prisma/migrations/20260818010000_logo_bucket_site_manager/migration.sql#L16)

- Controllo applicativo esteso in coppia con la RLS — mai una sola delle due.
  [`logo/actions.ts:37`](../../app/app/(configurazione)/logo/actions.ts#L37)

- Stesso pattern per `salvaNomeSettoreAction`, senza RLS coinvolta.
  [`logo/actions.ts:105`](../../app/app/(configurazione)/logo/actions.ts#L105)

**Accesso alla rotta**

- `ruoliAmmessi` esteso — confronta con l'entry di `/app/impostazioni` poco sopra (Story 19.1, stesso pattern).
  [`route-guard.ts:233`](../../lib/auth/route-guard.ts#L233)

- Mirror obbligatorio per il test di coerenza con la guida in-app.
  [`contenuti.ts:207`](../../lib/guida/contenuti.ts#L207)

**Test (periferici)**

- Casi negativi aggiunti per l'AC della spec (Site Manager resta bloccato su `/app/admin`/`/app/gruppi`) — review fix, mancavano nel primo giro.
  [`route-decision.test.ts:428`](../../lib/auth/route-decision.test.ts#L428)

- Percorso FORBIDDEN aggiornato + nuovi casi di successo su entrambe le action.
  [`logo/actions.test.ts:79`](../../app/app/(configurazione)/logo/actions.test.ts#L79)
