---
title: 'Story 27.1 - Anagrafica completa: cittadinanza e Genitori/Tutori'
type: 'feature'
created: '2026-10-19'
status: 'done'
baseline_commit: '407d6d965c431f9b12bb90cd6479cd9efc8547fa'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Il modulo di iscrizione (`docs/ModuloIscrizione.pdf`) richiede la cittadinanza dell'Atleta e l'anagrafica di fino a 2 Genitori/Tutori, dati che oggi non esistono a sistema: la Segreteria li ricopia a mano dalla carta e le Story 27.2/27.3 non avrebbero nulla con cui precompilare il modulo.

**Approach:** Colonna `cittadinanza` su `Atleta`, nuova tabella RLS `tutori_atleta` (max 2 righe per Atleta, posizione 1|2) letta e scritta solo via `lib/db-rls/`. Admin/Segreteria le modificano da `/app/gruppi`: cittadinanza nel form "Modifica" esistente, Genitori/Tutori in un secondo form "Genitori" accanto, visibile solo per Atlete minorenni.

## Boundaries & Constraints

**Always:** perimetro ADMIN+SEGRETERIA come `aggiornaDatiAtletaAction` (Story 9.45), lato server con `requireRuolo`. Tabella `tutori_atleta` con `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated` e poi GRANT/policy solo SELECT/INSERT/UPDATE/DELETE per ruoli ADMIN/SEGRETERIA (SELECT anche DIRIGENTE, mirror di `atlete`). `id` generato con `randomUUID()` e `updatedAt` esplicito lato codice (default Prisma non valgono via supabase-js). Codice fiscale del Tutore validato con `isCodiceFiscaleValido`, maiuscolo. Al più un `intestatarioRicevuta` per Atleta, garantito anche da indice unico parziale in SQL. Minorenne = meno di 18 anni compiuti alla data odierna, da `dataNascita`. Guida in-app di `/app/gruppi` aggiornata.

**Ask First:** spostare la modifica anagrafica fuori da `/app/gruppi` (es. nuova pagina scheda Atleta); concedere a GENITORE/ATLETA accesso alla tabella (rimandato alla 27.3, quando serve davvero).

