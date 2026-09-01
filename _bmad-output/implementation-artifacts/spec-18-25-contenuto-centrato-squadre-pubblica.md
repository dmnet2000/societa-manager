---
title: 'Story 18.25: Contenuto centrato nella pagina pubblica /squadre'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Story 18.25: Contenuto centrato nella pagina pubblica /squadre

## Intent

**Problem:** il contenuto di `/squadre` si estende a piena larghezza su schermi larghi - `.main` non ha alcun `max-width`, a differenza di `/torneo` (Story 20.14), che infatti aveva lasciato esplicitamente fuori scope proprio `/calendario`/`/squadre` ("nessun retrofit").

**Approach:** stesso identico trattamento già applicato a `/torneo` (`max-width: 1000px; margin: 0 auto;` su `.main`), aggiunto SOLO a `app/squadre/squadre.module.css` - `/calendario` resta esplicitamente a piena larghezza, invariato (scope confermato con l'utente via `AskUserQuestion`).

## Suggested Review Order

- Entry point: `.main` guadagna `max-width`/`margin: 0 auto`, mirror esatto di `/torneo`.
  [`squadre.module.css:24`](../../app/squadre/squadre.module.css#L24)

- Commento gemello in `torneo-pubblico.module.css` aggiornato per restare accurato (review fix, Blind Hunter: la prima stesura affermava erroneamente che `/calendario` fosse l'unica pagina rimasta a piena larghezza, ignorando `/staff`/`/contatti`).
  [`torneo-pubblico.module.css:13`](../../app/torneo/torneo-pubblico.module.css#L13)
