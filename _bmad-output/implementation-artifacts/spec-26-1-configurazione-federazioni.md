---
title: 'Story 26.1 — Configurazione Federazioni'
type: 'feature'
created: '2026-10-12'
status: 'done'
baseline_commit: 'a573e31fe3119b773aa7fb8fda1df5b055f684e1'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Il gestionale non conosce alcuna federazione: un'Atleta è solo "tesserata" o no, mentre nella realtà può essere tesserata con più federazioni (FIPAV, CSI, UISP…) contemporaneamente. Serve prima di tutto un elenco configurabile delle federazioni.

**Approach:** Nuovo model `Federazione` (strutturale, RLS deny-all) con migrazione che crea già "FIPAV", e nuova pagina `/app/federazioni` per Admin/Dirigente — mirror strutturale di `/app/menu-pubblico` (form nuova voce, card per voce con modifica, attiva/disattiva, riordino Su/Giù, più eliminazione bloccata se in uso).

## Boundaries & Constraints

**Always:** `requireRuolo(["ADMIN","DIRIGENTE"])` in testa a ogni Server Action; errori `{ error: { code, message } }`; migrazione con `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL … FROM anon, authenticated`; voce guida in-app coerente con `ruoliAmmessi` della rotta (test di coerenza esistente); nome univoco senza distinzione maiuscole/minuscole (dopo trim).

**Ask First:** qualunque modifica al model `Tesseramento` o alla pagina `/app/conferma-tesseramenti` (è Story 26.2).

