---
title: 'Story 20.19: Vista tabellare di tutti gli incontri di una Categoria su /torneo'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Story 20.19: Vista tabellare di tutti gli incontri di una Categoria su /torneo

## Intent

**Problem:** la pagina pubblica `/torneo` mostra oggi gli incontri di ogni Categoria solo come griglia grafica di match-card (una sezione per Girone, una per il Tabellone semifinali/finali) - nessun modo di vedere in un colpo d'occhio tutte le Gare di una Categoria insieme, in forma compatta.

**Approach:** nuovo componente client `TabellaIncontriCategoria` - un pulsante per Categoria che rivela (nascosta di default) una tabella unica con tutti gli incontri della Categoria (Gironi + Semifinali + Finali insieme, ordinati per numero di Gara), senza mai sostituire la griglia grafica esistente sopra di essa. Due funzioni pure estratte come unica fonte di verità (`etichettaFasePartitaTorneo`, `formattaSlotTestoBreve`) e riusate anche dalla griglia grafica preesistente.

## Suggested Review Order

**Componente nuovo: pulsante + tabella**

- Entry point: stato mostra/nascondi indipendente per Categoria, nome accessibile che include il nome della Categoria (review fix, Blind Hunter - senza, ogni istanza avrebbe lo stesso nome accessibile ambiguo per screen reader).
  [`TabellaIncontriCategoria.tsx:36`](../../app/torneo/TabellaIncontriCategoria.tsx#L36)

- `aria-controls`/`useId` collegano il pulsante alla regione che rivela (review fix, Blind Hunter).
  [`TabellaIncontriCategoria.tsx:44`](../../app/torneo/TabellaIncontriCategoria.tsx#L44)
  [`TabellaIncontriCategoria.tsx:65`](../../app/torneo/TabellaIncontriCategoria.tsx#L65)

- Montaggio nella pagina, subito dopo l'etichetta della settimana e prima della griglia grafica di ogni Categoria.
  [`page.tsx:225`](../../app/torneo/page.tsx#L225)

**Funzioni pure estratte (riusate da griglia + tabella)**

- Etichetta "Fase/Girone" di un incontro (Girone/Semifinale/Finale) - unica fonte di verità, prima duplicata implicitamente tra le due sezioni grafiche.
  [`etichetta-fase-partita-torneo.ts:14`](../../lib/etichetta-fase-partita-torneo.ts#L14)

- Testo breve di uno Slot (etichetta/data/ora/palestra/campo) - estratto da `MetaSlot` (`app/torneo/page.tsx`), ora riusato anche dalla nuova tabella.
  [`formatta-slot-torneo.ts:19`](../../lib/formatta-slot-torneo.ts#L19)

- `MetaSlot` aggiornato per usare la funzione estratta invece della JSX inline originale.
  [`page.tsx:28`](../../app/torneo/page.tsx#L28)

**Stile**

- Pulsante con touch target 44px esplicito (review fix, Blind Hunter - lezione già nota nel progetto: il solo padding verticale non basta).
  [`torneo-pubblico.module.css:123`](../../app/torneo/torneo-pubblico.module.css#L123)

- Tabella con wrapper di scroll orizzontale dedicato fin da subito (a differenza delle tabelle preesistenti della pagina, gap noto e deferred).
  [`torneo-pubblico.module.css:169`](../../app/torneo/torneo-pubblico.module.css#L169)

**Peripherals**

- Test delle due funzioni pure estratte (nessun test di rendering per il componente - stessa convenzione già confermata più volte nel progetto).
  `lib/etichetta-fase-partita-torneo.test.ts`, `lib/formatta-slot-torneo.test.ts`
