---
title: 'Story 19.17: ordine e visibilità delle classifiche su /classifiche'
type: 'feature'
created: '2026-10-02'
status: 'done'
baseline_commit: 'e1ad3fe644acb084436d92d4b5e8f5e4a0d69059'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/classifiche` mostra le classifiche in ordine alfabetico di Campionato e sempre tutte: l'utente vuole deciderne l'ordine e, a campionato terminato, nasconderne la classifica.

**Approach:** decisioni utente 2026-10-02 — le classifiche seguono lo stesso ordine delle squadre già deciso in `/app/ordine-squadre` (Story 19.15: `Gruppo.ordine`, a parità di Gruppo per nome Campionato). Nuovo campo `Campionato.classificaVisibile` (default `true`) con interruttore Nascondi/Mostra nella stessa pagina `/app/ordine-squadre`, sotto ogni squadra, per i suoi Campionati con link FIPAV. Ruoli: Admin e Site Manager.

## Boundaries & Constraints

**Always:** default `true` per ogni Campionato esistente e nuovo (nessuna classifica sparisce al deploy). Una classifica nascosta non compare su `/classifiche` e non viene letta per quella pagina; se tutte sono nascoste vale il messaggio già esistente "Nessuna classifica disponibile al momento.". Stesso perimetro Ruoli di `/app/ordine-squadre` (ADMIN, SITE_MANAGER) e stessa doppia `revalidatePath` (`/app/ordine-squadre` + `/classifiche`). Visibilità del Gruppo (Story 19.16) e della classifica indipendenti. Un Campionato nascosto mantiene il proprio posto (riappare nella stessa posizione). Aggiornare la guida in-app di `/app/ordine-squadre`.

**Ask First:** nascondere anche i risultati della home o le partite del calendario; un ordine delle classifiche separato da quello delle squadre.

**Never:** modifiche a `/app/campionati` (form Campionato) o ai Ruoli che vi accedono; nuove pagine di gestione; cambiare ordine o contenuto delle righe dentro una classifica; toccare fetch/parser FIPAV.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ordine | Gruppi ordine U14=0, Serie D=1; Campionati "U14 B", "U14 A", "Serie D" | `/classifiche`: U14 A, U14 B, Serie D | — |
| Nascosta | "U14 A" `classificaVisibile=false` | `/classifiche`: U14 B, Serie D; home Risultati invariata | — |
| Tutte nascoste | nessuna visibile | messaggio "Nessuna classifica disponibile al momento." | — |
| Gruppo nascosto | Gruppo `visibilePubblico=false`, Campionato visibile | classifica mostrata | — |
| Campionato senza link FIPAV | `linkFipav` null | nessun interruttore in `/app/ordine-squadre` | — |
| Ruolo non ammesso | DIRIGENTE invoca l'azione | rifiutata come le azioni esistenti della pagina | messaggio di errore esistente |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma:576` -- model `Campionato`: `classificaVisibile Boolean @default(true)`; nuova migrazione `ALTER TABLE "campionati" ADD COLUMN ... DEFAULT true` (colonna su tabella esistente, nessuna nuova tabella/RLS).
- `lib/sincronizza-gare-fipav/leggi-live-fipav.ts:138-160` -- `leggiCampionatiConLetturaFipav` (condivisa con la home): `orderBy` → `[{ gruppo: { ordine: "asc" } }, { nome: "asc" }]`; parametro opzionale per escludere i nascosti (`where classificaVisibile: true`) usato solo da `/classifiche`, così non parte il fetch; la home resta senza filtro (Risultati ordinati per data, ordine indifferente). Test in `leggi-live-fipav.test.ts`.
- `app/classifiche/page.tsx:43-52` -- passare l'opzione "solo visibili".
- `lib/ordine-squadre.ts:20-50` -- `elencaGruppiOrdinati` (include i Campionati del Gruppo con `linkFipav` non nullo, `id/nome/classificaVisibile`, ordinati per nome); nuova `impostaVisibilitaClassifica(id, visibile)` mirror di `impostaVisibilitaGruppo`. Test in `lib/ordine-squadre.test.ts`.
- `app/app/(configurazione)/ordine-squadre/actions.ts:90-128` -- nuova `impostaVisibilitaClassificaAction`, mirror di `impostaVisibilitaGruppoAction` (`RUOLI_ORDINE_SQUADRE`, validazione input, revalidate `/app/ordine-squadre` + `/classifiche`); test in `actions.test.ts`.
- `app/app/(configurazione)/ordine-squadre/GruppoOrdineRow.tsx:50-100` + `page.tsx:67-75` -- sotto la riga squadra, per ogni Campionato con link FIPAV: nome, badge "Classifica visibile/nascosta", bottone Mostra/Nascondi (stessi stili badge/bottoni, form separato per controllo, target ≥44px).
- `lib/guida/contenuti.ts:182-190` -- voce `/app/ordine-squadre`: ordine classifiche = ordine squadre + interruttore classifica.

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migrazione -- campo `classificaVisibile` default true.
- [x] `lib/sincronizza-gare-fipav/leggi-live-fipav.ts` + test -- ordine per Gruppo e opzione solo-visibili.
- [x] `app/classifiche/page.tsx` -- usare l'opzione solo-visibili.
- [x] `lib/ordine-squadre.ts` + test -- Campionati con link FIPAV in `elencaGruppiOrdinati`, `impostaVisibilitaClassifica`.
- [x] `ordine-squadre/actions.ts` + test -- `impostaVisibilitaClassificaAction`.
- [x] `ordine-squadre/GruppoOrdineRow.tsx`, `page.tsx` -- interruttore per Campionato.
- [x] `lib/guida/contenuti.ts` -- guida aggiornata.

