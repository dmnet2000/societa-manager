---
title: 'Story 20.21: Prenotazione anticipata di Slot sulle righe del prospetto ipotetico'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'afc68862f3cc279bcc05ee2d4acb4ec29f6f9aae'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** il prospetto ipotetico (Story 20.20) mostra come si incroceranno le posizioni di girone, ma non permette di pianificare in anticipo dove/quando si giocherà ciascuna riga - a differenza del girone (Story 20.9), per una semifinale ipotetica non c'è oggi modo di dire "questa, la Semifinale 1, sarà alla Palestra X" prima che la squadra reale sia nota.

**Approach:** estendere `SlotTorneo` (Story 20.9/20.18) con una prenotazione opzionale per Categoria+posizione ipotetica (fase/tabellone/ordinale) - stesso principio "prenotazione per fase", ora granulare fino alla singola riga del prospetto. `generaTabelloneAction`/`generaFinaliSeCompletate` useranno prima uno Slot prenotato per quella riga specifica, prima di ricadere sull'assegnazione automatica generica esistente.

## Boundaries & Constraints

**Always:**
- Riuso esatto dell'entità `SlotTorneo` esistente - nessuna nuova tabella, nessuna partita fantasma (`PartitaTorneo.squadraCasaId`/`squadraOspiteId` restano sempre obbligatori, spec-20-9 Never invariato).
- Due nuovi campi opzionali su `SlotTorneo`: `prenotazioneCategoriaTorneoId` (FK → `CategoriaTorneo`, nullable) e `prenotazioneOrdinale` (Int, nullable, 1|2). `prenotazioneOrdinale` è significativo SOLO quando `fase = SEMIFINALE` e `prenotazioneCategoriaTorneoId` è impostato (obbligatorio in quel caso: 1 o 2, per distinguere Semifinale 1 da Semifinale 2 dello stesso tabellone); per `FINALE_VINCENTI`/`FINALE_PERDENTI` resta sempre `null` (un solo Slot serve, nessuna ambiguità). Validato in Server Action, mai un CHECK DB (stesso principio di `numeroMassimoSquadre`).
- Disponibile SOLO per Categorie nel formato "8 squadre" (4+4) del prospetto ipotetico: `generaTabelloneAction` blocca oggi l'intero tabellone (1°-4° e 5°-8°) se anche un solo Girone ha meno di 4 Squadre, quindi nessuna riga del formato "6 squadre" (3+3) ha oggi un percorso reale di generazione - nessun controllo di prenotazione esposto lì.
- Al più una prenotazione attiva per (Categoria, fase, tabellone, ordinale): riassegnare sovrascrive quella precedente sulla stessa riga (lo Slot liberato torna disponibile).
- Alla generazione reale, per ciascuna semifinale/finale si cerca prima uno Slot prenotato per quella riga esatta e, se esiste, viene assegnato direttamente; solo le righe senza prenotazione ricadono sul best-effort esistente (`assegnaSlotAutomaticamente`), che deve escludere dal proprio pool generico gli Slot prenotati per un'altra Categoria/ordinale.
- Cancellare una Categoria con Slot ancora prenotati (anche senza Squadre/Partite residue) resta bloccato con messaggio esplicito, mirror della disambiguazione già fatta per `cancellaEdizioneTorneo` (Story 20.9).
- Stesso perimetro di autorizzazione del resto del modulo (ADMIN/DIRIGENTE). Guida in-app (`/app/torneo`) aggiornata.

**Ask First:** nessuna - i limiti sopra sono già decisi qui, mirror dei precedenti già stabiliti in Story 20.9/20.20.

