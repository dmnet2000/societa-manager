---
title: "Story 20.16: Punti realizzati nei set e nuovo criterio di spareggio (quoziente set/punti) nella classifica di girone"
type: 'feature'
created: '2026-08-27'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '89c040e7c57dc0babc7e294e93d767114516096f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `calcolaClassificaGirone` (`lib/classifica-girone-torneo.ts`) ordina oggi per punti-classifica (3/2/1/0) desc, poi per **set vinti assoluti** desc, poi alfabetico — non somma mai i punti-set grezzi (`set1Casa`/`set1Ospite`/ecc., già su ogni `PartitaTorneo`) e non usa un quoziente come spareggio, a differenza della prassi pallavolistica reale richiesta dall'utente ("aggiungi anche i punti in classifica sommando i punti fatti nei vari set. in caso di parità di quoziente set si valuta il quoziente punti").

**Approach:** aggiungere a `RigaClassifica` due nuovi totali (`puntiFatti`/`puntiSubiti`, somma dei punteggi-set grezzi), esposti in due nuove colonne "Punti fatti"/"Punti subiti" (dopo "Set persi") in entrambe le tabelle classifica di girone (pubblica e admin). Sostituire il secondo criterio di ordinamento (set vinti assoluti) con il **quoziente set** (`setVinti / setPersi`), aggiungere il **quoziente punti** (`puntiFatti / puntiSubiti`) come terzo criterio a ulteriore parità, prima del fallback alfabetico invariato. Un denominatore zero rende il quoziente `Infinity` (nessun errore di divisione, la squadra si posiziona in cima al gruppo di spareggio per quel criterio).

## Boundaries & Constraints

**Always:** l'ordinamento primario (punti-classifica desc) e il fallback alfabetico finale restano esattamente gli stessi. `calcolaClassificaFinale` (`lib/classifica-finale-torneo.ts`) non viene toccata — usa solo chi ha vinto l'incontro (`setVintiCasa > setVintiOspite`), nessun criterio di spareggio in comune con `calcolaClassificaGirone`.

**Ask First:** risolto in fase di pianificazione (AskUserQuestion) — due colonne separate "Punti fatti"/"Punti subiti" (mirror di "Set vinti"/"Set persi"), non una colonna combinata. Denominatore zero (`setPersi === 0` o `puntiSubiti === 0`, incluso il caso "nessuna partita giocata", `0/0`) → quoziente `Infinity`, mai `NaN`.

**Never:** nessuna modifica a `calcolaClassificaFinale`/al tabellone semifinali-finali. Nessuna modifica al criterio primario (punti-classifica) né al fallback alfabetico finale. Nessuna modifica alla colonna "Punti" di classifica esistente (resta il punteggio 3/2/1/0, invariata) — le nuove colonne hanno etichette distinte.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Parità di punti-classifica, quozienti set diversi | es. A: 4 set vinti/1 perso, B: 3/2 | A prima di B (quoziente set 4.0 > 1.5) | N/A |
| Parità di punti-classifica E quoziente set, quozienti punti diversi | es. A e B stesso quoziente set, A ha più punti-set fatti/subiti proporzionalmente | ordinamento deciso dal quoziente punti | N/A |
| Squadra con `setPersi = 0` (tutte le partite vinte 2-0) | `setVinti=6, setPersi=0` | quoziente set = `Infinity`, la squadra si posiziona in cima al gruppo di spareggio per quel criterio | N/A |
| Squadra senza alcuna partita giocata | `setVinti=0, setPersi=0, puntiFatti=0, puntiSubiti=0` | entrambi i quozienti `Infinity`, ma il criterio primario (punti-classifica=0) la separa già dalle squadre con risultati reali — ricade nel fallback alfabetico tra pari a 0 partite | N/A |
| Parità anche di quoziente punti | quozienti set e punti identici | fallback alfabetico invariato (Story 20.3) | N/A |

</frozen-after-approval>

## Code Map

