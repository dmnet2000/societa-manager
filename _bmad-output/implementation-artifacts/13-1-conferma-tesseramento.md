---
baseline_commit: a5c6aa40a7adc970c245dd1536d7b96a35af0abe
---

# Story 13.1: Conferma Tesseramento

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want confermare il Tesseramento federale di un'Atleta (distinto dalla Conferma Iscrizione esistente),
so that il club possa tracciare in-app quali Atlete sono effettivamente tesserate presso la federazione per la stagione corrente, senza dover consultare fonti esterne.

## Acceptance Criteria

1. **Given** sono autenticato come Admin o Dirigente **When** visito `/conferma-tesseramenti` **Then** vedo l'elenco di tutte le Atlete con, per ciascuna, lo stato della propria Iscrizione e del proprio Tesseramento per l'Anno Agonistico corrente (nome, Codice Fiscale, stato Iscrizione, stato Tesseramento — stesso impianto tabellare di `/conferma-iscrizioni`).
2. **Given** un'Atleta ha l'Iscrizione confermata per l'Anno Agonistico corrente e il Tesseramento non ancora confermato **When** premo "Conferma" sul Tesseramento **Then** viene creata una riga `Tesseramento` per quella coppia Atleta+Anno Agonistico e lo stato in pagina passa a "Confermato".
3. **Given** un'Atleta NON ha l'Iscrizione confermata per l'Anno Agonistico corrente **When** visito la pagina **Then** non vedo un bottone "Conferma" attivo per il Tesseramento di quell'Atleta, ma un'indicazione esplicita che l'Iscrizione va confermata prima — non un errore generico al tentativo di submit (dipendenza obbligatoria, decisa in fase di analisi dell'Epic 13).
4. **Given** un'Atleta ha già il Tesseramento confermato per l'Anno Agonistico corrente **When** la Server Action `confermaTesseramento` viene invocata di nuovo per la stessa Atleta+Anno (doppio click, retry di rete) **Then** l'operazione è idempotente — nessun errore, nessuna riga duplicata, stesso principio già adottato per `inserisciIscrizione` (Story 1.6).
5. **Given** sono autenticato con un Ruolo diverso da Admin/Dirigente (inclusa esplicitamente Segreteria) **When** provo a visitare `/conferma-tesseramenti` o a invocare `confermaTesseramento` direttamente **Then** vengo respinto — route-guard per la pagina, `requireRuolo(["ADMIN","DIRIGENTE"])` per la Server Action (difesa in profondità, stesso principio di ogni altra Server Action del progetto).
6. **And** nessun riporto automatico al cambio stagione: quando si apre un nuovo Anno Agonistico (wizard, Story 6.3), nessuna Atleta risulta con il Tesseramento già confermato per la nuova stagione — comportamento naturale (nessuna riga `Tesseramento` esiste ancora per il nuovo `annoAgonisticoId`), nessuna modifica al wizard richiesta da questa storia.

## Tasks / Subtasks

- [x] Task 1: Modello dati `Tesseramento` (AC: #1, #2, #4, #6)
  - [x] Aggiungere a `prisma/schema.prisma` il model `Tesseramento`: `id` (uuid), `atletaId`, `annoAgonisticoId`, relazioni `atleta`/`annoAgonistico` con `onDelete: Cascade`, `confermataIl DateTime @default(now())`, `createdAt DateTime @default(now())`, `@@unique([atletaId, annoAgonisticoId])`, `@@map("tesseramenti")`. **Nessun campo `attiva`** — a differenza di `Iscrizione`, questa storia non implementa un'esclusione (vedi Dev Notes, "Scope deliberatamente escluso").
  - [x] Aggiungere le back-relation: `tesseramenti Tesseramento[]` su `Atleta` (accanto a `iscrizioni Iscrizione[]`) e su `AnnoAgonistico` (accanto a `iscrizioni Iscrizione[]`).
  - [x] Creare la migrazione (nome `20260804020000_add_tesseramento`) — **nessuna RLS, nessun GRANT verso `authenticated`/`service_role`**: tabella strutturale, stesso trattamento di `gruppo_allenatori` (Story 2.3). `npx prisma migrate dev` non raggiunge il DB in questo sandbox (`P1001`, nessun accesso di rete in uscita — stesso limite gia' incontrato in Story 12.4): migrazione scritta a mano mirrorando esattamente `20260717160000_add_gruppo_allenatore/migration.sql`. `npx prisma generate` eseguito con successo (non richiede connessione DB) — verificato che `node_modules/.prisma/client/index.d.ts` esponga `Tesseramento`.
- [x] Task 2: Helper di lettura Iscrizione attiva puntuale (AC: #3)
  - [x] Aggiungere `trovaIscrizioneAttiva(supabase, atletaId, annoAgonisticoId): Promise<boolean>` a `lib/db-rls/iscrizione.ts` — stessa query di `elencaIscrizioniPerAnno` ma filtrata anche su `atletaId`, per un controllo puntuale invece del fetch dell'intero elenco (usata dalla Server Action di Task 3, non dalla pagina — la pagina già ha bisogno dell'elenco completo via `elencaIscrizioniPerAnno`, vedi Task 4). 3 nuovi test in `lib/db-rls/iscrizione.test.ts` (13/13 passati).
- [x] Task 3: Server Action `confermaTesseramento` (AC: #2, #3, #4, #5)
  - [x] Nuovo file `app/(iscrizioni)/conferma-tesseramenti/actions.ts`, `"use server"`.
  - [x] `confermaTesseramento(_prevState, atletaId: string)`: `requireRuolo(["ADMIN", "DIRIGENTE"])` (nessun terzo parametro `rotta` — questa rotta non fa parte del sistema di permessi configurabili dell'Epic 12, fuori scope, non richiesto).
  - [x] Risolve l'Anno Agonistico corrente con `risolviAnnoAgonisticoCorrente()` (find-or-create, stesso principio di `confermaIscrizione` — ma nella pratica l'Anno Agonistico esiste già sempre a questo punto, dato che l'Iscrizione richiesta dalla dipendenza lo presuppone).
  - [x] Verifica la dipendenza (AC #3): chiama `trovaIscrizioneAttiva` (Task 2) con l'`atletaId` e l'Anno Agonistico risolto — se `false`, ritorna `{ error: { code: "VALIDATION", message: "L'Iscrizione dell'Atleta deve essere confermata prima del Tesseramento." } }`, **nessuna scrittura**.
  - [x] Scrive con `prisma.tesseramento.upsert({ where: { atletaId_annoAgonisticoId: { atletaId, annoAgonisticoId: anno.id } }, create: { atletaId, annoAgonisticoId: anno.id }, update: {} })` — `upsert` con un `update` vuoto è la via più semplice per l'idempotenza richiesta dall'AC #4 (nessun `try/catch` su `P2002` necessario, a differenza del pattern `insert`+catch di `inserisciIscrizione`, che serve lì solo perché deve *riattivare* una riga esclusa — Tesseramento non ha quel concetto).
  - [x] `revalidatePath("/conferma-tesseramenti")` e ritorna `{ success: true }` sul percorso felice; blocco `catch` generico → `{ error: { code: "INTERNAL", message: "Impossibile confermare il Tesseramento. Riprova." } }`, stesso stile di `creaPalestra`. 6/6 test in `app/(iscrizioni)/conferma-tesseramenti/actions.test.ts`.
- [x] Task 4: Pagina `/conferma-tesseramenti` (AC: #1, #3)
  - [x] Nuovo file `app/(iscrizioni)/conferma-tesseramenti/page.tsx`, `export const dynamic = "force-dynamic"` (dati mutati in-page via Server Action, stesso motivo di `/conferma-iscrizioni`).
  - [x] Legge in parallelo: `elencaAtlete(supabase)` (esistente, `lib/db-rls/atleta.ts`), `trovaAnnoAgonisticoCorrente()` (esistente, sola lettura — **non** `risolviAnnoAgonisticoCorrente`, la pagina non deve creare nulla in fase di rendering, stesso principio di `/conferma-iscrizioni`), poi (se l'anno esiste) `elencaIscrizioniPerAnno(supabase, anno.id)` **e** `prisma.tesseramento.findMany({ where: { annoAgonisticoId: anno.id } })` per costruire due `Set<atletaId>` (iscrizione attiva, tesseramento confermato).
  - [x] Nuovo componente `TesseramentoRow.tsx` (`"use client"`, mirror di `IscrizioneRow.tsx`): mostra nome/CF, stato Iscrizione (testo, sola lettura — nessun controllo qui, l'esclusione dell'Iscrizione resta di competenza esclusiva di `/conferma-iscrizioni`), stato Tesseramento con bottone "Conferma" **visibile solo se** Iscrizione attiva **e** Tesseramento non ancora confermato; se Iscrizione non attiva, testo esplicito "Iscrizione da confermare" al posto del bottone (AC #3).
  - [x] Nessun controllo `puoConfermare` per Ruolo dentro la pagina — il route-guard ammette **solo** ADMIN/DIRIGENTE, ed **entrambi** possono confermare. `npx tsc --noEmit` pulito.
- [x] Task 5: Route-guard e navigazione (AC: #5)
  - [x] Aggiungere a `PROTECTED_ROUTES` (`lib/auth/route-guard.ts`): `{ prefix: "/conferma-tesseramenti", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Conferma tesseramenti" }`. Verificato: nessuna regressione su `route-decision.test.ts`/`voci-navigazione.test.ts` (83/83 passati).
- [x] Task 6: Test
  - [x] `lib/db-rls/iscrizione.test.ts` (esteso): 3 nuovi test per `trovaIscrizioneAttiva`.
  - [x] `app/(iscrizioni)/conferma-tesseramenti/actions.test.ts` (nuovo file): 6 test — successo, FORBIDDEN, VALIDATION (Iscrizione non attiva), idempotenza, INTERNAL su errore Prisma, INTERNAL su errore nella verifica Iscrizione.
  - [x] `lib/auth/route-decision.test.ts` (esteso): 3 nuovi test per `/conferma-tesseramenti` (ADMIN/DIRIGENTE ammessi, SEGRETERIA esplicitamente respinta, altri Ruoli respinti).
  - [x] Nessun test E2E/integrazione contro Postgres reale (fuori standard di test del progetto, stesso limite accettato ovunque — vedi `deferred-work.md`).
  - [x] Suite completa: 901/901 test Vitest passati (era 889, +12), `eslint` pulito su tutti i file toccati, `npx tsc --noEmit` pulito, `npm run build` riuscita (`/conferma-tesseramenti` presente nell'elenco route generato).

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff vs `baseline_commit`.

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 6 verificati conformi, incluso il controllo puntuale su Task/file/pattern richiesti in Dev Notes.

**[Review][Patch]** Riga contraddittoria se un'Iscrizione viene esclusa dopo che il Tesseramento collegato era già stato confermato — la pagina mostrerebbe "Non iscritta" e "Confermato" sulla stessa riga, contraddicendo lo scopo dichiarato della storia (trovato dal Blind Hunter). Corretto in `TesseramentoRow.tsx`: la label "Confermato" ora richiede sia `confermato` sia `iscrizioneAttiva`; se il Tesseramento resta confermato ma l'Iscrizione non è più attiva, mostra "Confermato (Iscrizione non più attiva)" invece del testo ambiguo. Nessuna modifica alla riga `Tesseramento` nel DB (nessuna esclusione a cascata — resta esplicitamente fuori scope, vedi Dev Notes), solo la sua rappresentazione in pagina è resa coerente con lo stato attuale dell'Iscrizione.

**[Review][Defer]** Race check-then-act non transazionale tra `trovaIscrizioneAttiva` (client Supabase RLS) e `prisma.tesseramento.upsert` (client Prisma privilegiato) — trovato indipendentemente sia dal Blind Hunter sia dall'Edge Case Hunter. Se l'Iscrizione venisse esclusa nella finestra tra le due chiamate, il Tesseramento potrebbe essere confermato senza una dipendenza contestualmente attiva. Stessa classe di rischio a bassa probabilità (singolo Admin, piccola società) già accettata ripetutamente in questo progetto (Story 1.3/1.4/1.6/1.8, Story 12.1/12.2). [app/(iscrizioni)/conferma-tesseramenti/actions.ts]

**[Review][Defer]** Nessun vincolo DB per la dipendenza Iscrizione→Tesseramento (solo applicativo, Server Action) + l'indice unico composito `(atletaId, annoAgonisticoId)` non è ottimale per il filtro della pagina su sola `annoAgonisticoId` (colonna finale dell'indice) — entrambi coerenti con la scala ridotta del progetto (NFR5) e con pattern identici già accettati più volte (es. `gruppo_atlete.annoAgonisticoId`, Story 2.4). [prisma/schema.prisma, app/(iscrizioni)/conferma-tesseramenti/page.tsx]

**Dismessi come rumore/fuori scope/convenzioni già accettate (9)**: nessun test E2E contro Postgres reale (stesso limite di tutto il progetto); `requireRuolo` non avvolto in try/catch prima del blocco try (stesso identico pattern usato in ogni Server Action del progetto, `requireRuolo` non lancia mai internamente); mismatch teorico tra `trovaAnnoAgonisticoCorrente` (pagina) e `risolviAnnoAgonisticoCorrente` (azione) al confine di stagione (stesso identico pattern preesistente già in produzione per Iscrizione dalla Story 1.6, non introdotto da questa storia); rotta non collegata al sistema di permessi configurabili dell'Epic 12 (decisione esplicita già documentata in Dev Notes, non un'omissione); `_prevState`/naming che richiama `useActionState` mai usato (mirror intenzionale e letterale di `confermaIscrizione`/`IscrizioneRow.tsx`, che ha lo stesso identico pattern); stato locale ottimistico non riconciliato col server (stesso identico pattern di `IscrizioneRow.tsx`); `elencaAtlete` senza paginazione (stesso limite già accettato ovunque, NFR5); messaggio d'errore impreciso per un `atletaId` inesistente (Admin-only, l'id proviene sempre da una riga realmente renderizzata, mai da input utente libero); mock con branching per stringa in `iscrizione.test.ts` (il fallimento in caso di refactor sarebbe comunque rumoroso — un `TypeError` a runtime del test — non un falso verde silenzioso come ipotizzato).

## Dev Notes

### Contesto e decisioni prese in apertura dell'Epic 13 (2026-08-04)

Tutte le decisioni di prodotto/architettura sono già state prese con l'utente e sono documentate in `epics.md` (sezione "## Epic 13"). Riepilogo per questa storia:
- Solo un flag confermato/non confermato — **nessun** numero di tesseramento, **nessuna** data di validità/scadenza (esplicitamente fuori scope nonostante il Brief originale li menzionasse).
- Dipendenza **obbligatoria**: Tesseramento confermabile solo se l'Iscrizione per lo stesso Anno Agonistico è già confermata.
- Pagina dedicata `/conferma-tesseramenti` (non integrata in `/conferma-iscrizioni`).
- Entità `Tesseramento` propria, **strutturale** (AD-9, no RLS) — non due colonne su `Iscrizione` (la policy RLS `UPDATE` di `Iscrizione` non è column-scoped, esporrebbe il flag anche a Segreteria che deve restarne esplicitamente esclusa).
- Nessun riporto al rollover di nuova stagione.

### Scope deliberatamente escluso da questa storia (non un'omissione)

- **Esclusione/annullamento del Tesseramento** (mirror di `attiva:false` su Iscrizione, Story 1.8): non richiesto dall'utente in apertura dell'Epic 13. Stesso pattern incrementale già seguito per Iscrizione stessa — la conferma (Story 1.6) è arrivata prima, l'esclusione (Story 1.8) è arrivata dopo come storia separata quando il bisogno di prodotto è emerso. Se il bisogno emergesse per Tesseramento, sarà una storia futura dedicata (aggiungere `attiva Boolean @default(true)` + Server Action `escludiTesseramento`, stesso identico schema di `disattivaIscrizione`).
- **Numero di tesseramento / data di validità-scadenza**: il campo `Atleta.dataPrimoTesseramento` (già esistente, `prisma/schema.prisma`) **non è collegato a questa storia** — è popolato esclusivamente dall'import Excel federale (`app/(onboarding-import)/import-atlete/parser.ts`, colonna "Data 1° Tess.", Story 1.3) come dato storico di anagrafica, non ha alcuna relazione con la nuova entità `Tesseramento` per-stagione introdotta qui. **Non riutilizzare/estendere quel campo** per questa storia — sono due concetti distinti (uno storico e informativo, uno operativo e per-stagione).

### Pattern da riusare (non reinventare)

- **Struttura pagina + Server Action + Row component**: mirror quasi 1:1 di `/conferma-iscrizioni` (Story 1.6/1.8) — leggere per intero prima di scrivere codice: `app/(iscrizioni)/conferma-iscrizioni/page.tsx`, `actions.ts`, `IscrizioneRow.tsx`. La differenza principale è che Tesseramento è strutturale (Prisma diretto), mentre Iscrizione è RLS (client Supabase) — vedi sotto.
- **Entità strutturale (Prisma diretto, AD-9), non RLS**: mirror di `Palestra`/`Campo` (`app/(orari-palestre)/palestre/actions.ts`, letto per intero in fase di analisi di questa storia) per lo stile delle Server Action (`requireRuolo` → validazione → `try/catch` con `prisma.X.create/update` → `INTERNAL` generico su errore → `revalidatePath`). **Non** usare il pattern `lib/db-rls/*.ts` per la scrittura di `Tesseramento` — quella cartella è riservata alle tabelle RLS-protette (Atleta, Iscrizione, CertificatoMedico, ecc.), non alle strutturali.
- **Migrazione strutturale senza RLS**: mirror esatto di `prisma/migrations/20260717160000_add_gruppo_allenatore/migration.sql` (letto per intero) — `CREATE TABLE`, `CREATE UNIQUE INDEX`, due `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`, **nessuna** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, **nessun** `GRANT`.
- **Idempotenza via `upsert` con `update: {}`**: più semplice del pattern insert+catch-P2002+update usato da `inserisciIscrizione` — quel pattern serve lì solo per *riattivare* una riga esclusa (`attiva: false → true`), un concetto che `Tesseramento` non ha in questa storia (nessuna esclusione, vedi sopra). Un `upsert` con un ramo `update` a no-op è idiomatico Prisma per la sola idempotenza.
- **`requireRuolo` senza il parametro `rotta`**: questa rotta non fa parte del sistema di permessi configurabili (Epic 12) — chiamare `requireRuolo(["ADMIN", "DIRIGENTE"])` a due argomenti posizionali standard, stesso stile della stragrande maggioranza delle Server Action del progetto (es. `creaPalestra`). Non collegarla a `isAutorizzato`/`permessi-configurabili.ts` senza una richiesta esplicita dell'utente.

### Attenzione — Story 12.3 ha spostato la logica di autorizzazione delle rotte

`lib/auth/route-guard.ts` **non** contiene più `getRouteDecision`/`isAutorizzato` (spostati in `lib/auth/route-decision.ts` durante l'Epic 12, per tenere `route-guard.ts` privo di dipendenze server-only/Prisma — è importato anche da `NavBarClient.tsx`, Client Component). L'array `PROTECTED_ROUTES` (dove va aggiunta la nuova voce, Task 5) resta invece in `route-guard.ts`, invariato nella sua forma. `lib/auth/route-guard.test.ts` non esiste più (rimosso in Story 12.3, contenuto migrato in `lib/auth/route-decision.test.ts`, che è il file da estendere — verificato, non un'ipotesi).

### Riferimenti

- [Source: epics.md#Epic 13: Conferma Tesseramento] — decisioni di analisi complete, testo originale della richiesta utente.
- [Source: app/(iscrizioni)/conferma-iscrizioni/page.tsx, actions.ts, IscrizioneRow.tsx] — pattern da mirrorare per la UI/interazione.
- [Source: app/(orari-palestre)/palestre/actions.ts] — pattern da mirrorare per Server Action strutturali (Prisma diretto).
- [Source: prisma/migrations/20260717160000_add_gruppo_allenatore/migration.sql] — pattern da mirrorare per la migrazione (tabella strutturale, no RLS).
- [Source: lib/db-rls/iscrizione.ts] — dove aggiungere `trovaIscrizioneAttiva` (Task 2).
- [Source: lib/auth/require-ruolo.ts] — firma corrente di `requireRuolo`, invariata da Story 12.4.
- [Source: prisma/schema.prisma#model Atleta, model Iscrizione, model AnnoAgonistico] — forma esatta dei modelli da mirrorare/collegare.

### Project Structure Notes

- Nuova route sotto il gruppo esistente `app/(iscrizioni)/` (non un nuovo gruppo dedicato) — stessa vicinanza tematica già usata da `app/(certificati-medici)/` per `certificato-medico` + `conferma-certificati`, due rotte distinte ma collegate concettualmente nello stesso gruppo.
- Nessuna modifica a `app/(iscrizioni)/conferma-iscrizioni/*` — questa storia è puramente additiva rispetto a Iscrizione.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx prisma migrate dev --create-only` fallisce con `P1001` (`127.0.0.1:54322` irraggiungibile) — nessun accesso di rete in uscita in questo sandbox, stesso limite già incontrato in Story 12.4. Migrazione scritta a mano mirrorando `20260717160000_add_gruppo_allenatore/migration.sql`; `npx prisma generate` (non richiede connessione DB) eseguito con successo e verificato che `Tesseramento` compaia nel client generato.

### Completion Notes List

- Implementate tutte le 6 Task/AC della story: entità strutturale `Tesseramento` (no RLS), helper `trovaIscrizioneAttiva`, Server Action `confermaTesseramento` (idempotente via `upsert`), pagina `/conferma-tesseramenti` + `TesseramentoRow.tsx`, voce `PROTECTED_ROUTES`.
- Nessuna deviazione dal piano della story — tutti i pattern erano già identificati in Dev Notes (mirror di `/conferma-iscrizioni`, `palestre/actions.ts`, migrazione `gruppo_allenatori`).
- Verifica dal vivo non eseguibile in questo sandbox (nessun accesso di rete al DB Supabase) — verificato tutto il resto: 901/901 test Vitest passati (era 889 prima di questa story), `eslint` pulito, `npx tsc --noEmit` pulito, `npm run build` riuscita con `/conferma-tesseramenti` presente nell'elenco route generato.

### File List

**Nuovi:**
- `prisma/migrations/20260804020000_add_tesseramento/migration.sql`
- `app/(iscrizioni)/conferma-tesseramenti/actions.ts`
- `app/(iscrizioni)/conferma-tesseramenti/actions.test.ts`
- `app/(iscrizioni)/conferma-tesseramenti/page.tsx`
- `app/(iscrizioni)/conferma-tesseramenti/TesseramentoRow.tsx`
- `app/(iscrizioni)/conferma-tesseramenti/conferma-tesseramenti.module.css`

**Modificati:**
- `prisma/schema.prisma` (model `Tesseramento` + back-relation su `Atleta`/`AnnoAgonistico`)
- `lib/db-rls/iscrizione.ts` (nuova funzione `trovaIscrizioneAttiva`)
- `lib/db-rls/iscrizione.test.ts` (+3 test)
- `lib/auth/route-guard.ts` (+voce `/conferma-tesseramenti` in `PROTECTED_ROUTES`)
- `lib/auth/route-decision.test.ts` (+3 test)

## Change Log

- 2026-08-04: Story implementata (Task 1-6 completi). Entità `Tesseramento` strutturale (no RLS, mirror di `gruppo_allenatori`), Server Action `confermaTesseramento` idempotente con dipendenza obbligatoria da Iscrizione attiva, pagina `/conferma-tesseramenti` (Admin/Dirigente, Segreteria esclusa). Migrazione scritta a mano (nessun accesso DB nel sandbox, stesso limite di Story 12.4) ma `prisma generate` verificato con successo. 901/901 test Vitest passati, `eslint`/`tsc --noEmit` puliti, build di produzione riuscita. Status: review.
- 2026-08-04: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: nessuna violazione degli AC. 1 patch applicato (trovato dal Blind Hunter): `TesseramentoRow.tsx` mostrava "Confermato" anche se l'Iscrizione collegata veniva esclusa in un secondo momento — riga contraddittoria ("Non iscritta" + "Confermato"), ora corretta con lo stato distinto "Confermato (Iscrizione non più attiva)". 2 defer (race check-then-act non transazionale, trovata indipendentemente da 2 dei 3 layer; assenza di vincolo DB + indice non ottimale per la dipendenza Iscrizione→Tesseramento) — nessuno bloccante, entrambi coerenti con gap di concorrenza/scala già accettati ripetutamente in questo progetto. 9 osservazioni dismesse come rumore/fuori scope/convenzioni già accettate (pattern identici a `IscrizioneRow.tsx`/`confermaIscrizione` copiati intenzionalmente, non deviazioni). 901/901 test Vitest passati, `eslint`/`tsc --noEmit` puliti dopo il fix. **Epic 13 completo** (unica story, 13.1, done). Status: done.