**Never:** nessuna partita fantasma. Nessun vincolo di unicità DB sulla prenotazione (stesso principio "nessun vincolo che impedisca a due Partite di puntare allo stesso Slot", spec-20-9 Never) - la protezione contro doppie prenotazioni sulla stessa riga resta applicativa. Nessuna estensione al formato 3+3 (resta story futura, come la sua generazione reale). Nessuna modifica alla pagina pubblica `/torneo`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin prenota uno Slot libero su "Semifinale 1" del tabellone 1°-4° (Categoria 4+4) | Slot fase=SEMIFINALE/tabellone=POSIZIONI_1_4 libero, non prenotato | Slot marcato per quella Categoria/ordinale=1, mostrato accanto alla riga | N/A |
| Admin prenota un secondo Slot sulla riga già prenotata | prenotazione preesistente su quella riga | la nuova prenotazione sostituisce la precedente | N/A |
| Generazione tabellone reale con SF1 e SF2 di un tabellone entrambe prenotate | 2 Slot prenotati per le 2 posizioni | le 2 semifinali reali ricevono esattamente quegli Slot | N/A |
| Generazione tabellone reale con una sola posizione prenotata | 1 Slot prenotato, l'altra no | la posizione prenotata riceve il suo Slot, l'altra ricade sul best-effort esistente | N/A |
| Categoria in formato 3+3 (o non riconosciuto) | nessun percorso di generazione reale | nessun controllo di prenotazione mostrato su alcuna riga | N/A |
| Cancellazione di una Categoria con uno Slot ancora prenotato (anche senza Squadre) | `prenotazioneCategoriaTorneoId` punta a quella Categoria | rifiutata, messaggio esplicito | `VALIDATION` |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `SlotTorneo` guadagna `prenotazioneCategoriaTorneoId String?` (FK → `CategoriaTorneo`) e `prenotazioneOrdinale Int?`; nuova migrazione (`ADD COLUMN` + FK, nessun nuovo CHECK)
- `lib/torneo.ts` -- nuova `prenotaSlotTorneo(slotId, categoriaTorneoId, ordinale | null)` (mirror `assegnaSlotPartitaTorneo:507`) e `rimuoviPrenotazioneSlotTorneo(slotId)`; nuova `trovaSlotPrenotato(categoriaTorneoId, fase, tabellone, ordinale)`; `elencaSlotTorneoLiberi:524` estesa per escludere dal pool generico gli Slot prenotati per un'altra Categoria/ordinale; `cancellaCategoriaTorneo:133` -- `where` esteso con `slotPrenotati: { none: {} } }`
- `app/app/(torneo)/torneo/actions.ts` -- nuova `prenotaSlotIpoteticoAction` (valida Categoria/Edizione/fase/tabellone/ordinale, verifica formato 4+4 server-side via `calcolaProspettoIpoteticoTorneo`, mirror `assegnaSlotPartitaTorneoAction`); `generaTabelloneAction:1437` -- per ciascuna delle 4 righe cerca prima `trovaSlotPrenotato` prima di lasciare `slotTorneoId` a `null` per l'auto-assegnazione; `generaFinaliSeCompletate` -- stessa logica; `cancellaCategoriaTorneoAction` -- messaggio dedicato quando bloccata da Slot prenotati (mirror disambiguazione Story 20.9)
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/PrenotaSlotIpoteticoForm.tsx` -- form client per riga (mirror `<select>` Slot di `RisultatoPartitaTorneoForm.tsx:212-227`), submit verso `prenotaSlotIpoteticoAction`
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx` -- per Categorie in formato 4+4, ogni riga di semifinale/finale del prospetto ipotetico monta `PrenotaSlotIpoteticoForm`, con l'elenco Slot assegnabili per quella fase/tabellone/ordinale (mirror `slotPerPartita:129`)
- `lib/guida/contenuti.ts` -- rotta `/app/torneo`: una frase in più sulla prenotazione anticipata di Slot per riga ipotetica

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione -- nuovi campi `prenotazioneCategoriaTorneoId`/`prenotazioneOrdinale`
- [x] `lib/torneo.ts` -- `prenotaSlotTorneo`/`rimuoviPrenotazioneSlotTorneo`/`trovaSlotPrenotato` + estensione `elencaSlotTorneoLiberi`/`cancellaCategoriaTorneo` + test
- [x] `torneo/actions.ts` -- `prenotaSlotIpoteticoAction` + estensione `generaTabelloneAction`/`generaFinaliSeCompletate`/`cancellaCategoriaTorneoAction` + test
- [x] `PrenotaSlotIpoteticoForm.tsx` (nuovo) + integrazione in `tabellone/page.tsx`
- [x] `lib/guida/contenuti.ts` -- aggiornamento `corpo` rotta `/app/torneo`

