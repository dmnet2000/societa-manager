---
title: 'Story 7.3: Icona scheda browser - mostrare il logo reale'
type: 'bugfix'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'bda61d78db5f7d2e9d2740eadefad49ef9be2766'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'icona della scheda del browser (favicon) non mostra il logo della società - l'utente vede un triangolo nero al suo posto.

**Diagnosi dal vivo (2026-09-08, sito in produzione https://www.volleymogliano.it/):** nessuna delle tre ipotesi originali era corretta. Un logo È caricato via `/app/logo` e il meccanismo dinamico (`app/layout.tsx generateMetadata`, Story 18.21) genera correttamente `<link rel="icon" href="https://...supabase.co/.../logo-applicazione/logo...">`. La causa reale, non prevista dall'analisi originale: il repository conteneva anche un file `app/favicon.ico` (leftover dello scaffold iniziale di Next.js, mai sostituito né rimosso) - Next.js lo rileva automaticamente e genera un SECONDO `<link rel="icon" href="/favicon.ico">`, che risultava in competizione con quello dinamico del logo. Ispezionando direttamente `https://www.volleymogliano.it/favicon.ico` nel browser, il file conteneva letteralmente un cerchio nero con un triangolo bianco al centro (icona segnaposto generica) - esattamente il "triangolo nero" riportato dall'utente.

**Approach (rinegoziato con l'utente dopo la diagnosi):** eliminare `app/favicon.ico`. Il meccanismo dinamico esistente (già corretto, nessuna modifica) resta l'unica fonte di favicon, con l'identico comportamento di fallback già in uso (placeholder statico quadrato navy `public/icons/icon-192.png` se nessun logo è caricato).

## Boundaries & Constraints

**Always:** rispettare il meccanismo dinamico esistente (logo Admin ha sempre priorità sul placeholder, cache-busting via `?v=` invariato) - nessuna regressione alla Story 18.21.

**Ask First:** confermato con l'utente il fix (eliminare `app/favicon.ico`) dopo aver presentato la diagnosi - non assunto.

**Never:** nessuna modifica al placeholder statico `public/icons/icon-192.png`/`icon-512.png` (icone del manifest PWA, deliberatamente un quadrato a tinta unita, decisione già presa con l'utente in Story 14.1/18.21) - la diagnosi ha confermato che non erano la causa. Nessuna modifica a `app/layout.tsx` (il meccanismo dinamico era già corretto).

</frozen-after-approval>

## Code Map

- `app/favicon.ico` -- ELIMINATO. Era un file segnaposto (cerchio nero/triangolo bianco) mai sostituito, in competizione col `<link rel="icon">` dinamico generato da `generateMetadata` (`app/layout.tsx`).

## Tasks & Acceptance

**Execution:**
- [x] Diagnosi dal vivo su https://www.volleymogliano.it/ (ispezione `<link rel="icon">` via JavaScript nella pagina + apertura diretta di `/favicon.ico`)
- [x] Presentata la diagnosi all'utente, confermato il fix
- [x] `git rm app/favicon.ico`

**Acceptance Criteria:**
- Given un logo società correttamente caricato, when un Visitatore/Utente guarda la scheda del browser, then vede un'icona riconoscibile come il logo della società, non un triangolo nero

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run build` -- riuscito (exit 0, "Compiled successfully"), nessuna route `/favicon.ico` più generata; gli `Error: fetch failed`/`Unknown file extension ".wasm"` nel log sono i soliti errori preesistenti e noti dell'ambiente locale rotto (Prisma WASM/Windows), non correlati a questo cambiamento
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2052/2052 verdi

**Manual checks (da fare al primo deploy):**
- Aprire il sito in produzione dopo il deploy, verificare che la scheda del browser mostri il logo reale (non più il triangolo, non più un'icona in cache del vecchio favicon.ico - potrebbe richiedere uno svuotamento cache/hard refresh la prima volta per un Visitatore che aveva già visitato il sito prima di questo fix).

## Suggested Review Order

- Il fix: rimozione del file segnaposto in competizione con l'icona dinamica.
  [`app/favicon.ico`](../../app/favicon.ico) (eliminato)

- Meccanismo dinamico invariato, confermato corretto dalla diagnosi dal vivo.
  [`app/layout.tsx:61`](../../app/layout.tsx#L61)
