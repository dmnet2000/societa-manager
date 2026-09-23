---
title: 'Story 10.11: Sincronizzazione manuale delle Partite di un Campionato dal portale FIPAV/Lega'
type: 'feature'
created: '2026-09-23'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'a3b654afd8ea3961cdbd6b26f7f216e384299319'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi le Partite di un Campionato vanno importate a mano da un file Excel ogni volta che la Lega aggiorna calendario/risultati (Story 10.2) — nessun modo di sincronizzare direttamente dalla pagina del portale FIPAV già linkata in `Campionato.linkFipav` (Story 10.8).

**Approach:** nuovo bottone "Sincronizza da FIPAV" per Campionato (visibile solo se `linkFipav` è impostato) che scarica quella URL, parsa la tabella `tbl-risultati` con una libreria HTML server-side, e fa upsert delle Partite riusando la stessa chiave/logica già scritta per `importaGare` (Story 10.2) — non una seconda implementazione.

## Boundaries & Constraints

**Always:**
- Fonte dati: `Campionato.linkFipav` — bottone assente/disabilitato se vuoto.
- Parsing: nuova dipendenza `node-html-parser` (leggera, nessun problema noto con `nodejs_compat`, già abilitato in `wrangler.jsonc`/`wrangler.preview.jsonc`) — selettore `table.tbl.tbl-risultati tbody tr`. Per riga: numero gara (1ª cella), giornata (2ª), data/ora `gg/mm/aa hh:mm` → stesso formato già scritto da `analizzaFileGare` (`lib/importa-gare/parser.ts`); squadra casa/ospite = testo della cella (non l'attributo `title`); risultato = testo di `td.risultato` (es. `"3 - 0"`); parziali = testi di ogni `span.parziali` uniti con virgola (es. `"25-19,29-27,25-21"`); statoDescrizione = attributo `title` decodificato dell'icona di stato (`img.tips.ris-img` nell'ultima cella, non l'icona `info_16`); impianto/indirizzo = dentro il `title` (HTML-escaped) dell'icona `info_16`, formato `<p><b>Nome</b><br/>Città PR<br/>Indirizzo</p>` — nome → `impianto`, resto → `indirizzoImpianto`.
- Fetch: `fetch(linkFipav, { redirect: "follow", signal: AbortSignal.timeout(10000) })` — mirror del pattern già in uso (`app/app/(orari-palestre)/palestre/actions.ts:26-36`), timeout più alto (10s) perché la risposta è una pagina intera, non un redirect-check.
- Scrittura: stessa chiave/pattern di `importaGare` (`app/app/(partite-campionati)/campionati/importa-gare-actions.ts:74-124`) — `findUnique` su `gruppoId_campionatoId_garaNumero`, poi `update` o `create` (mai `prisma.partita.upsert` nativo, per coerenza), stesso trattamento del `P2002` concorrente.
- `risultato`/`parziali`/`statoDescrizione`/`giornata` sono SEMPRE scritti dall'upsert (nessun form li rende modificabili altrove).
- `data`/`ora`/`impianto`/`indirizzoImpianto` sono scritti SOLO se `modificataManualmente` della Partita esistente è `false`; se `true`, quei 4 campi restano invariati e la riga conta come "bloccata da modifica manuale" nel riepilogo (indipendentemente da un eventuale aggiornamento di risultato/parziali sulla stessa riga).
- Nuovo campo `Partita.modificataManualmente Boolean @default(false)` (migrazione additiva) — impostato a `true` da `aggiornaPartita` (`app/app/(partite-campionati)/partite/actions.ts:113-117`) ogni volta che un Allenatore/Admin/Dirigente salva una correzione di giorno/ora/impianto.
- Autorizzazione: stesso perimetro di `importaGare` — `requireRuolo(["ADMIN","DIRIGENTE","ALLENATORE"])` + `risolviAutorizzazioneGruppo(gruppoId)`, verifica `campionato.gruppoId === gruppoId`.
- Riepilogo dopo la sincronizzazione: create, aggiornate, bloccate-da-modifica-manuale, scartate (con motivo) — mirror di stile di `ImportaGareForm.tsx` (`role="status"`).
- Fail-soft per riga (una riga che non parsa va in "scartate" col motivo, non blocca le altre) e per l'intera chiamata (fetch fallita/HTML senza la tabella attesa → `{ error: { code, message } }` esplicito, nessuna scrittura in quel tentativo).
- `revalidatePath("/app/campionati")` e `revalidatePath("/app/partite")` (quest'ultima in più rispetto a `importaGare`, perché la vista `/app/partite` mostra gli stessi dati).

**Ask First:** nessuna — tutte le decisioni rilevanti erano già chiuse in epics.md (Story 10.11) prima di questa spec.

**Never:** nessun cron/sincronizzazione automatica (solo il bottone manuale). Nessuna rimozione dell'import Excel esistente (resta invariato, fallback). Nessun filtro per nome squadra (la URL con `SId` restituisce già solo le nostre partite, verificato dal vivo). Nessuna richiesta HTTP per singola gara (impianto/indirizzo sono già sulla riga della tabella).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Gara nuova (Gara N mai vista) | Riga valida, nessuna Partita con quella chiave | Partita creata | N/A |
| Gara esistente, mai modificata a mano | Riga valida, Partita con `modificataManualmente=false` | Tutti i campi aggiornati | N/A |
| Gara esistente, corretta a mano (Story 10.4) | Riga valida, Partita con `modificataManualmente=true` | Solo risultato/parziali/statoDescrizione/giornata aggiornati; data/ora/impianto invariati; conteggio "bloccata" | N/A |
| Riga non interpretabile (cella mancante/formato inatteso) | HTML anomalo su una riga | Riga saltata, motivo nel riepilogo | riga in `scartate`, sync prosegue |
| `linkFipav` irraggiungibile o tabella `tbl-risultati` assente | Timeout/HTML cambiato | Nessuna scrittura, errore esplicito | `{ error: { code: "INTERNAL", message } }` |
| Allenatore non proprietario del Gruppo | Ruolo insufficiente | Rifiutato | `{ error: { code: "FORBIDDEN"/"VALIDATION", message } }` |
| `linkFipav` vuoto | Campionato senza URL salvata | Bottone assente in UI; azione rifiutata anche se invocata direttamente | `{ error: { code: "VALIDATION", message } }` |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma:583` -- inserire `modificataManualmente Boolean @default(false)` nel model `Partita` (tra `updatedAt` riga 582 e il blocco commento/`@@unique` righe 584-590); nuova migrazione additiva mirror di quelle esistenti (es. `prisma/migrations/20260916000000_add_refertista_partita_torneo`).
- `app/app/(partite-campionati)/campionati/importa-gare-actions.ts:20-137` -- `importaGare`, pattern di riferimento diretto per la nuova `sincronizzaGareFipav`: stessa chiave upsert (righe 74-124), stesso trattamento P2002 (105-121), stesso tipo di stato di ritorno.
- `lib/importa-gare/parser.ts:6-15` -- tipo `RigaGara`/`analizzaFileGare`, stesso shape di riga da produrre per riuso del percorso di scrittura.
- `app/app/(partite-campionati)/autorizzazione.ts:38-41` -- `risolviAutorizzazioneGruppo(gruppoId, opzioni?)`, da riusare identico.
- `lib/auth/require-ruolo.ts:29-32` -- `requireRuolo(ruoli, rotta?)`, da riusare identico.
- `app/app/(orari-palestre)/palestre/actions.ts:18-37` -- `risolviLinkMaps`, pattern di riferimento per `fetch` esterno con timeout/try-catch.
- `app/app/(partite-campionati)/partite/actions.ts:76-137` -- `aggiornaPartita`; aggiungere `modificataManualmente: true` al `data:` dell'update (righe 113-117).
- `app/app/(partite-campionati)/campionati/page.tsx:91-103` -- ogni `<li>` per Campionato monta `ModificaCampionatoForm`/`ImportaGareForm`/`EliminaCampionatoForm`; aggiungere qui un quarto componente `SincronizzaFipavForm`, condizionato su `campionato.linkFipav`.
- `app/app/(partite-campionati)/campionati/ImportaGareForm.tsx` -- mirror di stile/UI per il nuovo form (bottone + riepilogo `role="status"` con create/aggiornate/scartate, qui esteso con "bloccate da modifica manuale").
- `app/app/(partite-campionati)/campionati/campionati.module.css` -- classi esistenti da riusare (`.formCompatto`, `.bottoneCompatto`, `.errore`, `.riepilogoCompatto`, `.scartateCompatto`).
- `package.json` -- nuova dipendenza `node-html-parser` (nessuna libreria di parsing HTML presente oggi).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- aggiungere `node-html-parser` -- serve al parsing HTML server-side
- [x] `prisma/schema.prisma` + nuova migrazione -- `Partita.modificataManualmente Boolean @default(false)` -- distingue una riga mai toccata a mano da una corretta con Story 10.4
- [x] `lib/sincronizza-gare-fipav/parser.ts` (nuovo) -- funzione pura HTML (stringa) → righe parsate (stesso shape di `RigaGara`) + righe scartate con motivo -- isolata dalla Server Action, testabile senza rete (mirror di `analizzaFileGare`)
- [x] `app/app/(partite-campionati)/campionati/sincronizza-fipav-actions.ts` (nuovo) -- Server Action `sincronizzaGareFipav`: autorizzazione, fetch con timeout, parsing (sopra), upsert con la logica `modificataManualmente`, riepilogo, `revalidatePath` su `/app/campionati` e `/app/partite`
- [x] `app/app/(partite-campionati)/partite/actions.ts` -- `aggiornaPartita` imposta `modificataManualmente: true`
- [x] `app/app/(partite-campionati)/campionati/SincronizzaFipavForm.tsx` (nuovo) -- bottone + riepilogo, mirror di `ImportaGareForm.tsx`
- [x] `app/app/(partite-campionati)/campionati/page.tsx` -- monta `SincronizzaFipavForm` per Campionato, condizionato su `linkFipav`
- [x] Test: `lib/sincronizza-gare-fipav/parser.test.ts` (righe reali/anomale, ispirate all'HTML verificato in sessione: gara futura `-`, gara disputata `"3 - 0"`/parziali multipli, riga malformata) + `sincronizza-fipav-actions.test.ts` (mirror dei casi di `importa-gare-actions.test.ts`: FORBIDDEN, linkFipav assente, Campionato/Gruppo mismatch, creazione, aggiornamento, blocco da modifica manuale, fetch fallita, riga scartata) + estendere `partite/actions.test.ts` con un caso per `modificataManualmente: true`

**Acceptance Criteria:**
- Given un Campionato con `linkFipav` impostato, when un Allenatore/Admin/Dirigente autorizzato clicca "Sincronizza da FIPAV", then le Partite vengono create/aggiornate con la logica sopra e un riepilogo esplicito viene mostrato
- Given una Partita con `modificataManualmente=true`, when la sincronizzazione la incontra di nuovo, then data/ora/impianto/indirizzoImpianto restano invariati, risultato/parziali/statoDescrizione/giornata si aggiornano comunque
- Given `aggiornaPartita` salva una correzione, then quella Partita ha `modificataManualmente=true` da quel momento
- Given `linkFipav` vuoto o portale irraggiungibile, then nessuna scrittura avviene e l'errore è esplicito

## Spec Change Log

## Design Notes

**Perché una funzione di parsing separata dalla Server Action:** `analizzaFileGare` (Excel) è già isolata in `lib/importa-gare/parser.ts`, testabile senza I/O — stesso principio qui: il parsing HTML (funzione pura, stringa in → righe out) vive in `lib/`, la Server Action fa solo fetch + autorizzazione + scrittura. Permette di testare il formato reale osservato in sessione (gara futura, gara disputata con parziali) senza vere richieste di rete nei test.

**Perché "bloccata da modifica manuale" è un conteggio a parte, non dentro "aggiornate":** una riga può essere sia "aggiornata" (risultato/parziali) sia "bloccata" (data/ora) nello stesso passaggio — assi indipendenti, non stati mutuamente esclusivi; il riepilogo mostra entrambi per non nascondere che un campo non si è mosso quando l'utente si aspetterebbe un aggiornamento completo.

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valido
- `npx vitest run` -- expected: tutti i test passano, inclusi quelli nuovi
- `npx tsc --noEmit` -- expected: nessun errore
- `npx eslint <file toccati>` -- expected: nessun errore

**Manual checks (dopo il deploy, dev locale non disponibile su questa macchina):**
- Aprire `/app/campionati`, verificare che il bottone compaia solo sui Campionati con `linkFipav` impostato
- Sincronizzare un Campionato reale e confrontare il riepilogo con quanto atteso dalla URL nota

## Suggested Review Order

**Entry point — Server Action**

- Autorizzazione a due livelli + guardia `linkFipav` vuoto, mirror di `importaGare` (Story 10.2).
  [`sincronizza-fipav-actions.ts:26`](sincronizza-fipav-actions.ts#L26)

**Fetch esterno**

- Timeout 10s + User-Agent esplicito (review fix: alcuni portali filtrano richieste senza UA plausibile).
  [`sincronizza-fipav-actions.ts:79`](sincronizza-fipav-actions.ts#L79)

**Parsing HTML (funzione pura, testabile senza rete)**

- Selettore verificato dal vivo sull'HTML reale del portale.
  [`parser.ts:19`](../../lib/sincronizza-gare-fipav/parser.ts#L19)

- Estrazione per cella/riga - icone di stato e info distinte per `alt`, non per classe (review fix: entrambe condividono la stessa classe CSS nell'HTML reale).
  [`parser.ts:100`](../../lib/sincronizza-gare-fipav/parser.ts#L100)

- Impianto/indirizzo dal title HTML-escaped dell'icona info - review fix: non presuppone più un `<b>` sempre presente.
  [`parser.ts:80`](../../lib/sincronizza-gare-fipav/parser.ts#L80)

- Split su `<br/>` riusato sia per l'indirizzo sia per lo stato gara su due righe.
  [`parser.ts:73`](../../lib/sincronizza-gare-fipav/parser.ts#L73)

- Punto di ingresso del parser - fail-soft per riga (review fix: una riga che lancia un'eccezione inattesa ora viene scartata, non blocca le altre) e per tabella assente.
  [`parser.ts:185`](../../lib/sincronizza-gare-fipav/parser.ts#L185)

**Scrittura selettiva (modificataManualmente)**

- Campi sempre scritti vs campi bloccabili - il cuore della regola di non-sovrascrittura.
  [`sincronizza-fipav-actions.ts:122`](sincronizza-fipav-actions.ts#L122)

- Applicazione della regola sul ramo primario (Partita già esistente).
  [`sincronizza-fipav-actions.ts:160`](sincronizza-fipav-actions.ts#L160)

- Stessa regola applicata al ramo P2002 concorrente (TOCTOU, mirror di `importaGare`).
  [`sincronizza-fipav-actions.ts:184`](sincronizza-fipav-actions.ts#L184)

- `aggiornaPartita` imposta il flag su ogni salvataggio riuscito - vedi nota in `deferred-work.md` sul caso di un reinvio senza modifiche reali, non risolto in questa story.
  [`partite/actions.ts:119`](../../app/app/(partite-campionati)/partite/actions.ts#L119)

**Schema**

- Nuovo campo additivo, `DEFAULT false` - nessun backfill necessario.
  [`schema.prisma:590`](../../prisma/schema.prisma#L590)

**UI**

- Bottone + riepilogo, mirror di stile di `ImportaGareForm.tsx`.
  [`SincronizzaFipavForm.tsx:13`](SincronizzaFipavForm.tsx#L13)

- Montato solo se `linkFipav` è impostato (difesa in profondità, controllo comunque server-side).
  [`page.tsx:101`](page.tsx#L101)

**Test (peripherali)**

- Ramo P2002 concorrente: asserzione rafforzata + nuovo caso `modificataManualmente=true` (review fix, Verification Gap Reviewer).
  [`sincronizza-fipav-actions.test.ts:301`](sincronizza-fipav-actions.test.ts#L301)

- Stato gara su due righe e icona info senza `<b>` (review fix, Blind Hunter + Edge Case Hunter).
  [`parser.test.ts:191`](../../lib/sincronizza-gare-fipav/parser.test.ts#L191)
