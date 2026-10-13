---
title: 'Story 26.2 — Tesseramento per Federazione: tabella unica di conferma e modifica'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: 'a573e31fe3119b773aa7fb8fda1df5b055f684e1'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Il Tesseramento è un flag unico per Atleta+stagione: non dice con quali federazioni l'Atleta è tesserata e, una volta confermato, non si può più correggere.

**Approach:** `Tesseramento.federazioneIds String[]` (migrazione: esistenti → FIPAV), modulo unico `lib/tesseramento.ts` per ogni lettura/scrittura, e `/app/conferma-tesseramenti` trasformata in una matrice Atlete × Federazioni con checkbox pre-spuntati e un solo "Salva" che conferma, aggiunge, toglie o sostituisce federazioni.

## Boundaries & Constraints

**Always:** solo Anno Agonistico corrente; invariante "riga esiste ⇔ array non vuoto" (svuotare = eliminare la riga); scrittura tutto-o-niente in un `prisma.$transaction([...])` ad array (nessuna transazione interattiva: mai usata nel progetto con l'adapter pg/pooler); solo le righe modificate vengono scritte; conferma in pagina (no `window.confirm`) + difesa server prima di svuotare un tesseramento esistente; `requireRuolo(["ADMIN","DIRIGENTE"])`; guida in-app aggiornata.

**Ask First:** qualunque cambiamento alla colonna "Stato Iscrizione" oltre a mantenerla informativa; letture di Tesseramento in pagine diverse dalle tre elencate nel Code Map.

**Never:** `prisma.tesseramento` o `federazioneIds` fuori da `lib/tesseramento.ts`; FK o tabella ponte; toccare stagioni precedenti; reintrodurre la dipendenza da Iscrizione.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nuovo tesseramento | A senza riga; inviati A:[FIPAV,CSI] | riga A = [FIPAV,CSI] | N/A |
| Sostituzione | A=[FIPAV]; inviati A:[CSI] | A=[CSI] | N/A |
| Svuotamento confermato | A=[FIPAV]; A:[] + `confermaRimozioneTotale` | riga A eliminata | N/A |
| Svuotamento non confermato | A=[FIPAV]; A:[] senza conferma | nulla scritto | VALIDATION "Conferma la rimozione…" |
| Riga mai tesserata lasciata vuota | A senza riga; A:[] | nessuna scrittura per A, nessuna conferma richiesta | N/A |
| Disattivata già presente | A=[UISP(off)]; A:[UISP,CSI] | A=[UISP,CSI] | N/A |
| Disattivata nuova | A=[]; A:[UISP(off)] | nulla scritto | VALIDATION |
| Id inesistente | A:[zzz] | nulla scritto | VALIDATION |
| Batch con un errore | A valida, B con id inesistente | nulla scritto per nessuna | VALIDATION |
| Nessuna riga modificata | nessun `atletaModificata` | nulla scritto | VALIDATION "Nessuna modifica da salvare." |
| Ruolo non ammesso | Segreteria | nulla scritto | FORBIDDEN |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma:297` -- `model Tesseramento`: aggiungere `federazioneIds String[]`, `@@unique` invariato; aggiornare il commento (ancora cita la dipendenza da Iscrizione rimossa)
- `prisma/migrations/20261012000000_add_federazioni/migration.sql` -- FIPAV ha id fisso `federazione-fipav`
- `lib/tesseramento.ts` -- oggi solo lo stub `federazioneInUso`; diventa il modulo unico
- `app/app/(iscrizioni)/conferma-tesseramenti/{page.tsx,actions.ts,ConfermaTesseramentiForm.tsx,conferma-tesseramenti.module.css,actions.test.ts}` -- pagina da trasformare; `confermaTesseramenti` sostituita
- `app/app/(gruppi-allenatori)/gruppi/page.tsx:147,201,352` e `i-miei-gruppi/page.tsx:98,122,159` -- oggi `prisma.tesseramento.findMany` → `Set` → `tesserata: boolean`
- `app/app/(gruppi-allenatori)/gruppi/AtletaTabellaRiga.tsx:25-27,186-190` -- tipo `AtletaConStato` e badge; condiviso con `MioGruppoCard.tsx`
- `lib/federazioni.ts:15` -- `elencaFederazioni()` per colonne ed etichette
- `lib/anno-agonistico.ts` -- `trovaAnnoAgonisticoCorrente` (lettura) / `risolviAnnoAgonisticoCorrente` (scrittura), già usate dalla pagina e dall'azione
- `lib/guida/contenuti.ts:95` -- voce "Conferma tesseramenti"

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + `prisma/migrations/20261013000000_tesseramento_federazioni/migration.sql` -- colonna `text[] NOT NULL DEFAULT '{}'`; `INSERT` FIPAV `ON CONFLICT DO NOTHING` (se eliminata o se un nome identico esiste); `UPDATE` tutte le righe a `ARRAY[id]` dove id = `federazione-fipav` se esiste, altrimenti la federazione con `lower(nome)='fipav'`; `DROP DEFAULT` -- migrazione senza perdite
- [x] `lib/tesseramento.ts` -- `federazioneInUso` reale (`has`, tutte le stagioni); `federazioniPerAtleta(annoId)` → Map atletaId→ids; `etichetteTesseramentoPerAtleta(annoId)` → Map atletaId→etichette (sigla ?? nome) in ordine federazione; `validaModificheTesseramento(...)` pura (regole della matrice); `salvaModificheTesseramento(annoId, modifiche, { consentiSvuotamento })` (legge stato + federazioni, valida, poi `$transaction` di `upsert`/`deleteMany`) -- unico punto di accesso
- [x] `conferma-tesseramenti/actions.ts` -- `salvaTesseramenti(formData)`: legge `atletaModificata` (unici), `federazione:<atletaId>` (unici), `confermaRimozioneTotale`; delega al modulo; mappa errori in VALIDATION/INTERNAL; revalida `/app/conferma-tesseramenti`, `/app/gruppi`, `/app/i-miei-gruppi`
- [x] `conferma-tesseramenti/page.tsx` -- colonne = federazioni attive + disattivate presenti nella stagione corrente, in ordine; righe con `federazioneIds` iniziali
- [x] `conferma-tesseramenti/ConfermaTesseramentiForm.tsx` + css -- matrice con stato locale (reset al cambio props con pattern "adjust state during render"), checkbox in colonna disattivata abilitato solo se inizialmente spuntato, hidden `atletaModificata` per le righe diverse dall'iniziale, pannello di conferma in pagina con nomi delle Atlete che verrebbero svuotate (Conferma = submit con `confermaRimozioneTotale`, Annulla = chiude senza toccare la tabella), bottone "Salva", messaggio vuoto se nessuna federazione attiva -- UX unica
- [x] `gruppi/page.tsx`, `i-miei-gruppi/page.tsx`, `AtletaTabellaRiga.tsx` -- `tesserata: boolean` → `federazioniTesseramento: string[]`; badge "Tesserata · FIPAV, CSI" / "Non tesserata" -- badge con sigle
- [x] `lib/guida/contenuti.ts` -- voce "Conferma tesseramenti" riscritta (matrice, modifica, svuotamento con conferma, disattivate)
- [x] `lib/tesseramento.test.ts`, `conferma-tesseramenti/actions.test.ts` (riscritto) -- tutte le righe della matrice I/O + forme delle query

**Acceptance Criteria:**
- Given federazioni attive N, when apro `/app/conferma-tesseramenti`, then vedo N colonne nell'ordine configurato con i checkbox già spuntati dove l'Atleta è tesserata nella stagione corrente
- Given modifico solo la riga di A, when salvo, then solo A viene scritta e le altre righe restano intatte anche se cambiate nel frattempo da un altro utente
- Given un salvataggio svuoterebbe A e B, when premo Salva, then compare una conferma con i loro nomi; Annulla non scrive nulla
- Given il salvataggio è riuscito, when apro `/app/gruppi` o `/app/i-miei-gruppi`, then il badge mostra "Tesserata · <sigle>" o "Non tesserata"
- Given la migrazione applicata, when apro la pagina, then ogni tesseramento preesistente risulta spuntato su FIPAV
- Given il codice, when cerco `prisma.tesseramento` e `federazioneIds`, then compaiono solo in `lib/tesseramento.ts` (e nei suoi test)

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valido
- `npx tsc --noEmit` -- expected: 0 errori
- `npm run lint` -- expected: 0 errori
- `npx vitest run --maxWorkers=2` -- expected: tutti verdi
- `grep -rn "prisma.tesseramento\|federazioneIds" app lib --include=*.ts --include=*.tsx` -- expected: solo `lib/tesseramento.ts` e `lib/tesseramento.test.ts`

**Manual checks (if no CLI):**
- Dopo il deploy della migrazione: `SELECT count(*) FROM tesseramenti WHERE cardinality("federazioneIds") = 0 OR array_position("federazioneIds", NULL) IS NOT NULL` -- expected: 0 (garantito anche dal vincolo `tesseramenti_federazioneIds_non_vuoto`, che fa fallire la migrazione in caso contrario)

## Suggested Review Order

**Regole del tesseramento (modulo unico)**

- Punto d'ingresso: regole pure della matrice I/O, testabili senza DB
  [`tesseramento.ts:103`](../../lib/tesseramento.ts#L103)

- Lettura stato, validazione, poi un'unica transazione ad array tutto-o-niente
  [`tesseramento.ts:148`](../../lib/tesseramento.ts#L148)

- Colonne: attive + disattivate ancora usate, per non perderle in silenzio
  [`tesseramento.ts:86`](../../lib/tesseramento.ts#L86)

- Eliminazione federazione bloccata se presente in qualunque stagione
  [`tesseramento.ts:34`](../../lib/tesseramento.ts#L34)

**Migrazione dati**

- FIPAV ricreata solo se servono tesseramenti e non esiste già (anche Fipav)
  [`migration.sql:13`](<../../prisma/migrations/20261013000000_tesseramento_federazioni/migration.sql#L13>)

- Tutti i tesseramenti esistenti assegnati a FIPAV
  [`migration.sql:23`](<../../prisma/migrations/20261013000000_tesseramento_federazioni/migration.sql#L23>)

- CHECK: array mai vuoto né con NULL, la migrazione fallisce invece di sporcare
  [`migration.sql:41`](<../../prisma/migrations/20261013000000_tesseramento_federazioni/migration.sql#L41>)

**Server Action e pagina**

- Solo righe con atletaModificata vengono passate al modulo
  [`actions.ts:27`](<../../app/app/(iscrizioni)/conferma-tesseramenti/actions.ts#L27>)

- Caselle iniziali limitate agli id con colonna, così ogni riga resta svuotabile
  [`page.tsx:64`](<../../app/app/(iscrizioni)/conferma-tesseramenti/page.tsx#L64>)

**Tabella client**

- Conferma dello svuotamento via flag del bottone, non SubmitEvent.submitter (Safari)
  [`ConfermaTesseramentiForm.tsx:94`](<../../app/app/(iscrizioni)/conferma-tesseramenti/ConfermaTesseramentiForm.tsx#L94>)

- Hidden atletaModificata solo per le righe diverse dallo stato iniziale
  [`ConfermaTesseramentiForm.tsx:138`](<../../app/app/(iscrizioni)/conferma-tesseramenti/ConfermaTesseramentiForm.tsx#L138>)

- Disattivata: togliere sì, aggiungere no
  [`ConfermaTesseramentiForm.tsx:157`](<../../app/app/(iscrizioni)/conferma-tesseramenti/ConfermaTesseramentiForm.tsx#L157>)

**Badge in /gruppi e /i-miei-gruppi**

- Etichette dal modulo unico invece di prisma.tesseramento diretto
  [`page.tsx:150`](<../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L150>)

- Badge "Tesserata · FIPAV, CSI"
  [`AtletaTabellaRiga.tsx:190`](<../../app/app/(gruppi-allenatori)/gruppi/AtletaTabellaRiga.tsx#L190>)

**Supporto**

- Schema: array su Tesseramento, vincolo univoco invariato
  [`schema.prisma:306`](../../prisma/schema.prisma#L306)

- Guida in-app riscritta per la matrice
  [`contenuti.ts:95`](../../lib/guida/contenuti.ts#L95)

- Test delle regole (matrice I/O completa)
  [`tesseramento.test.ts:113`](../../lib/tesseramento.test.ts#L113)

- Test del componente: righe modificate, conferma, disattivate
  [`ConfermaTesseramentiForm.test.tsx:105`](<../../app/app/(iscrizioni)/conferma-tesseramenti/ConfermaTesseramentiForm.test.tsx#L105>)
