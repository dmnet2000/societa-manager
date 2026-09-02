---
title: 'Story 21.1: Indice su Atleta.nome'
type: 'chore'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Story 21.1: Indice su Atleta.nome

## Intent

**Problem:** l'Advisor "Index Recommendations" di Supabase segnala un indice mancante su `atlete.nome` (miglioramento stimato 84.97%) - verificato nel codice che `lib/db-rls/atleta.ts` righe 82/110 (`elencaAtlete`/`elencaAtletePubbliche`) ordinano entrambe per `nome` senza alcun indice a supporto (solo `codiceFiscale @unique` esiste oggi sul modello `Atleta`).

**Approach:** aggiunto `@@index([nome])` al model `Atleta` (`prisma/schema.prisma`) + migrazione dedicata (`CREATE INDEX IF NOT EXISTS`). Nessuna modifica di comportamento applicativo - solo il piano di esecuzione di Postgres in lettura.

## Design Notes

**Perché un indice mono-colonna e non composito/covering:** questa story replica esattamente la raccomandazione misurata dell'Advisor Supabase (basata su statistiche reali `pg_stat_statements`), non un'ipotesi. Un indice composito (es. includendo `codiceFiscale`/`categoria`, lette anch'esse da `elencaAtlete`) non è supportato da alcuna segnalazione concreta - aggiungerne uno ora sarebbe un'ottimizzazione speculativa, fuori dalla regola di processo dell'Epic 21 ("partire dalla segnalazione... mai un audit generico a tappeto"). Riconsiderabile se una futura segnalazione Advisor lo richiedesse esplicitamente.

**Perché nessun `CONCURRENTLY` (deferred, non applicato):** `CREATE INDEX` prende un lock in scrittura per la durata della costruzione - alla scala di `atlete` (anagrafica di un'unica società sportiva, decine/centinaia di righe) il lock è dell'ordine dei millisecondi. Aggiungere `CONCURRENTLY` richiederebbe disabilitare il transaction-wrap della migrazione, non verificabile in questo ambiente (dev locale rotto) - vedi `deferred-work.md`.

## Verification

**Commands:**
- `npx prisma validate` -- expected: pulito
- `npx tsc --noEmit` / `npx vitest run` / `npm run lint` / `npm run build` -- expected: nessuna regressione (nessuna modifica di codice applicativo, solo schema/migrazione)

**Manual checks (obbligatorio, dopo il deploy):**
- Applicare la migrazione in produzione, poi verificare l'uso reale dell'indice via `pg_stat_user_indexes` (colonna `idx_scan` > 0 dopo un periodo di traffico normale) o `EXPLAIN ANALYZE` su una query che ordina `atlete` per `nome` - la stima dell'Advisor (84.97%) non garantisce che Postgres scelga effettivamente l'indice su una tabella ancora piccola.
- Non eseguibile in questa sessione (dev locale rotto, Prisma WASM/Windows).

## Suggested Review Order

- Entry point: nuovo indice sul model `Atleta`, mirror del pattern `@@map`/vincoli esistente.
  [`schema.prisma:126`](../../prisma/schema.prisma#L126)

- Migrazione (scritta a mano, dev locale rotto) - `IF NOT EXISTS` per idempotenza, nessun `CONCURRENTLY` (vedi Design Notes).
  [`20260901000000_add_index_atlete_nome/migration.sql:1`](../../prisma/migrations/20260901000000_add_index_atlete_nome/migration.sql#L1)

- Le due query che giustificano l'indice (invariate, nessuna modifica).
  [`atleta.ts:82`](../../lib/db-rls/atleta.ts#L82)
  [`atleta.ts:110`](../../lib/db-rls/atleta.ts#L110)