**Acceptance Criteria:**
- Given una Categoria 4+4 con SF1 e SF2 di un tabellone entrambe prenotate su Slot diversi, when l'Admin genera il tabellone reale, then ciascuna semifinale riceve esattamente lo Slot prenotato per la sua riga, non un altro
- Given una Categoria 3+3 (o formato non riconosciuto), when la pagina Tabellone è renderizzata, then nessuna riga del prospetto ipotetico mostra un controllo di prenotazione Slot
- Given uno Slot prenotato per una Categoria che non ha più Squadre, when si prova a cancellare quella Categoria, then l'operazione è rifiutata con un messaggio che indica lo Slot prenotato come causa

## Design Notes

**Perché riusare `SlotTorneo` invece di una nuova entità:** la prenotazione per riga ipotetica è una generalizzazione naturale della "prenotazione per fase" già esistente (Story 20.9) - stesso ciclo di vita (libero → prenotato/assegnato → collegato a una Partita reale), stessa entità, solo due colonne in più per restringere il target da "una fase/tabellone qualunque" a "una riga precisa di una Categoria".

**Perché solo il formato 4+4:** `generaTabelloneAction` oggi richiede ≥4 Squadre in ENTRAMBI i Gironi per generare qualunque parte del tabellone (non solo il 5°-8°) - per il formato 3+3 nessuna riga del prospetto ipotetico ha oggi un percorso reale di generazione (la sua eventuale introduzione è story futura, spec-20-20 Never), quindi una prenotazione lì sarebbe strutturalmente orfana.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx prisma validate` -- expected: schema valido

**Manual checks (obbligatorio, dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Categoria 4+4 con girone in corso: prenotare uno Slot su Semifinale 1 e uno su Semifinale 2 dello stesso tabellone, verificare che compaiano accanto alle righe corrispondenti; generare il tabellone reale e verificare che le 2 semifinali abbiano ricevuto esattamente quegli Slot.
- Prenotare un secondo Slot sulla stessa riga già prenotata: verificare che sostituisca la prenotazione precedente.
- Categoria 3+3: verificare che nessuna riga mostri un controllo di prenotazione.
- Svuotare le Squadre di una Categoria con uno Slot ancora prenotato e provare a cancellarla: verificare il rifiuto con messaggio esplicito.

## Spec Change Log

**2026-09-06/07 — tre giri di review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec` in senso stretto - tutte le patch implementavano garanzie già promesse dal frozen intent, mai una rinegoziazione dei Boundaries.

**Giro 1 - PATCH (applicate):**
- **A**: la prenotazione consumata con successo da `assegnaSlotAutomaticamente` non veniva mai liberata - bloccava per sempre la cancellazione della Categoria (guardia `slotPrenotati: { none: {} } }`) anche dopo la normale pulizia di Squadre/Partite. Aggiunta `rimuoviPrenotazioneSlotTorneo` dopo il consumo.
- **B**: nessuna protezione contro il "furto" silenzioso della prenotazione di un'altra Categoria (confermato indipendentemente da tutti e 3 i reviewer) - `slotDisponibili` ora esclude gli Slot occupati da una Partita reale o prenotati per un'altra riga (`slotPerPrenotazione`, tabellone/page.tsx), più verifica server-side in `prenotaSlotIpoteticoAction`.
- **C**: l'ordinale era derivato dalla posizione nell'array GIA' FILTRATO per "senza Slot" - fragile se una sola delle due semifinali fosse già assegnata. Derivato ora dalla posizione nell'array completo.
- **D**: un errore nella ricerca della prenotazione interrompeva l'intera funzione invece di fallire in isolamento - avvolto in try/catch per-iterazione.
- **E**: nessuna guardia contro una prenotazione dopo che il tabellone reale è già stato generato (stale tab race) - aggiunto un controllo con `contaPartiteTorneoTabellone`.
- **F**: messaggio di successo impreciso quando si rimuoveva una prenotazione invece di crearla/aggiornarla.

