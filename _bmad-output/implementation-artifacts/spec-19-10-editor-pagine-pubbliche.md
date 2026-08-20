---
title: "Story 19.10: Editor di creazione e modifica delle Pagine personalizzate"
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '674c3555d5dcd489d0b627628737783bc45a2b95'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La Story 19.9 costruisce solo la fondazione (modello dati + rendering pubblico) - nessuna UI esiste ancora per un Site Manager/Admin per creare o modificare una `PaginaPubblica`.

**Approach:** Nuova pagina di gestione `/app/pagine-pubbliche` con un editor rich-text **Tiptap** ([tiptap.dev](https://tiptap.dev/product/editor), MIT, gratuito/self-hosted - coerente con NFR6, decisione presa in party mode 2026-08-19) - toolbar minimale coerente con l'ampiezza "dépliant" decisa per la 19.9: titoli (H2/H3), grassetto/corsivo, elenchi puntati, link, immagini. Niente tabelle/embed/colonne. Stesso perimetro Ruoli di `/app/menu-pubblico` (Story 19.7): `ADMIN`+`SITE_MANAGER`, non Dirigente - funzionalità nuova, nessun permesso preesistente da affiancare.

## Boundaries & Constraints

**Always:** ogni salvataggio (creazione o modifica) passa dalla sanitizzazione di `lib/sanitizza-html.ts` (Story 19.9) prima di scrivere su database - mai il solo passaggio al render. Ogni salvataggio valida lo slug/URL con `rottaRiservata()` (Story 19.9) - stesso controllo del form voci di menu.

**Ask First:** nessuna aggiuntiva - ampiezza già chiusa in party mode (vedi spec-19-9 e epics.md).

**Never:** nessuno stato bozza/pubblicato (deciso in party mode - una Pagina salvata è visibile). Nessuna funzione di cancellazione "soft" tipo `visibile` di `VoceMenuPubblico` - una Pagina non più desiderata si elimina (hard delete, nessun AC richiede altro). Non introdurre editor collaborativo/commenti/cronologia versioni (funzioni Tiptap a pagamento, fuori scope NFR6 e fuori scope "dépliant").

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Crea una Pagina con titolo+URL+contenuto validi | Admin/Site Manager su `/app/pagine-pubbliche/nuova` | riga creata, immediatamente visibile all'URL scelto | N/A |
| Crea/modifica con URL riservato | `rottaRiservata()` vero | rifiutato | `VALIDATION` |
| Crea/modifica con slug già in uso | vincolo `@unique` | rifiutato | `VALIDATION` |
| Inserisce un'immagine nell'editor | upload diretto | immagine caricata su bucket pubblico, referenziata nel contenuto salvato | stessa validazione MIME/dimensione di `lib/storage/validazione-immagine.ts` |
| Elimina una Pagina | Admin/Site Manager | riga rimossa, l'URL torna a mostrare 404 | N/A |
| Utente senza `ADMIN`/`SITE_MANAGER` | route-guard | bloccato | redirect `/app/non-autorizzato` |

</frozen-after-approval>

## Code Map

- `lib/pagine-pubbliche.ts` (Story 19.9) -- aggiungere `creaPaginaPubblica`, `aggiornaPaginaPubblica`, `eliminaPaginaPubblica` (mirror di `lib/menu-pubblico.ts`, nessuna validazione qui - vive nel Server Action)
- **Nuovo file** `prisma/migrations/<timestamp>_add_pagine_pubbliche_bucket/migration.sql` -- bucket Storage pubblico per-entità `contenuti-pagine-pubbliche` (mirror esatto di `20260809010000_add_sponsor_banner_bucket`, Story 16.1: `public: true`, policy INSERT/UPDATE/SELECT scoped `ADMIN`/`SITE_MANAGER` invece di `ADMIN`/`DIRIGENTE`)
- `lib/auth/route-guard.ts` -- nuova entry `{ prefix: "/app/pagine-pubbliche", ruoliAmmessi: ["ADMIN","SITE_MANAGER"], navLabel: "Pagine", gruppo: "Gestione sito" }` - quinta figlia del gruppo, dichiarata dopo `/app/menu-pubblico`
- **Nuovo file** `app/app/(configurazione)/pagine-pubbliche/actions.ts` -- `creaPaginaPubblicaAction`/`aggiornaPaginaPubblicaAction`/`eliminaPaginaPubblicaAction`/`caricaImmaginePaginaAction`, tutte `requireRuolo(["ADMIN","SITE_MANAGER"])`; validazione titolo (lunghezza) + URL (`rottaRiservata` + formato `"/"`-prefissato, mirror `urlVoceMenuValido`) + sanitizzazione contenuto prima di ogni `crea`/`aggiorna`
- **Nuovo file** `app/app/(configurazione)/pagine-pubbliche/page.tsx` -- elenco Pagine (titolo, URL, link "Modifica", link pubblico, elimina) + link a "Nuova pagina"
- **Nuovo file** `app/app/(configurazione)/pagine-pubbliche/nuova/page.tsx` + `app/app/(configurazione)/pagine-pubbliche/[id]/page.tsx` -- form di creazione/modifica, editor a canvas pieno (non inline come le righe di `/app/menu-pubblico` - un editor rich-text non ci sta in una card)
- **Nuovo file** `app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx` -- client component, `@tiptap/react` + `@tiptap/starter-kit` (paragrafi/titoli/grassetto-corsivo/elenchi) + `@tiptap/extension-link` + `@tiptap/extension-image`; toolbar minimale; `editor.getHTML()` serializzato in un campo hidden del form al submit (mirror del pattern FormData/Server Action già in uso in tutto il progetto, nessun fetch client-side introdotto)
- `lib/guida/contenuti.ts` -- nuova entry `/app/pagine-pubbliche`

## Tasks & Acceptance

**Execution:**
- [x] `lib/pagine-pubbliche.ts` -- crea/aggiorna/elimina
- [x] migrazione -- bucket Storage `contenuti-pagine-pubbliche`
- [x] `route-guard.ts` -- nuova entry `/app/pagine-pubbliche`
- [x] `pagine-pubbliche/actions.ts` -- le 4 Server Action + validazione (URL riservato, slug duplicato, sanitizzazione)
- [x] `pagine-pubbliche/page.tsx` -- elenco + azioni
- [x] `pagine-pubbliche/nuova/page.tsx` + `[id]/page.tsx` -- form creazione/modifica
- [x] `PaginaPubblicaEditor.tsx` -- editor Tiptap, toolbar minimale, upload immagini
- [x] `contenuti.ts` -- guida in-app

**Acceptance Criteria:** vedi epics.md Story 19.10 (5 AC, verbatim - non duplicati qui).

## Spec Change Log

- **2026-08-20 (implementazione, ripresa dopo interruzione):** il subagent di implementazione iniziale è stato terminato a metà da un limite di spesa dell'account ("You've hit your monthly spend limit"), non da un errore nel codice - interrotto mentre scriveva `pagine-pubbliche/nuova/page.tsx`/`[id]/page.tsx`. Ripresa verificando lo stato reale su disco file per file (non fidandosi del solo report parziale): tutti i file del Code Map risultavano già scritti e completi (`lib/pagine-pubbliche.ts` con crea/aggiorna/elimina/trovaPerId, `lib/storage/pagine-pubbliche.ts`, la migrazione bucket, `route-guard.ts`, `pagine-pubbliche/actions.ts` con le 4 Server Action e relativo `actions.test.ts` molto completo, `page.tsx`/`nuova/page.tsx`/`[id]/page.tsx`/`PaginaPubblicaEditor.tsx`/`EliminaPaginaPubblicaForm.tsx`/CSS module, `contenuti.ts`). Solo i checkbox del Tasks & Acceptance non erano stati aggiornati.
- **2026-08-20 (verifica finale, 3 gap reali trovati e corretti):** (1) `lib/auth/voci-navigazione.test.ts` aveva 4 test falliti - la nuova voce "Pagine" nel gruppo "Gestione sito" non era stata propagata alle asserzioni esatte (`toEqual`) di quel file, una regressione reale non ancora corretta; aggiornati i 4 test (Site Manager, Admin, ordine completo, conteggio nodi gruppo) per includere `/app/pagine-pubbliche`. (2) `lib/pagine-pubbliche.ts` aveva le nuove funzioni di scrittura (`creaPaginaPubblica`/`aggiornaPaginaPubblica`/`eliminaPaginaPubblica`/`trovaPaginaPubblicaPerId`) senza alcun test diretto - `lib/menu-pubblico.test.ts` (mirror strutturale dichiarato nel Code Map) testa invece ogni funzione della propria libreria dati individualmente, anche le più semplici; aggiunti i test mancanti. (3) `lib/storage/pagine-pubbliche.ts` (`caricaImmaginePaginaPubblica`) non aveva alcun file di test, mentre `lib/storage/sponsor.ts` (il mirror esplicitamente citato nel commento sorgente) ne ha uno; creato `lib/storage/pagine-pubbliche.test.ts`. Verifica finale dopo i 3 fix: `npx vitest run` 1385/1385 (era 1339 prima di questa storia, +46), `npx tsc --noEmit` pulito, `npm run lint` 0 errori (19 warning preesistenti invariati), `npm run build` riuscita (`/app/pagine-pubbliche`, `/app/pagine-pubbliche/nuova`, `/app/pagine-pubbliche/[id]` tutte presenti come rotte dynamic, nessuna regressione di shape).
- **2026-08-20 (code review, 3 layer paralleli - Blind Hunter, Edge Case Hunter, Verification Gap):** nessun intent_gap/bad_spec (nessuna ambiguità nel testo congelato) - solo patch e defer. **6 patch applicati**: (1) `invalidaCachePaginePubbliche()` (Story 19.9) non veniva mai chiamata dopo un salvataggio riuscito - una Pagina appena creata/modificata/eliminata poteva restare non riflessa per un Visitatore anonimo fino a 90s (TTL della cache edge-safe del Proxy), in contraddizione con "subito visibile pubblicamente" mostrato in UI - ora chiamata dopo ogni scrittura riuscita nelle 3 Server Action. (2) Il controllo "contenuto obbligatorio" operava sul testo grezzo pre-sanitizzazione e non intercettava il markup "vuoto" reale prodotto da Tiptap (`"<p></p>"`, non vuoto come stringa) - trovato indipendentemente da Blind Hunter ed Edge Case Hunter; il controllo ora opera sul contenuto GIA' sanitizzato, spogliato dei tag, con un'eccezione esplicita per un contenuto fatto solo di immagini (`<img>`, nessun testo). (3) Nessun limite applicativo sulla lunghezza di `contenutoHtml` (colonna `@db.Text` illimitata) - aggiunto un tetto di 200.000 caratteri, generoso per l'ampiezza "dépliant" ma non illimitato. (4) Un errore DB nel lookup `trovaPaginaPubblicaPerId` durante la modifica veniva mascherato da un `.catch(() => null)` silenzioso, trasformando un genuino errore di sistema in un fuorviante "URL non valido" (l'esenzione slug-invariato falliva silenziosamente) - ora l'errore propaga fino a un onesto `INTERNAL`. (5) `rottaRiservata()` (Story 19.9) confrontava le rotte riservate case-sensitive - un valore come "/App" o "/Squadre" la bypassava pur "sembrando" una rotta reale solo a meno delle maiuscole - reso case-insensitive (solo per questa funzione, `isPublicRoute()` stessa resta invariata per non alterare il routing live del Proxy). (6) `window.prompt` per il link dell'editor non veniva trimmato - una stringa di soli spazi passava il controllo `!url` e finiva salvata come href vuoto. **9 defer** loggati in `deferred-work.md` (nessuna FK/avviso tra Pagine e voci di menu, immagini senza `alt`, nessuna guardia "modifiche non salvate", nessuna concorrenza ottimistica, P2025 generico invece di un messaggio dedicato, nessuna restrizione sui caratteri interni dello slug - stessa lacuna pre-esistente di `urlVoceMenuValido`, nessuna normalizzazione slug, nessun controllo lato client pre-upload, nessun segnale "URL già in uso" prima del submit completo). **1 reject** (immagini orfane su Storage senza cleanup: il commento sorgente della migrazione dichiara esplicitamente che è "same accepted tradeoff as Sponsor" - decisione già presa, non un difetto). Verifica finale dopo i 6 patch: `npx vitest run` 1392/1392 (+7 su questo giro), `npx tsc --noEmit` pulito, `npm run lint` 0 errori, `npm run build` riuscita, nessuna regressione di shape.

## Verification

**Commands:**
- `npx vitest run` (dalla root del repo) -- expected: tutti i test verdi, inclusi i nuovi (Server Action, mirror del pattern di test di `menu-pubblico/actions.test.ts`)
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: `/app/pagine-pubbliche` compare come rotta dynamic, nessuna regressione

**Manual checks (if no CLI):**
- Dopo il deploy: un Admin/Site Manager crea una Pagina con titolo/URL/contenuto formattato + un'immagine, la vede subito pubblicamente; la modifica; la elimina (l'URL torna 404)

