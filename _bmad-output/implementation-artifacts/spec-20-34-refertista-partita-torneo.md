---
title: 'Story 20.34: Campo Refertista per ogni incontro del Torneo'
type: 'feature'
created: '2026-09-16'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '0d5e5965a12ce64f3fb4dc1193c4b42b7901da16'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** richiesta esplicita dell'utente: aggiungere un campo "Refertista" (chi ha compilato il referto cartaceo dell'incontro) per ogni partita del Torneo, da mostrare anche sulla pagina pubblica `/torneo`.

**Approach:** `PartitaTorneo` guadagna un campo `refertista` (testo libero, facoltativo) - inserito nello stesso form con cui l'Admin/Dirigente registra il risultato (`RisultatoPartitaTorneoForm.tsx`, stesso momento "compilo il referto"), salvato dalla stessa `salvaRisultatoPartitaTorneoAction`. Mostrato sulla pagina pubblica accanto al risultato di ogni incontro (girone, semifinali, finali), solo quando valorizzato.

## Boundaries & Constraints

**Always:**
- `refertista` è `String?` (nullable, facoltativo) - additivo, nessun backfill per gli incontri esistenti (restano `null`).
- Inserito/modificato nello stesso form/submit del risultato (`RisultatoPartitaTorneoForm.tsx`), stesso `useActionState`/`salvaRisultatoPartitaTorneoAction` - nessun nuovo form/Server Action separato, nessuna nuova riga di useActionState nel componente.
- Stessa disciplina "mai fidarsi del client" già in uso in questo file: lunghezza massima validata server-side (`REFERTISTA_MAX`, mirror di `ETICHETTA_SLOT_MAX`), stringa vuota dopo trim → `null`, mai una stringa vuota persistita (stesso principio già applicato a `nomeSettimana1/2`, Story 20.13).
- Mostrato sulla pagina pubblica `/torneo` in tutti e 4 i punti dove un incontro reale viene renderizzato (girone, semifinale/finale nel tabellone, finale vincenti, finale perdenti) - stesso componente/markup ripetuto nei 4 punti già esistenti, nessuna estrazione di componente condiviso fuori scope per questa story.
- Mostrato SOLO quando valorizzato (mai una riga vuota "Refertista: —" quando non impostato) - mirror del trattamento già esistente per `MetaSlot` (nessuno Slot assegnato → nessuna riga).
- Nessuna modifica al criterio "risultato valido"/"modifica bloccata" già esistenti (`risultatoValido`, `erroreModificaBloccata`) - il refertista è un campo indipendente dal punteggio, salvabile/modificabile con le stesse regole di blocco già in vigore per il resto del form (un incontro con modifica bloccata resta bloccato anche per il refertista, stesso form/stessa azione).