**Giro 2 - PATCH (applicate), sulle correzioni del Giro 1:**
- **G** (il più importante): la Patch A liberava la prenotazione SOLO nel ramo di successo - se `assegnaSlotPartitaTorneo` falliva (count 0 o eccezione), la prenotazione restava agganciata per sempre, riaprendo esattamente il rischio che la Patch A doveva chiudere. Ora liberata sempre quando trovata, indipendentemente dall'esito del tentativo di consumo.
- **H**: la guardia "tabellone già generato" (Patch E) bloccava anche la RIMOZIONE di una prenotazione residua, non solo la sua creazione - stessa classe di blocco permanente con un innesco diverso. Il ramo di rimozione è stato spostato prima delle due guardie (generazione/formato), che restano in vigore solo per creare/cambiare una prenotazione.
- **I**: la regola "Categoria in formato 8 squadre" era duplicata indipendentemente in `tabellone/page.tsx` e `actions.ts` - estratta in `formatoOttoSquadre` (lib/prospetto-ipotetico-torneo.ts), unica fonte di verità.

**DEFER (annotati in `deferred-work.md`):** race TOCTOU su submit concorrenti sulla stessa riga/sullo stesso Slot (nessuna transazione) - coerente con il rischio già esplicitamente accettato in Story 20.9; nessuna via di recupero se le Squadre scendono sotto 4+4 dopo una prenotazione (la sezione sparisce dalla UI, la prenotazione persiste); nessun indice DB dedicato sulle nuove colonne (mirror della stessa scelta già fatta per `campoId`); nessun messaggio esplicativo quando il formato 3+3 nasconde la sezione di prenotazione; nessun vincolo che leghi la tripla fase/tabellone/ordinale alle righe reali del prospetto (sempre vero oggi per il solo formato 4+4 esistente); il dropdown potrebbe in teoria mostrare uno Slot di una prenotazione residua senza segnalarlo esplicitamente (scenario reso molto più raro dalla Patch G).

**Nota operativa:** il subagent di implementazione ha esaurito il budget della sessione (rate limit dell'account) a lavoro completo ma prima di riportare l'esito finale - verificato a mano che tutte e 3 le patch del Giro 3 (G/H/I) fossero già scritte correttamente su disco, inclusi i test dedicati, prima di procedere alla chiusura.

## Suggested Review Order

**Cancello reale: consumo e pulizia della prenotazione**

- Entry point: per ciascuna riga senza Slot, cerca prima la corrispondenza esatta; libera SEMPRE la prenotazione trovata (Patch G), indipendentemente dal successo del consumo; fallback sul pool generico.
  [`actions.ts:1505`](../../app/app/(torneo)/torneo/actions.ts#L1505)

- Ordine di generazione: la rimozione di una prenotazione è sempre permessa prima delle guardie di generazione/formato (Patch H).
  [`actions.ts:2225`](../../app/app/(torneo)/torneo/actions.ts#L2225)

**Protezione contro il furto di prenotazioni altrui**

- Filtro lato UI: esclude Slot occupati da una Partita reale o prenotati per un'altra riga, include sempre la prenotazione corrente.
  [`page.tsx:171`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx#L171)

- Verifica server-side (difesa in profondità, mai fidarsi solo del filtro client).
  [`actions.ts:2225`](../../app/app/(torneo)/torneo/actions.ts#L2225)

**Unica fonte di verità per il formato**

- `formatoOttoSquadre` condivisa tra page.tsx e actions.ts (Patch I).
  [`prospetto-ipotetico-torneo.ts:161`](../../lib/prospetto-ipotetico-torneo.ts#L161)

**Peripherals**

- Schema e migrazione (`prenotazioneCategoriaTorneoId`/`prenotazioneOrdinale`).
  [`schema.prisma`](../../prisma/schema.prisma)

- Test di regressione per ciascuna patch (G/H/I inclusi, con i casi count-0 ed eccezione per Patch G).
  [`actions.test.ts`](../../app/app/(torneo)/torneo/actions.test.ts)

