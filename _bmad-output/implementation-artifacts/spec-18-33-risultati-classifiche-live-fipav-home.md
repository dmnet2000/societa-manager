---
title: 'Story 18.33: Risultati e classifiche recuperati in tempo reale dal portale FIPAV, in evidenza sulla home pubblica'
type: 'feature'
created: '2026-09-27'
status: 'done'
review_loop_iteration: 1
context: ['{project-root}/_bmad-output/planning-artifacts/epics.md']
baseline_commit: 'd9d2187fa8bc94b5f087c184f778e612ad3b81a3'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi la home pubblica mostra solo le prossime partite della settimana (Story 18.3), lette da `Partita` locale — nessun risultato passato né classifica è mai mostrato pubblicamente, e i dati locali sono aggiornati solo se qualcuno esegue la sincronizzazione manuale FIPAV (Story 10.11).

**Approach:** nuova sezione "Risultati della settimana scorsa" + una sezione classifica per Campionato, PRIMA di "Partite della settimana" esistente, con dati recuperati con un fetch HTTP live al portale FIPAV (stessa `Campionato.linkFipav` già esistente) al momento della visita — mai da `Partita`/DB. Indagine dal vivo (2026-09-27, `fipavtreuno.net`): la classifica vive sulla STESSA pagina di `linkFipav`, in una seconda tabella `table.tbl.tbl-classifica` (Pos/Squadra/Punti/PG/PV/PP/SF/SS/QS/PF/PS/QP/Penal.), già "all'ultima giornata" di default — un solo fetch per Campionato copre sia risultati sia classifica.

## Boundaries & Constraints

