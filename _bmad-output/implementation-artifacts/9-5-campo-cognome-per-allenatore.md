---
baseline_commit: 0e2a9f03f28837a5181a885687e0566f360db5e4
---

# Story 9.5: Campo Cognome per Allenatore (precaricamento)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente che precarica un Allenatore,
I want inserire anche il Cognome oltre a Nome e Codice Fiscale,
so that l'anagrafica Allenatore sia completa fin dal precaricamento, senza dover dedurre il cognome dal solo Codice Fiscale.

## Acceptance Criteria

1. **Given** la pagina `/precaricamento-allenatori` **When** un Admin o Dirigente compila il form **Then** vede un campo "Cognome" obbligatorio, oltre ai due campi già esistenti (Nome, Codice Fiscale)
2. **Given** il form inviato senza Cognome **When** la Server Action `precaricaAllenatore` lo valida **Then** restituisce un errore di validazione, stesso pattern dei controlli già esistenti su Nome/Codice Fiscale vuoti
3. **Given** un Allenatore precaricato con successo **When** viene salvato **Then** il Cognome è persistito sul nuovo campo `Allenatore.cognome`, non concatenato dentro `nome`
4. **And** ogni pagina esistente che mostra il nome di un Allenatore continua a funzionare senza errori (nessuna regressione, suite Vitest invariata) — la decisione su cosa mostrare esattamente (solo nome, o "Nome Cognome") va presa in fase di sviluppo

## Tasks / Subtasks

