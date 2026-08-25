---
title: "Story 20.4: Tabellone semifinali/finali e classifica finale"
type: 'feature'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '5592f062d3f810ff546e316245ed4a2e460a5dc3'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** una volta completi i gironi (Story 20.3), non esiste alcun modo di generare le semifinali/finali di posizionamento (1°-4° e 5°-8°) né una classifica finale 1°-8° - il torneo si ferma alla classifica di girone.

**Approach:** deciso in `epics.md` (Story 20.4, regolamento 2026-08-23): riusa `PartitaTorneo` (Story 20.3) estesa con `fase` (GIRONE|SEMIFINALE|FINALE_VINCENTI|FINALE_PERDENTI, default GIRONE - nessuna migrazione dati per le righe esistenti) e `tabellone` (POSIZIONI_1_4|POSIZIONI_5_8, nullo per GIRONE). Le semifinali sono generate da un'azione esplicita a partire dalla classifica di girone; le finali sono generate **automaticamente** quando entrambe le semifinali dello stesso tabellone hanno un risultato (AC di epics.md, non un'azione manuale separata). `salvaRisultatoPartitaTorneoAction` (Story 20.3, riusata invariata per la validazione/scrittura del punteggio) resta l'unico punto che scrive un risultato, per qualunque fase.

## Boundaries & Constraints

