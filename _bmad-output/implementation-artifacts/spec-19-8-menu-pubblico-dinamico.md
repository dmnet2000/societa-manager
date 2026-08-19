---
title: 'Story 19.8: Menu pubblico dinamico'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'cadc722'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `app/NavPubblica.tsx` legge ancora l'array hard-coded `VOCI` (5 voci fisse) - le Story 19.6/19.7 hanno costruito tabella e UI di gestione, ma nessuna modifica fatta lì si riflette sul sito pubblico reale. Ultima storia dell'Epic 19.

**Approach:** `NavPubblica.tsx` diventa un Server Component asincrono che legge da `VoceMenuPubblico` (`elencaVociMenuPubblicoVisibili`, nuova funzione in `lib/menu-pubblico.ts`) invece dell'array hard-coded. Tutta l'interattività (hamburger/drawer, stato attivo, Esc/tocco fuori) viene estratta in un nuovo componente client `NavPubblicaClient.tsx`, che riceve le voci come prop - necessario perché `VoceMenuPubblico` non ha RLS/policy (AD-9, solo Prisma diretto), irraggiungibile da un componente client. Unico punto di montaggio reale (`HeaderPubblico.tsx`) invariato: `<NavPubblica />` resta la stessa chiamata, ora però un Server Component invece di uno hard-coded.

## Boundaries & Constraints

**Always:** tabella vuota (nessuna voce visibile) è un errore esplicito e loggato (`console.error` + `throw`, propaga al più vicino Error Boundary, `app/error.tsx`), non un fallback silenzioso sulle 5 voci hard-coded di prima - decisione esplicita presa in party mode (`epic-19-context.md`, decisione 7): un fallback permanente creerebbe due fonti di verità del menu da tenere sincronizzate per sempre. La Story 19.6 garantisce, tramite seed, che la tabella non sia mai vuota dopo un deploy corretto.

**Ask First:** nessuna - scope chiuso dall'AC della story.

**Never:** non toccare le 5 pagine pubbliche che montano `HeaderPubblico`/`NavPubblica` (`app/page.tsx`, `squadre/page.tsx`, `calendario/page.tsx`, `staff/page.tsx`, `contatti/page.tsx`) - il punto di montaggio (`HeaderPubblico.tsx`) resta l'unico consumer, nessuna modifica alle 5 pagine stesse. Non introdurre un fallback catch-and-default per un errore di lettura DB genuino (es. connessione caduta): nessun `.catch()` intorno a `elencaVociMenuPubblicoVisibili()`, un'eccezione Prisma propaga naturalmente allo stesso Error Boundary - coerente con "nessun fallback silenzioso" (non solo per il caso tabella-vuota, per qualunque motivo il menu non sia leggibile).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tabella con N voci visibili | `elencaVociMenuPubblicoVisibili()` | menu pubblico mostra esattamente quelle N voci, nell'ordine di `ordine` | N/A |
| Una voce ha `visibile: false` | idem | non compare nel menu (ma resta nella tabella, gestibile da `/app/menu-pubblico`) | N/A |
| Nessuna voce visibile (tabella vuota o tutte nascoste) | idem | `console.error` + `throw`, propaga a `app/error.tsx` | pagina pubblica mostra l'Error Boundary esistente, non un menu vuoto/incompleto |
| Voce con URL esterno (`https://...`, creabile da 19.7) | `NavPubblicaClient` | link renderizzato, mai "attivo" (confronto `pathname === href` non corrisponde mai a un URL assoluto) | N/A |
| Le 5 pagine pubbliche esistenti | build/route shape | tutte ancora `ƒ` (dynamic), stesso shape di prima - nessuna regressione | N/A |

</frozen-after-approval>

## Code Map