## Suggested Review Order

**Le Server Action (il cancello reale, validazione + sanitizzazione PRIMA della scrittura)**

- Contenuto validato sul risultato GIA' sanitizzato (fix review: il vecchio controllo pre-sanitizzazione non intercettava il markup "vuoto" reale di Tiptap).
  [`pagine-pubbliche/actions.ts:85`](../../app/app/(configurazione)/pagine-pubbliche/actions.ts#L85)

- Errore DB nel lookup dello slug attuale propaga onestamente a `INTERNAL` (fix review: prima mascherato da un `.catch(() =&gt; null)` silenzioso).
  [`pagine-pubbliche/actions.ts:222`](../../app/app/(configurazione)/pagine-pubbliche/actions.ts#L222)

- Invalidazione della cache dello slug dopo ogni scrittura riuscita (fix review: mancava, una Pagina appena salvata poteva restare non riflessa fino a 90s per un Visitatore anonimo) - 3 punti di chiamata, uno per azione.
  [`pagine-pubbliche/actions.ts:199`](../../app/app/(configurazione)/pagine-pubbliche/actions.ts#L199)

**Gli URL riservati (unica fonte di verità, ora anche case-insensitive)**

- `rottaRiservata()` confronta ora una copia minuscola del pathname (fix review: "/App"/"/Squadre" bypassavano il controllo per via delle sole maiuscole) - `isPublicRoute()` stessa resta invariata altrove.
  [`route-guard.ts:514`](../../lib/auth/route-guard.ts#L514)

**L'editor (nessun test diretto possibile, come ogni altra pagina del progetto)**

- Verificare a occhio che la toolbar sia davvero limitata a quanto deciso (niente tabelle/embed) e che l'HTML prodotto passi dalla sanitizzazione al submit.
  [`PaginaPubblicaEditor.tsx`](../../app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx)

- URL del link trimmato prima dell'inserimento (fix review: una stringa di soli spazi passava il vecchio controllo `!url`).
  [`PaginaPubblicaEditor.tsx:107`](../../app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx#L107)

**Periferici (Storage, guida in-app, test)**

- Upload per-file su path casuale (mai l'id di un'entità) - nessuna funzione di possesso da verificare.
  [`lib/storage/pagine-pubbliche.ts`](../../lib/storage/pagine-pubbliche.ts)

- Guida in-app aggiornata con i vincoli reali (2MB/PNG-JPG, immagini non rimosse all'eliminazione della Pagina) - fix review, mancavano.
  [`contenuti.ts`](../../lib/guida/contenuti.ts)
