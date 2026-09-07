---
title: 'Story 20.26: Generazione reale del tabellone per il formato a 6 squadre'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'f498f4f4a145c04f0c87386a9486dc00f10b622b'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** per una Categoria nel formato "6 squadre" (2 gironi da 3), esiste oggi solo il prospetto ipotetico (Story 20.20, sola anteprima) - `generaTabelloneAction` richiede esattamente 4 Squadre in ciascun girone e rifiuta qualunque altro conteggio, quindi non esiste ancora un percorso di generazione reale del tabellone per questo formato.

**Approach:** estendere `generaTabelloneAction` per riconoscere anche il formato 3+3 (stesso rilevamento già usato dal prospetto ipotetico) e generare, in quel caso, le 2 semifinali del tabellone 1°-4° (identiche al formato 8) più UNA SOLA partita diretta (fase `FINALE_VINCENTI`, tabellone `POSIZIONI_5_8`, senza semifinale né `FINALE_PERDENTI`) tra le terze classificate dei due gironi. `calcolaClassificaFinale` diventa format-aware, restituendo una classifica 1-6 quando `FINALE_PERDENTI` di `POSIZIONI_5_8` non esiste affatto (segnale univoco del formato 6).

## Boundaries & Constraints

**Always:**
- `generaTabelloneAction` accetta ORA esattamente 4+4 Squadre (comportamento invariato) O esattamente 3+3 (nuovo) - qualunque altra combinazione resta rifiutata con messaggio esplicito, come oggi.
- Formato rilevato riusando `formatoOttoSquadre`/nuova `formatoSeiSquadre` (lib/prospetto-ipotetico-torneo.ts) - unica fonte di verità già condivisa con il prospetto ipotetico e con `prenotaSlotIpoteticoAction`, mai una terza implementazione indipendente della stessa soglia.
- Formato 3+3: le 2 semifinali del tabellone 1°-4° sono identiche al formato 8 (1°A-2°B, 1°B-2°A) - stesse finali automatiche vincenti/perdenti già esistenti (`generaFinaliSeCompletate`, invariata). Il 5°-6° posto è un'UNICA partita diretta (`FINALE_VINCENTI`/`POSIZIONI_5_8`) tra 3°A e 3°B, creata subito insieme alle semifinali - MAI una `SEMIFINALE` né una `FINALE_PERDENTI` per quel tabellone in questo formato.
- L'auto-assegnazione best-effort di uno Slot (`assegnaSlotAutomaticamente`, invariata) si applica anche alla nuova partita diretta, mirror delle chiamate già esistenti per le semifinali.
- `calcolaClassificaFinale` restituisce una classifica 1-6 quando `FINALE_PERDENTI` di `POSIZIONI_5_8` non esiste affatto e le altre 3 finali sono complete; resta 1-8 (o `null` finché incomplete) quando quella riga esiste, comportamento invariato per il formato 8.
- Vista admin (`tabellone/page.tsx`): la sezione del tabellone 5°-8° non mostra l'intestazione "Semifinali" quando non ce ne sono (mirror della stessa condizione già usata dal prospetto ipotetico), e il suo titolo diventa "Finalina 5°/6° posto" invece di "Tabellone posizioni 5°-8°" quando il formato rilevato è 6 - stessa etichetta già usata dal prospetto ipotetico per la stessa situazione.
- **Prenotazione anticipata di Slot (Story 20.21) estesa al formato 6**: decisione dell'utente durante il checkpoint di questa story - ora che il formato 3+3 ha un percorso di generazione reale, la prenotazione diventa disponibile anche lì. Il meccanismo esistente (`prenotaSlotIpoteticoAction`, `trovaSlotPrenotato`, `assegnaSlotAutomaticamente`) è già generico su qualunque `(fase, tabellone, ordinale)` - la fase `FINALE_VINCENTI` con `ordinale: null` è già lo stesso identico meccanismo già usato oggi per prenotare le finali del formato 8 (nessuna estensione al motore di prenotazione, solo tre punti): (1) `sezionePosizioni5_6Formato6` (lib/prospetto-ipotetico-torneo.ts) valorizza ora `fase: "FINALE_VINCENTI", tabellone: "POSIZIONI_5_8", ordinale: null` sull'accoppiamento della finalina diretta (oggi lasciati `undefined` perché non esisteva un percorso di generazione reale); (2) `prenotaSlotIpoteticoAction` accetta il formato 6 oltre al formato 8 (`formatoOttoSquadre(...) || formatoSeiSquadre(...)`); (3) `tabellone/page.tsx` monta `PrenotaSlotIpoteticoForm` anche per le righe del formato 6 (stesso `mostraPrenotazione` esteso ai due formati).

