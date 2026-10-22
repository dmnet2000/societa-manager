---
title: 'Ruolo Direttore Tecnico e pagina Composizione gruppi'
type: 'feature'
created: '2026-10-22'
status: 'done'
baseline_commit: '407d6d965c431f9b12bb90cd6479cd9efc8547fa'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Il Direttore Tecnico deve vedere la composizione di tutti i Gruppi della stagione e, per ogni atleta, se è iscritta e se è tesserata. Oggi non esiste il ruolo, e `/app/gruppi` è una pagina di gestione riservata ad Admin, Dirigente e Segreteria.

**Approach:** Nuovo ottavo Ruolo `DIRETTORE_TECNICO`, assegnato dall'Admin da `/app/admin`, più una nuova pagina in sola lettura `/app/composizione-gruppi` visibile ad Admin e Direttore Tecnico. La pagina mostra ogni Gruppo dell'Anno Agonistico corrente con le sue atlete, i badge Iscritta/Tesserata (con le sigle delle Federazioni) e un riepilogo per Gruppo.

## Boundaries & Constraints

**Always:**
- Sola lettura: nessuna Server Action e nessun form nella nuova pagina.
- Atlete e Iscrizioni si leggono solo via client Supabase autenticato (`elencaAtlete`, `elencaIscrizioniPerAnno`), il Tesseramento solo via `lib/tesseramento.ts`, Gruppo e GruppoAtleta via Prisma.
- Le nuove policy RLS per `DIRETTORE_TECNICO` sono solo `FOR SELECT` (su `atlete` e `iscrizioni`), separate da quelle esistenti, che restano invariate.
- La migration dell'enum va in un file a sé, con il solo `ALTER TYPE ... ADD VALUE` (stesso vincolo di `20260818000000_add_site_manager_ruolo`).
- Aggiornare la guida in-app (`lib/guida/contenuti.ts`) con una voce per la nuova rotta.
- Il Direttore Tecnico accede anche alle rotte "per tutti i Ruoli" (`/app/guida`, `/app/sponsor`), come fatto per `SITE_MANAGER`.

**Ask First:**
- Dare al Direttore Tecnico accesso a qualunque altra rotta esistente, o a scritture.
- Mostrare dati anagrafici oltre al nome (CF, contatti, data di nascita).