**Always:** `fase`/`tabellone` seguono le stesse convenzioni enum del progetto (mirror `SettimanaTorneo`/`GironeTorneo`). Il tabellone (le 4 semifinali) è generato **una sola volta** per Categoria (idempotente: rifiutato se esistono già `PartitaTorneo` con `fase !== GIRONE`), e solo quando **la classifica di entrambi i gironi è completa** (ogni `PartitaTorneo` di fase GIRONE ha un risultato) - altrimenti rifiutato con errore esplicito. Genera il tabellone richiede **almeno 4 Squadre per girone** (serve un 4° posto per il tabellone 5°-8°) - altrimenti rifiutato con errore esplicito, decisione presa qui perché `epics.md` non la specifica esplicitamente (il minimo di 20.2 resta 2). La generazione delle finali (side-effect di `salvaRisultatoPartitaTorneoAction` su una SEMIFINALE) si basa **sempre su una rilettura server-side della `PartitaTorneo` appena salvata** (mai su un campo `fase`/`tabellone` inviato dal client) - stessa disciplina "mai fidarsi del client per lo scoping" già applicata ripetutamente in questa epica. Le semifinali/finali sono al meglio dei 3 set, stessa `risultatoValido`/`esitoPartita` delle partite di girone - nessuna seconda implementazione. La classifica finale (1°-8°) resta calcolata al volo, mai persistita, stesso principio di `calcolaClassificaGirone`.

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`/`epic-20-context.md`, salvo il minimo di 4 Squadre per girone sopra (deciso qui per necessità strutturale, non un vero punto aperto).

**Never:** nessuna sezione pubblica qui (Story 20.6). Nessuna generazione manuale delle finali (sempre automatica, mai un'azione separata da esporre). Nessun incrocio diverso da quello letterale dell'AC (1°A-2°B/1°B-2°A per il tabellone 1°-4°, 3°A-4°B/3°B-4°A per il 5°-8°).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Dirigente genera il tabellone con entrambi i gironi completi (≥4 Squadre ciascuno) | classifica di girone completa | 4 semifinali create (2 per tabellone) | N/A |
| Admin/Dirigente genera il tabellone con un girone incompleto | almeno un incontro di girone senza risultato | rifiutato | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente genera il tabellone con un girone a <4 Squadre | girone A o B con meno di 4 Squadre | rifiutato | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente rigenera un tabellone già generato | `PartitaTorneo` con `fase !== GIRONE` già esistenti | rifiutato | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente salva il risultato della 2ª semifinale di un tabellone (la 1ª ha già un risultato) | entrambe le semifinali dello stesso tabellone complete | le 2 finali di quel tabellone vengono create automaticamente | N/A |
| Admin/Dirigente salva il risultato di una semifinale quando l'altra dello stesso tabellone non ha ancora un risultato | solo una semifinale completa | nessuna finale generata (nessun errore, solo nessun side-effect) | N/A |
| Un Visitatore ipotetico consulta la classifica finale prima che tutte le finali siano complete | tabellone incompleto | classifica finale non mostrata/non calcolabile | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo enum `FaseTorneo { GIRONE SEMIFINALE FINALE_VINCENTI FINALE_PERDENTI }` (mirror `GironeTorneo`); nuovo enum `TabelloneTorneo { POSIZIONI_1_4 POSIZIONI_5_8 }`; `PartitaTorneo` guadagna `fase FaseTorneo @default(GIRONE)` (nessuna migrazione dati - il default copre le righe di girone già esistenti) e `tabellone TabelloneTorneo?` (nullo per GIRONE)
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_fase_tabellone_partita_torneo/migration.sql` -- `CREATE TYPE` per entrambi gli enum, `ALTER TABLE partite_torneo ADD COLUMN "fase" ... NOT NULL DEFAULT 'GIRONE'`, `ADD COLUMN "tabellone" ...` nullable
- `lib/torneo.ts` -- `creaPartiteTorneo` estesa: il tipo delle righe accetta opzionalmente `fase`/`tabellone` (default Prisma applicato se omessi, righe di girone esistenti invariate); riaggiunta `trovaPartitaTorneoPerId(id)` (rimossa come codice morto in Story 20.3, ora davvero necessaria per rileggere la fase/il tabellone reali dopo un salvataggio, mai dal client)
- **Nuovo file** `lib/classifica-finale-torneo.ts` -- `calcolaClassificaFinale(partiteTabellone1_4: PartitaTorneo[], partiteTabellone5_8: PartitaTorneo[]): RigaClassificaFinale[] | null` (pura; `null` se non tutte e 4 le finali hanno un risultato completo; altrimenti 8 righe ordinate 1°-8°, derivando vincitore/perdente di ciascuna finale con `esitoPartita` - FINALE_VINCENTI di un tabellone decide 1°/2° posto di quel tabellone, FINALE_PERDENTI decide 3°/4°, stesso schema per 5°-8°)
- **Nuovo file** `lib/classifica-finale-torneo.test.ts` -- casi: `null` con tabellone incompleto/parzialmente completo, ordine 1-8 corretto con vincitori/perdenti misti
- `app/app/(torneo)/torneo/actions.ts` -- nuova `generaTabelloneAction(categoriaTorneoId)` (verifica idempotenza via `contaPartiteTorneo` filtrato per fase - o un nuovo conteggio dedicato, verifica completezza classifica di entrambi i gironi, verifica ≥4 Squadre per girone, genera le 4 semifinali con `calcolaClassificaGirone` + `creaPartiteTorneo`); `salvaRisultatoPartitaTorneoAction` estesa: dopo un salvataggio riuscito, rilegge la `PartitaTorneo` con `trovaPartitaTorneoPerId`, se `fase === "SEMIFINALE"` verifica se la semifinale sorella dello stesso `tabellone` ha anch'essa un risultato completo e se le finali di quel tabellone non esistono già - in tal caso le genera (vincitori vs vincitori = FINALE_VINCENTI, perdenti vs perdenti = FINALE_PERDENTI)
- **Nuovo file** `app/app/(torneo)/torneo/actions.test.ts` (aggiunta ai `describe` esistenti) -- `generaTabelloneAction`: FORBIDDEN/VALIDATION per ciascun caso della I/O matrix, accoppiamenti corretti; `salvaRisultatoPartitaTorneoAction`: generazione automatica delle finali dopo la 2ª semifinale, nessun side-effect dopo la 1ª, nessuna doppia generazione se già esistenti
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx` -- Server Component, mirror di `risultati/page.tsx` (404, `dynamic = "force-dynamic"`): se nessuna `PartitaTorneo` con `fase !== GIRONE` esiste, bottone "Genera tabellone" (con lo stato di completezza dei gironi mostrato, mirror del riepilogo squadre già in `risultati/page.tsx`); altrimenti le semifinali/finali di ciascun tabellone (riusa `RisultatoPartitaTorneoForm.tsx`, Story 20.3, invariato) e la classifica finale 1°-8° una volta completa (`calcolaClassificaFinale`)
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/GeneraTabelloneForm.tsx` -- mirror `GeneraCalendarioGironiForm.tsx`
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx` -- il filtro delle partite di girone per sezione diventa `p.fase === "GIRONE" && p.squadraCasa.girone === girone.value` (senza questo, le semifinali/finali cross-girone finirebbero mescolate nella classifica di un girone - la fase GIRONE non esisteva ancora quando questo filtro è stato scritto in Story 20.3); aggiunto un link verso `tabellone`

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- enum `FaseTorneo`/`TabelloneTorneo` + campi su `PartitaTorneo`
- [x] migrazione -- `CREATE TYPE` + `ADD COLUMN` (default `GIRONE`, nessun backfill manuale)
- [x] `lib/torneo.ts` -- `creaPartiteTorneo` estesa, `trovaPartitaTorneoPerId` riaggiunta
- [x] `lib/classifica-finale-torneo.ts` + test
- [x] `torneo/actions.ts` -- `generaTabelloneAction` + estensione di `salvaRisultatoPartitaTorneoAction` + test
- [x] `tabellone/page.tsx` + `GeneraTabelloneForm.tsx`
- [x] `risultati/page.tsx` -- filtro `fase === "GIRONE"` + link a `tabellone`

**Acceptance Criteria:** vedi `epics.md` Story 20.4 (Given/When/Then, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-24 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Trovate reali sull'integrità del torneo, patch applicate e riverificate:

- **PATCH** — Edge Case Hunter (2 finding convergenti su questo stesso tema): modificare un risultato di girone dopo la generazione del tabellone, o un risultato di semifinale dopo la generazione delle finali, lasciava silenziosamente stantii gli accoppiamenti/vincitori già derivati dal risultato originale. Aggiunta una guardia esplicita (`erroreModificaBloccata`) in `salvaRisultatoPartitaTorneoAction` che blocca la modifica in entrambi i casi con un messaggio esplicito; le finali restano sempre modificabili (nessuna ulteriore fase deriva da loro).
- **PATCH** — Verification Gap Reviewer (2 finding): sia il filtro "solo partite di girone" (`risultati/page.tsx`) sia l'abbinamento riga→tabellone di `calcolaClassificaFinale` (`tabellone/page.tsx`) erano wiring a livello pagina senza alcun test capace di intercettare una regressione (uno scambio, un filtro invertito). Risolto eliminando il rischio alla radice invece di solo aggiungere test attorno: `calcolaClassificaGirone` ora filtra `fase === "GIRONE"` internamente (difesa in profondità, il filtro a monte resta anche per la lista "Incontri"); `calcolaClassificaFinale` non prende più due array posizionali ma un solo array e deriva da sola quale riga appartiene a quale tabellone leggendo il campo `tabellone` dei dati - uno scambio degli argomenti non è più possibile per costruzione.
- **PATCH** — Edge Case Hunter: il catch P2002 di `generaFinaliSeCompletate` trattava qualunque violazione del vincolo unico come idempotenza, senza verificare che le finali esistessero davvero. Ora si verifica che esistano prima di considerare l'errore un no-op silenzioso; altrimenti l'eccezione originale è propagata.
- **PATCH** — Blind Hunter (3 finding sulla stessa area UX): due messaggi distinti per "calendario di girone mai generato" vs "generato ma incompleto" in `generaTabelloneAction`; riepilogo di completezza dei gironi con le due condizioni indipendenti ("squadre sufficienti" e "risultati completi") separate invece di un solo messaggio combinato; le due finali di un tabellone ora mostrano un'etichetta esplicita (es. "Finale 1°/2° posto") invece di essere indistinguibili.
- **PATCH** — Blind Hunter: bottone "Genera tabellone" ora disabilitato quando la generazione verrebbe comunque rifiutata (stesso stato calcolato lato pagina, il vero cancello resta server-side).
- **PATCH** — Blind Hunter: `tabellone/page.tsx` usava le stringhe letterali `"GIRONE_A"`/`"GIRONE_B"` invece di iterare su `GIRONI_TORNEO` (unica fonte di verità già stabilita in Story 20.2).
- **PATCH** — Blind Hunter: `haRisultatoCompleto` era duplicata in 5 punti del progetto (`lib/classifica-girone-torneo.ts`, `lib/classifica-finale-torneo.ts`, `actions.ts`, `RisultatoPartitaTorneoForm.tsx`, `tabellone/page.tsx`). Estratta come unica fonte di verità in `lib/risultato-partita-torneo.ts` (mirror di `terzoSetNecessario`, stessa story che l'ha introdotta per il primo caso analogo), riusata ovunque.
- **PATCH** — Blind Hunter: aggiunto un vincolo `CHECK` in migrazione (mai applicata altrove, modificabile in sicurezza) che impone `fase`/`tabellone` come un'unione discriminata reale (`fase = 'GIRONE' ⟺ tabellone IS NULL`), prima imposta solo per disciplina applicativa.
- **PATCH** (test) — Blind Hunter: copertura asimmetrica del vincolo "≥4 Squadre per girone" (solo Girone A corto era testato) - aggiunti i casi Girone B corto ed entrambi corti.
- **DEFER** (loggati in `deferred-work.md`): nessuna via di recupero in-app per un tabellone generato per errore (stessa situazione già deferita per il calendario di girone in Story 20.3); l'accoppiamento incidentale tra il minimo di 4 squadre per girone e il massimo di 8 (Story 20.1) - se il massimo venisse mai alzato, squadre oltre la 4ª resterebbero escluse senza errore.
- **REJECT**: mismatch temporaneo spec `in-review`/sprint-status `in-progress` nel diff (Blind Hunter) - artefatto di sequenza del workflow, risolto dai passi di chiusura di questa stessa review. Extra round-trip DB per salvataggio di semifinale (Blind Hunter) - micro-ottimizzazione non in linea con un pannello di gestione a basso traffico, stesso principio già rigettato in Story 20.2/20.3.

Riverificato dopo le patch: `npx vitest run` (115 file, 1655 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 19 warning preesistenti non correlati), `npm run build` (riuscita, `/app/torneo/[edizioneId]/[categoriaId]/tabellone` registrata). Due bug propri (non della review) corretti durante l'applicazione delle patch: un'inversione vincitore/perdente nel test di indipendenza dall'ordine di `calcolaClassificaFinale`, e due test di "generazione automatica finali" pre-esistenti che assumevano ancora il vecchio comportamento (nessun blocco) invece del nuovo (blocco esplicito) - riscritti per il comportamento corretto, più un nuovo test per il caso "P2002 genuino, non spiegabile da una generazione concorrente riuscita".

## Design Notes

**Perché le finali sono generate come side-effect, non un'azione separata:** l'AC di `epics.md` dice esplicitamente "una volta inseriti i risultati delle semifinali, vengono generate la finale" (voce passiva, automatico) - un'azione manuale aggiuntiva ("Genera finali") sarebbe un passo in più non richiesto e una fonte di stato incoerente se dimenticata.

**Perché il minimo di 4 Squadre per girone è deciso qui:** il tabellone 5°-8° richiede un 3° e un 4° classificato di ciascun girone - con meno di 4 Squadre in un girone, quelle posizioni non esistono. `epics.md` non lo specifica esplicitamente (il minimo strutturale di Story 20.2 resta 2, per il solo calendario di girone) - se il reale vincolo del regolamento è diverso, va corretto in una story successiva.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione
- `npx prisma migrate dev` (o equivalente) -- expected: migrazione applicata senza errori (probabilmente non eseguibile in questo ambiente, stesso limite delle story precedenti)

**Manual checks (obbligatorio):**
- Un Admin/Dirigente completa entrambi i gironi di una Categoria con almeno 4 Squadre ciascuno, genera il tabellone (verifica le 4 semifinali con gli accoppiamenti corretti), inserisce il risultato di una semifinale (verifica: nessuna finale ancora), inserisce il risultato dell'altra semifinale dello stesso tabellone (verifica: le 2 finali di quel tabellone compaiono, ciascuna etichettata), ripete per l'altro tabellone, inserisce tutti i risultati delle finali e verifica la classifica finale 1°-8°. Prova a generare il tabellone con un girone incompleto (atteso: rifiutato) e con meno di 4 Squadre in un girone (atteso: rifiutato).
- Aggiunta post-review (2026-08-24): prova a modificare un risultato di girone dopo aver generato il tabellone (atteso: rifiutato); prova a modificare una semifinale dopo che le sue finali sono già state generate (atteso: rifiutato).

## Suggested Review Order

**Blocco della modifica su dati derivati (il cancello reale, aggiunto in review)**

- Entry point: `erroreModificaBloccata`, chiamata prima di ogni scrittura.
  [`actions.ts:1078`](../../app/app/(torneo)/torneo/actions.ts#L1078)
- Vincolo `CHECK` a livello DB per l'unione discriminata fase/tabellone (aggiunto in review).
  [`migration.sql:21`](../../prisma/migrations/20260824000000_add_fase_tabellone_partita_torneo/migration.sql#L21)

**Generazione automatica delle finali (side-effect, mai un'azione manuale)**

- `generaFinaliSeCompletate` - P2002 ora ri-verificato prima di trattarlo come idempotenza (fix di review).
  [`actions.ts:763`](../../app/app/(torneo)/torneo/actions.ts#L763)
- `salvaRisultatoPartitaTorneoAction` - fase/tabellone sempre riletti server-side, mai dal client.
  [`actions.ts:1119`](../../app/app/(torneo)/torneo/actions.ts#L1119)

**Le funzioni pure (fix di review: rischio di scambio eliminato alla radice)**

- `calcolaClassificaFinale` - un solo array in ingresso, nessun argomento posizionale da poter scambiare.
  [`classifica-finale-torneo.ts:58`](../../lib/classifica-finale-torneo.ts#L58)
- `calcolaClassificaGirone` - filtro `fase === GIRONE` ora interno, difesa in profondità.
  [`classifica-girone-torneo.ts:46`](../../lib/classifica-girone-torneo.ts#L46)
- `haRisultatoCompleto` - unica fonte di verità, prima duplicata in 5 punti (fix di review).
  [`risultato-partita-torneo.ts:23`](../../lib/risultato-partita-torneo.ts#L23)

**UI (chiarezza per l'Admin, fix di review, nessun impatto sui dati)**

- Etichette distintive per le due finali, messaggi separati per gironi incompleti, bottone disabilitato quando non generabile.
  [`tabellone/page.tsx`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx)
