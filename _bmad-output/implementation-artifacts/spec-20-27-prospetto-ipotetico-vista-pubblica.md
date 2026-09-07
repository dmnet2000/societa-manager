---
title: 'Story 20.27: Prospetto ipotetico della seconda fase sulla vista pubblica'
type: 'feature'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '78b4097bc86aeb61a8108fc46d620c457b3ea4b2'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** sulla vista pubblica `/torneo`, finché il tabellone reale di una Categoria non è generato, la sezione "Tabellone semifinali/finali" mostra solo il messaggio "Tabellone semifinali/finali non ancora generato." - il prospetto ipotetico di sola lettura (Story 20.20, già mostrato nell'area admin) non è visibile ai visitatori.

**Approach:** riusare `calcolaProspettoIpoteticoTorneo` (lib/prospetto-ipotetico-torneo.ts, stessa funzione pura già usata in admin) per renderizzare lo stesso prospetto ipotetico, di sola lettura, dentro la sezione "Tabellone semifinali/finali" già esistente di ciascuna Categoria su `app/torneo/page.tsx` - le sezioni restano divise per Categoria (già così strutturato, un `<section>` per Categoria).

## Boundaries & Constraints

**Always:** riusare `calcolaProspettoIpoteticoTorneo(numeroGironeA, numeroGironeB)` esattamente come in admin (tabellone/page.tsx) - stessi due conteggi derivati da `squadre` già caricate per la Categoria (`squadre.filter(s => s.girone === "GIRONE_A").length`, idem per B), nessuna nuova logica di calcolo. Calcolato SOLO quando `!tabelloneGenerato` (nessun uso altrove). Quando il prospetto è `null` (formato diverso da 4+4/3+3), mostrare un messaggio esplicito invece del prospetto - mirror del messaggio già usato in admin ("Il prospetto ipotetico è disponibile solo quando..."), mai un'area vuota senza spiegazione. Per la finalina diretta del formato 6 (nessuna semifinale, `sezione.semifinali.length === 0`), omettere il prefisso etichetta quando è la stessa stringa del titolo sezione - stesso review fix già applicato in admin (Verification Gap Reviewer, Story 20.20/20.26).

**Ask First:** nessuna prevista.

**Never:** nessun controllo di prenotazione anticipata Slot (`PrenotaSlotIpoteticoForm`/`prenotaSlotIpoteticoAction`) - resta una funzionalità esclusivamente admin (spec-20-21 Boundaries), la pagina pubblica non ha sessione/ruolo. Nessuna PartitaTorneo creata/modificata (garantito dalla sola lettura via funzione pura). Nessuna modifica al ramo `tabelloneGenerato` esistente (tabellone reale già funzionante, fuori scope).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Formato 8 (4+4), girone in corso | `tabelloneGenerato=false`, 4 Squadre/Girone | Prospetto con Tabellone 1°-4° (2 semifinali + 2 finali) e Tabellone 5°-8° (2 semifinali + 2 finali) | N/A |
| Formato 6 (3+3), girone in corso | `tabelloneGenerato=false`, 3 Squadre/Girone | Prospetto con Tabellone 1°-4° e Finalina 5°/6° diretta (nessuna semifinale, un solo accoppiamento) | N/A |
| Formato non riconosciuto | `tabelloneGenerato=false`, es. 5+3 Squadre | Messaggio esplicito "prospetto non disponibile", nessuna area vuota | N/A |
| Nessuna Squadra iscritta | `tabelloneGenerato=false`, 0+0 Squadre | Stesso messaggio esplicito del caso sopra (0 !== 4 e 0 !== 3) | N/A |
| Tabellone già generato | `tabelloneGenerato=true` | Comportamento invariato (tabellone reale, non toccato da questa story) | N/A |

</frozen-after-approval>

## Code Map

- `app/torneo/page.tsx` -- import `calcolaProspettoIpoteticoTorneo` da `@/lib/prospetto-ipotetico-torneo`; dentro il map delle Categorie (dopo il calcolo di `tabelloneGenerato`, riga ~192), calcolare `numeroGironeA`/`numeroGironeB` da `squadre` (stesso pattern di tabellone/page.tsx) e `prospettoIpotetico = !tabelloneGenerato ? calcolaProspettoIpoteticoTorneo(numeroGironeA, numeroGironeB) : null`; sostituire il ramo `!tabelloneGenerato` della sezione "Tabellone semifinali/finali" (righe ~398-401, oggi un solo `<p className={styles.messaggioSezione}>Tabellone semifinali/finali non ancora generato.</p>`) con il rendering del prospetto, mirror di `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx` righe ~228-298 MA senza `PrenotaSlotIpoteticoForm`/`mostraPrenotazione` (nessun form, nessun import di `formatoOttoSquadre`/`formatoSeiSquadre`, non servono qui: bastano `sezione.semifinali`/`sezione.finali` così come restituiti).
- `lib/prospetto-ipotetico-torneo.ts` -- nessuna modifica, riusato tale e quale (`calcolaProspettoIpoteticoTorneo`, `AccoppiamentoIpotetico`, `SezioneProspettoIpotetico` già esportati).
- `app/torneo/torneo-pubblico.module.css` -- riuso di classi esistenti: `.messaggioSezione` (messaggi/note), nessuna nuova classe prevista salvo necessità emersa in implementazione (es. spaziatura fra sezioni del prospetto - valutare riuso di `.sezioneGirone`/margini inline minimi).

## Tasks & Acceptance

**Execution:**
- [x] `app/torneo/page.tsx` -- calcolare `numeroGironeA`/`numeroGironeB`/`prospettoIpotetico` per Categoria e renderizzare il prospetto ipotetico di sola lettura nel ramo `!tabelloneGenerato` -- porta in vista pubblica ciò che l'admin già vede, sola lettura
- [x] `app/torneo/page.test.tsx` o test esistente pertinente -- se una suite di test copre già questa pagina, estenderla con i 4 scenari della I/O Matrix; altrimenti verificare manualmente (pagina server component, nessuna suite di test di rendering esiste oggi per questo file - stesso principio "niente test di rendering per componenti React" già stabilito nel progetto) -- nessuna suite esiste, confermato; verifica manuale rimandata al primo deploy utile, come da Verification

**Acceptance Criteria:**
- Given una Categoria in formato 8 con girone in corso, when un visitatore apre `/torneo`, then vede il Tabellone 1°-4° e 5°-8° ipotetici con le posizioni placeholder, nessun nome Squadra reale per le posizioni non ancora decise
- Given una Categoria in formato 6 con girone in corso, when un visitatore apre `/torneo`, then vede il Tabellone 1°-4° ipotetico e la Finalina 5°/6° diretta (nessuna semifinale mostrata per quella riga)
- Given una Categoria con conteggi Squadre che non formano né 4+4 né 3+3, when un visitatore apre `/torneo`, then vede un messaggio esplicito invece di un'area vuota
- Given più Categorie nella stessa Edizione con stati diversi (una già con tabellone generato, una ancora in girone), when un visitatore apre `/torneo`, then ciascuna sezione Categoria mostra il contenuto corretto per il proprio stato, senza mescolarsi con le altre

## Design Notes

Il rendering è deliberatamente un sottoinsieme di quello admin: stessa struttura ad albero (sezione tabellone → eventuali semifinali → finali, con l'omissione del prefisso etichetta per la finalina diretta), ma senza alcun controllo interattivo. Non serve importare `formatoOttoSquadre`/`formatoSeiSquadre` qui: quelle funzioni servono solo a decidere se montare il form di prenotazione (admin-only), la vista pubblica non ne ha bisogno perché `sezione.semifinali`/`sezione.finali` già riflettono la forma corretta per il formato rilevato.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx vitest run` -- expected: tutti verdi (nessuna nuova suite di rendering prevista, coerente con l'assenza di test di rendering per componenti React in questo progetto)

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/torneo` per un'Edizione con almeno una Categoria in formato 8 e una in formato 6, entrambe ancora in fase di girone: verificare che ciascuna mostri il proprio prospetto ipotetico corretto, sezioni separate.
- Aprire `/torneo` per una Categoria con un conteggio Squadre non standard (es. 5+3): verificare il messaggio esplicito, nessuna area vuota.

## Suggested Review Order

**Il cuore della story: prospetto ipotetico riusato in sola lettura**

- Calcolo di `numeroGironeA`/`numeroGironeB` (stesso pattern posizionale già in uso in admin) e `prospettoIpotetico`, calcolato solo quando `!tabelloneGenerato`.
  [`app/torneo/page.tsx:208`](../../app/torneo/page.tsx#L208)

- Rendering del prospetto nel ramo `!tabelloneGenerato`: messaggio esplicito quando `null`, altrimenti le sezioni con l'omissione del prefisso etichetta per la finalina diretta del formato 6 - nessun controllo di prenotazione Slot (resta solo admin).
  [`app/torneo/page.tsx:418`](../../app/torneo/page.tsx#L418)

**Review fix: guida in-app aggiornata**

- La guida admin della rotta `/app/torneo` ora segnala che il prospetto ipotetico è visibile anche pubblicamente, senza il menu di prenotazione.
  [`lib/guida/contenuti.ts:462`](../../lib/guida/contenuti.ts#L462)