**Never:** nessun dato Tutore su `Utente` o `GenitoreAtleta`; nessuna query Prisma diretta su `tutori_atleta` a runtime; nessuna modifica a import federale o `/registrati`; nessun campo della domanda per stagione (consensi, stato) - sono della 27.3.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Salva 2 tutori | Atleta minorenne, slot 1 e 2 compilati, uno intestatario | 2 righe scritte, `success` | N/A |
| Svuota slot 2 | slot 2 con nome vuoto, riga esistente | riga posizione 2 eliminata, slot 1 invariato | N/A |
| Due intestatari | entrambi gli slot con intestatario | nulla scritto | VALIDATION "Un solo intestatario ricevuta" |
| CF errato | CF tutore non valido | nulla scritto | VALIDATION "Codice fiscale del Genitore/Tutore N non valido." |
| Maggiorenne | Atleta con 18+ anni | nulla scritto | VALIDATION, form non mostrato in UI |
| Utente non collegato | `utenteId` non tra i GenitoreAtleta (non autoAggancio) dell'Atleta | nulla scritto | VALIDATION |
| Ruolo errato | DIRIGENTE/ALLENATORE | nulla scritto | FORBIDDEN da `requireRuolo` |
| Cittadinanza | "italiana" in Modifica | salvata così com'è (trim), vuota → null; re-import federale non la tocca | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma:103` -- model `Atleta`: aggiungere `cittadinanza String?` e relazione `tutori TutoreAtleta[]`; nuovo model `TutoreAtleta` (`@@map("tutori_atleta")`, `@@unique([atletaId, posizione])`, FK Atleta `onDelete: Cascade`, FK Utente opzionale `onDelete: SetNull`); `Utente` riceve la back-relation.
- `prisma/migrations/20261012000000_add_federazioni/migration.sql` -- pattern ENABLE RLS + REVOKE; `20260716080000_atlete_restrict_delete/migration.sql` -- pattern policy per ruolo via `auth.jwt() -> 'app_metadata' -> 'ruoli'`; i GRANT verso `authenticated` vanno concessi esplicitamente (`20260718020000_certificati_storage_e_rls`).
- `lib/db-rls/atleta.ts:10` -- `DatiAtletaIdentitari`: aggiungere `cittadinanza?: string | null` (spread in `serializza`: omesso = colonna intatta, quindi l'import federale non la azzera). `AtletaElenco`/`elencaAtlete` (:79, :115): aggiungere `cittadinanza` al select.
- `lib/db-rls/misurazione-atleta.ts` -- modello di modulo db-rls piccolo da imitare per il nuovo `lib/db-rls/tutore-atleta.ts`.
- `lib/matching-codice-fiscale/valida-codice-fiscale.ts` -- `isCodiceFiscaleValido`, da riusare.
- `app/app/(gruppi-allenatori)/gruppi/actions.ts:810` -- `aggiornaDatiAtletaAction`: aggiungere `cittadinanza`; nuova `salvaTutoriAtletaAction` accanto, stesso `GruppoActionState`, stesso `revalidatePath`.
- `app/app/(gruppi-allenatori)/gruppi/ModificaDatiAtletaForm.tsx` -- `DatiAnagraficiAtleta` + campo cittadinanza; pattern toggle sola-lettura/modifica da replicare nel nuovo `GenitoriTutoriForm.tsx`.
- `app/app/(gruppi-allenatori)/gruppi/page.tsx:182` -- `datiAnagraficiPerId` (solo se `puoModificareAtleta`); due rami di render (:273 sola lettura Segreteria, `AtletaTabellaRiga.tsx:96` gestione) che montano il form.
- `app/app/(gruppi-allenatori)/gruppi/actions.test.ts:1750` -- test esistenti di `aggiornaDatiAtletaAction` e mock supabase da estendere.
- `lib/guida/contenuti.ts:144` -- voce `/app/gruppi`.

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- `Atleta.cittadinanza`, model `TutoreAtleta` (id, atletaId, posizione Int, nome "Cognome Nome", codiceFiscale, luogoNascita?, dataNascita?, indirizzo?, cap?, localitaResidenza?, provinciaResidenza?, email?, telefono?, intestatarioRicevuta Boolean default false, utenteId?, createdAt, updatedAt) -- dati del modulo.
- [x] `prisma/migrations/20261019000000_add_tutori_atleta/migration.sql` -- ALTER `atlete` ADD `cittadinanza`; CREATE `tutori_atleta`, CHECK `posizione IN (1,2)`, unique (atletaId, posizione), unique parziale su atletaId WHERE intestatarioRicevuta; ENABLE RLS, REVOKE, GRANT SELECT/INSERT/UPDATE/DELETE a authenticated, policy per ruolo come da Boundaries -- RLS obbligatoria.
- [x] `lib/db-rls/tutore-atleta.ts` (+ `.test.ts`) -- `elencaTutori(supabase)` e `salvaTutoriAtleta(supabase, atletaId, slot[])`: per ogni posizione, upsert su (atletaId, posizione) se compilato, delete se vuoto; prima le delete/il reset di `intestatarioRicevuta`, poi le scritture, per non violare l'indice parziale.
- [x] `lib/eta.ts` (+ test) -- `isMinorenne(dataNascita, oggi)` pura.
- [x] `lib/db-rls/atleta.ts` -- `cittadinanza` in tipo, select ed elenco.
- [x] `app/app/(gruppi-allenatori)/gruppi/actions.ts` (+ test) -- cittadinanza in `aggiornaDatiAtletaAction`; `salvaTutoriAtletaAction` con validazione campo per campo (nome obbligatorio se slot usato, CF obbligatorio e valido, data valida se presente, email formato base), controllo minorenne lato server leggendo `dataNascita`, controllo `utenteId` contro `prisma.genitoreAtleta` (autoAggancio false) dell'Atleta, un solo intestatario.
- [x] `app/app/(gruppi-allenatori)/gruppi/GenitoriTutoriForm.tsx` -- pulsante "Genitori" accanto a "Modifica", due fieldset (Genitore/Tutore 1 e 2), radio intestatario ricevuta (nessuno/1/2), select account collegato tra gli Utenti genitori dell'Atleta (email); input 44px.
- [x] `ModificaDatiAtletaForm.tsx`, `AtletaTabellaRiga.tsx`, `page.tsx` -- cittadinanza nei dati precompilati; carica tutori (`elencaTutori`) e genitori collegati (Prisma `genitoreAtleta` + email Utente) solo se `puoModificareAtleta`; monta `GenitoriTutoriForm` solo per minorenni in entrambi i rami.
- [x] `lib/guida/contenuti.ts` -- riga Modifica: aggiungere Cittadinanza; nuova riga "Genitori" (fino a 2, intestatario ricevuta, account collegato, solo Atlete minorenni).

**Acceptance Criteria:**
- Given sono Admin o Segreteria su `/app/gruppi`, when apro "Genitori" di un'Atleta minorenne con tutori già salvati, then il form è precompilato con i dati esistenti e l'intestatario selezionato.
- Given un'Atleta maggiorenne, when guardo la sua riga, then il pulsante "Genitori" non c'è.
- Given un utente `authenticated` con ruolo GENITORE, when interroga `tutori_atleta` via PostgREST, then non ottiene righe (policy).
- Given `npm test`, when gira, then i nuovi test (db-rls, eta, Server Action) e quelli esistenti passano.

## Design Notes

Upsert per posizione invece di "cancella tutto e reinserisci": conserva `id`/`createdAt` e il collegamento `utenteId` quando si corregge un solo campo. Il campo `nome` resta unico "Cognome Nome" come `Atleta.nome` e come nel modulo ("Cognome e Nome"), nessuno split. Il CF del Tutore non è univoco a livello globale: lo stesso genitore può comparire su due figlie (righe distinte, nessuna deduplica in questa story).

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valido
- `npx tsc --noEmit` -- expected: nessun errore (se compaiono errori in `.next/dev/types`, `rm -rf .next` e riprovare)
- `npm test` -- expected: tutti verdi
- `npm run lint` -- expected: nessun errore nuovo

**Manual checks (if no CLI):**
- Dopo il deploy (l'utente applica la migrazione): su `/app/gruppi` salvare 2 tutori per un'Atleta minorenne, ricaricare e verificare i dati; provare due intestatari e vedere il messaggio d'errore.

## Suggested Review Order

**Sicurezza dati (RLS)**

- Punto d'ingresso: tabella nuova con RLS + REVOKE, policy per ruolo, nessun accesso Genitore
  [`migration.sql:59`](../../prisma/migrations/20261019000000_add_tutori_atleta/migration.sql#L59)

- Indice unico parziale: al massimo un intestatario ricevuta per Atleta, garantito dal DB
  [`migration.sql:45`](../../prisma/migrations/20261019000000_add_tutori_atleta/migration.sql#L45)

**Validazione e scrittura**

- Server Action: ruoli, validazione campo per campo, minorenne, account collegati, controlli incrociati
  [`actions.ts:1008`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L1008)

- Scrittura per posizione: delete, reset intestatario, poi update/insert (conserva id)
  [`tutore-atleta.ts:95`](../../lib/db-rls/tutore-atleta.ts#L95)

- Cittadinanza nella correzione anagrafica esistente, vuota diventa null
  [`actions.ts:837`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L837)

**Pagina e form**

- Funzione pura: chi vede "Genitori" (minorenni, o maggiorenni con tutori da rimuovere)
  [`genitori-tutori-per-atleta.ts:55`](../../app/app/(gruppi-allenatori)/gruppi/genitori-tutori-per-atleta.ts#L55)

- Form a due slot, invio senza reset dei campi, account non più collegato visibile
  [`GenitoriTutoriForm.tsx:48`](../../app/app/(gruppi-allenatori)/gruppi/GenitoriTutoriForm.tsx#L48)

- Caricamento dati solo per Admin/Segreteria, montaggio nel ramo sola lettura
  [`page.tsx:221`](../../app/app/(gruppi-allenatori)/gruppi/page.tsx#L221)

- Montaggio nel ramo di gestione
  [`AtletaTabellaRiga.tsx:113`](../../app/app/(gruppi-allenatori)/gruppi/AtletaTabellaRiga.tsx#L113)

**Contorno**

- Modello Prisma e colonna cittadinanza
  [`schema.prisma:185`](../../prisma/schema.prisma#L185)

- Regola dei 18 anni, incluso il 29 febbraio
  [`eta.ts:10`](../../lib/eta.ts#L10)

- Cittadinanza nel tipo e nel select di Atleta
  [`atleta.ts:32`](../../lib/db-rls/atleta.ts#L32)

- Guida in-app di /app/gruppi
  [`contenuti.ts:161`](../../lib/guida/contenuti.ts#L161)
