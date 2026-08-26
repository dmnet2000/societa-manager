---
title: "Story 9.39: Normalizzazione in maiuscolo delle Atlete già esistenti in anagrafica"
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '69a468b3e93f4a0781bb2cfe542c33a757415923'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la Story 9.36 sanifica in maiuscolo solo le Atlete create da ora in poi — le righe `Atleta.nome` già esistenti prima di quella storia restano con la capitalizzazione originale, creando un'anagrafica permanentemente mista.

**Approach:** deciso in `epics.md` (Story 9.39): migrazione Prisma di soli dati, `UPDATE "atlete" SET "nome" = UPPER("nome")`, nessuna modifica di schema. Mirror del backfill già usato in Story 20.7 per `EdizioneTorneo.nome`.

## Boundaries & Constraints

**Always:** operazione idempotente — rieseguirla su righe già maiuscole non produce alcun cambiamento. Nessuna colonna diversa da `nome` toccata.

**Ask First:** l'applicazione effettiva in produzione (`prisma migrate deploy`) resta a carico dell'utente — nessuna istanza Supabase disponibile in questa sessione per eseguirla/verificarla dal vivo, stesso limite di ogni altra migrazione di questo progetto.

**Never:** questa storia non tocca `Allenatore.nome` (asimmetria nota e accettata, decisione esplicita dell'utente in fase di creazione storia) né alcuna colonna di `Atleta` diversa da `nome`. Nessuna modifica di schema — solo dati.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Riga con `nome` misto/minuscolo | `"Rossi Maria"` | diventa `"ROSSI MARIA"` | N/A |
| Riga già interamente maiuscola | `"ROSSI MARIA"` | invariata (idempotente) | N/A |
| Riga con accenti/lettere estese | `"città josé"` | `UPPER()` Postgres applicato, `"CITTÀ JOSÉ"` | N/A |

</frozen-after-approval>

## Code Map

- Nuova migrazione `prisma/migrations/20260826000000_uppercase_atlete_nome/migration.sql` -- unica istruzione `UPDATE "atlete" SET "nome" = UPPER("nome");`. Nessuna modifica a `prisma/schema.prisma` (nessun cambio di colonna/tipo).

## Tasks & Acceptance

**Execution:**
- [x] Nuova migrazione `prisma/migrations/20260826000000_uppercase_atlete_nome/migration.sql`

**Acceptance Criteria:** vedi `epics.md` Story 9.39 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-26.** Nessun finding ha richiesto di riaprire l'Intent (nessun `intent_gap`/`bad_spec`). Verification Gap Reviewer: nessun gap (nessun consumer dipende dal casing di `nome` per matching/confronto, sempre `codiceFiscale`). Patch applicata:
- Aggiunta `WHERE "nome" <> UPPER("nome")` alla `UPDATE` (segnalato da Edge Case Hunter e Blind Hunter): evita di riscrivere righe già invariate, stesso risultato finale, nessun costo.

Finding scartati/derogati (in `deferred-work.md`): dipendenza da locale/collation di `UPPER()` per caratteri accentati (convergenza forte, 2 reviewer su 3 — non corretta alla cieca con una `COLLATE` non verificata, mitigata con verifica manuale esplicita post-deploy); `updatedAt` non aggiornato da questa migrazione SQL grezza (stessa caratteristica di ogni altra migrazione dati di questo progetto, non introdotta qui). Scartati come già decisi/fuori scope: confronto con il precedente di Story 20.7 (nitpick sulla natura del precedente, non sulla correttezza), asimmetria di casing con `Allenatore` (scelta esplicita dell'utente via `AskUserQuestion`), sovrascrittura silenziosa da un futuro re-import federale (già deferito in Story 9.36), nessun vincolo RLS specifico (stessa assunzione AD-9 già alla base di ogni migrazione di questo progetto), nessuna guida operativa su durata/lock (sproporzionato per la scala di questa tabella).

Riverificato dopo la patch: `npx prisma validate` (schema valido).

## Design Notes

**Perché una migrazione solo-dati e non uno script separato:** ogni altra modifica strutturale/di dati di questo progetto passa da `prisma/migrations` (AD-3), mai uno script ad-hoc eseguito a mano fuori da quel meccanismo — stessa disciplina già seguita per il backfill di `EdizioneTorneo.nome` (Story 20.7).

**Perché nessun controllo preventivo "solo dove non è già maiuscolo":** l'`UPDATE` incondizionato su `UPPER("nome")` è già naturalmente un no-op per le righe già maiuscole (stesso valore riscritto) - aggiungere un `WHERE nome <> UPPER(nome)` non cambierebbe il risultato, solo il numero di righe toccate riportato da Postgres, irrilevante qui.

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valido (nessuna modifica di schema in questa storia)
- `npx tsc --noEmit` -- expected: pulito (nessun file TypeScript toccato)
- `npm run lint` -- expected: 0 errori

**Manual checks (obbligatorio, da demandare all'utente — nessun ambiente Supabase disponibile in questa sessione):**
- Applicare la migrazione in produzione con `prisma migrate deploy`.
- Verificare a campione (query diretta o `/gruppi`) che le Atlete già esistenti mostrino ora il nome in maiuscolo, senza alcuna riga persa/alterata in altro modo.
- **Verifica mirata sui nomi con accenti/lettere estese** (es. "città", "José" se presenti in anagrafica): confermare che `UPPER()` di Postgres li abbia convertiti correttamente (es. "ò" → "Ò"), non solo le lettere ASCII semplici — comportamento dipendente dalla collation del database di produzione, non verificabile in questa sessione (vedi `deferred-work.md`).

## Suggested Review Order

- L'intera migrazione: `UPDATE` guardato con `WHERE` (no-op sulle righe già maiuscole), stessa convenzione "solo dati, via prisma/migrations" già in uso nel progetto.
  [`migration.sql`](<../../prisma/migrations/20260826000000_uppercase_atlete_nome/migration.sql>)
