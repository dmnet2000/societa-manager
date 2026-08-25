---
title: "Story 20.2: Squadre partecipanti e gironi"
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '9c49c937fdd89ff52569226bdd13fa7c311e43cb'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `CategoriaTorneo` (Story 20.1) non ha ancora squadre partecipanti né un modo di ripartirle sui due gironi (A/B) - nessun calendario di girone o classifica (Story 20.3) può esistere senza questo.

**Approach:** deciso in `epics.md` (Story 20.2): nuova tabella Prisma `SquadraTorneo` (nome, categoria, girone A|B, referente, contatto), entità indipendente da `Gruppo`/`Atleta`/`Allenatore` (il torneo ospita anche club esterni). Gestione in una nuova pagina di dettaglio Categoria (`/app/torneo/[edizioneId]/[categoriaId]`), stesso pattern master/detail e stesse convenzioni architetturali di Story 20.1 (scritture in `lib/torneo.ts`, mutazioni scoped su id+parent id, RLS ENABLE + REVOKE).

## Boundaries & Constraints

**Always:** `SquadraTorneo` segue le stesse convenzioni Prisma di `EdizioneTorneo`/`CategoriaTorneo` (RLS ENABLE + REVOKE nella migrazione di creazione, `@@map` snake_case, `id`/`createdAt`/`updatedAt`), enum `GironeTorneo { GIRONE_A GIRONE_B }` mirror di `SettimanaTorneo`. Ogni mutazione via Server Action `requireRuolo(["ADMIN","DIRIGENTE"])`, scritture in `lib/torneo.ts` (non in `actions.ts`, lezione della review di 20.1). Update/delete Squadra scoped su `id` + `categoriaTorneoId` insieme (stesso pattern anti-mismatch di `aggiornaCategoriaTorneo`/`cancellaCategoriaTorneo`, Story 20.1). Iscrivere una Squadra oltre `categoria.numeroMassimoSquadre` è rifiutato con errore esplicito. `cancellaCategoriaTorneo` (20.1) va estesa con la guardia equivalente ora che `SquadraTorneo` esiste (`squadre: { none: {} } }` nel where) - obbligo già annotato nel Design Notes di spec-20-1.

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`/`epic-20-context.md`.

**Never:** nessun collegamento a `Gruppo`/`Atleta`/`Allenatore`. Nessuna gestione di risultati/calendario/classifiche qui (Story 20.3). Nessun vincolo di bilanciamento tra i due gironi (es. stesso numero di squadre per girone) - non richiesto da nessun AC, l'Admin/Dirigente assegna liberamente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Dirigente iscrive una Squadra | nome, girone (A\|B), referente/contatto opzionali | riga `SquadraTorneo` creata, agganciata alla Categoria | `VALIDATION` se nome vuoto o girone non valido |
| Admin/Dirigente iscrive una Squadra oltre il numero massimo | Categoria già al limite (`numeroMassimoSquadre`) | rifiutata | `VALIDATION`, messaggio esplicito |
| Admin/Dirigente elimina una Squadra | nessuna Partita esistente (Story 20.3 non ancora arrivata) | riga eliminata | N/A |
| Admin/Dirigente elimina una Categoria con Squadre iscritte | Squadre collegate | rifiutata | `VALIDATION`, messaggio esplicito (estende la guardia di 20.1) |
| Utente senza `ADMIN`/`DIRIGENTE` apre la pagina di dettaglio Categoria | - | redirect, stesso pattern di `/app/torneo` | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- nuovo enum `GironeTorneo { GIRONE_A GIRONE_B }` (mirror `SettimanaTorneo`); nuovo modello `SquadraTorneo` (`nome String`, `girone GironeTorneo`, `referente String?`, `contatto String?` - opzionali, un club esterno potrebbe non aver ancora fornito questi dati, stesso principio "campo indipendente, vuoto non mostra nulla" già in uso per i contatti pubblici; `categoriaTorneoId String` + relazione verso `CategoriaTorneo`, FK default `Restrict`); `CategoriaTorneo` guadagna la relazione inversa `squadre SquadraTorneo[]`
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_squadra_torneo/migration.sql` -- `CREATE TABLE`, RLS ENABLE + REVOKE, stessa struttura letterale di `20260823000000_add_torneo/migration.sql`
- `lib/torneo.ts` -- nuove funzioni: `elencaSquadreTorneo(categoriaTorneoId)` (orderBy `[{girone:"asc"},{nome:"asc"}]`, mirror `elencaCategorieTorneo`), `contaSquadreTorneo(categoriaTorneoId)` (per il controllo del massimo, `count()`), `creaSquadraTorneo(dati)`, `aggiornaSquadraTorneo(id, categoriaTorneoId, dati)`, `cancellaSquadraTorneo(id, categoriaTorneoId)` (stesso pattern `updateMany`/`deleteMany` scoped su id+parent di `aggiornaCategoriaTorneo`/`cancellaCategoriaTorneo`); `trovaCategoriaTorneoPerId(id)` (nuova, serve alla disambiguazione sotto); `cancellaCategoriaTorneo` MODIFICATA: where esteso a `{ id, edizioneTorneoId, squadre: { none: {} } }`
- **Nuovo file** `lib/girone-torneo.ts` -- `GIRONI_TORNEO`, `ETICHETTA_GIRONE`, `isGironeTorneoValido` (mirror `lib/settimana-torneo.ts`)
- **Nuovo file** `lib/girone-torneo.test.ts` -- mirror `lib/settimana-torneo.test.ts`
- `app/app/(torneo)/torneo/actions.ts` -- nuove Server Action `creaSquadraTorneoAction`, `aggiornaSquadraTorneoAction`, `cancellaSquadraTorneoAction` (validazione nome/girone, controllo `contaSquadreTorneo(categoriaTorneoId) >= categoria.numeroMassimoSquadre` prima di creare - richiede leggere la Categoria, mirror del controllo "Edizione non trovata" di `creaCategoriaTorneoAction`); `cancellaCategoriaTorneoAction` MODIFICATA: su `count === 0` disambigua con `trovaCategoriaTorneoPerId` (non trovata/mismatch vs bloccata da Squadre collegate), stesso schema di `cancellaEdizioneTorneoAction`
- **Nuovo file** `app/app/(torneo)/torneo/actions.test.ts` -- nuovi `describe` per le 3 Server Action Squadra (stesso stile mock di `@/lib/torneo`, FORBIDDEN/VALIDATION/successo/limite massimo/errore imprevisto), test aggiornato per `cancellaCategoriaTorneoAction` (nuovo caso "bloccata da Squadre collegate")
- **Nuovo file** `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/page.tsx` -- Server Component, 404 se Categoria non trovata (mirror `[edizioneId]/page.tsx`), mostra nome/settimana/numero massimo della Categoria, elenco Squadre raggruppate per girone (due sotto-tabelle o una tabella con colonna Girone), form di iscrizione nuova Squadra, link di ritorno a `/app/torneo/[edizioneId]`
- **Nuovo file** `app/app/(torneo)/torneo/[categoriaId]/SquadraTorneoRow.tsx` -- mirror `CategoriaTorneoRow.tsx` (toggle modifica inline, `useActionState`, due flag di visibilità errore dedicati - stessa correzione già fatta in 20.1, non da reintrodurre come bug)
- `app/app/(torneo)/torneo/[edizioneId]/page.tsx` -- `CategoriaTorneoRow.tsx` (o la pagina) guadagna un link verso `/app/torneo/[edizioneId]/[categoriaId]`
- `lib/guida/contenuti.ts` -- voce `/app/torneo` aggiornata per menzionare la gestione delle Squadre/gironi (stessa convenzione di aggiornamento guida già seguita in 20.1/19.14)

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- enum `GironeTorneo` + modello `SquadraTorneo` + relazione inversa
- [x] migrazione -- tabella + RLS ENABLE + REVOKE
- [x] `lib/girone-torneo.ts` + test
- [x] `lib/torneo.ts` -- funzioni Squadra + `cancellaCategoriaTorneo` estesa + `trovaCategoriaTorneoPerId` + `lib/torneo.test.ts` aggiornato
- [x] `torneo/actions.ts` -- 3 Server Action Squadra + `cancellaCategoriaTorneoAction` aggiornata + test
- [x] `[edizioneId]/[categoriaId]/page.tsx` + `SquadraTorneoRow.tsx`
- [x] link da `[edizioneId]/page.tsx` alla nuova pagina di dettaglio
- [x] `lib/guida/contenuti.ts` -- aggiornata