- `lib/menu-pubblico.ts` -- nuova funzione `elencaVociMenuPubblicoVisibili()` (`where: { visibile: true }`, stesso `orderBy` di `elencaVociMenuPubblico`)
- `lib/menu-pubblico.test.ts` -- nuovo test per la funzione sopra
- **Nuovo file** `app/NavPubblicaClient.tsx` -- estratto da `NavPubblica.tsx` (contenuto pressoché identico, `"use client"`), riceve `voci: {href, label}[]` come prop invece del vecchio array `VOCI` hard-coded
- `app/NavPubblica.tsx` -- riscritto come Server Component asincrono: `elencaVociMenuPubblicoVisibili()`, throw esplicito su array vuoto, altrimenti mappa `{url, etichetta}` → `{href, label}` e renderizza `<NavPubblicaClient voci={...} />`
- **Nuovo file** `app/NavPubblica.test.ts` -- chiama `NavPubblica()` direttamente come funzione async (nessuna libreria di rendering) e ispeziona l'elemento React restituito (`type`/`props`) - prima pagina/componente del progetto con un test diretto, reso possibile dal fatto che ora contiene logica (mapping + throw) invece di solo JSX statico
- `app/HeaderPubblico.tsx` -- **nessuna modifica**: `<NavPubblica />` resta la stessa chiamata, unico punto di montaggio

## Tasks & Acceptance

**Execution:**
- [x] `lib/menu-pubblico.ts` -- `elencaVociMenuPubblicoVisibili()`
- [x] `lib/menu-pubblico.test.ts` -- test della nuova funzione
- [x] `app/NavPubblicaClient.tsx` -- estratto, riceve `voci` come prop
- [x] `app/NavPubblica.tsx` -- Server Component, lettura DB + throw esplicito su tabella vuota
- [x] `app/NavPubblica.test.ts` -- copertura del mapping e del caso tabella vuota
- [x] `npm run build` -- verificato che le 5 rotte pubbliche restano `ƒ` (dynamic), nessuna regressione di shape

**Acceptance Criteria:**
- Given `app/NavPubblica.tsx` modificato per leggere da `VoceMenuPubblico`, when un Visitatore apre una pagina pubblica, then il menu mostra esattamente le voci visibili, nell'ordine impostato, escludendo quelle nascoste
- Given la tabella vuota (caso limite), when `NavPubblica` viene renderizzato, then il rendering fallisce in modo esplicito e loggato - non un fallback silenzioso sulle 5 voci hard-coded
- Given le 5 pagine pubbliche esistenti (Home/Squadre/Calendario/Staff/Contatti), when questa storia viene completata, then nessuna regressione - stesso shape di rotta, stesso punto di montaggio

## Spec Change Log

- 2026-08-19 (code review Epic 19, post-hoc): il throw esplicito su tabella vuota (per design, vedi Boundaries) era raggiungibile anche in un percorso operativo normale, non solo dal caso limite "migrazione fallita" - un Admin/Site Manager poteva nascondere l'ultima voce visibile rimasta da `/app/menu-pubblico` (Story 19.7) e mandare in errore l'intero sito pubblico. Fix applicato lato Server Action (guard in `impostaVisibileVoceMenuPubblicoAction`, vedi Spec Change Log della 19.7) invece che qui: il comportamento di `NavPubblica.tsx` (fail-closed su tabella vuota) resta quello voluto, il gap era a monte.

## Verification

**Commands:**
- `npx vitest run` (dalla root del repo) -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: le 5 rotte pubbliche restano `ƒ` (dynamic, non prerenderizzate a build time - per questo il build non esercita mai davvero `elencaVociMenuPubblicoVisibili()`, la verifica del comportamento dati resta ai test unitari sopra), nessuna regressione di shape

**Manual checks (if no CLI):**
- Dopo il deploy (migrazione 19.6 applicata): il menu pubblico mostra le 5 voci del seed, in ordine; nascondendo una voce da `/app/menu-pubblico` sparisce dal menu pubblico all'aggiornamento successivo della pagina; riordinandole con Su/Giù il menu pubblico riflette il nuovo ordine

## Suggested Review Order

**Il caso limite esplicito nell'AC (coperto da test)**

- Tabella vuota → throw, non fallback - verificare che non ci sia alcun `.catch()` che lo silenzi.
  [`NavPubblica.tsx`](../../app/NavPubblica.tsx)

**Il confine Server/Client (nessuna regressione di interattività attesa)**

- Tutta la logica hamburger/drawer/Esc/tocco-fuori spostata invariata in `NavPubblicaClient.tsx` - verificare che non sia stato perso nulla nel copia-incolla.
  [`NavPubblicaClient.tsx`](../../app/NavPubblicaClient.tsx)

**Il punto di montaggio (nessun diff atteso)**

- `HeaderPubblico.tsx` non toccato - `<NavPubblica />` funziona invariata perché un Server Component asincrono è montabile in JSX esattamente come prima.
  [`HeaderPubblico.tsx`](../../app/HeaderPubblico.tsx)
