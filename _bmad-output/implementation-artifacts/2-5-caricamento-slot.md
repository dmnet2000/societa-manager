---
baseline_commit: NO_VCS
---

# Story 2.5: Caricamento Slot

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want creare uno Slot (giorno, ora inizio/fine, Palestra, Campo, Gruppo) direttamente,
so that l'orario degli allenamenti, già deciso fuori dall'app, sia visibile a tutti nel sistema.

## Acceptance Criteria

1. **Given** Palestra/Campo (Story 2.1) e Gruppo (Story 2.2) esistono, **when** creo uno Slot specificando giorno, orario, campo e gruppo, **then** lo Slot è salvato e resta fisso per l'intero Anno Agonistico (AD-8) — nessuna rilevazione conflitti in continuo richiesta (FR-2).
2. **Given** uno Slot è stato creato, **when** visito la pagina Slot, **then** lo vedo elencato con giorno, orario, Palestra/Campo e Gruppo.
3. Orari-Palestre resta l'unico proprietario della mutazione dello Slot (AD-2) — nessun altro modulo lo scrive direttamente; la creazione dello Slot legge Gruppo (di proprietà di Gruppi-Allenatori) solo in lettura per popolare il form, mai per scriverci.

## Tasks / Subtasks

- [ ] Task 1: Modello Prisma `Slot` (AC: #1, #3)
  - [ ] `prisma/schema.prisma`: nuovo enum `GiornoSettimana` (`LUNEDI, MARTEDI, MERCOLEDI, GIOVEDI, VENERDI, SABATO, DOMENICA`).
  - [ ] Nuovo modello `Slot` (`id`, `giorno GiornoSettimana`, `oraInizio String`, `oraFine String`, `campoId`, `campo Campo @relation(...)`, `gruppoId`, `gruppo Gruppo @relation(...)`, `createdAt`, `@@map("slot")`).
  - [ ] **`oraInizio`/`oraFine` sono `String` (formato `"HH:MM"`), non `DateTime`/`@db.Time`**: decisione deliberata, non un'omissione. Questa storia non richiede alcuna aritmetica su orari (AC #1 dice esplicitamente "nessuna rilevazione conflitti in continuo richiesta") — sono valori puramente di visualizzazione ("18:30–20:00"). Un `DateTime`/`@db.Time` costringerebbe a costruire una data fittizia (es. `1970-01-01THH:MM`) solo per soddisfare il tipo, con lo stesso rischio di ambiguità di fuso orario già incontrato con `AnnoAgonistico` (Story 1.6, confini UTC) — non necessario qui. Validare il formato con una regex (`/^([01]\d|2[0-3]):[0-5]\d$/`) e `oraInizio < oraFine` con un confronto stringa (funziona correttamente su `HH:MM` zero-paddato).
  - [ ] **`Slot` NON ha una colonna `annoAgonisticoId` propria — eredita l'Anno Agonistico transitivamente tramite `Gruppo`.** Questa è la decisione architetturale esplicita di AD-8 ("Slot e Presenza non hanno un proprio riferimento di stagione — ereditano l'Anno Agonistico transitivamente tramite Gruppo"), **diversa** dal pattern a FK diretta usato da `Iscrizione` (Story 1.6) e `GruppoAtleta` (Story 2.4, che aveva bisogno di un vincolo di unicità reale per Anno Agonistico che `Slot` non richiede). Non aggiungere `annoAgonisticoId` a `Slot`: sarebbe una deviazione architetturale, non solo ridondante.
  - [ ] `Slot` **non è protetta da RLS** (AD-9, elencata esplicitamente insieme a Palestra/Campo/Gruppo/Allenatore) — gestita via Prisma diretto, stesso pattern di `Campo` (Story 2.1) e `Gruppo` (Story 2.2).
  - [ ] `onDelete: Cascade` su entrambe le FK (`campoId`, `gruppoId`) — stesso principio già applicato a `GruppoAllenatore`/`GruppoAtleta` (Story 2.3/2.4): uno Slot non ha significato indipendente dal proprio Campo o Gruppo.
  - [ ] Migrazione scritta a mano: `CREATE TYPE "GiornoSettimana" AS ENUM (...)`, `CREATE TABLE "slot" (...)` con FK verso `campi` e `gruppi` (`ON DELETE CASCADE`). Applicare con `prisma migrate deploy`, verificare con `prisma migrate status` (nessun drift), poi `prisma generate`.
- [ ] Task 2: Server Action `creaSlot` in `app/(orari-palestre)/slot/actions.ts` (nuovo file) (AC: #1, #3)
  - [ ] Nuovo file (nuova pagina, non estende `palestre/actions.ts`) — stesso modulo route-group `app/(orari-palestre)/` di Story 2.1 (AD-2: Orari-Palestre possiede sia Palestra/Campo sia Slot). `requireRuolo(["ADMIN", "DIRIGENTE"])` come primo passo (FR-2), stesso pattern di `creaPalestra`/`creaCampo`.
  - [ ] `creaSlot(_prevState, formData)`: legge `giorno`, `oraInizio`, `oraFine`, `campoId`, `gruppoId` da `formData`. Valida ciascun campo con un controllo distinto e un messaggio distinto (lezione già consolidata dalle code review di Story 2.1/2.2, applicata proattivamente qui): `"Il giorno è obbligatorio."`, `"L'ora di inizio è obbligatoria."`, `"L'ora di fine è obbligatoria."`, `"Il Campo è obbligatorio."`, `"Il Gruppo è obbligatorio."`.
  - [ ] Valida il formato `HH:MM` di `oraInizio`/`oraFine` con la regex sopra — messaggio `"Formato ora non valido (usa HH:MM)."` se non conforme, per entrambi i campi (stesso messaggio, il campo non è ambiguo perché l'utente lo sta compilando in quel momento tramite `<input type="time">`, che garantisce già il formato lato browser — la validazione server-side è comunque necessaria, mai fidarsi solo del client).
  - [ ] Valida `oraInizio < oraFine` (confronto stringa) — messaggio `"L'ora di fine deve essere successiva all'ora di inizio."`.
  - [ ] `prisma.slot.create({ data: { giorno, oraInizio, oraFine, campoId, gruppoId } })` dentro un try/catch — un `campoId`/`gruppoId` inesistente genera un errore Prisma di violazione FK, catturato come `INTERNAL` (nessuna validazione preventiva separata dell'esistenza, stesso pattern di `assegnaAllenatore`/`assegnaAtleta`, Story 2.3/2.4).
  - [ ] `revalidatePath("/slot")` dopo la creazione riuscita.
  - [ ] **Nessuna Server Action di modifica o rimozione in questa storia**: AC #1 dice esplicitamente che lo Slot "resta fisso per l'intero Anno Agonistico" — nessun AC richiede modifica/rimozione, stessa disciplina di scope già applicata in Story 2.2/2.3/2.4.
- [ ] Task 3: UI in `app/(orari-palestre)/slot/page.tsx` (nuovo file) + `NuovoSlotForm.tsx` (nuovo file) (AC: #1, #2)
  - [ ] `page.tsx`: legge l'Anno Agonistico corrente in sola lettura (`trovaAnnoAgonisticoCorrente()`, mai `risolviAnnoAgonisticoCorrente()` in una pagina GET — Dev Notes Story 1.6) per scopare sia l'elenco dei Gruppi disponibili nel form sia l'elenco degli Slot esistenti: `where: { gruppo: { annoAgonisticoId: annoCorrente.id } }` (filtro transitivo via relazione, non una colonna propria — coerente con la decisione del Task 1). **Applicare questo filtro fin da subito, non aspettare una code review**: la stessa lacuna (elenco non scopato per stagione) è stata trovata e corretta in code review sia per `Gruppo` (Story 2.2) sia implicitamente prevenuta per `GruppoAtleta`/`GruppoAllenatore` (Story 2.3/2.4) — qui si applica alla lettura transitiva via `Gruppo`.
  - [ ] Legge anche `prisma.campo.findMany({ include: { palestra: true }, orderBy: [...] })` per popolare il `<select>` Campo del form, mostrando `"NomePalestra - NomeCampo"` come etichetta (nessun Campo esiste senza una Palestra, FK obbligatoria — nessun caso limite da gestire).
  - [ ] `Slot`/`Campo`/`Gruppo`/`Palestra` non sono protetti da RLS (AD-9) — tutte le letture di questa pagina sono Prisma diretto, **nessun client Supabase necessario qui** (a differenza di Story 2.4, che doveva leggere `Atleta`).
  - [ ] `NuovoSlotForm.tsx`: Client Component, `useActionState(creaSlot, undefined)`, stesso pattern di `NuovaPalestraForm`/`NuovoGruppoForm` incluso il reset del form al successo (`formRef`/`useEffect`, lezione dalla code review di Story 2.3, applicata proattivamente da Story 2.4 in poi). Campi: `<select name="giorno">` con le 7 opzioni di `GiornoSettimana` (etichette in italiano: Lunedì...Domenica), `<input type="time" name="oraInizio">`, `<input type="time" name="oraFine">`, `<select name="campoId">`, `<select name="gruppoId">` (solo Gruppi della stagione corrente).
  - [ ] Elenco Slot esistenti (AC #2): tabella con colonne Giorno, Orario (`oraInizio–oraFine`), Palestra/Campo, Gruppo — ordinata per `giorno` poi `oraInizio` (leggibilità, non un AC esplicito ma coerente con lo scopo "vedere l'orario"). Nessun componente Client dedicato necessario per la sola visualizzazione (a differenza di `GruppoRow.tsx`, qui non c'è un'azione per riga in questa storia).
  - [ ] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/slot", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] }` — stesso pattern di `/palestre`/`/gruppi` (Story 2.1/2.2).
- [ ] Task 4: Test (Vitest)
  - [ ] `app/(orari-palestre)/slot/actions.test.ts` (nuovo file): `FORBIDDEN` per Ruoli diversi da Admin/Dirigente; `VALIDATION` per ciascuno dei 5 campi mancanti (messaggi distinti); `VALIDATION` per formato ora non valido; `VALIDATION` per `oraInizio >= oraFine`; successo — `prisma.slot.create` chiamato con tutti i campi corretti, `revalidatePath` chiamato; errore `INTERNAL` fail-closed su eccezione Prisma (es. `campoId`/`gruppoId` inesistente, FK violata).

## Dev Notes

- **`Slot` eredita l'Anno Agonistico transitivamente tramite `Gruppo` (AD-8) — non ha una propria colonna `annoAgonisticoId`.** Questo è il primo utilizzo reale del pattern "transitivo" che l'architettura aveva già anticipato ma non ancora costruito (vedi il commento su `Iscrizione`, Story 1.6: "non il pattern transitivo di Slot/Presenza, ancora da costruire" — ora è questa storia). È l'opposto della scelta fatta per `GruppoAtleta` (Story 2.4), che aveva bisogno di una FK diretta perché doveva esprimere un vincolo di unicità reale (`@@unique([atletaId, annoAgonisticoId])`) — `Slot` non ha un vincolo di unicità analogo da esprimere, quindi non c'è ragione architetturale per duplicare la stagione sulla riga. **Non reintrodurre per abitudine il pattern di Story 2.4**: qui sarebbe sbagliato.
- **`oraInizio`/`oraFine` come `String`, non `DateTime`/`@db.Time`**: decisione pragmatica esplicita — vedi Task 1. Se una storia futura richiedesse aritmetica su orari (es. rilevazione conflitti), sarà quella storia a introdurre il tipo più ricco, non questa.
- **AD-2 rispettato**: la creazione dello Slot vive in `app/(orari-palestre)/`, non in `app/(gruppi-allenatori)/` — Orari-Palestre resta l'unico proprietario della mutazione dello Slot, incluso il suo FK verso Gruppo. La pagina *legge* `Gruppo` via Prisma diretto solo per popolare il form (lettura, non scrittura) — esattamente come `gruppi/page.tsx` (Story 2.3) legge `Allenatore` senza esserne proprietario. Nessuna Server Action di questa storia scrive mai su `Gruppo`.
- **Nessun client Supabase in questa storia**: a differenza di Story 2.4, nessuna delle entità coinvolte (`Slot`, `Campo`, `Gruppo`, `Palestra`) è protetta da RLS (AD-9) — tutto Prisma diretto, come Story 2.1/2.2/2.3.
- **Pattern di riferimento più vicino**: `app/(orari-palestre)/palestre/actions.ts` (Story 2.1) per la struttura della Server Action e la validazione a messaggi distinti; `app/(orari-palestre)/palestre/page.tsx` (Story 2.1) per una pagina Prisma-diretto senza client Supabase; `app/(gruppi-allenatori)/gruppi/page.tsx` (Story 2.2, review fix) per il pattern di scoping per Anno Agonistico corrente, qui adattato a un filtro transitivo via relazione (`where: { gruppo: { annoAgonisticoId: ... } }`) invece che su una colonna propria.
- **Scala**: NFR PRD §8 (poche palestre/campi, poche decine di Gruppi), nessuna preoccupazione di paginazione per l'elenco Slot o i `<select>` del form.

### Project Structure Notes

- Nuovo route group riusato: `app/(orari-palestre)/slot/` (accanto a `app/(orari-palestre)/palestre/`, stesso modulo AD-2, nuova pagina).
- File nuovi attesi: `prisma/migrations/<timestamp>_add_slot/migration.sql`, `app/(orari-palestre)/slot/actions.ts`, `app/(orari-palestre)/slot/actions.test.ts`, `app/(orari-palestre)/slot/page.tsx`, `app/(orari-palestre)/slot/NuovoSlotForm.tsx`. File modificati: `prisma/schema.prisma` (nuovo enum `GiornoSettimana`, nuovo modello `Slot`, relazioni inverse su `Campo`/`Gruppo`), `lib/auth/route-guard.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5: Caricamento Slot] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-2] — "Admin o Dirigente può creare uno Slot (giorno, ora inizio/fine, Palestra, Campo, Gruppo) direttamente, senza calcolo automatico. Lo Slot resta fisso per l'intero Anno Agonistico una volta creato (nessuna rilevazione conflitti in continuo richiesta)."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2] — "Orari-Palestre è l'unico proprietario della mutazione di Slot, incluso il suo FK verso Gruppo — Gruppi-Allenatori possiede la creazione del Gruppo e l'assegnazione degli Allenatori, ma non scrive mai direttamente su Slot."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-8] — "Slot e Presenza non hanno un proprio riferimento di stagione — ereditano l'Anno Agonistico transitivamente tramite Gruppo."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — Slot esplicitamente nell'elenco delle tabelle non protette da RLS, gestibili via Prisma diretto.
- [Source: app/(orari-palestre)/palestre/actions.ts, page.tsx] — pattern di riferimento per Server Action e pagina Prisma-diretto senza client Supabase (Story 2.1).
- [Source: app/(gruppi-allenatori)/gruppi/page.tsx] — pattern di riferimento per lo scoping per Anno Agonistico corrente (Story 2.2, review fix).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

### Completion Notes List

Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