- [x] Task 1: Migrazione Prisma — aggiungere `Allenatore.cognome` (AC: #3)
  - [x] In `prisma/schema.prisma`, model `Allenatore`: aggiunto `cognome String` (NOT NULL — confermato dall'utente che la tabella `allenatori` in produzione è ancora vuota, nessun precaricamento fatto finora: nessun rischio di violare il vincolo su righe esistenti, vedi Dev Notes)
  - [x] Creata `prisma/migrations/20260727000000_add_cognome_allenatore/migration.sql` con `ALTER TABLE "allenatori" ADD COLUMN "cognome" TEXT NOT NULL;` — nessuna policy RLS toccata (`Allenatore` non è protetta da RLS, AD-9)
  - [x] `npx prisma validate` + `npx prisma generate` eseguiti con successo (nessun ambiente Supabase locale disponibile per `migrate deploy`, coerente con le storie precedenti dell'epic — la migrazione va applicata in deploy come le altre)
- [x] Task 2: Server Action `precaricaAllenatore` (AC: #1, #2, #3)
  - [x] In `app/(onboarding-import)/precaricamento-allenatori/actions.ts`: letto `cognome` da `formData`, `.trim()` come già fatto per `nome`/`codiceFiscaleInput`
  - [x] Esteso il controllo per includere `!cognome`, messaggio aggiornato a "Nome, Cognome e Codice Fiscale sono obbligatori." — stesso `code: "VALIDATION"`
  - [x] `cognome` passato a `prisma.allenatore.create({ data: { ... } })` insieme a `nome`, `codiceFiscale`, `utenteId: null`
- [x] Task 3: Form `/precaricamento-allenatori` (AC: #1)
  - [x] In `page.tsx`: aggiunto campo "Cognome" (`input required`, stesso markup/classe `styles.campo`), posizionato tra Nome e Codice Fiscale
- [x] Task 4: Mappare i punti che mostrano `allenatore.nome` (AC: #4)
  - [x] Verificati `GruppoRow.tsx` e `wizard-nuova-stagione/page.tsx`: lasciati invariati (solo `nome`), decisione presa per minimizzare il rischio di regressione — nessun AC impone la concatenazione. Confermato con `npx tsc --noEmit` (zero errori): i tipi locali `Allenatore = { id, nome }` restano validi anche se gli oggetti Prisma reali ora includono anche `cognome`.
- [x] Task 5: Test (AC: #2, #3, #4)
  - [x] Esteso `app/(onboarding-import)/precaricamento-allenatori/actions.test.ts`: `cognome` aggiunto a tutti i `buildFormData(...)`, nuovo test dedicato a validazione con solo `cognome` mancente, assert su `createMock` aggiornato
  - [x] Suite Vitest completa: 500/500 test passati (492 baseline + 8 nuovi/estesi in questa storia), zero regressioni
  - [x] `npx eslint` sui file toccati: nessun errore

### Review Findings

- [x] [Review][Decision] Il Cognome non viene mai mostrato in UI — **risolto su richiesta dell'utente: concatenare "Nome Cognome"**. Applicato in `GruppoRow.tsx` (tipo `Allenatore` esteso con `cognome`, elenco assegnati e `<option>` del select ora mostrano "Nome Cognome"), `wizard-nuova-stagione/page.tsx` (riepilogo Allenatori copiati) e ordinamento secondario per `cognome` aggiunto in tutte e tre le query Prisma coinvolte (`gruppi/page.tsx` x2, `wizard-nuova-stagione/page.tsx`) per risolvere anche l'ambiguità su Allenatori con lo stesso nome di battesimo. 500/500 test passati, 0 nuovi errori tsc/eslint.
- [x] [Review][Patch] Completion Notes con conteggio test fuorviante [_bmad-output/implementation-artifacts/9-5-campo-cognome-per-allenatore.md] — corretto
- [x] [Review][Defer] Messaggio di validazione impreciso quando manca un solo campo su tre [app/(onboarding-import)/precaricamento-allenatori/actions.ts:29] — deferred, pre-existing (stesso pattern già presente per nome/codiceFiscale prima di questa storia)
- [x] [Review][Defer] Race TOCTOU su Codice Fiscale duplicato (check-then-create non transazionale) [app/(onboarding-import)/precaricamento-allenatori/actions.ts:52-64] — deferred, pre-existing
- [x] [Review][Defer] Nessun vincolo di formato/lunghezza su `cognome` (maxlength, normalizzazione spazi) [app/(onboarding-import)/precaricamento-allenatori/actions.ts:27] — deferred, pre-existing (stesso gap già presente su `nome`)
- [x] [Review][Defer] Nessun attributo `autoComplete` sul nuovo campo Cognome [app/(onboarding-import)/precaricamento-allenatori/page.tsx] — deferred, pre-existing (nessun campo nome/form del progetto lo usa)
- [x] [Review][Defer] Nessun test che verifichi il rendering del campo Cognome in UI (solo la Server Action è testata) [app/(onboarding-import)/precaricamento-allenatori/page.tsx] — deferred, pre-existing (nessuna pagina del progetto ha test di rendering component, solo test di Server Action)

## Dev Notes

- **Vincolo di migrazione — confermato dall'utente (2026-07-27)**: la tabella `allenatori` in produzione è ancora **vuota** (nessun precaricamento effettuato finora), quindi `cognome` può essere aggiunta direttamente come `NOT NULL` senza `DEFAULT` — nessuna riga esistente da violare. Se in futuro si aggiungesse un nuovo campo obbligatorio su questa tabella *dopo* che sono stati caricati Allenatori reali, questa scorciatoia non sarebbe più valida (servirebbe un `DEFAULT` o una colonna nullable + validazione applicativa, come inizialmente valutato qui).
- **Pattern Server Action da replicare esattamente** (`actions.ts` righe 26-46): `String(formData.get(campo) ?? "").trim()`, poi validazione vuoto → `{ error: { code: "VALIDATION", message } }` prima di qualunque query. `precaricaAllenatore` è già interamente coperta da `requireRuolo(["ADMIN", "DIRIGENTE"])` (riga 23) — non toccare quella parte.
- `Allenatore` non è protetta da RLS (AD-9) — l'accesso a runtime resta Prisma diretto (`lib/prisma`), non `lib/db-rls`; nessuna policy da scrivere per questa storia, solo la migrazione di schema (AD-3: ogni cambio di schema passa da migrazione Prisma, mai modifica manuale via dashboard Supabase).
- **Non concatenare** `cognome` dentro `nome` (AC #3 esplicito) — campo Prisma separato.
- **Fuori perimetro di questa storia** (osservazione già catturata in `epics.md`/`epic-9-context.md`, non richiesta dall'utente): anche `Atleta` ha oggi un solo campo `nome` senza `cognome`. Non estendere `Atleta` in questa storia — resta un'asimmetria nota e accettata, eventualmente materia di una storia futura dedicata.
- I due punti che mostrano `allenatore.nome` (`GruppoRow.tsx`, `wizard-nuova-stagione/page.tsx`) leggono da query Prisma che fanno `include`/`select` impliciti su tutte le colonne del modello — aggiungere `cognome` allo schema non li rompe automaticamente; la questione è solo cosa mostrare in UI (vedi Task 4).
- Nessun impatto su Supabase Auth/RLS/route-guard: questa storia tocca solo lo schema Allenatore e la Server Action di precaricamento.

### Project Structure Notes

- File toccati: `prisma/schema.prisma`, nuova cartella `prisma/migrations/<timestamp>_add_cognome_allenatore/migration.sql`, `app/(onboarding-import)/precaricamento-allenatori/actions.ts`, `.../page.tsx`, `.../actions.test.ts`. Nessun nuovo modulo, nessuna nuova cartella applicativa.
- Nessuna variazione rispetto alla struttura unificata del progetto — stesso pattern Server Action + Client Component già in uso per questa stessa pagina (Story 1.4).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.5: Campo Cognome per Allenatore (precaricamento)]
- [Source: _bmad-output/implementation-artifacts/epic-9-context.md — vincoli su Allenatore/RLS, asimmetria Atleta accettata]
- [Source: prisma/schema.prisma#model Allenatore, model Atleta]
- [Source: app/(onboarding-import)/precaricamento-allenatori/actions.ts, page.tsx, actions.test.ts]
- [Source: app/(gruppi-allenatori)/gruppi/GruppoRow.tsx, app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx — punti che mostrano allenatore.nome]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-3 (Prisma come modello dati canonico), AD-9 (split RLS/Prisma)]
- [Source: prisma/migrations/20260717120000_iscrizioni_add_attiva/migration.sql — precedente di ALTER TABLE ADD COLUMN nel progetto]

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

### Completion Notes List

- Migrazione Prisma aggiunta come `NOT NULL` diretto (senza `DEFAULT`), non nullable come inizialmente valutato: l'utente ha confermato che la tabella `allenatori` in produzione è ancora vuota (nessun precaricamento effettuato), quindi nessuna riga esistente da rompere. Vedi Dev Notes per il vincolo (non più valido non appena esisteranno righe reali).
- Task 4 (mappatura `allenatore.nome`): confermata la raccomandazione della story — `GruppoRow.tsx` e `wizard-nuova-stagione/page.tsx` lasciati invariati (mostrano solo `nome`), nessuna concatenazione "Nome Cognome" introdotta. Nessun AC la richiedeva; verificato con `tsc --noEmit` che il nuovo campo `cognome` sui record Prisma non causa errori nei tipi locali più stretti usati da quei componenti.
- Suite Vitest: 500/500 passati dopo l'implementazione iniziale (era 492 prima di questa storia: 1 test nuovo dedicato a `cognome` mancante, gli altri 6 test esistenti in `actions.test.ts` estesi per includere `cognome` senza aggiungere nuovi casi). Dopo il fix di code review (Nome Cognome in UI), suite ancora 500/500 — nessun nuovo test necessario in `GruppoRow.tsx`/`gruppi/page.tsx`/`wizard-nuova-stagione/page.tsx`, coerente con la convenzione del progetto (nessuna pagina ha test di rendering component).
- `npx prisma migrate deploy` non eseguibile in locale (nessun ambiente Supabase locale disponibile, stessa limitazione già incontrata nelle storie precedenti dell'epic) — validato invece con `npx prisma validate` + `npx prisma generate` (schema corretto, client rigenerato). La migrazione va applicata in fase di deploy come le altre.

### File List

- `prisma/schema.prisma` (modificato — model Allenatore: nuovo campo `cognome`)
- `prisma/migrations/20260727000000_add_cognome_allenatore/migration.sql` (nuovo)
- `app/(onboarding-import)/precaricamento-allenatori/actions.ts` (modificato)
- `app/(onboarding-import)/precaricamento-allenatori/page.tsx` (modificato)
- `app/(onboarding-import)/precaricamento-allenatori/actions.test.ts` (modificato)
- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (modificato — code review: mostra "Nome Cognome")
- `app/(gruppi-allenatori)/gruppi/page.tsx` (modificato — code review: ordinamento secondario per cognome)
- `app/(gruppi-allenatori)/wizard-nuova-stagione/page.tsx` (modificato — code review: mostra "Nome Cognome", ordinamento secondario per cognome)

## Change Log

- 2026-07-27: Implementata Story 9.5 — campo Cognome obbligatorio nel precaricamento Allenatori (nuovo campo `Allenatore.cognome`, form e Server Action aggiornati, 500/500 test passati).
- 2026-07-27: Code review completata — risolta la decisione su come mostrare il Cognome (concatenato "Nome Cognome" in `GruppoRow.tsx`/`wizard-nuova-stagione/page.tsx`, con ordinamento secondario per cognome), corretta la formulazione delle Completion Notes, 5 item deferiti in `deferred-work.md`. Status: done.
