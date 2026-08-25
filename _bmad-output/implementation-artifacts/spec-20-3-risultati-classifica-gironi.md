---
title: "Story 20.3: Risultati di girone e classifica automatica"
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '0b89f328e11d629b538a067e370d2e06e98fe71f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le Squadre (Story 20.2) sono ripartite sui due gironi, ma non esiste alcun calendario di incontri né un modo di registrare risultati o vedere una classifica - senza questo il torneo non può procedere.

**Approach:** deciso in `epics.md` (Story 20.3, regolamento 2026-08-23): nuovo modello `PartitaTorneo` (categoria, squadra casa/ospite, punteggio per set, fino a 3), generato automaticamente come "tutti contro tutti" **dentro ciascun girone** (mai tra gironi diversi - quello è il tabellone di Story 20.4) da una nuova Server Action esplicita. Un Admin/Dirigente inserisce il risultato set per set; una funzione pura calcola punti (3/2/1/0) ed esito, un'altra calcola la classifica di girone (punti, spareggio per set vinti) - mai persistita, sempre ricalcolata dai dati grezzi.

## Boundaries & Constraints

**Always:** `PartitaTorneo` segue le stesse convenzioni delle tabelle Torneo esistenti (RLS ENABLE + REVOKE nella migrazione di creazione, scritture in `lib/torneo.ts`, `requireRuolo(["ADMIN","DIRIGENTE"])`). Il calendario di girone è generato **una sola volta** per Categoria (azione idempotente: rifiutata esplicitamente se `PartitaTorneo` esistono già per quella Categoria) e richiede **almeno 2 Squadre per girone** (altrimenti rifiutata con errore esplicito). Un punteggio è valido solo se strutturalmente coerente con "al meglio dei 3 set" (nessun set pari, il 3° set presente solo se 1-1 dopo i primi due, mai una squadra con più di 2 set vinti) - validato da una funzione pura dedicata, riusata sia per l'inserimento sia per un eventuale controllo futuro. La classifica di girone (punti, set vinti come spareggio) è **sempre calcolata al volo** da una funzione pura a partire dalle `PartitaTorneo` con risultato completo - mai una colonna/tabella "classifica" persistita, per evitare una seconda fonte di verità da tenere sincronizzata.

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`/`epic-20-context.md`.

**Never:** nessun incrocio tra gironi diversi qui (Story 20.4). Nessuna validazione delle regole di punteggio pallavolistiche reali (es. margine di 2 punti, minimo 25/15) - solo coerenza strutturale "al meglio dei 3 set", come esplicitamente descritto nell'AC di `epics.md`. Nessuna sezione pubblica qui (Story 20.6).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Dirigente genera il calendario di una Categoria con ≥2 Squadre per girone | nessuna `PartitaTorneo` esistente per la Categoria | tutte le coppie di ciascun girone create come incontri | N/A |
| Admin/Dirigente rigenera il calendario di una Categoria già generata | `PartitaTorneo` già esistenti | rifiutata | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente genera il calendario con un girone a <2 Squadre | girone A o B con 0-1 Squadre | rifiutata | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente inserisce un risultato coerente (2-0, 2-1, o 1-2/0-2 dopo 3 set) | punteggio dei set | risultato salvato, punti/esito derivati (mai persistiti) | N/A |
| Admin/Dirigente inserisce un punteggio incoerente (set pari, 3° set assente/presente quando non dovrebbe, oltre 2 set vinti) | punteggio malformato | rifiutato | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente modifica un risultato già inserito | nuovo punteggio valido | classifica del girone riflette subito il nuovo risultato (nessun ricalcolo esplicito richiesto, sempre live) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo modello `PartitaTorneo` (`categoriaTorneoId` + relazione, `squadraCasaId`/`squadraOspiteId` + relazioni verso `SquadraTorneo` - FK `onDelete: Restrict` come le altre relazioni Torneo, `set1Casa`/`set1Ospite`/`set2Casa`/`set2Ospite`/`set3Casa`/`set3Ospite` tutti `Int?` - nulli finché il risultato non è inserito, `createdAt`/`updatedAt`)
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_partita_torneo/migration.sql` -- `CREATE TABLE`, RLS ENABLE + REVOKE, stessa struttura letterale delle migrazioni Torneo precedenti
- **Nuovo file** `lib/risultato-partita-torneo.ts` -- `RisultatoSet = { casa: number; ospite: number }`; `risultatoValido(set1, set2, set3?): boolean` (coerenza strutturale "al meglio dei 3", nessuna regola di punteggio pallavolistico); `esitoPartita(set1, set2, set3?): { setVintiCasa: number; setVintiOspite: number; puntiCasa: number; puntiOspite: number }` (deriva l'esito e i punti 3/2/1/0 SOLO da un risultato già validato - non richiama `risultatoValido` internamente, il chiamante valida prima)
- **Nuovo file** `lib/risultato-partita-torneo.test.ts` -- casi estesi per entrambe le funzioni (ogni combinazione 2-0/2-1/1-2/0-2, set pari rifiutato, 3° set mancante/in eccesso, ecc.)
- **Nuovo file** `lib/classifica-girone-torneo.ts` -- `calcolaClassificaGirone(squadre: SquadraTorneo[], partite: PartitaTorneo[]): RigaClassifica[]` (pura, filtra le partite del girone con risultato completo, somma punti/set vinti per squadra, ordina per punti desc poi set vinti desc); tipo `RigaClassifica = { squadra: SquadraTorneo; punti: number; setVinti: number; setPersi: number; partiteGiocate: number }`
- **Nuovo file** `lib/classifica-girone-torneo.test.ts` -- casi: classifica vuota (nessuna partita giocata), ordinamento per punti, spareggio per set vinti a parità di punti, una partita senza risultato non conta
- `lib/torneo.ts` -- nuove funzioni: `elencaPartiteTorneo(categoriaTorneoId)` (include squadraCasa/squadraOspite), `contaPartiteTorneo(categoriaTorneoId)` (guardia idempotenza generazione), `creaPartiteTorneo(righe[])` (bulk insert via `createMany`, usata dalla generazione calendario), `trovaPartitaTorneoPerId(id)`, `aggiornaRisultatoPartitaTorneo(id, categoriaTorneoId, set1..set3)` (scoped su id+categoriaTorneoId, stesso pattern anti-mismatch di `aggiornaCategoriaTorneo`)
- `app/app/(torneo)/torneo/actions.ts` -- `generaCalendarioGironiAction(categoriaTorneoId)` (legge Squadre, raggruppa per girone, verifica ≥2 per girone, verifica nessuna Partita esistente, genera tutte le coppie di ciascun girone con `creaPartiteTorneo`); `salvaRisultatoPartitaTorneoAction(id, categoriaTorneoId, set1Casa, set1Ospite, set2Casa, set2Ospite, set3Casa?, set3Ospite?)` (valida con `risultatoValido`, poi `aggiornaRisultatoPartitaTorneo`)
- **Nuovo file** `app/app/(torneo)/torneo/actions.test.ts` (aggiunta ai `describe` esistenti) -- FORBIDDEN/VALIDATION/successo per entrambe le nuove Server Action, casi limite (calendario già generato, girone con 1 sola Squadra, punteggio incoerente)
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/page.tsx` -- Server Component: se nessuna `PartitaTorneo` esiste, bottone "Genera calendario"; altrimenti elenco incontri per girone (A poi B) con form di inserimento risultato inline, e sotto la classifica calcolata di ciascun girone (tabella punti/set vinti/partite giocate)
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx` -- form inline per set1/set2/set3 (il terzo campo abilitato solo se necessario), mirror dello stile toggle-modifica già in uso per Categoria/Squadra
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/page.tsx` -- link verso `risultati` (sempre visibile, la pagina dei risultati spiega da sola se mancano ancora Squadre sufficienti)

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- modello `PartitaTorneo`
- [x] migrazione -- tabella + RLS ENABLE + REVOKE
- [x] `lib/risultato-partita-torneo.ts` + test
- [x] `lib/classifica-girone-torneo.ts` + test
- [x] `lib/torneo.ts` -- funzioni Partita
- [x] `torneo/actions.ts` -- `generaCalendarioGironiAction` + `salvaRisultatoPartitaTorneoAction` + test
- [x] `risultati/page.tsx` + `RisultatoPartitaTorneoForm.tsx`
- [x] link da `[categoriaId]/page.tsx` a `risultati`

**Acceptance Criteria:** vedi `epics.md` Story 20.3 (Given/When/Then, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-24 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Tutti e tre i reviewer hanno convergito indipendentemente su due gap reali legati all'interazione tra `PartitaTorneo` (nuova) e Squadra/Categoria (storie precedenti):

- **PATCH** — Blind Hunter + Edge Case Hunter + Verification Gap Reviewer, tutti e tre indipendentemente: cancellare una Squadra con incontri già generati falliva a livello DB (nuova FK `Restrict` da `PartitaTorneo`), intercettato solo dal catch generico come INTERNAL "Riprova" - fuorviante, un retry non può mai riuscire. Aggiunta guardia esplicita in `cancellaSquadraTorneo` (`partiteCasa`/`partiteOspite: { none: {} } }`), disambiguazione in `cancellaSquadraTorneoAction` (mismatch vs bloccata da incontri).
- **PATCH** — Blind Hunter + Edge Case Hunter + Verification Gap Reviewer, tutti e tre indipendentemente: cambiare il girone di una Squadra (`aggiornaSquadraTorneoAction`, azione di Story 20.2 mai toccata prima) dopo la generazione del calendario spostava silenziosamente i suoi incontri fuori dalla classifica del girone originale (`calcolaClassificaGirone` scarta una partita se la Squadra non è tra quelle passate). Bloccato esplicitamente il cambio di girone quando esistono già `PartitaTorneo` per la Categoria.
- **PATCH** — Blind Hunter + Edge Case Hunter, indipendentemente: iscrivere una nuova Squadra dopo la generazione del calendario la lasciava silenziosamente fuori da ogni incontro. Bloccato esplicitamente.
- **PATCH** — Edge Case Hunter: nessun vincolo DB contro un doppio invio concorrente di "Genera calendario" (la guardia applicativa è check-then-act). Aggiunto `@@unique([categoriaTorneoId, squadraCasaId, squadraOspiteId])` + `CHECK (squadraCasaId <> squadraOspiteId)` alla migrazione (mai applicata altrove, modificabile in sicurezza), P2002 tradotto nello stesso messaggio esplicito di idempotenza.
- **PATCH** — Blind Hunter: `terzoSetNecessario` era duplicata a mano in `RisultatoPartitaTorneoForm.tsx` invece di riusare la stessa regola di `risultatoValido`. Estratta ed esportata da `lib/risultato-partita-torneo.ts`, riusata lato client.
- **PATCH** — Blind Hunter: "Annulla" nel form di modifica risultato non ripristinava i campi (valori digitati e poi annullati restavano visibili riaprendo il form, nessun remount). Corretto.
- **PATCH** — Blind Hunter: bottone toggle del form risultato senza `aria-expanded`. Aggiunto.
- **PATCH** (trovato in verifica propria, non da un reviewer): `lib/torneo.ts` aveva zero test per le 4 nuove funzioni Partita (`elencaPartiteTorneo`/`contaPartiteTorneo`/`creaPartiteTorneo`/`aggiornaRisultatoPartitaTorneo`) - stessa classe di gap già trovata in Story 20.1/20.2 per altri moduli `lib/torneo.ts`. Aggiunti.
- **REJECT** (dead code, rimosso invece di testato): `trovaPartitaTorneoPerId` (Blind Hunter + Verification Gap Reviewer, indipendentemente) non aveva alcun chiamante - rimossa invece di patchata.
- **REJECT** (matches spec esplicitamente): `esitoPartita` non valida il proprio input (Edge Case Hunter) - decisione dichiarata nel Code Map ("non richiama risultatoValido internamente, il chiamante valida prima"), verificato che l'unico chiamante reale (`salvaRisultatoPartitaTorneoAction`) valida sempre prima di persistere.
- **DEFER** (loggato in `deferred-work.md`): etichette "Casa"/"Ospite" sempre assegnate per ordine alfabetico, nessun significato reale per un torneo giocato in un'unica sede - decisione di prodotto.

Riverificato dopo le patch: `npx vitest run` (114 file, 1618 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 19 warning preesistenti non correlati), `npm run build` (riuscita, `/app/torneo/[edizioneId]/[categoriaId]/risultati` registrata).

## Design Notes

**Perché la classifica non è mai persistita:** ricalcolarla al volo da `PartitaTorneo` a ogni lettura (nessuna cache/colonna denormalizzata) elimina strutturalmente il rischio di una classifica "vecchia" dopo la modifica di un risultato - stesso principio "mai una seconda fonte di verità" già seguito ripetutamente in questo progetto (es. `lib/allineamenti.ts`, Story 19.13).

**Perché il calendario è generato una sola volta, non ricalcolato:** se venisse rigenerato dopo l'inserimento di risultati, andrebbero persi - l'azione è quindi bloccata esplicitamente se `PartitaTorneo` esistono già, coerente col principio fail-closed del progetto. Girone/iscrizione di Squadre dopo la generazione sono ora bloccati esplicitamente (vedi Spec Change Log) invece di restare un gap silenzioso.

**Struttura del punteggio:** 6 colonne `Int?` (`set1Casa`..`set3Ospite`) invece di un campo libero tipo `Partita.parziali` (Epic 10, stringa non strutturata importata da Excel) - qui il risultato è inserito da un Utente reale attraverso un form, non importato da un file, quindi vale la pena validarlo e poterci calcolare sopra (classifica) senza fare parsing di stringhe.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione
- `npx prisma migrate dev` (o equivalente) -- expected: migrazione applicata senza errori (probabilmente non eseguibile in questo ambiente, stesso limite di 20.1/20.2)

**Manual checks (obbligatorio):**
- Un Admin/Dirigente apre una Categoria con Squadre sufficienti in entrambi i gironi, genera il calendario, inserisce risultati per tutti gli incontri di un girone (mix di 2-0/2-1/1-2/0-2), verifica che la classifica rifletta punti e spareggio per set vinti corretti; modifica un risultato già inserito e verifica che la classifica si aggiorni; prova a generare di nuovo il calendario (atteso: rifiutato); prova un punteggio incoerente (es. 25-20/20-25/25-20 con un 3° set quando già 2-0, o un set 20-20) (atteso: rifiutato).
- Aggiunta post-review (2026-08-24): dopo aver generato il calendario, prova a iscrivere una nuova Squadra (atteso: rifiutato), a cambiare il girone di una Squadra esistente (atteso: rifiutato) e a cancellare una Squadra con incontri già generati (atteso: rifiutato con messaggio esplicito, non un errore generico).

## Suggested Review Order

**Il cancello reale: interazione Squadra/Categoria con Partite già generate**

- Entry point: le 3 guardie aggiunte in review (nuova Squadra, cambio girone, cancellazione) - tutte condizionate su `contaPartiteTorneo`/il nuovo vincolo FK.
  [`actions.ts:404`](../../app/app/(torneo)/torneo/actions.ts#L404)
- La guardia di cancellazione a livello dati (`partiteCasa`/`partiteOspite: { none: {} } }`).
  [`torneo.ts:164`](../../lib/torneo.ts#L164)

**Il vincolo DB come rete di sicurezza (aggiunto in review)**

- Vincolo unico sulla coppia + CHECK squadre diverse, mai applicati altrove (migrazione modificata in sicurezza).
  [`migration.sql:38`](../../prisma/migrations/20260823020000_add_partita_torneo/migration.sql#L38)
- P2002 tradotto nello stesso messaggio esplicito di idempotenza.
  [`actions.ts:642`](../../app/app/(torneo)/torneo/actions.ts#L642)

**Le funzioni pure (validazione risultato, esito, classifica)**

- `risultatoValido`/`terzoSetNecessario` (estratta in review, riusata anche lato client) - unica fonte di verità.
  [`risultato-partita-torneo.ts:30`](../../lib/risultato-partita-torneo.ts#L30)
- Classifica sempre ricalcolata al volo, mai persistita.
  [`classifica-girone-torneo.ts:38`](../../lib/classifica-girone-torneo.ts#L38)

**Test (peripherals, ampliati in review)**

- Nuova copertura per le funzioni Partita di `lib/torneo.ts`, prima assenti.
  [`torneo.test.ts`](../../lib/torneo.test.ts)