**Ask First:** nessuna - i punti sopra sono già decisi qui (compreso il punto sulla prenotazione anticipata, deciso con l'utente durante il checkpoint), mirror diretto delle convenzioni già stabilite in Story 20.4/20.9/20.20/20.21.

**Never:** nessuna modifica allo schema Prisma (il formato 6 riusa per intero `FaseTorneo`/`TabelloneTorneo` esistenti, e il motore di prenotazione esistente senza alcuna nuova colonna). Nessuna modifica alla pagina pubblica `/torneo` (la rendering esistente già gestisce correttamente questo caso, verificato leggendo il codice).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin genera il tabellone per una Categoria 3+3 con gironi completi | 3 Squadre per girone, classifiche complete | create 2 semifinali (1°-4°) + 1 finale diretta (5°-6°, fase `FINALE_VINCENTI`) | N/A |
| Admin inserisce i risultati di entrambe le semifinali 1°-4° (formato 6) | semifinali complete | le 2 finali 1°-4° (vincenti/perdenti) generate automaticamente, invariato | N/A |
| Admin inserisce il risultato della finale diretta 5°-6° (formato 6) | risultato completo | nessuna generazione automatica aggiuntiva (non è una semifinale) | N/A |
| Tutte le finali di una Categoria 3+3 sono complete (1°-4° vincenti/perdenti + 5°-6° diretta) | 3 finali complete | `calcolaClassificaFinale` restituisce 6 posizioni | N/A |
| Categoria con conteggi diversi da 4+4/3+3 | es. 5+5, 4+3 | generazione rifiutata, come oggi | `VALIDATION` |
| Admin prenota uno Slot sulla finalina diretta 5°-6° di una Categoria 3+3 | Categoria in formato 6, girone in corso | Slot marcato per quella Categoria (fase `FINALE_VINCENTI`, tabellone `POSIZIONI_5_8`, ordinale `null`) | N/A |

</frozen-after-approval>

## Code Map

- `lib/prospetto-ipotetico-torneo.ts` -- nuova `formatoSeiSquadre(numeroGironeA, numeroGironeB): boolean`, mirror di `formatoOttoSquadre` esistente; `calcolaProspettoIpoteticoTorneo` riusa la nuova funzione al posto del controllo inline `=== 3 && === 3`
- `app/app/(torneo)/torneo/actions.ts` -- `generaTabelloneAction` (riga ~1707): il controllo "< 4 Squadre" diventa "né `formatoOttoSquadre` né `formatoSeiSquadre`" → rifiutato con messaggio aggiornato; nuovo ramo per il formato 3+3 che genera 2 righe (semifinali 1°-4°, identiche al formato 8) + 1 riga diretta (`FINALE_VINCENTI`/`POSIZIONI_5_8`, 3°A vs 3°B) invece delle 4 righe attuali; chiamata aggiuntiva ad `assegnaSlotAutomaticamente` per la nuova fase/tabellone diretto (mirror delle chiamate esistenti)
- `lib/classifica-finale-torneo.ts` -- `calcolaClassificaFinale`: distingue "`FINALE_PERDENTI` di `POSIZIONI_5_8` non esiste affatto" (formato 6, ritorna 1-6) da "esiste ma incompleta" (formato 8, ritorna `null`) da "esiste e completa" (formato 8, ritorna 1-8)
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx` -- sezione tabellone 5°-8°: `<h3>Semifinali</h3>` mostrato solo quando `semifinali.length > 0`; titolo sezione diventa "Finalina 5°/6° posto" quando il formato rilevato (stessi conteggi Squadre già disponibili in pagina, `formatoSeiSquadre`) è 6 invece di 8; `mostraPrenotazione` esteso a `formatoOttoSquadre || formatoSeiSquadre` (prospetto ipotetico, ramo `!tabelloneGenerato`)
- `lib/prospetto-ipotetico-torneo.ts` -- `sezionePosizioni5_6Formato6`: l'accoppiamento della finalina diretta valorizza ora `fase: "FINALE_VINCENTI"`, `tabellone: "POSIZIONI_5_8"`, `ordinale: null` (oggi tutti `undefined`) - stesso meccanismo di prenotazione già usato per le finali del formato 8, nessuna estensione al motore
- `app/app/(torneo)/torneo/actions.ts` -- `prenotaSlotIpoteticoAction`: il controllo di formato diventa `formatoOttoSquadre(...) || formatoSeiSquadre(...)` invece del solo `formatoOttoSquadre`

## Tasks & Acceptance

**Execution:**
- [ ] `lib/prospetto-ipotetico-torneo.ts` -- `formatoSeiSquadre` + refactor `calcolaProspettoIpoteticoTorneo` + test
- [ ] `torneo/actions.ts` -- `generaTabelloneAction` esteso per il formato 3+3 + test
- [ ] `lib/classifica-finale-torneo.ts` -- `calcolaClassificaFinale` format-aware + test
- [ ] `tabellone/page.tsx` -- adattamento vista sezione 5°-8° per il formato 6 + `mostraPrenotazione` esteso
- [ ] `prenotaSlotIpoteticoAction` -- accetta anche il formato 6 + test

**Acceptance Criteria:**
- Given una Categoria 3+3 con gironi completi, when l'Admin genera il tabellone, then vengono create esattamente 3 partite (2 semifinali 1°-4° + 1 finale diretta 5°-6°), mai una semifinale né una finale perdenti per il tabellone 5°-8°
- Given tutte e 3 le finali di una Categoria 3+3 complete, when la pagina Tabellone viene renderizzata, then la classifica finale mostra 6 posizioni
- Given una Categoria con conteggi Squadre diversi da 4+4/3+3, when si tenta di generare il tabellone, then l'operazione resta rifiutata come oggi
- Given una Categoria 3+3 con girone in corso, when l'Admin prenota uno Slot sulla finalina diretta 5°-6° e poi genera il tabellone reale, then quella partita riceve esattamente lo Slot prenotato

## Design Notes

**Perché la finalina diretta è modellata come `FINALE_VINCENTI` di `POSIZIONI_5_8` invece di un nuovo valore enum:** riusa per intero `FaseTorneo`/`TabelloneTorneo` esistenti, nessuna migrazione - l'etichetta "Finale 5°/6° posto" (`TABELLONI_TORNEO`) è già letteralmente corretta per questa fase/tabellone, l'unica differenza è che qui non è preceduta da alcuna semifinale.

**Perché `generaFinaliSeCompletate` non richiede modifiche:** per il tabellone 1°-4° funziona identica indipendentemente dal formato; per il 5°-8° in formato 6 non esiste mai una `SEMIFINALE` per quel tabellone, quindi il suo controllo `semifinali.length !== 2` la fa sempre uscire subito - innocuo, mai invocata utilmente in quel caso.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, inclusi i nuovi/estesi test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (obbligatorio, dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Categoria 3+3 con gironi completi: generare il tabellone, verificare le 2 semifinali 1°-4° e l'unica finale diretta 5°-6° (nessuna semifinale per quest'ultima).
- Inserire i risultati delle 2 semifinali 1°-4°: verificare la generazione automatica delle finali vincenti/perdenti.
- Inserire il risultato della finale diretta 5°-6° e delle finali 1°-4°: verificare che la classifica finale mostri 6 posizioni.
- Verificare la vista pubblica `/torneo` per la stessa Categoria: la sezione 5°-8° deve mostrare solo la finale diretta, senza righe vuote o errori.

## Suggested Review Order

**Il cuore della story: generazione reale per il formato 3+3**

- Rilevamento formato condiviso (`formatoOttoSquadre`/`formatoSeiSquadre`, unica fonte di verità) e ramo `righe` che genera 3 righe invece di 4 per il formato 6 (nessuna `SEMIFINALE`/`FINALE_PERDENTI` su `POSIZIONI_5_8`).
  [`actions.ts:1744`](../../app/app/(torneo)/torneo/actions.ts#L1744)

- `calcolaClassificaFinale` format-aware: l'assenza totale di `FINALE_PERDENTI`/`POSIZIONI_5_8` (non "esiste ma incompleta") è il segnale del formato 6 → classifica 1-6 invece di `null`.
  [`classifica-finale-torneo.ts:93`](../../lib/classifica-finale-torneo.ts#L93)

**Estensione della prenotazione anticipata al formato 6 (richiesta aggiunta al checkpoint)**

- Prenotazione ipotetica della finalina diretta: `sezionePosizioni5_6Formato6` ora valorizza `fase`/`tabellone`/`ordinale` come le altre righe (prima tutti `undefined`, nessun percorso reale esisteva).
  [`prospetto-ipotetico-torneo.ts:150`](../../lib/prospetto-ipotetico-torneo.ts#L150)

- Review fix: `prenotaSlotIpoteticoAction` rifiuta una combinazione fase/tabellone impossibile nel formato rilevato (es. `SEMIFINALE`/`POSIZIONI_5_8` per una Categoria 3+3) - senza questo controllo una prenotazione simile resterebbe orfana per sempre, nessuna riga reale la consumerebbe mai.
  [`actions.ts:2381`](../../app/app/(torneo)/torneo/actions.ts#L2381)

**Vista admin: adattamento della sezione 5°-8° per il formato 6**

- Titolo sezione ("Finalina 5°/6° posto" invece di "Tabellone posizioni 5°-8°") e intestazione "Semifinali" omessa quando non ce ne sono.
  [`tabellone/page.tsx:346`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx#L346)

