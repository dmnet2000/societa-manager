---
title: 'Story 10.9: Raggruppamento tabellare delle Partite per Gruppo, a scomparsa'
type: 'feature'
created: '2026-09-04'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Story 10.9: Raggruppamento tabellare delle Partite per Gruppo, a scomparsa

## Intent

**Problem:** `/app/partite` (Story 10.3) raggruppa le Partite SOLO per settimana - un Admin/Dirigente/Allenatore con più Gruppi vede le Partite di più Gruppi mescolate in ogni tabella settimanale, senza un modo per vedere tutte le Partite di UN Gruppo raccolte insieme.

**Approach:** nuova sezione aggiuntiva (mai sostitutiva della vista per settimana) con un bottone a scomparsa per Gruppo, mirror di `TabellaIncontriCategoria.tsx` (Story 20.19, torneo pubblico) per la meccanica disclosure - rivela una tabella con tutte le Partite di quel Gruppo nell'intera stagione, ordinate cronologicamente. Visibile solo quando le Partite mostrate appartengono a più di un Gruppo (per Atleta/Genitore/Allenatore mono-Gruppo la condizione discende naturalmente dai dati già filtrati, nessun controllo esplicito sul Ruolo).

## Suggested Review Order

**Raggruppamento (funzione pura)**

- Entry point: raggruppa le Partite per Gruppo, ordinando i gruppi per `Gruppo.ordine` (poi nome come spareggio) - stesso criterio già scelto dal Site Manager altrove (Story 19.15).
  [`raggruppa-partite-per-gruppo.ts:21`](../../lib/raggruppa-partite-per-gruppo.ts#L21)

- Review fix (Blind Hunter): ordinamento alfabetico iniziale sostituito con `Gruppo.ordine` - non consultava il criterio di ordinamento già stabilito nel progetto, e non era numeric-aware ("Under 13" prima di "Under 9").
  [`raggruppa-partite-per-gruppo.ts:18`](../../lib/raggruppa-partite-per-gruppo.ts#L18)

**Componente disclosure**

- `TabellaPartiteGruppo`: bottone + tabella nascosta di default, mirror della meccanica di `TabellaIncontriCategoria.tsx` (Story 20.19) - non del suo stile (registro secondario di questa pagina, non il bottone primario pubblico).
  [`TabellaPartiteGruppo.tsx:35`](../../app/app/(partite-campionati)/partite/TabellaPartiteGruppo.tsx#L35)

- Review fix (Blind Hunter): `scope="col"` aggiunto alle intestazioni, mancante rispetto al componente mirror.
  [`TabellaPartiteGruppo.tsx:69`](../../app/app/(partite-campionati)/partite/TabellaPartiteGruppo.tsx#L69)

**Wiring nella pagina**

- Sezione condizionale: compare solo quando le Partite visibili appartengono a più di un Gruppo (AC #4, derivato dai dati, nessun controllo esplicito sul Ruolo).
  [`page.tsx:170`](../../app/app/(partite-campionati)/partite/page.tsx#L170)

- `gruppo.ordine` aggiunto alla query esistente (necessario per l'ordinamento sopra).
  [`page.tsx:156`](../../app/app/(partite-campionati)/partite/page.tsx#L156)

**Stili**

- Review fix (Blind Hunter): nuova classe `.sezionePerGruppo` dedicata - la prima stesura riusava `.settimana`, un nome che non descriveva più la sezione.
  [`partite.module.css:27`](../../app/app/(partite-campionati)/partite/partite.module.css#L27)
