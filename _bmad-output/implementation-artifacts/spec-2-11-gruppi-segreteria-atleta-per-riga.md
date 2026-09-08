---
title: 'Story 2.11: Vista Gruppi Segreteria - un Atleta per riga'
type: 'chore'
created: '2026-09-08'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

# Story 2.11: Vista Gruppi Segreteria - un Atleta per riga

## Intent

**Problem:** nel ramo di sola lettura per Segreteria di `/app/gruppi` (Story 2.10), le Atlete di ciascun Gruppo comparivano come un unico elenco unito da virgole in una sola cella - richiesta esplicita dell'utente di avere un'Atleta per riga.

**Approach:** la tabella ora genera una riga per ogni coppia Gruppo+Atleta (Nome/Categoria del Gruppo ripetuti su ogni riga), invece di una riga per Gruppo con l'elenco unito. Un Gruppo senza Atlete assegnate mostra comunque una riga con "–" (invariato).

## Suggested Review Order

- Generazione delle righe per Atleta invece che per Gruppo.
  [`page.tsx:213`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L213)

- Review fix (Blind Hunter): bordo tra righe dello stesso Gruppo soppresso (riusando il pattern già consolidato nel file per il ramo di gestione, `.rigaAtlete`/`.rigaAllenatori`), così il separatore visivo segnala solo il cambio di Gruppo.
  [`gruppi.module.css:34`](../../app/app/(gruppi-allenatori)/gruppi/gruppi.module.css#L34)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2051/2051 verdi

**Review a 3 livelli:** Blind Hunter ha trovato il gap sul bordo tra righe (corretto) e una piccola pulizia di codice (branch a zero Atlete semplificato, ordinamento reso deterministico con un secondo criterio). Altri findings (numero di maglia non mostrato, guida in-app, duplicazione di codice col ramo di gestione, assenza di test di rendering) sono fuori scope esplicito della story precedente (2.10) o coerenti con convenzioni già accettate nel progetto, non corretti. Edge Case Hunter e Verification Gap Reviewer non hanno trovato problemi.

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/app/gruppi` con un Utente Segreteria e un Gruppo con più Atlete: verificare una riga per Atleta, bordo solo tra Gruppi diversi.