**Always:**
- Nessun nuovo campo su `Campionato` — riuso di `linkFipav` esistente per entrambe le tabelle.
- Percorso interamente read-only: MAI una scrittura su `Partita`/DB da qui — resta indipendente dalla sincronizzazione manuale esistente (`sincronizzaGareFipav`, Story 10.11), che non viene toccata.
- Fail-soft per singolo Campionato: un fetch fallito, in timeout, con risposta non-ok, o con HTML privo di `table.tbl.tbl-risultati`/`table.tbl.tbl-classifica` (formato portale cambiato) fa omettere silenziosamente quel blocco — mai un errore visibile, mai un Campionato che blocca gli altri o il resto della home.
- Un Campionato senza `linkFipav` impostato non mostra alcun blocco (nessun messaggio "non disponibile") — mirror del pulsante di sincronizzazione manuale esistente (Story 10.11 AC #2).
- Stessa configurazione di fetch già stabilita in `sincronizzaGareFipav` (`app/app/(partite-campionati)/campionati/sincronizza-fipav-actions.ts:79-92`): `redirect: "follow"`, `AbortSignal.timeout(10000)`, header `User-Agent` esplicito — mirror esatto, non una seconda convenzione.
- Cache breve via Next.js `fetch(url, { next: { revalidate: N } })` (N a discrezione dello sviluppo, es. 600s) invece di un fetch letteralmente per-singolo-visitatore — resta "sempre aggiornato" in pratica senza sovraccaricare un sito di terzi.
- "Risultati della settimana scorsa" e le sezioni classifica compaiono PRIMA di "Partite della settimana" (Story 18.3, `app/page.tsx` riga ~322), che resta invariata subito dopo, stesso comportamento/markup di oggi.
- Riuso di `lunediDellaSettimana`/`formattaDataIso`/`parseDataUtc` (già importate in `app/page.tsx`, `lib/raggruppa-per-settimana.ts`) per calcolare i confini della settimana PRECEDENTE (stessa aritmetica già in uso per la settimana corrente, spostata indietro di 7 giorni) — filtro applicato lato nostro sulle righe risultato del fetch live (il portale non supporta un filtro data nella URL).

**Ask First:** nessuna — le 5 decisioni rilevanti sono già chiuse (epics.md, Story 18.33, 2026-09-27).

**Never:** nessuna scrittura su `Partita`/DB da questa sezione pubblica. Nessun nuovo campo `linkClassificaFipav` (la classifica vive sulla stessa pagina di `linkFipav`, verificato dal vivo). Nessuna modifica al pulsante di sincronizzazione manuale esistente (`/app/campionati`) né alla sua logica di upsert.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Campionato con `linkFipav`, pagina raggiungibile, gare disputate la settimana scorsa | Fetch riuscito | Sezione "Risultati della settimana scorsa" mostra quelle gare (squadre, risultato) per quel Campionato | N/A |
| Campionato con `linkFipav`, nessuna gara nella settimana precedente | Fetch riuscito, righe fuori range data | Nessun blocco risultati per quel Campionato (silenzioso) | N/A |
| Campionato con `linkFipav`, pagina raggiungibile | Fetch riuscito | Sezione classifica per quel Campionato con la tabella "all'ultima giornata" (almeno Pos./Squadra/Punti) | N/A |
| Campionato senza `linkFipav` | `linkFipav` null | Nessun blocco risultati/classifica per quel Campionato | N/A |
| Portale FIPAV irraggiungibile/timeout/errore HTTP per un Campionato | Fetch fallisce | Quel Campionato omesso (risultati e classifica), altri Campionati/resto della home intatti | Nessun errore visibile, log server-side |
| HTML restituito senza `table.tbl.tbl-risultati`/`table.tbl.tbl-classifica` (formato cambiato) | Parsing fallisce | Stesso comportamento del caso sopra (omesso) | Nessun errore visibile |
| Nessun Campionato della stagione corrente ha `linkFipav` | Tutti null | Nessuna sezione risultati/classifica mostrata | N/A |

</frozen-after-approval>

## Code Map

- `lib/sincronizza-gare-fipav/parser.ts:1-222` -- aggiungere `analizzaHtmlClassificaFipav(html): RigaClassificaFipav[]`, sibling di `analizzaHtmlGareFipav` esistente; selettore `table.tbl.tbl-classifica` (verificato dal vivo 2026-09-27), colonne Pos./Squadra/Punti/PG/PV/PP/SF/SS/QS/PF/PS/QP/Penal.; stesso fail-soft per-riga (try/catch) e throw solo se la tabella stessa manca, mirror di `analizzaHtmlGareFipav`.
- Nuovo file (nome a discrezione, es. `lib/sincronizza-gare-fipav/leggi-live-fipav.ts`) -- funzione pura di lettura read-only: dato un `linkFipav`, fetch con la stessa config di `sincronizza-fipav-actions.ts:79-92` avvolto in `next: { revalidate }`, poi `analizzaHtmlGareFipav` + `analizzaHtmlClassificaFipav`; ritorna `null` (mai un throw) su risposta non-ok, eccezione di rete/timeout, o tabella mancante.
- `app/page.tsx:107-207` -- nuova query `prisma.campionato.findMany({ where: { annoAgonisticoId: annoCorrente.id, linkFipav: { not: null } }, select: { id, nome, colore, linkFipav, gruppo: { select: { nome: true } } } })` dentro il `Promise.all` esistente; poi, fuori dal `Promise.all` (dipende dal suo risultato, mirror del pattern già usato per `postFacebook` riga 216), un fetch live in parallelo per Campionato via la funzione sopra, ciascuno con `.catch(() => null)`.
- `app/page.tsx:313-325` -- nuove sezioni JSX "Risultati della settimana scorsa" e classifica per Campionato, PRIMA della sezione "Partite della settimana" esistente (riga 322) — mirror dello stile card/colore già in uso lì (`testoScuroSuSfondo`, `formattaData`, `styles.schedaPartita`).
- `app/home-pubblica.module.css` -- nuove classi per le due sezioni, mirror di `.sezionePartite`/`.schedaPartita`/`.listaPartite` già presenti.
- `lib/raggruppa-per-settimana.ts:31-49` -- `parseDataUtc`/`lunediDellaSettimana`/`formattaDataIso` riusate (non duplicate) per calcolare i confini della settimana precedente.
- Review fix: `lib/sincronizza-gare-fipav/vista-home-live.ts` (nuovo) -- `risultatiSettimanaScorsaDaLetture`/`classifichePerCampionatoDaLetture`, logica di filtro/formazione estratta da `app/page.tsx` (era inline, non testabile) in due funzioni pure testate a sé.

## Tasks & Acceptance

**Execution:**
- [x] `lib/sincronizza-gare-fipav/parser.ts` -- `analizzaHtmlClassificaFipav` + tipo `RigaClassificaFipav` + test unitari (HTML reale/parziale/tabella mancante)
- [x] Nuovo file lettura live FIPAV (read-only, fail-soft, cache breve) -- `lib/sincronizza-gare-fipav/leggi-live-fipav.ts` + test (fetch mockato: successo, timeout, risposta non-ok, HTML senza le tabelle attese)
- [x] `app/page.tsx` -- query Campionati con `linkFipav` della stagione corrente + fetch live in parallelo per Campionato + nuove sezioni JSX prima di "Partite della settimana"
- [x] `app/home-pubblica.module.css` -- nuove classi per le due sezioni
- [x] Test: verificare che un fallimento su un Campionato non impedisca il rendering degli altri né della sezione "Partite della settimana" esistente -- coperto in `lib/sincronizza-gare-fipav/vista-home-live.test.ts` (logica di filtro/formazione estratta da `app/page.tsx` in `vista-home-live.ts`, review fix: era inline nel Server Component, non testabile; ora una funzione pura testata a sé, come `leggiLiveFipav` che isola ogni Campionato in `Promise.all`/`.catch(() => null)`)
- [x] Review fix: `analizzaHtmlClassificaFipav` usava `tabella.querySelectorAll("tbody tr")` (mirror di `analizzaHtmlGareFipav`) -- verificato con un fetch live reale contro il portale che `table.tbl.tbl-classifica` NON ha un `<tbody>` (a differenza di `table.tbl.tbl-risultati`, che ce l'ha): il selettore trovava sempre zero righe, silenziosamente, in produzione. Corretto in `tabella.querySelectorAll("tr")` (le righe di intestazione in `<thead>`, con celle `<th>`, vengono scartate naturalmente dal controllo esistente `celle.length < 3`). Nuovo test di regressione con la forma reale (nessun `<tbody>`, `<thead>` con `<th>`).

**Acceptance Criteria:**
- Vedi Story 18.33 completa in `_bmad-output/planning-artifacts/epics.md` (Epic 18) — 6 AC con le 5 decisioni chiuse il 2026-09-27, riportate qui per intero come parte del contratto di questa spec.

## Design Notes

**Perché un solo fetch per Campionato copre sia risultati sia classifica:** l'indagine dal vivo (2026-09-27) ha verificato che `table.tbl.tbl-classifica` compare sulla stessa pagina già puntata da `linkFipav`, subito dopo `table.tbl.tbl-risultati` — evita sia un secondo campo URL sia una seconda richiesta HTTP per Campionato (che raddoppierebbe la latenza/il rischio di fallimento della home pubblica).

**Perché una cache breve (`revalidate`) e non un fetch letterale ad ogni visita:** un girone di pallavolo non cambia risultato/classifica più di una volta ogni pochi giorni — una richiesta fresca per ogni singolo visitatore sovraccaricherebbe inutilmente un portale di terzi senza SLA, senza alcun beneficio percepibile ("sempre aggiornato" resta vero in pratica con una finestra di pochi minuti).

## Suggested Review Order

**Fetch live + cache (il cuore della storia)**

- Entry point: fetch read-only fail-soft, mai un throw, mirror della config di `sincronizzaGareFipav`.
  [`leggi-live-fipav.ts:111`](../../lib/sincronizza-gare-fipav/leggi-live-fipav.ts#L111)

- Bug corretto in review: `dynamic = "force-dynamic"` (pre-esistente) annullava `next.revalidate` sul fetch — `unstable_cache` (Data Cache di Next.js, indipendente dal segmento) è ora il vero livello di cache.
  [`leggi-live-fipav.ts:115`](../../lib/sincronizza-gare-fipav/leggi-live-fipav.ts#L115)

**Parsing HTML del portale FIPAV**

- Bug corretto in review, verificato con un fetch reale contro il portale: `table.tbl.tbl-classifica` non ha `<tbody>` (a differenza di `tbl-risultati`) — il selettore `"tbody tr"` avrebbe sempre restituito zero righe.
  [`parser.ts:319`](../../lib/sincronizza-gare-fipav/parser.ts#L319)

- Nuovo parser classifica, colonne posizionali verificate dal vivo (Pos./Squadra/Punti/PG/PV/PP/SF/SS/QS/PF/PS/QP/Penal.).
  [`parser.ts:301`](../../lib/sincronizza-gare-fipav/parser.ts#L301)

**Formazione dati per la home (estratta per restare testabile)**

- Filtro settimana precedente + ordinamento, con chiave React deduplicata (review fix) e `statoDescrizione` propagato (review fix).
  [`vista-home-live.ts:49`](../../lib/sincronizza-gare-fipav/vista-home-live.ts#L49)

- Una card per Campionato, solo se la lettura è riuscita con classifica non vuota.
  [`vista-home-live.ts:96`](../../lib/sincronizza-gare-fipav/vista-home-live.ts#L96)

**Home pubblica (`app/page.tsx`)**

- Query Campionati con `linkFipav` della stagione corrente, con `orderBy` (review fix, ordine altrimenti non deterministico).
  [`page.tsx:133`](../../app/page.tsx#L133)

- Fetch live in parallelo per Campionato, isolato per Campionato (`.catch(() => null)`) — un portale lento/rotto non deve mai bloccare gli altri o il resto della home.
  [`page.tsx:277`](../../app/page.tsx#L277)

- Nuova sezione "Risultati della settimana scorsa", PRIMA di "Partite della settimana" esistente (invariata subito dopo).
  [`page.tsx:412`](../../app/page.tsx#L412)

- Nuova sezione classifica, una card per Campionato con `<caption>` invisibile (review fix, contesto per screen reader).
  [`page.tsx:459`](../../app/page.tsx#L459)

**Peripherali**

- Nuove classi CSS per le due sezioni, mirror dello stile card già esistente.
  [`home-pubblica.module.css:628`](../../app/home-pubblica.module.css#L628)

- Guida in-app aggiornata per `/app/campionati` (review fix, regola permanente del progetto).
  [`contenuti.ts:381`](../../lib/guida/contenuti.ts#L381)

- Test: parser classifica (incl. regressione "nessun `<tbody>`"), fetch live (incl. `unstable_cache`), formazione dati home.
  [`parser.test.ts`](../../lib/sincronizza-gare-fipav/parser.test.ts) · [`leggi-live-fipav.test.ts`](../../lib/sincronizza-gare-fipav/leggi-live-fipav.test.ts) · [`vista-home-live.test.ts`](../../lib/sincronizza-gare-fipav/vista-home-live.test.ts)

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: nessun errore
- `npx vitest run` -- expected: tutti i test passano, inclusi quelli nuovi
- `npx eslint <file toccati>` -- expected: nessun errore

**Manual checks (dopo il deploy, dev locale non disponibile su questa macchina):**
- Impostare `linkFipav` su un Campionato reale, verificare che la home mostri risultati/classifica coerenti con quanto visibile sul portale
- Verificare che un `linkFipav` non valido/irraggiungibile non rompa la home (sezione omessa, resto della pagina intatto)
- Verificare che "Partite della settimana" (Story 18.3) resti invariata subito dopo le nuove sezioni
