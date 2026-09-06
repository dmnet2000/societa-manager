---
title: 'Story 20.23: Ordinamento per data/ora Slot della vista tabellare incontri'
type: 'feature'
created: '2026-09-06'
status: 'done'
route: 'one-shot'
---

# Story 20.23: Ordinamento per data/ora Slot della vista tabellare incontri

## Intent

**Problem:** sulla pagina pubblica `/torneo`, la "vista tabellare completa" di una Categoria (`TabellaIncontriCategoria.tsx`, Story 20.19) mostrava tutti gli incontri (Gironi+Semifinali+Finali) ordinati per numero di Gara - verificato dal vivo dall'utente che questo non corrisponde all'ordine cronologico reale degli Slot assegnati, a differenza delle griglie Girone/Semifinali della stessa pagina (già corrette da Story 20.17).

**Approach:** riusare `ordinaPartitePerSlot` (funzione pura già esistente e testata, `lib/ordina-partite-per-slot.ts`) anche al punto di chiamata di `TabellaIncontriCategoria` in `app/torneo/page.tsx`, esattamente come già fatto per le griglie Girone/Semifinali - nessuna modifica alla funzione stessa né al componente della tabella, che continua a renderizzare l'array nell'ordine ricevuto.

## Suggested Review Order

- Entry point: `partiteTabellaCompleta` calcolata una volta per Categoria, riusando la stessa funzione già in uso per le griglie sottostanti.
  [`page.tsx:207`](../../app/torneo/page.tsx#L207)

- Punto di consumo: la tabella riceve l'array già ordinato, invariata nella sua logica di rendering.
  [`page.tsx:220`](../../app/torneo/page.tsx#L220)

- Commento aggiornato per riflettere che l'ordine ora arriva dal chiamante (Story 20.23), non più "per numero di Gara" come all'origine della Story 20.19.
  [`TabellaIncontriCategoria.tsx:26`](../../app/torneo/TabellaIncontriCategoria.tsx#L26)