**Acceptance Criteria:** vedi `epics.md` Story 20.2, con l'estensione della guardia di eliminazione Categoria (obbligo ereditato da spec-20-1 Design Notes) inclusa qui.

## Spec Change Log

- **Implementazione (2026-08-23), deviazione dal Code Map**: il Code Map indicava `SquadraTorneoRow.tsx` in `torneo/[categoriaId]/` - percorso incoerente con la pagina che dichiara di riflettere (`[edizioneId]/[categoriaId]/page.tsx`) e senza significato di routing valido. Implementato invece in `torneo/[edizioneId]/` (poi spostato in `[edizioneId]/[categoriaId]/` durante la review, vedi sotto).
- **2026-08-23 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer).** Nessun `intent_gap`/`bad_spec`, nessun loopback. Finding promossi a `patch`, applicati e riverificati:
  - **PATCH** — Blind Hunter: `SquadraTorneoRow.tsx`/`NuovaSquadraTorneoForm.tsx` colocati in `[edizioneId]/` erano confusi con `page.tsx` di quella cartella (l'elenco Categorie, una pagina diversa) - spostati in `[edizioneId]/[categoriaId]/`, colocati con l'unica pagina che li usa davvero (stesso principio già seguito per `CategoriaTorneoRow.tsx` a livello `torneo/`).
  - **PATCH** — Blind Hunter + Edge Case Hunter, indipendentemente: `aggiornaSquadraTorneoAction`/`cancellaSquadraTorneoAction` leggevano `edizioneTorneoId` da un campo nascosto lato client, mai verificato, usato solo per `revalidatePath` - un valore stantio/manomesso avrebbe rivalidato la pagina sbagliata. Ora derivato lato server da `trovaCategoriaTorneoPerId`, campo nascosto rimosso dai form.
  - **PATCH** — Edge Case Hunter: `trovaCategoriaTorneoPerId`/`contaSquadreTorneo` in `creaSquadraTorneoAction` erano fuori dal try/catch - un errore DB su una delle due si sarebbe propagato non gestito. Ora l'intera azione è in un solo try/catch.
  - **PATCH** — Blind Hunter + Verification Gap Reviewer, indipendentemente: `aggiornaCategoriaTorneoAction` (Story 20.1, mai toccata da questa story) non aveva alcuna guardia contro l'abbassamento di `numeroMassimoSquadre` sotto il numero di Squadre già iscritte - stato raggiungibile solo ora che `SquadraTorneo` esiste. Aggiunto un controllo esplicito.
  - **PATCH** — Blind Hunter: nessun riepilogo "N/max squadre iscritte" sulla pagina di dettaglio Categoria - il limite si scopriva solo dopo un tentativo rifiutato. Aggiunto.
  - **PATCH** (test) — Blind Hunter: aggiunti test per il confine appena-sotto-il-limite (`creaSquadraTorneoAction`), per il ramo `categoriaTorneoId` mancante da solo (`aggiornaSquadraTorneoAction`), e per il nuovo comportamento di `aggiornaCategoriaTorneoAction`.
  - **DEFER** (loggati in `deferred-work.md`): la guardia sul numero massimo resta un check-then-act non atomico (race condition teorica su iscrizioni concorrenti sull'ultimo posto) - rischio accettato per un pannello di gestione a bassa concorrenza, stessa decisione già esplicita nel Design Notes originale. Nessun vincolo di unicità sul nome Squadra dentro la stessa Categoria (stessa situazione già deferita per Categoria in 20.1).
  - **REJECT**: due round-trip DB sequenziali (`trovaCategoriaTorneoPerId` + `contaSquadreTorneo`) invece di una singola query con `_count` (Blind Hunter) - micro-ottimizzazione non in linea con il resto di un pannello di gestione a basso traffico, nessun precedente nel progetto per questo livello di ottimizzazione. Mismatch temporaneo tra stato dello spec file (`in-review`) e `sprint-status.yaml` (`in-progress`) nel diff (Blind Hunter) - artefatto di sequenza del workflow, risolto dai passi di chiusura di questa stessa review.

Riverificato dopo le patch: `npx vitest run` (112 file, 1562 test, tutti verdi), `npx tsc --noEmit` (pulito), `npm run lint` (0 errori, 19 warning preesistenti non correlati), `npm run build` (riuscita, `/app/torneo/[edizioneId]/[categoriaId]` registrata).

## Design Notes

**Perché una pagina di dettaglio dedicata e non una sezione inline nella riga Categoria:** l'AC di `epics.md` dice "dentro la pagina di gestione della Categoria" - letto come la pagina di dettaglio DELLA Categoria (non una sezione inline nella riga dentro `/app/torneo/[edizioneId]`), stesso principio master/detail già scelto in 20.1 per Edizione→Categoria: la gestione Squadre (nome, girone, referente, contatto, validazione del massimo) è troppo per stare in una riga di tabella espandibile.

**Guardia sul numero massimo:** confrontare `contaSquadreTorneo(categoriaTorneoId)` con `categoria.numeroMassimoSquadre` al momento della creazione (non un vincolo DB `CHECK`, che richiederebbe una subquery non banale in Postgres) - stessa filosofia "il vero cancello è nella Server Action" già stabilita per gli altri limiti del progetto.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione
- `npx prisma migrate dev` (o equivalente) -- expected: migrazione applicata senza errori (probabilmente non eseguibile in questo ambiente, stesso limite di 20.1 - `npx prisma validate`/`generate` come fallback)

**Manual checks (obbligatorio):**
- Un Admin/Dirigente apre una Categoria, iscrive squadre fino al numero massimo impostato (atteso: la successiva è rifiutata), le ripartisce sui due gironi, modifica una Squadra, elimina una Squadra; prova a eliminare la Categoria con Squadre ancora presenti (atteso: rifiutato), elimina le Squadre e poi la Categoria (atteso: riuscito).
- Aggiunta post-review (2026-08-23): con Squadre già iscritte, prova ad abbassare il numero massimo della Categoria sotto quel conteggio (atteso: rifiutato con messaggio esplicito).

## Suggested Review Order

**Il modello dati e la guardia sul massimo (il cancello reale)**

- Entry point: nuovo modello + relazione inversa su Categoria.
  [`prisma/schema.prisma`](../../prisma/schema.prisma)
- RLS ENABLE + REVOKE nella stessa migrazione di creazione.
  [`prisma/migrations/20260823010000_add_squadra_torneo/migration.sql:32`](../../prisma/migrations/20260823010000_add_squadra_torneo/migration.sql#L32)
- Guardia sul numero massimo (check-then-act, race condition nota e deferita) e lettura/scrittura scoped su id+categoriaTorneoId.
  [`torneo.ts:122`](../../lib/torneo.ts#L122)

**Le Server Action (fix di review: try/catch unico, edizioneTorneoId derivato lato server)**

- Iscrizione: lookup Categoria + conteggio ora nello stesso try/catch della scrittura.
  [`actions.ts:398`](../../app/app/(torneo)/torneo/actions.ts#L398)
- Update/delete: `edizioneTorneoId` non più letto (e mai verificato) da un campo nascosto client.
  [`actions.ts:471`](../../app/app/(torneo)/torneo/actions.ts#L471)
- Guardia aggiunta in review su una funzione di Story 20.1: non abbassabile sotto le Squadre già iscritte.
  [`actions.ts:249`](../../app/app/(torneo)/torneo/actions.ts#L249)

**UI (colocazione corretta in review, nessun impatto sui dati)**

- Spostati da `[edizioneId]/` a `[edizioneId]/[categoriaId]/`, colocati con l'unica pagina che li usa.
  [`[edizioneId]/[categoriaId]/SquadraTorneoRow.tsx`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/SquadraTorneoRow.tsx)
- Riepilogo "N/max squadre iscritte" aggiunto in review.
  [`[edizioneId]/[categoriaId]/page.tsx`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/page.tsx)