**Never:**
- Modificare `/app/gruppi` o il suo perimetro di Ruoli.
- Rendere `DIRETTORE_TECNICO` selezionabile nell'auto-registrazione (`/registrati`).
- Leggere Atleta o Iscrizione con Prisma diretto a runtime.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Gruppo con 3 atlete: 2 iscritte, 1 tesserata FIPAV+CSI | Card del Gruppo con il riepilogo "3 atlete · 2 iscritte · 1 tesserata" e una riga per atleta con i badge "Iscritta" e "FIPAV", "CSI" | N/A |
| Atleta né iscritta né tesserata | Nessuna Iscrizione attiva e nessun Tesseramento | Badge "Non iscritta" e "Non tesserata" | N/A |
| Iscrizione esclusa | Iscrizione con `attiva=false` | Conta come non iscritta | N/A |
| Gruppo vuoto | Nessuna GruppoAtleta | Card con "Nessuna atleta assegnata" e riepilogo a 0 | N/A |
| Atleta rimossa | Riga GruppoAtleta di un'Atleta con `rimossaIl` valorizzato | Esclusa dall'elenco e dai conteggi | N/A |
| Nessun anno corrente | `trovaAnnoAgonisticoCorrente()` restituisce null | Messaggio "Nessun Anno Agonistico corrente" | N/A |
| Ruolo non ammesso | Dirigente/Segreteria/Allenatore su `/app/composizione-gruppi` | Redirect a `/app/non-autorizzato` (route guard) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma:26` -- enum `Ruolo`: aggiungere `DIRETTORE_TECNICO`.
- `prisma/migrations/20260818000000_add_site_manager_ruolo/migration.sql` -- modello della migration dell'enum.
- `prisma/migrations/20260716210000_add_iscrizione/migration.sql` -- formato delle policy: `(auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'RUOLO'`.
- `lib/ruoli.ts` -- `RUOLI_VALIDI`: fonte unica (parseRuoli, ordinamento utenti, checkbox di UtenteRow).
- `app/app/(amministrazione)/admin/NuovoUtenteForm.tsx:7`, `UtenteRow.tsx:~15` -- liste `RUOLI` con le etichette.
- `app/(onboarding-import)/registrati/actions.ts:37` -- `ETICHETTA_RUOLO: Record<Ruolo, string>` (esaustivo, tsc fallisce senza la nuova chiave). `registrati/page.tsx` NON va toccato.
- `lib/auth/route-guard.ts:102` -- `PROTECTED_ROUTES`: la nuova voce va subito dopo `/app/gruppi` (~riga 232); `DIRETTORE_TECNICO` va aggiunto anche a `/app/guida` e `/app/sponsor`.
- `app/app/(gruppi-allenatori)/gruppi/page.tsx:93-200` -- pattern di lettura da riusare (gruppi + gruppoAtleta via Prisma, `elencaAtlete`, `elencaIscrizioniPerAnno`, `etichetteTesseramentoPerAtleta`, `TitoloPagina` + `contenutoPerRotta`).
- `app/app/(amministrazione)/vista-dirigente/page.tsx` -- modello di una pagina in sola lettura organizzata a card per Gruppo.
- `lib/tesseramento.ts:56` -- `etichetteTesseramentoPerAtleta(annoId)`: Map da atletaId alle sigle.
- `lib/guida/contenuti.ts` -- `CONTENUTI_GUIDA`, voci per rotta con `ruoliAmmessi`.
- `lib/ruoli.test.ts`, `lib/auth/route-decision.test.ts` -- test da estendere.

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + `prisma/migrations/20261022000000_add_direttore_tecnico_ruolo/migration.sql` -- aggiungere il valore all'enum, con il solo `ALTER TYPE "Ruolo" ADD VALUE 'DIRETTORE_TECNICO';`.
- [x] `prisma/migrations/20261022010000_direttore_tecnico_select/migration.sql` -- policy `direttore_tecnico_select` FOR SELECT su `atlete` e `iscrizioni` (il GRANT SELECT ad `authenticated` esiste già).
- [x] `lib/ruoli.ts`, `NuovoUtenteForm.tsx`, `UtenteRow.tsx`, `registrati/actions.ts` -- aggiungere `DIRETTORE_TECNICO` con l'etichetta "Direttore tecnico".
- [x] `lib/auth/route-guard.ts` -- nuova rotta `/app/composizione-gruppi` (`["ADMIN", "DIRETTORE_TECNICO"]`, navLabel "Composizione gruppi") + `DIRETTORE_TECNICO` su `/app/guida` e `/app/sponsor`.
- [x] `app/app/(gruppi-allenatori)/composizione-gruppi/componi-gruppi.ts` (+ `.test.ts`) -- funzione pura: da gruppi, righe GruppoAtleta, atlete, set degli iscritti e mappa dei tesseramenti produce le card (atlete ordinate per nome, rimosse escluse, conteggi); test che coprono la matrice I/O.
- [x] `app/app/(gruppi-allenatori)/composizione-gruppi/page.tsx` + `composizione-gruppi.module.css` -- Server Component (`force-dynamic`) che legge i dati in parallelo, chiama la funzione e rende le card con badge e riepilogo; layout utilizzabile da mobile.
- [x] `lib/guida/contenuti.ts` -- voce `/app/composizione-gruppi` per ADMIN e DIRETTORE_TECNICO, più `DIRETTORE_TECNICO` nella voce `/app/sponsor`/Guida "per tutti i Ruoli".
- [x] `lib/ruoli.test.ts`, `lib/auth/route-decision.test.ts` -- test sul nuovo Ruolo e sul perimetro della rotta (consentita ad ADMIN e DIRETTORE_TECNICO, negata a DIRIGENTE).

**Acceptance Criteria:**
- Given un Admin su `/app/admin`, when assegna il ruolo "Direttore tecnico" a un Utente, then quell'Utente, al login, vede nel menu "Composizione gruppi", "Guida" e "Sponsor".
- Given un Direttore Tecnico, when apre `/app/composizione-gruppi`, then vede tutti i Gruppi dell'anno corrente con atlete, badge e riepilogo, popolati con i dati reali (le policy RLS lo consentono).
- Given un Direttore Tecnico, when prova `/app/gruppi` o un'altra rotta di gestione, then viene reindirizzato a `/app/non-autorizzato`.

## Design Notes

L'Admin vede la pagina ma la policy RLS esistente lo copre già: le nuove policy servono solo al Direttore Tecnico. Un Utente può cumulare DIRETTORE_TECNICO con altri Ruoli: le policy sono OR, quindi nessun conflitto.

## Verification

**Commands:**
- `npx prisma generate && npx tsc --noEmit` -- expected: nessun errore (se ci sono errori dentro `.next/dev/types`, eseguire `rm -rf .next`).
- `npx vitest run lib/ruoli.test.ts lib/auth "app/app/(gruppi-allenatori)/composizione-gruppi"` -- expected: tutti verdi.
- `npx vitest run` -- expected: nessuna regressione.

**Manual checks:**
- Dopo il deploy delle migration: un utente con solo DIRETTORE_TECNICO vede le card popolate e non gli elenchi vuoti (un elenco vuoto indica una policy RLS mancante).

## Suggested Review Order

**Autorizzazione del nuovo Ruolo**

- Policy RLS di sola lettura per il DT, sommate in OR a quelle esistenti.
  [`migration.sql:8`](../../prisma/migrations/20261022010000_direttore_tecnico_select/migration.sql#L8)

- Nuova rotta Admin + DT, separata da /app/gruppi.
  [`route-guard.ts:240`](../../lib/auth/route-guard.ts#L240)

- Enum in migration a sé (vincolo ADD VALUE di Postgres).
  [`migration.sql:6`](../../prisma/migrations/20261022000000_add_direttore_tecnico_ruolo/migration.sql#L6)

**Pagina Composizione gruppi**

- Letture parallele: Prisma per Gruppi, RLS per Atlete/Iscrizioni, lib/tesseramento.
  [`page.tsx:46`](../../app/app/(gruppi-allenatori)/composizione-gruppi/page.tsx#L46)

- Join in memoria puro, rimosse escluse, conteggi per Gruppo.
  [`componi-gruppi.ts:26`](../../app/app/(gruppi-allenatori)/composizione-gruppi/componi-gruppi.ts#L26)

**Assegnazione del Ruolo e guida**

- Fonte unica dei Ruoli validi.
  [`ruoli.ts:11`](../../lib/ruoli.ts#L11)

- Checkbox in /app/admin (anche NuovoUtenteForm).
  [`UtenteRow.tsx:23`](../../app/app/(amministrazione)/admin/UtenteRow.tsx#L23)

- Voce guida della nuova pagina.
  [`contenuti.ts:175`](../../lib/guida/contenuti.ts#L175)

**Test**

- Menu completo del solo DT.
  [`voci-navigazione.test.ts:87`](../../lib/auth/voci-navigazione.test.ts#L87)

- Auto-registrazione forzata del DT resta attivo:false.
  [`actions.test.ts:1155`](../../app/(onboarding-import)/registrati/actions.test.ts#L1155)