**Ask First:** nessuna - decisione chiusa qui: il refertista è testo libero (nome scritto a mano dall'Admin), non un riferimento a un Utente/Allenatore esistente nel sistema - nessun collegamento a un'anagrafica, coerente con la richiesta letterale dell'utente ("aggiungere un campo").

**Never:** nessun nuovo form/Server Action dedicato al solo refertista (deciso: stesso form del risultato). Nessuna modifica all'area amministrativa del layout esistente oltre all'aggiunta del campo. Nessun collegamento a un'anagrafica Utente/Allenatore - resta un campo di testo libero.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin inserisce un refertista insieme al risultato | Testo valido, ≤20 caratteri | Salvato insieme al risultato, mostrato in sola lettura nel form e sulla pagina pubblica | N/A |
| Admin lascia il campo Refertista vuoto | Nessun testo inserito | `refertista` resta/diventa `null`, nessuna riga mostrata (né in admin né sul pubblico) | N/A |
| Admin inserisce un testo oltre il limite massimo | >20 caratteri | Rifiutato con messaggio esplicito, stesso trattamento di un campo di testo troppo lungo altrove nel progetto | `VALIDATION` |
| Incontro con modifica bloccata (finali già generate a valle) | `erroreModificaBloccata` già vero per questo incontro | Il refertista non è modificabile, stesso blocco già esistente per il risultato (stesso form) | (blocco esistente, invariato) |
| Incontro senza refertista impostato, visitatore apre `/torneo` | `refertista` è `null` | Nessuna riga "Refertista" mostrata per quell'incontro | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `PartitaTorneo`: nuovo campo `refertista String?`; nuova migrazione additiva (mirror sintattico di `20260826010000_add_nomi_settimane_edizione_torneo`).
- `lib/torneo.ts` -- `aggiornaRisultatoPartitaTorneo`: parametro `refertista: string | null` aggiunto ai `dati` scritti (nessuna nuova funzione, `elencaPartiteTorneo` già restituisce tutte le colonne scalari di `PartitaTorneo` senza `select` esplicito - il nuovo campo arriva gratis).
- `app/app/(torneo)/torneo/actions.ts` -- `REFERTISTA_MAX = 20` (mirror `ETICHETTA_SLOT_MAX`); `validaCampiRisultato` legge/valida `refertista` (trim, lunghezza massima, stringa vuota → `null`) insieme ai set; `salvaRisultatoPartitaTorneoAction` lo passa a `aggiornaRisultatoPartitaTorneo`.
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx` -- tipo `Partita` esteso con `refertista: string | null`; nuovo campo di testo nel form (stesso `fieldset`/`campiRiga` dei set), valore iniziale in `valoriIniziali()`/reset su "Annulla" (stesso trattamento dei punteggi); mostrato anche nella riga di sola lettura in cima quando valorizzato.
- `app/torneo/page.tsx` -- nei 4 punti dove viene renderizzato un incontro reale (girone, semifinale/finale, finale vincenti, finale perdenti), una riga `{partita.refertista && <p className={styles.meta}>Refertista: {partita.refertista}</p>}` accanto al risultato/`MetaSlot` esistenti.

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione -- `PartitaTorneo.refertista` nullable
- [x] `lib/torneo.ts` -- `aggiornaRisultatoPartitaTorneo` esteso + test
- [x] `actions.ts` -- `validaCampiRisultato`/`salvaRisultatoPartitaTorneoAction` validano/passano `refertista` + test
- [x] `RisultatoPartitaTorneoForm.tsx` -- campo di testo nel form, valore iniziale/reset, riga di sola lettura
- [x] `app/torneo/page.tsx` -- riga "Refertista" nei 4 punti di rendering incontro, solo se valorizzato

**Acceptance Criteria:**
- Given un incontro senza risultato ancora inserito, when l'Admin inserisce un Refertista e salva, then il campo viene salvato e mostrato in sola lettura nel form
- Given un incontro con un Refertista impostato, when un Visitatore apre `/torneo`, then vede "Refertista: {nome}" accanto a quell'incontro
- Given un incontro senza Refertista impostato, when un Visitatore apre `/torneo`, then non vede alcuna riga Refertista per quell'incontro
- Given un testo Refertista oltre il limite massimo, when l'Admin salva, then l'operazione è rifiutata con un messaggio esplicito

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Inserire un Refertista su un incontro di girone e su una semifinale/finale, verificare che compaia correttamente sia in admin sia su `/torneo`.
- Verificare che un incontro senza Refertista non mostri alcuna riga vuota, né in admin né sul pubblico.
- Verificare anche la colonna "Refertista" nella tabella "Mostra tutti gli incontri" su `/torneo` (quinta vista, trovata in review - non nell'elenco originale della spec).

## Suggested Review Order

**Correzioni emerse in review**

- Colonna Refertista mancante nella quinta vista pubblica (tabella "Mostra tutti gli incontri", Story 20.19) - la spec originale ne elencava solo 4.
  [`TabellaIncontriCategoria.tsx:160`](../../app/torneo/TabellaIncontriCategoria.tsx#L160)

- Reset dello stato locale dopo un salvataggio riuscito - il Refertista mostrava il valore non "ripulito" (spazi) invece di quello realmente salvato.
  [`RisultatoPartitaTorneoForm.tsx:170`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx#L170)

**Funzionalità principale**

- Validazione server-side (trim, limite 20 caratteri, stringa vuota → null).
  [`actions.ts:2085`](../../app/app/(torneo)/torneo/actions.ts#L2085)

- Campo nel form di inserimento risultato, stesso submit/stessa azione.
  [`RisultatoPartitaTorneoForm.tsx:435`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/risultati/RisultatoPartitaTorneoForm.tsx#L435)

- Le 4 righe sulla pagina pubblica principale (girone/semifinale/finale vincenti/finale perdenti).
  [`page.tsx:453`](../../app/torneo/page.tsx#L453)