**Never:** collegare la Federazione al Tesseramento in questa story; indici funzionali (es. `lower(nome)`) scritti solo in SQL senza corrispettivo nello schema Prisma (causerebbero drift); nuove dipendenze npm; `window.confirm`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Crea | nome "CSI", sigla vuota | Federazione creata in coda, attiva, sigla null | N/A |
| Duplicato | nome " fipav " con "FIPAV" esistente | nessuna scrittura | VALIDATION "Esiste già una federazione con questo nome." |
| Nome vuoto | nome "   " | nessuna scrittura | VALIDATION |
| Rinomina su sé stessa | modifica "FIPAV" → "Fipav" | aggiornata (esclusa sé stessa dal controllo duplicati) | N/A |
| Elimina in uso | `federazioneInUso` → true | nessuna eliminazione | VALIDATION che suggerisce la disattivazione |
| Elimina libera | mai usata | riga eliminata | N/A |
| Ruolo non ammesso | Segreteria chiama un'azione | nessuna scrittura | FORBIDDEN (da `requireRuolo`) |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- aggiungere `model Federazione` (id uuid, `nome String @unique`, `sigla String?`, `ordine Int`, `attiva Boolean @default(true)`, createdAt, updatedAt, `@@map("federazioni")`); commento in stile `VoceMenuPubblico` (~riga 885)
- `prisma/migrations/20260819000000_add_voce_menu_pubblico/migration.sql` -- modello da copiare: CREATE TABLE + ENABLE RLS + REVOKE + seed via `gen_random_uuid()::text`
- `lib/menu-pubblico.ts` -- modello per `lib/federazioni.ts` (elenca, crea in coda con `_max.ordine`, aggiorna, toggle, riordina in `$transaction`)
- `app/app/(configurazione)/menu-pubblico/{page.tsx,actions.ts,NuovaVoceMenuPubblicoForm.tsx,VoceMenuPubblicoRow.tsx,menu-pubblico.module.css,actions.test.ts}` -- modello per la nuova pagina e i suoi test
- `lib/auth/route-guard.ts:167` -- `/app/conferma-tesseramenti` nel gruppo "Atleti": la nuova rotta va dichiarata subito dopo (l'ordine di dichiarazione = ordine figlie nel menu)
- `lib/auth/voci-navigazione.test.ts:215-235, 370-415, 473, 538` -- liste esatte delle figlie del gruppo "Atleti": vanno aggiornate con la quinta voce
- `lib/auth/route-decision.test.ts:299-318` -- modello per i test di accesso della nuova rotta
- `lib/guida/contenuti.ts:95` -- voce `/app/conferma-tesseramenti`; aggiungere accanto la voce `/app/federazioni`

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + `prisma/migrations/20261012000000_add_federazioni/migration.sql` -- model e migrazione (RLS/REVOKE, seed "FIPAV" sigla "FIPAV" ordine 0) -- base dati dell'epica
- [x] `lib/federazioni.ts` -- CRUD + `trovaFederazionePerNomeInsensitive(nome, escludiId?)` (`mode: "insensitive"`) + `eliminaFederazione` -- accesso dati separato dalla validazione
- [x] `lib/tesseramento.ts` -- creare con `federazioneInUso(id): Promise<boolean>` che per ora restituisce `false` (commento: completata da Story 26.2 con `federazioneIds: { has: id }`) -- punto unico di accesso al Tesseramento richiesto dall'epica
- [x] `app/app/(configurazione)/federazioni/actions.ts` -- crea/aggiorna/imposta attiva/sposta/elimina, validazione come nella matrice -- logica e autorizzazione
- [x] `app/app/(configurazione)/federazioni/{page.tsx,NuovaFederazioneForm.tsx,FederazioneRow.tsx,federazioni.module.css}` -- UI mirror di menu-pubblico; l'eliminazione chiede conferma in pagina (stato locale "Conferma eliminazione"/"Annulla") -- UX coerente col progetto
- [x] `lib/auth/route-guard.ts` -- voce `/app/federazioni`, `["ADMIN","DIRIGENTE"]`, navLabel "Federazioni", gruppo "Atleti", subito dopo conferma-tesseramenti -- accesso e menu
- [x] `lib/guida/contenuti.ts` -- voce guida `/app/federazioni` -- regola permanente guida
- [x] `app/app/(configurazione)/federazioni/actions.test.ts`, `lib/auth/route-decision.test.ts`, `lib/auth/voci-navigazione.test.ts` -- test della matrice, accesso rotta, menu "Atleti" a 5 figlie -- copertura

**Acceptance Criteria:**
- Given sono Admin o Dirigente, when apro `/app/federazioni`, then vedo le Federazioni (nome, sigla, badge Attiva/Disattivata) nell'ordine configurato, con FIPAV presente dopo la migrazione
- Given una Federazione, when la sposto su/giù o la disattivo/riattivo, then l'ordine/lo stato vengono salvati e la pagina si aggiorna
- Given sono Segreteria, Allenatore, Atleta, Genitore o Site Manager, when apro `/app/federazioni`, then il route guard mi respinge e la voce non compare nel menu
- Given la tabella `federazioni`, when è interrogata da `anon`/`authenticated` via PostgREST, then non ha privilegi (RLS abilitata + REVOKE)

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valido
- `npx tsc --noEmit` -- expected: 0 errori
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti i test verdi, inclusi i nuovi

## Suggested Review Order

**Modello dati e migrazione**

- Nuova entità strutturale; univocità case-insensitive lasciata al codice per evitare drift Prisma
  [`schema.prisma:322`](../../prisma/schema.prisma#L322)

- RLS deny-all + REVOKE, regola permanente per ogni nuova tabella
  [`migration.sql:22`](../../prisma/migrations/20261012000000_add_federazioni/migration.sql#L22)

- Seed FIPAV con id fisso: la 26.2 lo riferisce per id, non per nome
  [`migration.sql:31`](../../prisma/migrations/20261012000000_add_federazioni/migration.sql#L31)

**Validazione e Server Actions**

- Punto d'ingresso: nome obbligatorio, lunghezze, duplicato senza maiuscole/minuscole
  [`actions.ts:68`](<../../app/app/(configurazione)/federazioni/actions.ts#L68>)

- Codici Prisma P2002/P2025 mappati su messaggi utente invece di INTERNAL
  [`actions.ts:50`](<../../app/app/(configurazione)/federazioni/actions.ts#L50>)

- Eliminazione bloccata se in uso; già eliminata = successo
  [`actions.ts:224`](<../../app/app/(configurazione)/federazioni/actions.ts#L224>)

- Stub "in uso" sempre false finché la 26.2 non introduce federazioneIds
  [`tesseramento.ts:14`](../../lib/tesseramento.ts#L14)

**Accesso ai dati**

- Ricerca case-insensitive con esclusione della federazione stessa in modifica
  [`federazioni.ts:24`](../../lib/federazioni.ts#L24)

- Ordinamento con spareggio stabile, coerente tra pagina e riordino
  [`federazioni.ts:15`](../../lib/federazioni.ts#L15)

**UI**

- Conferma di eliminazione in pagina, bottone disabilitato durante l'invio
  [`FederazioneRow.tsx:86`](<../../app/app/(configurazione)/federazioni/FederazioneRow.tsx#L86>)

- Touch target 44px e azioni che vanno a capo su mobile
  [`federazioni.module.css:205`](<../../app/app/(configurazione)/federazioni/federazioni.module.css#L205>)

**Accesso, menu e guida**

- Rotta ADMIN/DIRIGENTE, quinta figlia del gruppo Atleti
  [`route-guard.ts:179`](../../lib/auth/route-guard.ts#L179)

- Voce guida in-app, coerente con i Ruoli della rotta
  [`contenuti.ts:105`](../../lib/guida/contenuti.ts#L105)

**Test**

- Casi limite actions: P2002/P2025, id mancante, INTERNAL, normalizzazione
  [`actions.test.ts:98`](<../../app/app/(configurazione)/federazioni/actions.test.ts#L98>)

- Forme esatte delle query Prisma del livello dati
  [`federazioni.test.ts:1`](../../lib/federazioni.test.ts#L1)

- Accesso alla rotta per tutti i Ruoli non ammessi
  [`route-decision.test.ts:320`](../../lib/auth/route-decision.test.ts#L320)
