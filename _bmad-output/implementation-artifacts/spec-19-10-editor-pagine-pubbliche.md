---
title: "Story 19.10: Editor di creazione e modifica delle Pagine personalizzate"
type: 'feature'
created: '2026-08-19'
status: 'planned'
review_loop_iteration: 0
context: []
baseline_commit: 'dipende da Story 19.9 (modello dati + rendering pubblico)'
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
- [ ] `lib/pagine-pubbliche.ts` -- crea/aggiorna/elimina
- [ ] migrazione -- bucket Storage `contenuti-pagine-pubbliche`
- [ ] `route-guard.ts` -- nuova entry `/app/pagine-pubbliche`
- [ ] `pagine-pubbliche/actions.ts` -- le 4 Server Action + validazione (URL riservato, slug duplicato, sanitizzazione)
- [ ] `pagine-pubbliche/page.tsx` -- elenco + azioni
- [ ] `pagine-pubbliche/nuova/page.tsx` + `[id]/page.tsx` -- form creazione/modifica
- [ ] `PaginaPubblicaEditor.tsx` -- editor Tiptap, toolbar minimale, upload immagini
- [ ] `contenuti.ts` -- guida in-app

**Acceptance Criteria:** vedi epics.md Story 19.10 (5 AC, verbatim - non duplicati qui).

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run` (dalla root del repo) -- expected: tutti i test verdi, inclusi i nuovi (Server Action, mirror del pattern di test di `menu-pubblico/actions.test.ts`)
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: `/app/pagine-pubbliche` compare come rotta dynamic, nessuna regressione

**Manual checks (if no CLI):**
- Dopo il deploy: un Admin/Site Manager crea una Pagina con titolo/URL/contenuto formattato + un'immagine, la vede subito pubblicamente; la modifica; la elimina (l'URL torna 404)

## Suggested Review Order

**Le Server Action (il cancello reale)**

- Validazione URL riservato + slug duplicato + sanitizzazione - tutti e tre devono avvenire PRIMA della scrittura, non dopo.
  [`pagine-pubbliche/actions.ts`](../../app/app/(configurazione)/pagine-pubbliche/actions.ts)

**L'editor (nessun test diretto possibile, come ogni altra pagina del progetto)**

- Verificare a occhio che la toolbar sia davvero limitata a quanto deciso (niente tabelle/embed) e che l'HTML prodotto passi dalla sanitizzazione al submit.
  [`PaginaPubblicaEditor.tsx`](../../app/app/(configurazione)/pagine-pubbliche/PaginaPubblicaEditor.tsx)