**Acceptance Criteria:**
- Given due squadre riordinate in `/app/ordine-squadre`, when apro `/classifiche`, then le classifiche seguono il nuovo ordine.
- Given una classifica nascosta da `/app/ordine-squadre`, when la rimostro, then ricompare nella stessa posizione.

## Verification

**Commands:**
- `npx prisma validate` + `npx prisma generate` -- expected: schema valido
- `npx tsc --noEmit` -- expected: nessun errore
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti verdi

**Manual checks (dev locale rotto, al deploy):**
- migrazione applicata; interruttore in `/app/ordine-squadre` e effetto su `/classifiche`.

## Suggested Review Order

**Ordine e filtro delle classifiche**

- Punto d'ingresso: ordine per squadra (ordine, nome) poi Campionato; filtro solo-visibili senza fetch.
  [`leggi-live-fipav.ts:149`](../../lib/sincronizza-gare-fipav/leggi-live-fipav.ts#L149)

- /classifiche chiede solo le classifiche visibili; la home no.
  [`page.tsx:45`](../../app/classifiche/page.tsx#L45)

**Interruttore in /app/ordine-squadre**

- Azione: Ruoli, input, appartenenza alla stagione e link FIPAV, P2025, revalidate.
  [`actions.ts:147`](../../app/app/(configurazione)/ordine-squadre/actions.ts#L147)

- Controllo di appartenenza e scrittura del flag.
  [`ordine-squadre.ts:68`](../../lib/ordine-squadre.ts#L68)
  [`ordine-squadre.ts:83`](../../lib/ordine-squadre.ts#L83)

- Riga Campionato con badge e bottone Mostra/Nascondi sotto ogni squadra.
  [`GruppoOrdineRow.tsx:31`](../../app/app/(configurazione)/ordine-squadre/GruppoOrdineRow.tsx#L31)

- Campionati con link FIPAV caricati con le squadre.
  [`ordine-squadre.ts:24`](../../lib/ordine-squadre.ts#L24)

**Schema, guida e test**

- Nuovo campo e migrazione (default visibile; RLS già attiva sulla tabella).
  [`schema.prisma`](../../prisma/schema.prisma)
  [`migration.sql`](../../prisma/migrations/20261002000000_add_classifica_visibile_campionato/migration.sql)

- Guida in-app di Ordine squadre.
  [`contenuti.ts:182`](../../lib/guida/contenuti.ts#L182)

- Test di pagina, componente, azione e helper.
  [`page.test.tsx:1`](../../app/classifiche/page.test.tsx#L1)
  [`GruppoOrdineRow.test.tsx:1`](../../app/app/(configurazione)/ordine-squadre/GruppoOrdineRow.test.tsx#L1)
  [`actions.test.ts:1`](../../app/app/(configurazione)/ordine-squadre/actions.test.ts#L1)
  [`leggi-live-fipav.test.ts:1`](../../lib/sincronizza-gare-fipav/leggi-live-fipav.test.ts#L1)
