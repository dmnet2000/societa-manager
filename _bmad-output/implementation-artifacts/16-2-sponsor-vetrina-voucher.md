---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 16.2: Vetrina pubblica e generazione voucher

Status: done

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

- [x] Task 1: Route-guard e navigazione (AC: #1)
  - [x] `lib/auth/route-guard.ts`: nuova voce con `ruoliAmmessi` che include **tutti e sei** i Ruoli (`["ALLENATORE", "ATLETA", "GENITORE", "SEGRETERIA", "DIRIGENTE", "ADMIN"]`) — primo caso nel progetto di una rotta autenticata visibile a ogni Ruolo, verificare che il tipo `ProtectedRoute`/`ruoliAmmessi` lo supporti senza modifiche (dovrebbe: è già un array di `Ruolo`).
  - [x] Decidere se riusare la stessa rotta `/sponsor` di Story 16.1 con contenuto condizionale (Admin/Dirigente vedono anche i controlli di gestione sulla stessa pagina) o una rotta pubblica distinta (es. `/sponsor` gestione Admin-only + vetrina altrove) — **raccomandato**: stessa rotta `/sponsor`, contenuto condizionale per Ruolo (stesso principio già in uso altrove nel progetto, es. `/campionati` mostra controlli diversi per Allenatore vs Admin/Dirigente sulla stessa pagina) — evita di duplicare la lettura degli Sponsor attivi in due punti. **Deciso: stessa rotta `/sponsor`** — `ruoliAmmessi` esteso a tutti e sei i Ruoli (era Admin/Dirigente-only).
- [x] Task 2: Vista vetrina (AC: #1, #3, #4)
  - [x] `app/(sponsor)/sponsor/page.tsx` (estesa da Story 16.1): per Ruoli non Admin/Dirigente (o in aggiunta, se contenuto condizionale sulla stessa pagina), elenca `prisma.sponsor.findMany({ where: { attiva: true }, orderBy: { createdAt: "desc" } })`, separando visivamente `BANNER` da `CONVENZIONE` (due sezioni, o un badge/etichetta per riga).
  - [x] Messaggio esplicito se l'elenco filtrato è vuoto (AC #4).
  - [x] Immagine sponsor via `urlPubblicoImmagineSponsor` (Story 16.1, Task 2).
- [x] Task 3: Generazione voucher (AC: #2, #3, #5)
  - [x] Nuova pagina o pannello (es. `/sponsor/[id]/voucher` o un componente espandibile inline — decidere in sviluppo in base a cosa risulta più semplice con l'infrastruttura Next.js già in uso, es. Server Component con `params`) che, solo per uno Sponsor `tipo = CONVENZIONE` attivo, mostra: Nome Cognome dell'Utente autenticato (da dove? l'Utente autenticato ha `email` ma il Nome/Cognome vive su `Atleta`/`Allenatore`/altre entità collegate, non su `Utente` stesso — **punto da chiarire in sviluppo**: un Genitore non ha un proprio Nome/Cognome nel sistema oggi, solo l'`email`; decidere se il voucher usa l'email come fallback per Ruoli senza un Nome/Cognome collegato, o se richiede un nuovo campo — non assumere, verificare `prisma.utente`/entità collegate prima di implementare), nome società (`leggiNomeSettore()`, può essere `null`), data corrente, riferimento al nome/descrizione della Convenzione. **Deciso con l'utente**: Allenatore → nome+cognome da `Allenatore`; Atleta auto-agganciata → `Atleta.nome`; Genitore → "Genitore di &lt;nome prima Atleta collegata&gt;"; Admin/Dirigente/Segreteria → email come fallback. Pagina `app/(sponsor)/sponsor/[id]/voucher/page.tsx`.
  - [x] Nessuna scrittura DB — puramente computato a request-time (decisione di analisi, AC #2 "nessuna persistenza").
- [x] Task 4: Test
  - [x] Test della logica di filtro (`attiva: true`, split per `tipo`) — mirror dei pattern di test già esistenti per liste filtrate (es. `elencaIscrizioniPerAnno`).
  - [x] Test che il pulsante "Genera voucher"/la vista voucher siano raggiungibili solo per `tipo = CONVENZIONE` (AC #3).
  - [x] `lib/auth/route-decision.test.ts` (esteso): nuova voce verificata per **tutti** i Ruoli ammessi.
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

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

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff scoped alla sola Story 16.2 (14 file: la Story 16.1, già committata separatamente, non è stata ri-inclusa nel diff).

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 5 verificati indipendentemente, incluso un controllo puntuale sull'AC #5 (nessun dato sanitario/riservato letto, solo `Allenatore.nome/cognome`/`Atleta.nome`) e sulla decisione di analisi presa con l'utente per Genitore/Admin/Dirigente/Segreteria (non ri-messa in discussione, già pre-approvata).

- [x] [Review][Patch] Immagine della vetrina (`SponsorVetrinaCard`) senza cache-busting (`?v=updatedAt`) — stessa lezione già applicata a `SponsorRow.tsx`/`logo/page.tsx` (Story 7.2/16.1) ma mancante qui: dopo che un Admin sostituisce l'immagine di uno Sponsor, la vetrina pubblica può continuare a mostrare la versione precedente in cache mentre la sezione di gestione si aggiorna correttamente. Trovato dal Blind Hunter. Corretto: `updatedAt` propagato nel tipo `SponsorVetrina`/`page.tsx`/`SponsorVetrinaCard`, stessa query string `?v=` di `SponsorRow`. [app/(sponsor)/sponsor/SponsorVetrinaCard.tsx]
- [x] [Review][Patch] `leggiNomeSettore()` inutilmente accoppiato al ternario `user ?` in `voucher/page.tsx` — il nome società (dato indipendente dall'identità dell'Utente) sparisce silenziosamente se `getUser()` fallisce, pur essendo perfettamente leggibile. Trovato indipendentemente da Blind Hunter ed Edge Case Hunter. Corretto: `leggiNomeSettore()` chiamata fuori dal ternario, sempre eseguita. [app/(sponsor)/sponsor/[id]/voucher/page.tsx]
- [x] [Review][Patch] `risolviNomeVoucher` può restituire una stringa vuota se ogni ramo (incluso il fallback email) è falsy — il voucher renderizzerebbe un nome vuoto invece di un placeholder sicuro. Trovato indipendentemente da Blind Hunter, Edge Case Hunter e Acceptance Auditor (tutti e 3 i layer). Corretto: fallback finale `"Utente"` se anche l'email è vuota, 1 nuovo test. [lib/sponsor/risolvi-nome-voucher.ts]

- [x] [Review][Defer] `getUser()` fallisce silenziosamente (loggato ma non gestito diversamente) sia in `page.tsx` sia in `voucher/page.tsx` — degrada a un nome/sezione vuoti invece di un messaggio esplicito di sessione scaduta (Blind Hunter + Edge Case Hunter + Acceptance Auditor, trovato indipendentemente da tutti e 3). Deferred: stesso pattern già esplicitamente accettato in `mio-orario/page.tsx` ("probabilità bassa, nessun crash, solo un messaggio impreciso per uno stato dati patologico") — `route-guard.ts` resta comunque l'autorità che garantisce una sessione valida a monte. [app/(sponsor)/sponsor/page.tsx, app/(sponsor)/sponsor/[id]/voucher/page.tsx]
- [x] [Review][Defer] Il `Promise.all` di risoluzione identità in `voucher/page.tsx` non è avvolto in un try/catch (Edge Case Hunter). Deferred: gap preesistente e trasversale a tutta l'app (nessun `error.tsx`), già loggato ripetutamente fin da Story 1.2. [app/(sponsor)/sponsor/[id]/voucher/page.tsx]
- [x] [Review][Defer] Due query `prisma.sponsor.findMany()` separate e non raggruppate (vetrina + gestione) per Admin/Dirigente — potrebbero divergere sotto un toggle concorrente della stessa riga (Blind Hunter). Deferred: stessa categoria di rischio a bassa probabilità già accettata ripetutamente in questo progetto (pochi Admin/Dirigente attivi contemporaneamente, nessun controllo di concorrenza ottimistica altrove). [app/(sponsor)/sponsor/page.tsx]
- [x] [Review][Defer] `SponsorVetrinaCard` non ha un fallback `onError` sull'immagine, ora esposto a tutti i Ruoli invece che solo Admin/Dirigente come in `SponsorRow` (Blind Hunter). Deferred: estende lo stesso gap già deferito nella code review di Story 16.1 per `SponsorRow.tsx`, non introdotto ex-novo qui. [app/(sponsor)/sponsor/SponsorVetrinaCard.tsx]
- [x] [Review][Defer] Nessun limite visivo (CSS line-clamp/truncation) sulla descrizione nelle card della vetrina, a fronte di un layout a grid a colonne fisse (Blind Hunter). Deferred: il limite dati (1000 caratteri) è già stato applicato in Story 16.1 proprio per questo scenario; il solo limite visivo è un dettaglio estetico, nessun AC lo richiede. [app/(sponsor)/sponsor/sponsor.module.css]
- [x] [Review][Defer] `SponsorVetrinaCard` non porta il campo `tipo` nel proprio `Props` — la garanzia "voucher solo su Convenzioni" (AC #3) dipende interamente da `page.tsx` che passa correttamente `mostraVoucher` ai due punti di chiamata (Blind Hunter). Deferred: rischio reale basso, mitigato da una verifica indipendente e ridondante in `voucher/page.tsx` (`convenzioneVoucherValida`, difesa in profondità già in atto) — non un difetto funzionale, solo un'assenza di garanzia a livello di tipo. **Risolto in positivo dall'estensione post-review** (2026-08-09, Banner cliccabile): `tipo`/`linkEsterno` ora fanno parte di `Props.sponsor`, `mostraVoucher` rimosso — il componente deriva entrambe le decisioni (immagine cliccabile, pulsante voucher) internamente da `sponsor.tipo`. [app/(sponsor)/sponsor/SponsorVetrinaCard.tsx]

**Dismessi come rumore/convenzioni già accettate (6)**: doppio controllo di autenticazione (`voucher/page.tsx` richiama `getUser()` nonostante `route-guard.ts` abbia già autorizzato la richiesta, Blind Hunter) — stesso identico pattern già in uso in ogni pagina Server Component del progetto (`il-mio-profilo`, `campionati`, `mio-orario`, ecc.), unica modalità disponibile per risolvere l'identità in un Server Component; nessun controllo anti-abuso/tracciamento sul riutilizzo del voucher (Blind Hunter) — decisione di design esplicita già presa in fase di analisi (AC #2 "nessuna persistenza", Dev Notes "coerente con la preferenza NFR6 soluzione più semplice"), non un difetto; `raggruppaSponsorPerTipo` senza bucket per un terzo `tipo` (Blind Hunter) — impossibile oggi, `TipoSponsor` è vincolato dall'enum del DB a due soli valori; risoluzione "prima Atleta collegata" per il Genitore con `orderBy: atletaId asc` (Blind Hunter) — implementa esattamente la decisione presa con l'utente in apertura di questa storia, non un difetto; nessun test che eserciti `VoucherPage` end-to-end (Blind Hunter) — coerente con la convenzione già accettata in tutto il progetto di non testare `page.tsx` direttamente (osservazione confermata anche dall'Acceptance Auditor); proprietà CSS inerte/touch-target non verificato su `.linkVoucher` (Blind Hunter) — stesso identico pattern (`.bottone` esteso su un `<a>`) già in produzione per `.linkNaviga` (`palestre.module.css`, Story 9.6), mai flaggato in nessuna review precedente.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Nessuno - nessun blocco incontrato. Stesso errore benigno preesistente del motore Prisma WASM durante il prerendering statico già osservato in Story 16.1 (non introdotto/aggravato da questa story) - la build completa comunque con successo, `/sponsor` e `/sponsor/[id]/voucher` presenti nell'elenco finale.

### Completion Notes List

- **Punto aperto critico risolto con l'utente prima di scrivere codice** (come richiesto esplicitamente dalle Dev Notes): verificato lo schema Prisma (`Utente` ha solo `email`, nessun Nome/Cognome) - confermato che nessuna soluzione ovvia emergeva per Genitore/Admin/Dirigente/Segreteria. Deciso: Genitore → "Genitore di &lt;nome prima Atleta collegata&gt;" (mirror del pattern di risoluzione identità già in `il-mio-profilo/page.tsx`, Story 9.12); Admin/Dirigente/Segreteria → email come fallback (nessuna fonte diretta, stesso principio "soluzione più semplice" già citato nelle Dev Notes della story per NFR6).
- Task 1: `/sponsor` estesa da Admin/Dirigente-only a tutti e sei i Ruoli in `route-guard.ts` — prima rotta autenticata del progetto visibile a ogni Ruolo. Stessa rotta riusata (non una rotta distinta), contenuto condizionale in `page.tsx` in base a `ADMIN`/`DIRIGENTE` nei ruoli dell'Utente (stesso principio già in uso in `/campionati`).
- Task 2: `page.tsx` esteso con la sezione vetrina (visibile a tutti) sopra la sezione di gestione esistente (visibile solo ad Admin/Dirigente, invariata da Story 16.1). Nuova funzione pura `raggruppaSponsorPerTipo` (`lib/sponsor/`) per lo split Banner/Convenzioni, nuovo componente `SponsorVetrinaCard.tsx` di sola lettura (mai un `<form>`, a differenza di `SponsorRow.tsx`). AC #4: un solo messaggio "Nessuno sponsor al momento." quando l'elenco filtrato è interamente vuoto (non un messaggio per singola sezione).
- Task 3: nuova rotta dinamica `app/(sponsor)/sponsor/[id]/voucher/page.tsx` (primo uso di un Dynamic Route Segment `[id]` in questo progetto — verificati i doc Next.js vendored per il pattern `params: Promise<{id}>`/`await params`, coerente con AGENTS.md). Logica di gating (`tipo === "CONVENZIONE" && attiva`) estratta in una funzione pura testabile `convenzioneVoucherValida` invece di restare inline nel Server Component, per rispettare la richiesta esplicita del Task 4 di testare questo comportamento senza rompere la convenzione del progetto di non testare `page.tsx` direttamente. Risoluzione identità mirror di `il-mio-profilo/page.tsx`, estratta in `risolviNomeVoucher` (pura). Nessuna scrittura DB (AC #2).
- Task 4: 3 nuovi moduli `lib/sponsor/*.test.ts` (19 test totali su filtro/tipo, risoluzione nome, gating voucher), `route-decision.test.ts` esteso (6 Ruoli + rotta nidificata), `voci-navigazione.test.ts` aggiornato (2 test di ordine completo che ora includono `/sponsor` per Allenatore/Segreteria, oltre ad Admin già coperto da Story 16.1). 1027/1027 test Vitest passati (era 1008), 0 errori tsc/eslint, build produzione riuscita.
- Verifica dal vivo (voucher reale per ciascun Ruolo, upload immagine) non eseguibile in questo sandbox (nessun accesso DB/Storage reale) - demandata all'utente dopo il deploy.

### File List

- `lib/auth/route-guard.ts` (modificato: `/sponsor` esteso a tutti e sei i Ruoli)
- `lib/auth/route-decision.test.ts` (modificato: test `/sponsor` per tutti i Ruoli + rotta nidificata voucher)
- `lib/auth/voci-navigazione.test.ts` (modificato: test di ordine completo per Allenatore/Segreteria aggiornati con `/sponsor`)
- `lib/sponsor/raggruppa-sponsor-per-tipo.ts` (nuovo)
- `lib/sponsor/raggruppa-sponsor-per-tipo.test.ts` (nuovo)
- `lib/sponsor/risolvi-nome-voucher.ts` (nuovo)
- `lib/sponsor/risolvi-nome-voucher.test.ts` (nuovo)
- `lib/sponsor/convenzione-voucher-valida.ts` (nuovo)
- `lib/sponsor/convenzione-voucher-valida.test.ts` (nuovo)
- `app/(sponsor)/sponsor/page.tsx` (modificato: vetrina pubblica + gestione condizionale)
- `app/(sponsor)/sponsor/SponsorVetrinaCard.tsx` (nuovo)
- `app/(sponsor)/sponsor/sponsor.module.css` (modificato: nuove classi vetrina)
- `app/(sponsor)/sponsor/[id]/voucher/page.tsx` (nuovo)
- `app/(sponsor)/sponsor/[id]/voucher/voucher.module.css` (nuovo)

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
- 2026-08-09: Implementata - punto aperto critico su Nome/Cognome risolto con l'utente, `/sponsor` estesa a tutti i Ruoli, vetrina pubblica con split Banner/Convenzioni, generazione voucher su rotta dinamica `/sponsor/[id]/voucher`. 1027/1027 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-09: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff scoped alla sola Story 16.2 - nessuna violazione degli AC. 3 patch applicati (cache-busting mancante sull'immagine della vetrina, `leggiNomeSettore()` inutilmente accoppiato al ternario `user`, `risolviNomeVoucher` senza fallback finale su nome vuoto - quest'ultimo trovato indipendentemente da tutti e 3 i layer). 6 defer, 6 dismessi come rumore/convenzioni/decisioni di design già accettate. 1028/1028 test Vitest passati (era 1027), 0 errori tsc/eslint, build produzione riuscita. Epic 16 completo: entrambe le story (16.1, 16.2) done. Status: done.
- 2026-08-09: Estensione post-review segnalata dall'utente dal vivo ("ho inserito uno sponsor... vedo il banner ma non è cliccabile"): un Banner pubblicitario senza alcuna azione cliccabile non ha senso dal punto di vista dello sponsor - il campo `linkEsterno` (già impostabile in gestione, Story 16.1) non veniva mai usato dalla vetrina. Deciso con l'utente: solo i Banner (non le Convenzioni, che mantengono il pulsante "Genera voucher") diventano cliccabili verso `linkEsterno` se impostato, aprendolo in una nuova scheda. `SponsorVetrinaCard` ora porta `tipo`/`linkEsterno` nel proprio `Props` (risolve anche in positivo un finding già deferito in code review - "non porta tipo nel Props"). 1028/1028 test Vitest passati (invariato), 0 errori tsc/eslint, build produzione riuscita. Status invariato: done.
