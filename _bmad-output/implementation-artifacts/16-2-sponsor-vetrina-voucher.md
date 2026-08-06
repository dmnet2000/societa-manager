---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 16.2: Vetrina pubblica e generazione voucher

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Atleta, Genitore o Allenatore,
I want vedere i banner pubblicitari e le convenzioni attive della società, e generare un voucher per una convenzione,
so that possa scoprire gli sponsor della società e usufruire delle scontistiche a cui ho diritto in quanto membro.

## Acceptance Criteria

1. **Given** un Utente autenticato con un qualunque Ruolo **When** visita la sezione Sponsor **Then** vede i Banner pubblicitari e le Convenzioni **attivi** (nessuno Sponsor disattivato, Story 16.1 AC #3), ciascuno con immagine e descrizione, visivamente distinti per tipo.
2. **Given** una Convenzione attiva **When** l'Utente clicca "Genera voucher" **Then** vede una schermata col proprio Nome e Cognome, il nome della società (se configurato), la data corrente, e un riferimento alla Convenzione/scontistica — nessuna persistenza di questa generazione.
3. **And** il pulsante "Genera voucher" non compare sui Banner pubblicitari (`tipo = BANNER`) — solo sulle Convenzioni.
4. **And** se nessuno Sponsor è attivo, la pagina mostra un messaggio esplicito ("Nessuno sponsor al momento") invece di una sezione vuota senza spiegazione.
5. **And** nessuna informazione sanitaria/riservata nel voucher — solo Nome Cognome (già pubblico all'interno della società) e nome società, nessun dato da `Atleta`/`CertificatoMedico`.

## Tasks / Subtasks

- [ ] Task 1: Route-guard e navigazione (AC: #1)
  - [ ] `lib/auth/route-guard.ts`: nuova voce con `ruoliAmmessi` che include **tutti e sei** i Ruoli (`["ALLENATORE", "ATLETA", "GENITORE", "SEGRETERIA", "DIRIGENTE", "ADMIN"]`) — primo caso nel progetto di una rotta autenticata visibile a ogni Ruolo, verificare che il tipo `ProtectedRoute`/`ruoliAmmessi` lo supporti senza modifiche (dovrebbe: è già un array di `Ruolo`).
  - [ ] Decidere se riusare la stessa rotta `/sponsor` di Story 16.1 con contenuto condizionale (Admin/Dirigente vedono anche i controlli di gestione sulla stessa pagina) o una rotta pubblica distinta (es. `/sponsor` gestione Admin-only + vetrina altrove) — **raccomandato**: stessa rotta `/sponsor`, contenuto condizionale per Ruolo (stesso principio già in uso altrove nel progetto, es. `/campionati` mostra controlli diversi per Allenatore vs Admin/Dirigente sulla stessa pagina) — evita di duplicare la lettura degli Sponsor attivi in due punti.
- [ ] Task 2: Vista vetrina (AC: #1, #3, #4)
  - [ ] `app/(sponsor)/sponsor/page.tsx` (estesa da Story 16.1): per Ruoli non Admin/Dirigente (o in aggiunta, se contenuto condizionale sulla stessa pagina), elenca `prisma.sponsor.findMany({ where: { attiva: true }, orderBy: { createdAt: "desc" } })`, separando visivamente `BANNER` da `CONVENZIONE` (due sezioni, o un badge/etichetta per riga).
  - [ ] Messaggio esplicito se l'elenco filtrato è vuoto (AC #4).
  - [ ] Immagine sponsor via `urlPubblicoImmagineSponsor` (Story 16.1, Task 2).
- [ ] Task 3: Generazione voucher (AC: #2, #3, #5)
  - [ ] Nuova pagina o pannello (es. `/sponsor/[id]/voucher` o un componente espandibile inline — decidere in sviluppo in base a cosa risulta più semplice con l'infrastruttura Next.js già in uso, es. Server Component con `params`) che, solo per uno Sponsor `tipo = CONVENZIONE` attivo, mostra: Nome Cognome dell'Utente autenticato (da dove? l'Utente autenticato ha `email` ma il Nome/Cognome vive su `Atleta`/`Allenatore`/altre entità collegate, non su `Utente` stesso — **punto da chiarire in sviluppo**: un Genitore non ha un proprio Nome/Cognome nel sistema oggi, solo l'`email`; decidere se il voucher usa l'email come fallback per Ruoli senza un Nome/Cognome collegato, o se richiede un nuovo campo — non assumere, verificare `prisma.utente`/entità collegate prima di implementare), nome società (`leggiNomeSettore()`, può essere `null`), data corrente, riferimento al nome/descrizione della Convenzione.
  - [ ] Nessuna scrittura DB — puramente computato a request-time (decisione di analisi, AC #2 "nessuna persistenza").
- [ ] Task 4: Test
  - [ ] Test della logica di filtro (`attiva: true`, split per `tipo`) — mirror dei pattern di test già esistenti per liste filtrate (es. `elencaIscrizioniPerAnno`).
  - [ ] Test che il pulsante "Genera voucher"/la vista voucher siano raggiungibili solo per `tipo = CONVENZIONE` (AC #3).
  - [ ] `lib/auth/route-decision.test.ts` (esteso): nuova voce verificata per **tutti** i Ruoli ammessi.
  - [ ] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (2026-08-06, prese con l'utente — vedi `epics.md#Epic 16`)

- **Voucher = schermata, non PDF**: nessuna libreria di generazione PDF, nessuna nuova dipendenza.
- **Nessuna persistenza**: non si traccia chi ha generato un voucher per quale Convenzione — coerente con la preferenza NFR6 "soluzione più semplice" già più volte scelta in questo progetto.
- **Visibilità totale**: tutti e sei i Ruoli, non solo Atleta/Genitore/Allenatore come nello Story-title (Admin/Dirigente/Segreteria vedono comunque la vetrina, oltre — per Admin/Dirigente — ai controlli di gestione di Story 16.1).

### Punto aperto critico — da dove viene il Nome Cognome per il voucher

**Non assumere**: verificare in apertura sviluppo come risolvere "Nome Cognome" per l'Utente autenticato, per Ruolo:
- Un **Allenatore** ha `nome`/`cognome` su `Allenatore` (Story 9.5), collegato a `Utente` — risolvibile.
- Un'**Atleta** ha `nome` su `Atleta` (nessun campo `cognome` separato — Dev Notes di più storie precedenti lo confermano, es. Story 9.31/9.18: "nome" resta un formato "Cognome e Nome" unico) — risolvibile, ma formato diverso da Allenatore.
- Un **Genitore** non ha necessariamente un proprio profilo con Nome/Cognome nel sistema oggi (solo `email` su `Utente`, aggancio a un'Atleta tramite `GenitoreAtleta`) — **nessuna fonte diretta di Nome/Cognome per un Genitore**, verificare se serve un fallback (es. nome dell'Atleta collegata + "genitore di", o l'email) prima di scrivere l'AC come "Nome Cognome" letterale.
- **Admin/Dirigente/Segreteria**: stesso problema del Genitore, nessun Nome/Cognome diretto su `Utente`.

Questo è il punto tecnico più delicato della storia — va risolto con l'utente in apertura sviluppo se non emerge una soluzione ovvia leggendo lo schema, non assunto qui.

### Pattern da riusare (non reinventare)

- **Lettura nome società**: `leggiNomeSettore()` (`lib/configurazione-applicazione.ts`, Story 7.2) — già esiste, nessuna nuova funzione necessaria, gestisce già il caso `null`.
- **Rotta visibile a tutti i Ruoli**: nessun precedente diretto — la rotta più simile per ampiezza è `/notifiche` (`ruoliAmmessi: ["ALLENATORE", "DIRIGENTE"]`, comunque parziale) — questa è la prima rotta autenticata davvero universale, verificare che nessuna assunzione implicita altrove nel codice (es. `voci-navigazione.ts`) presupponga un sottoinsieme di Ruoli.

### Riferimenti

- [Source: lib/configurazione-applicazione.ts] — `leggiNomeSettore`, da riusare invariata.
- [Source: prisma/schema.prisma, model Utente/Atleta/Allenatore/GenitoreAtleta] — da leggere per intero per risolvere il punto aperto su Nome/Cognome.
- [Source: _bmad-output/implementation-artifacts/16-1-sponsor-modello-dati-gestione.md] — story da cui questa dipende (modello dati, storage, pagina di gestione).
- [Source: epics.md#Epic 16: Sponsor e Convenzioni] — decisioni di analisi complete.

### Project Structure Notes

- Estende `app/(sponsor)/sponsor/page.tsx` (Story 16.1) invece di un nuovo route group.
- Nuovo file per la vista voucher (percorso esatto da decidere in sviluppo, Task 3).
- Nessuna nuova migrazione (nessuna persistenza, AC #2).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
