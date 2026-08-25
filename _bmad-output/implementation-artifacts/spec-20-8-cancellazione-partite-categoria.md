---
title: "Story 20.8: Cancellazione delle partite di una Categoria"
type: 'feature'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'd3be9f87182f1f73399f1442ea2bed2a963ed83c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** una volta generato un calendario di girone (e a maggior ragione un tabellone), non esiste alcuna funzione per cancellare le `PartitaTorneo` risultanti - la catena di cancellazione Categoria→Squadre→Partite resta bloccata per sempre, senza via di recupero per una Categoria creata per errore/test. Gap già noto (deferred-work.md, review 20.3/20.4), mai risolto prima d'ora.

**Approach:** nuova azione "Cancella tutte le partite" sulla pagina Risultati di una Categoria - cancella **tutte** le `PartitaTorneo` di quella Categoria (girone e tabellone insieme, in un'unica operazione), riportando la Categoria allo stato "calendario non ancora generato". Nessun impatto su Squadre/Categoria stesse, solo sulle partite.

## Boundaries & Constraints

**Always:** `requireRuolo(["ADMIN","DIRIGENTE"])` - stesso perimetro di ogni altra azione distruttiva del dominio Torneo. Conferma esplicita (`window.confirm`) prima dell'invio - stesso pattern già in uso per ogni altra cancellazione dell'epica (Edizione, Categoria, Squadra).

**Ask First:** nessuna - richiesto esplicitamente dall'utente.

**Never:** nessun impatto su `SquadraTorneo`/`CategoriaTorneo` - solo `PartitaTorneo` viene toccata. Nessuna cancellazione parziale (solo girone, o solo tabellone) - un'unica azione cancella tutto, coerente con l'obiettivo "poter poi eliminare tutto".

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Categoria con calendario di girone generato, nessun tabellone | N partite fase GIRONE | tutte cancellate, Categoria torna a "nessun calendario" | N/A |
| Categoria con calendario e tabellone generati | N partite miste GIRONE/SEMIFINALE/FINALE | tutte cancellate in un colpo solo | N/A |
| Categoria senza alcuna partita | 0 partite | azione idempotente, nessun errore (count 0 è un esito valido) | N/A |
| Categoria inesistente/id non corrispondente | id non valido | rifiutata | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `lib/torneo.ts` -- nuova `cancellaPartiteTorneo(categoriaTorneoId: string)`: `prisma.partitaTorneo.deleteMany({ where: { categoriaTorneoId } })`
- `app/app/(torneo)/torneo/actions.ts` -- nuova `cancellaPartiteTorneoAction(_prevState, formData)`: `requireRuolo(["ADMIN","DIRIGENTE"])`, legge `categoriaTorneoId`, verifica che la Categoria esista (`trovaCategoriaTorneoPerId`, mirror del controllo già in uso altrove), chiama `cancellaPartiteTorneo`, `revalidatePath` sia su `risultati` sia su `tabellone` della stessa Categoria
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/CancellaPartiteTorneoForm.tsx` -- form con conferma esplicita (mirror `EliminaEdizioneTorneoForm.tsx`), visibile solo se esiste almeno una partita
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx` -- nuova sezione con `CancellaPartiteTorneoForm`, visibile quando `calendarioGenerato` è vero

## Tasks & Acceptance

**Execution:**
- [x] `lib/torneo.ts` -- `cancellaPartiteTorneo` + test
- [x] `torneo/actions.ts` -- `cancellaPartiteTorneoAction` + test
- [x] `CancellaPartiteTorneoForm.tsx` + `risultati/page.tsx`

**Acceptance Criteria:** vedi `epics.md` Story 20.8 (Given/When/Then, verbatim).

## Spec Change Log

**2026-08-25 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Patch applicate e riverificate:

- **PATCH** — Blind Hunter (3 punti convergenti sulla stessa area UX di un'azione distruttiva): il dialog di conferma minimizzava l'impatto ("il calendario tornerà a dover essere generato da capo", senza menzionare la perdita di risultati/classifiche), il bottone usava lo stesso stile grigio neutro di un "Annulla" innocuo, e non mostrava quante partite sarebbero state cancellate. Aggiunta nuova classe `.bottoneDanger`, testo di conferma esplicito sulla perdita di risultati/classifiche, conteggio partite mostrato prima della conferma.
- **PATCH** — Blind Hunter: il bottone era il primo elemento interattivo della pagina, prima ancora del riepilogo di ciò che stava per cancellare. Spostato in fondo (sezione "Ripristino"), dopo gironi/classifiche/incontri.
- **PATCH** — Verification Gap Reviewer: se `revalidatePath` avesse lanciato DOPO una cancellazione già riuscita, l'azione avrebbe comunque restituito "Impossibile cancellare le partite. Riprova." nonostante i dati fossero già stati cancellati in modo irreversibile - l'ambiguità più pericolosa possibile per un'azione distruttiva. Riletta la Categoria in un blocco try/catch separato dalla cancellazione vera e propria; `revalidatePath` ora fuori da ogni try/catch.
- **PATCH** — Blind Hunter: `revalidatePath` non copriva la pagina della Categoria (elenco Squadre) - proprio da lì l'Admin procede a cancellare le Squadre dopo le partite, motivazione dichiarata della storia stessa. Aggiunta.
- **PATCH** (test): aggiunte asserzioni per la nuova sequenza (nessuna cancellazione se la lettura della Categoria fallisce, nessun `revalidatePath` se la cancellazione fallisce, `revalidatePath` esteso alla pagina Categoria).
- **PATCH** — testo guida in-app aggiornato per non minimizzare l'impatto (menziona esplicitamente la perdita di risultati/classifiche, non solo del calendario).
- **PATCH (housekeeping)** — Blind Hunter: l'item deferito dalla review 20.4 ("nessuna via di recupero in-app per un tabellone generato per errore") marcato risolto in `deferred-work.md`, essendo esattamente il gap che questa storia chiude.
- **DEFER** (loggati in `deferred-work.md`): race condition tra `cancellaPartiteTorneoAction` e `generaTabelloneAction`/`salvaRisultatoPartitaTorneoAction` concorrenti (Edge Case Hunter, 2 scenari convergenti) - stessa classe di rischio check-then-act già accettata ripetutamente in questa epica per un pannello a bassa concorrenza; nessuna coordinazione del `pending` tra il nuovo form e i form di risultato della stessa pagina (Blind Hunter, stessa causa radice); messaggio generico per un id di partita stantio dopo una rigenerazione (Edge Case Hunter, miglioramento di messaggistica minore).
- **REJECT**: pattern TOCTOU (lettura Categoria poi scrittura, invece di un `deleteMany` con `where` composto) segnalato come incoerente con `cancellaEdizioneTorneo`/`cancellaCategoriaTorneo`/`cancellaSquadraTorneo` (Blind Hunter) - a differenza di quei tre, qui non serve alcuna guardia nel `where` (cancellare partite non ha vincoli da proteggere, count 0 è già un esito valido) e la lettura serve solo a ottenere `edizioneTorneoId` per `revalidatePath`, stesso pattern già in uso da ogni altra azione Partita di questo stesso file (`generaCalendarioGironiAction`/`generaTabelloneAction`/`salvaRisultatoPartitaTorneoAction`), mirror più pertinente di quello citato. Bottone sempre renderizzato indipendentemente dal Ruolo dell'Utente (Blind Hunter) - stesso pattern già in uso in tutto il dominio Torneo, il vero cancello resta `requireRuolo` server-side. Nessuna disambiguazione "categoria non trovata" vs "partite già cancellate da un altro Admin" (Blind Hunter) - `count === 0` come esito valido è una decisione esplicita già in spec (I/O matrix), non un gap. "id non corrispondente" non rappresentabile a livello di Server Action (Verification Gap Reviewer) - `categoriaTorneoId` da solo identifica univocamente le partite da cancellare, l'edizione di appartenenza non è rilevante per questa azione specifica. Copertura mista fase GIRONE+SEMIFINALE+FINALE non dimostrata da un fixture reale (Verification Gap Reviewer) - già protetta dall'asserzione esatta sul `where` (nessun filtro su `fase`), un filtro parziale aggiunto per errore farebbe fallire il test esistente.

Riverificato dopo le patch: `npx vitest run` (118 file, 1731 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 21 warning preesistenti non correlati), `npm run build` (riuscita).

## Verification

**Commands:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
