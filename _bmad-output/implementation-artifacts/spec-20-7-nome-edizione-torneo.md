---
title: "Story 20.7: Nome dell'Edizione del Torneo"
type: 'feature'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '53cbe1cb8b18b4f55e07aa156f3490a2ccae0194'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `EdizioneTorneo` ha oggi solo `anno` - due Edizioni si distinguono solo per l'anno, nessun modo di dare un nome proprio (es. dedicato a una persona/sponsor).

**Approach:** nuovo campo `nome String` (obbligatorio, deciso con l'utente via AskUserQuestion) su `EdizioneTorneo`. Backfill "Torneo Memorial" per le Edizioni esistenti (nome dell'epica stessa). Mostrato insieme all'Anno ovunque oggi compare "Edizione {anno}".

## Boundaries & Constraints

**Always:** `nome` obbligatorio (non vuoto dopo trim) in creazione - stessa disciplina già in uso per `CategoriaTorneo.nome`/`SquadraTorneo.nome` (solo verifica di non-vuoto, nessun limite di lunghezza server-side).

**Ask First:** nessuna - già chiarito con l'utente.

**Never:** nessun vincolo di unicità su `nome` (solo `anno` resta `@unique`, invariato). Nessuna azione di modifica per un'Edizione esistente - stesso trattamento di `anno` (immutabile dopo la creazione, solo creazione/cancellazione esistono per `EdizioneTorneo`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Creazione Edizione con nome vuoto | `nome=""` | rifiutata | `VALIDATION` |
| Edizioni esistenti al momento della migrazione | nessun `nome` pregresso | backfill "Torneo Memorial" | N/A |
| Due Edizioni con lo stesso Nome ma anni diversi | es. entrambe "Memorial" | accettate entrambe (nessun vincolo su nome) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `EdizioneTorneo.nome String`
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_nome_edizione_torneo/migration.sql` -- `ADD COLUMN nome TEXT NOT NULL DEFAULT 'Torneo Memorial'` poi `ALTER COLUMN nome DROP DEFAULT` (backfill immediato via DEFAULT, poi rimosso perché le nuove Edizioni devono specificarlo esplicitamente)
- `lib/torneo.ts` -- `creaEdizioneTorneo(anno: number, nome: string)` firma estesa
- `app/app/(torneo)/torneo/actions.ts` -- `creaEdizioneTorneoAction` valida `nome` (obbligatorio) e lo passa a `creaEdizioneTorneo`
- `app/app/(torneo)/torneo/NuovaEdizioneTorneoForm.tsx` -- nuovo campo "Nome"
- `app/app/(torneo)/torneo/page.tsx` -- colonna "Nome" nell'elenco Edizioni
- `app/app/(torneo)/torneo/[edizioneId]/page.tsx` -- titolo `"${edizione.nome} ${edizione.anno}"`
- `app/torneo/page.tsx` -- h1 pubblico aggiornato allo stesso formato

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione con backfill
- [x] `lib/torneo.ts` -- `creaEdizioneTorneo` esteso + test
- [x] `torneo/actions.ts` -- validazione + test
- [x] `NuovaEdizioneTorneoForm.tsx` + `page.tsx` (elenco) + `[edizioneId]/page.tsx` + `app/torneo/page.tsx`

**Acceptance Criteria:** vedi `epics.md` Story 20.7 (Given/When/Then, verbatim).

## Spec Change Log

**2026-08-25 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Patch applicate e riverificate:

- **PATCH** — convergenza Edge Case Hunter + Blind Hunter: `EliminaEdizioneTorneoForm.tsx` mostrava solo l'anno nel dialog di conferma e nell'`aria-label`, mai il nome - con più Edizioni che possono condividere lo stesso nome ma anni diversi (nessun vincolo di unicità su nome), l'Admin non aveva conferma di quale Edizione stesse cancellando. Aggiunto il nome a entrambi.
- **PATCH** — Blind Hunter (2 punti dimenticati): `VolantinoTorneoForm.tsx` (pagina interna) e `app/torneo/page.tsx` (pubblica) mostravano ancora solo l'anno/la stringa letterale "Torneo Memorial" nell'`alt` del volantino, mai il nome reale dell'Edizione. Propagato `edizioneNome` fino a entrambi i punti.
- **PATCH** — Blind Hunter: la guida in-app di `/app/torneo` non menzionava il nuovo campo Nome obbligatorio (regola di progetto: ogni story che tocca una funzionalità già documentata deve aggiornarne la guida). Aggiornata.
- **PATCH** — convergenza Edge Case Hunter + Blind Hunter: nessun limite di lunghezza server-side su `nome`, nonostante il form avesse `maxLength={100}` - un FormData manomesso poteva bypassarlo e salvare un nome arbitrariamente lungo, poi renderizzato senza troncamento in un `<h1>`. Aggiunto lo stesso limite (100) lato Server Action.
- **PATCH (test)** — Blind Hunter + Verification Gap Reviewer: aggiunti test per nome di soli spazi, per il comportamento di trim (mai verificato prima), per il limite di 100 caratteri (rifiutato/accettato al margine), e per la combinazione "anno invalido + nome vuoto" (documenta che l'errore sull'anno ha sempre priorità, coerente con l'ordine di validazione server nonostante nel form il campo Nome compaia visivamente prima di Anno).
- **DEFER** (loggati in `deferred-work.md`): rischio di sequenza migrazione/deploy per la colonna NOT NULL - stessa classe di rischio già presente per ogni altra colonna NOT NULL aggiunta in questa epica, non introdotta qui in particolare; `.trim()` non copre whitespace Unicode zero-width - stesso limite preesistente su CategoriaTorneo.nome/SquadraTorneo.nome.
- **REJECT**: ordinamento della tabella Edizioni rimasto per anno nonostante "Nome" sia ora la prima colonna (Blind Hunter) - nessun AC lo richiede, `anno` resta l'identificativo univoco storico (Story 20.1), cambiarlo è fuori scope. Assenza di test diretto sulle 3 pagine che renderizzano `edizione.nome` (Verification Gap Reviewer) - gap sistemico del progetto (nessuna pagina è mai stata testata direttamente), non specifico di questa storia.

Riverificato dopo le patch: `npx vitest run` (118 file, 1722 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti non correlati), `npm run build` (riuscita), `npx prisma validate` (schema valido).

## Verification

**Commands:**
- `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx prisma validate`