- `lib/risultato-partita-torneo.ts` -- `EsitoPartita` (riga 88): aggiungere `puntiFattiCasa: number; puntiFattiOspite: number;` (somma dei punteggi-set grezzi, es. `set1Casa+set2Casa+(set3Casa ?? 0)`). `esitoPartita()` (riga 99): calcolarli sommando `s.casa`/`s.ospite` sull'array `set` già costruito (stesso loop che già calcola `setVintiCasa`/`setVintiOspite`, righe 106-114) — nessuna nuova validazione, `esitoPartita` non richiama `risultatoValido` (invariato). Nessun'altra funzione del file toccata (`formattaRisultatoPartitaTorneo` continua a destrutturare solo i campi che già usa, l'aggiunta è puramente additiva).
- `lib/classifica-girone-torneo.ts` -- `RigaClassifica` (riga 10): aggiungere `puntiFatti: number; puntiSubiti: number;`, inizializzati a `0` nel `Map` iniziale (riga 31-37). Nel loop (righe 40-68): destrutturare anche `puntiFattiCasa`/`puntiFattiOspite` da `esitoPartita(...)`, accumulare `rigaCasa.puntiFatti += puntiFattiCasa; rigaCasa.puntiSubiti += puntiFattiOspite;` (e simmetrico per `rigaOspite`). Sort (righe 74-78): sostituire il secondo criterio (`b.setVinti - a.setVinti`) con quoziente set (`setPersi === 0 ? Infinity : setVinti/setPersi`, decrescente), aggiungere un terzo criterio quoziente punti (`puntiSubiti === 0 ? Infinity : puntiFatti/puntiSubiti`, decrescente) prima del fallback alfabetico esistente (invariato, ultima riga). Confrontare per disuguaglianza prima di sottrarre (`Infinity !== Infinity` è `false`, evita `Infinity - Infinity = NaN` quando entrambe le squadre hanno denominatore zero).
- `app/torneo/page.tsx:274` -- dopo `<th>Set persi</th>`, aggiungere `<th>Punti fatti</th><th>Punti subiti</th>`; dopo `<td>{riga.setPersi}</td>` (riga ~284), aggiungere `<td>{riga.puntiFatti}</td><td>{riga.puntiSubiti}</td>`.
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx:168` -- stessa identica aggiunta di due `<th>`/due `<td>`, stessa posizione.
- Nessun altro file toccato (`calcolaClassificaFinale` non importa `RigaClassifica` né riusa il criterio di spareggio, verificato).

## Tasks & Acceptance

**Execution:**
- [x] `lib/risultato-partita-torneo.ts` -- `EsitoPartita`/`esitoPartita()` -- somma punti-set grezzi (fatti/subiti) per squadra
- [x] `lib/classifica-girone-torneo.ts` -- `RigaClassifica` + accumulo + nuovo ordinamento (quoziente set, poi quoziente punti, poi alfabetico) + test degli edge case della matrice I/O
- [x] `app/torneo/page.tsx` -- 2 nuove colonne "Punti fatti"/"Punti subiti" nella tabella classifica pubblica
- [x] `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx` -- stessa aggiunta nella tabella classifica admin

**Acceptance Criteria:** vedi `epics.md` Story 20.16 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-27.** Verification Gap Reviewer: nessun gap (tutti e 5 i casi della matrice I/O coperti da test, `calcolaClassificaFinale` confermato non toccato/non affetto).

**Caso limite riportato all'utente (non un `bad_spec`/`intent_gap` in senso stretto, ma una conseguenza della regola già approvata non esplicitamente esaminata prima)** — Edge Case Hunter: una squadra senza alcuna partita giocata (quoziente `Infinity` per denominatore zero) si posiziona, nello spareggio, DAVANTI a una squadra che ha giocato e perso tutte le partite 0-2 (anch'essa a 0 punti-classifica, ma con quoziente reale basso, non `Infinity`) — la riga della spec Intent "il criterio primario la separa già dalle squadre con risultati reali" era imprecisa: non copre il caso di una squadra reale con lo stesso punteggio-classifica 0. Sottoposto esplicitamente all'utente (AskUserQuestion): confermato **nessuna modifica** — comportamento accettato così com'è (caso raro, si autocorregge appena la squadra gioca la prima partita).

**PATCH (applicati, entrambi reali, nessun impatto sull'ordinamento)**:
1. Blind Hunter: la guida in-app (`lib/guida/contenuti.ts`, voce "Torneo") non menzionava le nuove colonne né il nuovo criterio di spareggio — violazione della regola permanente del progetto ("aggiornare la guida in-app ad ogni modifica"), non prevista nel Code Map originale. Aggiornata la voce "Risultati e classifica" con le due nuove colonne e l'ordine di spareggio (punti-classifica → quoziente set → quoziente punti → nome).
2. Blind Hunter: `scope="col"` mancante su TUTTE le intestazioni `<th>` di entrambe le tabelle classifica (pubblica e admin) — incoerente con `.tabellaSquadreGironi` (Story 20.15), che già lo usa. Aggiunto a tutte le 7 intestazioni di entrambe le tabelle (non solo alle 2 nuove, per coerenza dell'intera riga).

**DEFER** (reale ma fuori dai Boundaries stretti di questa storia, aggiunto a `deferred-work.md`): `.tabellaClassifica` passata da 5 a 7 colonne senza `overflow-x`/regola dedicata nel breakpoint mobile esistente — nessuna delle due tabelle aveva già un wrapper di scroll orizzontale prima di questa storia (gap pre-esistente, solo aggravato).

Finding scartati (già decisi esplicitamente in fase di pianificazione, o fuori scope): colonna "Punti fatti"/"Punti subiti" ambigua accanto a "Punti" esistente (etichette letteralmente distinte, richiesta AC soddisfatta, distinzione visiva aggiuntiva mai richiesta); quoziente non mostrato in tabella (solo i totali grezzi sono richiesti dall'AC, stesso pattern già in uso per Set vinti/Set persi); nessuna regola di validazione sui punteggi-set grezzi (boundary "Never" pre-esistente di Story 20.3, non introdotto qui); naming `puntiCasa`/`puntiFattiCasa` simili (naming già approvato al checkpoint, commenti già presenti a chiarire la distinzione); nessuna copia esplicativa sul cambio di criterio (fuori scope, nessuna story precedente in questa epica introduce testo di changelog in-app).

Riverificato dopo le patch: `npx vitest run` (120 file, 1857 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti).

## Design Notes

**Perché la somma dei punti-set vive in `esitoPartita` e non in `calcolaClassificaGirone`:** `esitoPartita` è già l'unica fonte di verità per derivare qualunque valore aggregato da un risultato validato (set vinti, punti-classifica) — sommare anche i punti-set grezzi lì evita di duplicare il loop sull'array `set`/la gestione del terzo set opzionale, stessa disciplina DRY già documentata nel file.

**Perché confronto per disuguaglianza prima della sottrazione nel comparator:** `Infinity - Infinity` produce `NaN`, che romperebbe silenziosamente `Array.sort` se entrambe le squadre a confronto avessero denominatore zero sullo stesso criterio — verificare `!==` prima (dove `Infinity !== Infinity` è `false`) fa cadere correttamente al criterio successivo invece di propagare `NaN`.

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`

**Manual checks (obbligatorio, da demandare all'utente dopo il deploy — stesso vincolo di ogni story di questa epica, dev locale rotto):** verificare le due nuove colonne su entrambe le tabelle (pubblica e admin) con dati reali; verificare che una squadra con tutte le vittorie 2-0 (set persi = 0) si posizioni in cima al proprio gruppo di spareggio invece di generare un errore o un ordinamento incoerente.

## Suggested Review Order

**Calcolo — fonte di verità**

- Somma dei punti-set grezzi, stesso loop che già calcola i set vinti.
  [`risultato-partita-torneo.ts:97`](<../../lib/risultato-partita-torneo.ts#L97>)

- Accumulo per squadra + nuovo comparator (quoziente set → quoziente punti → alfabetico), guardia `Infinity` contro `NaN`.
  [`classifica-girone-torneo.ts:93`](<../../lib/classifica-girone-torneo.ts#L93>)

**Adozione alle 2 viste**

- Colonne "Punti fatti"/"Punti subiti" + `scope="col"` (review fix) sulla tabella pubblica.
  [`page.tsx:270`](<../../app/torneo/page.tsx#L270>)

- Stessa aggiunta sulla tabella admin.
  [`risultati/page.tsx:161`](<../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx#L161>)

**Peripherals**

- Guida in-app aggiornata (review fix).
  [`contenuti.ts:448`](<../../lib/guida/contenuti.ts#L448>)

- Copertura test dei 5 casi della matrice I/O.
  [`classifica-girone-torneo.test.ts:184`](<../../lib/classifica-girone-torneo.test.ts#L184>)
