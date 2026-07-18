---
baseline_commit: NO_VCS
---

# Story 7.1: Configurazione SMTP

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want configurare i parametri del server SMTP per l'invio email dall'app,
so that il sistema può inviare le email transazionali (es. alla Segreteria, Story 4.3) usando la mia casella email esistente (Aruba), senza dipendere da un provider terzo.

## Acceptance Criteria

1. **Given** sono autenticato come Admin, **when** apro la sezione di configurazione email e inserisco host/porta/modalità di sicurezza (SSL/TLS)/utente/password/mittente, **then** i parametri vengono salvati e sono disponibili per i successivi invii email del sistema.
2. Ricaricare la pagina di configurazione mostra i parametri salvati (tranne la password, mai ri-mostrata in chiaro nel form — vedi Prerequisito #3) — modificare un solo campo non richiede di re-inserire tutti gli altri.
3. Dopo aver salvato una configurazione, l'Admin può inviare un'email di prova a un indirizzo a sua scelta per verificare che i parametri siano corretti, prima che qualunque funzionalità automatica (Story 4.3+) faccia affidamento su di essi.
4. Se la configurazione non è ancora stata salvata, un tentativo di invio (email di prova o, in storie future, automatico) fallisce con un messaggio chiaro ("Configurazione email non impostata"), mai un errore generico o un tentativo silenzioso.
5. Solo l'Admin può accedere alla sezione di configurazione e ai suoi dati — nessun altro Ruolo, nemmeno Dirigente/Segreteria (RLS, non solo route-guard).

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

Questa storia nasce da una correzione di rotta (vedi `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-18.md`): l'architettura iniziale prevedeva Resend, sostituito con SMTP generico per riusare la casella email esistente della polisportiva. È la prima storia a toccare `lib/email/` e introduce il nuovo AD-12.

### 1. Nuovo modello `ConfigurazioneSmtp` — riga singola, protetta da RLS (AD-9 esteso, AD-12)

Nessuna tabella di configurazione esiste ancora in questo progetto. A differenza delle tabelle "non protette da RLS, gestibili via Prisma diretto" (Palestra, Slot, Allenatore, Utente...), questa contiene una password e va protetta da RLS reale (AD-12), non solo da un controllo applicativo — stesso livello di garanzia già scelto per i dati sanitari (AD-4). **AD-9 è stato esteso** per includere `ConfigurazioneSmtp` (e, in ritardo, anche `Notifica` di Story 4.2 che mancava dalla lista) tra le tabelle lette/scritte a runtime via client Supabase autenticato, non Prisma diretto.

```prisma
model ConfigurazioneSmtp {
  id           String   @id @default(uuid())
  host         String
  porta        Int
  sicura       Boolean  @default(true)
  utente       String
  password     String
  mittente     String
  nomeMittente String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("configurazione_smtp")
}
```

`sicura` (SSL/TLS implicito, tipicamente porta 465) vs STARTTLS (tipicamente porta 587) — necessario perché Nodemailer richiede di saperlo esplicitamente per creare il transporter correttamente; senza questo campo la configurazione Aruba reale (smtps.aruba.it:465, SSL implicito) non funzionerebbe. **Password salvata in chiaro** (AD-12 già lo dichiara esplicitamente: nessuna cifratura applicativa, protezione solo RLS ADMIN-only — scelta deliberata, coerente con il resto del progetto, non da riconsiderare qui).

**Riga singola (nessuna business key naturale)**: nessun ID fisso o costante — il modulo dati legge "la prima riga esistente" e fa update-se-esiste/insert-se-assente (stesso pattern read-then-branch già usato in `unisciCertificato`, Story 1.7, solo più semplice perché non serve confrontare date).

Migrazione:

```sql
CREATE TABLE "configurazione_smtp" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "porta" INTEGER NOT NULL,
    "sicura" BOOLEAN NOT NULL DEFAULT true,
    "utente" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mittente" TEXT NOT NULL,
    "nomeMittente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurazione_smtp_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "configurazione_smtp" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON "configurazione_smtp" TO authenticated;

CREATE POLICY "admin_configurazione_smtp_select" ON "configurazione_smtp"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN');

CREATE POLICY "admin_configurazione_smtp_insert" ON "configurazione_smtp"
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN');

CREATE POLICY "admin_configurazione_smtp_update" ON "configurazione_smtp"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN')
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN');
```

Nessuna policy DELETE (nessun AC la richiede — stessa scelta già fatta per `certificati_medici`/`notifiche`).

### 2. `lib/email/` — nuovo servizio condiviso, Nodemailer, nessuna dipendenza da variabili d'ambiente per le credenziali

Nuova dipendenza: `nodemailer` (+ `@types/nodemailer`) — da installare (`npm install nodemailer` e `npm install -D @types/nodemailer`), sostituisce la scelta iniziale (mai implementata) di Resend. **Nessuna API key in `.env.local`**: a differenza di ogni altro servizio esterno di questo progetto (Supabase, che usa variabili d'ambiente), le credenziali SMTP sono lette a runtime dalla tabella `configurazione_smtp` (AD-12) — coerente con l'obiettivo della storia (l'Admin le cambia dall'app, non da un redeploy).

`inviaEmail(supabase, { destinatario, oggetto, testo })`: legge la configurazione (`leggiConfigurazioneSmtp`), se assente lancia un errore con messaggio chiaro e riconoscibile (AC #4) — questa storia lo consuma solo per l'email di prova (AC #3); Story 4.3+ lo riuserà per l'invio automatico, nessuna duplicazione della logica di invio.

### 3. UI: la password non viene mai ri-mostrata in chiaro nel form

Convenzione standard (mai specifica di questo progetto, ma nuova qui): il campo password del form è sempre vuoto al caricamento, con un'etichetta che chiarisce "lascia vuoto per non modificare la password esistente". Se il campo arriva vuoto in submit **e** una configurazione esiste già, la password esistente non viene toccata (il payload di update la omette) — se non esiste ancora nessuna configurazione, il campo password è invece obbligatorio (non c'è nulla da preservare). Motivo: anche per un Admin autorizzato a conoscerla, non va mai iniettata in un attributo HTML `value` (rischio di esposizione via cronologia browser, screen-sharing, cache) — stesso principio prudenziale già visto per gli URL firmati (Story 4.1, mai pre-generati nell'HTML).

## Tasks / Subtasks

- [x] Task 1: Migrazione — tabella `configurazione_smtp`, RLS ADMIN-only (AC: #1, #5)
  - [x] `prisma/schema.prisma`: nuovo model `ConfigurazioneSmtp` (vedi Prerequisito #1).
  - [x] Migrazione a mano con l'SQL esatto del Prerequisito #1.
  - [x] Applicare con `prisma migrate deploy`, verificare `prisma migrate status` (nessun drift), poi `prisma generate`.
- [x] Task 2: `lib/db-rls/configurazione-smtp.ts` (nuovo file) (AC: #1, #2)
  - [x] `leggiConfigurazioneSmtp(supabase: SupabaseClient): Promise<ConfigurazioneSmtpDati | null>` — `select("*").maybeSingle()` (una sola riga possibile). Propaga l'errore su fallimento (incluso un rifiuto RLS).
  - [x] `salvaConfigurazioneSmtp(supabase: SupabaseClient, dati: DatiConfigurazioneSmtp): Promise<void>` — legge la riga esistente (Prerequisito #1: read-then-branch); se esiste, `update` per `id` **omettendo `password` dal payload se `dati.password` è vuoto/assente** (Prerequisito #3); se non esiste, `insert` con `id: randomUUID()` (password obbligatoria in questo ramo, validata dal chiamante — Task 3).
  - [x] Test TDD per entrambe (mock del client Supabase, verifica che il payload di update ometta `password` quando vuoto, propagazione errori incluso un rifiuto RLS).
- [x] Task 3: `app/(configurazione)/smtp/actions.ts` (nuovo file) (AC: #1, #3, #4, #5)
  - [x] `requireRuolo("ADMIN")` come primo passo in ogni azione.
  - [x] `salvaConfigurazione(prevState, formData)`: legge host/porta/sicura/utente/password/mittente/nomeMittente. Validazioni: host/utente/mittente non vuoti, porta un intero valido (1-65535), password obbligatoria SOLO se non esiste già una configurazione (vedi Prerequisito #3 — richiede leggere lo stato esistente prima di validare). Poi `salvaConfigurazioneSmtp`. `revalidatePath("/smtp")` dopo il salvataggio (**non** `/configurazione/smtp` — il route group `(configurazione)` non compare nell'URL, bug scoperto in validazione, vedi Debug Log References).
  - [x] `inviaEmailDiProva(prevState, formData)`: legge un `destinatario` dal form, chiama `inviaEmail(supabase, { destinatario, oggetto: "Email di prova", testo: "..." })` (Task 4). Se `inviaEmail` lancia per configurazione assente, ritorna `{ error: { code: "VALIDATION", message: "Configurazione email non impostata." } }` (AC #4); qualunque altro fallimento (host irraggiungibile, credenziali rifiutate dal server SMTP) ritorna `{ error: { code: "INTERNAL", message: "Impossibile inviare l'email di prova. Verifica i parametri." } }`.
- [x] Task 4: `lib/email/invia-email.ts` (nuovo file) (AC: #3, #4)
  - [x] `inviaEmail(supabase: SupabaseClient, dati: { destinatario: string; oggetto: string; testo: string }): Promise<void>` — legge `leggiConfigurazioneSmtp`; se `null`, lancia un errore con un messaggio riconoscibile (es. `"CONFIGURAZIONE_SMTP_MANCANTE"` come primo token del messaggio, cosi' il chiamante puo' distinguere questo caso dagli altri fallimenti). Altrimenti crea un transporter Nodemailer (`nodemailer.createTransport({ host, port: porta, secure: sicura, auth: { user: utente, pass: password } })`) e chiama `transporter.sendMail(...)`. Propaga qualunque errore di invio.
  - [x] Test TDD (mock di `nodemailer.createTransport`/`sendMail` e di `leggiConfigurazioneSmtp`): configurazione assente → errore riconoscibile; configurazione presente → `createTransport` chiamato con i parametri corretti, `sendMail` chiamato con destinatario/oggetto/testo; propagazione di un errore di invio.
- [x] Task 5: UI `app/(configurazione)/smtp/page.tsx` + `ConfigurazioneSmtpForm.tsx` + `InviaEmailProvaForm.tsx` (nuovi file) (AC: #1, #2, #3, #5)
  - [x] `export const dynamic = "force-dynamic"`.
  - [x] `leggiConfigurazioneSmtp(supabase)` per precompilare il form (tranne `password`, sempre vuota — Prerequisito #3). Se nessuna configurazione esiste, il form è vuoto e un messaggio indica "Nessuna configurazione email impostata".
  - [x] Form di salvataggio: host, porta, checkbox "Connessione SSL/TLS (porta 465)" per `sicura`, utente, password (vuota, con testo di aiuto), mittente, nome mittente (opzionale).
  - [x] Form separato "Invia email di prova": campo destinatario + submit, mostra il risultato (successo/errore) — visibile solo se una configurazione esiste già.
  - [x] `lib/auth/route-guard.ts`: aggiungere `{ prefix: "/smtp", ruoliAmmessi: ["ADMIN"] }` (**non** `/configurazione` — il route group non compare nell'URL, stesso pattern di ogni altro modulo di questo progetto; scoperto durante `npm run build`, vedi Debug Log References).
- [x] Task 6: Test (Vitest)
  - [x] `lib/db-rls/configurazione-smtp.test.ts`: come da Task 2.
  - [x] `lib/email/invia-email.test.ts`: come da Task 4.
  - [x] `app/(configurazione)/smtp/actions.test.ts`: `FORBIDDEN` per Ruoli diversi da Admin; validazioni di `salvaConfigurazione` (campi vuoti, porta non valida, password obbligatoria solo alla prima configurazione); `inviaEmailDiProva` con configurazione assente vs errore di invio vs successo.
  - [x] `lib/auth/route-guard.test.ts`: aggiungere test per `/smtp` (allow ADMIN, redirect per ogni altro Ruolo).
  - [x] Nessun test per `smtp/page.tsx` — stessa decisione deliberata già applicata a ogni altra pagina di questo progetto.
- [x] Task 7: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] AC #1/#2: come Admin, salvare una configurazione SMTP; ricaricare la pagina e verificare che i campi (tranne password) siano precompilati. **Nota**: l'utente ha scelto di non fornire credenziali Aruba reali in questa sessione (verrà verificato manualmente in seguito) — usati parametri di test (`127.0.0.1:587`, connessione rifiutata immediatamente, scelta deliberata per un fallimento rapido e deterministico invece di un timeout DNS).
  - [x] AC #3/#4: inviato un'email di prova con l'host di test non raggiungibile, verificato il fallimento controllato (`INTERNAL`, messaggio chiaro, nessun crash) — non la ricezione reale (vedi nota sopra). Il percorso "configurazione assente" (AC #4) non è raggiungibile dalla UI stessa (il form di prova compare solo se una configurazione esiste, per design) — già coperto dal test Vitest dedicato di `actions.test.ts`, non ri-verificato dal vivo.
  - [x] AC #5: verificato che un Dirigente non possa raggiungere `/smtp` (route-guard, redirect a `/non-autorizzato`) né leggere `configurazione_smtp` via REST diretto con la propria sessione (RLS, 0 righe restituite).
  - [x] Verificato che risalvare la configurazione con il campo password vuoto **non cancella/sovrascrive** la password esistente (query diretta al DB prima/dopo), e che fornire una nuova password la aggiorna correttamente.

### Review Findings

Triage di 3 review adversarial paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) su un diff interamente scoperto da questa storia (nessun file condiviso con storie precedenti, a differenza di 4.1/4.2).

- [x] [Review][Patch] — **risolto**. **[Trovato indipendentemente da Blind Hunter e Acceptance Auditor, massima priorità]** La password in chiaro veniva comunque inviata al browser: `page.tsx` passava l'intero oggetto `ConfigurazioneSmtpDati` (che include `password`) come prop a `ConfigurazioneSmtpForm`, un Client Component — Next.js serializza OGNI prop passata a un Client Component nel payload RSC inviato al browser, indipendentemente da cosa il componente renderizza davvero nel DOM (l'`<input>` vuoto non bastava). Questo vanificava esattamente il rischio che il Prerequisito #3 della storia intendeva evitare. Aggiunta `rimuoviPassword()` (nuova funzione testata in `lib/db-rls/configurazione-smtp.ts`) che `page.tsx` chiama prima di passare i dati al Client Component; il tipo del prop di `ConfigurazioneSmtpForm` ora esclude strutturalmente `password` (`ConfigurazioneSmtpSenzaPassword`). Riverificato dal vivo intercettando tutte le risposte di rete della pagina e confermando l'assenza della password in chiaro [lib/db-rls/configurazione-smtp.ts, app/(configurazione)/smtp/page.tsx, app/(configurazione)/smtp/ConfigurazioneSmtpForm.tsx]
- [x] [Review][Patch] — **risolto**. **[Trovato indipendentemente da Blind Hunter e Edge Case Hunter]** Race condition reale: `salvaConfigurazioneSmtp` faceva un read-then-branch (select poi insert-se-assente/update-se-esiste) lato applicazione, non atomico — due salvataggi concorrenti (due tab, un retry) potevano entrambi osservare "nessuna riga" e inserire due righe, rompendo `leggiConfigurazioneSmtp` (`.maybeSingle()`) per sempre per ogni chiamante futuro, incluso Story 4.3. Ridisegnato con un id fisso (`ID_CONFIGURAZIONE_SMTP`, costante, mai generato dinamicamente) e un upsert atomico (`onConflict: "id"`) — elimina la race a livello di database, non solo di applicazione. Come effetto collaterale positivo, elimina anche la doppia lettura ridondante che il vecchio design faceva ad ogni salvataggio. Riverificato dal vivo con due upsert concorrenti reali (`Promise.all`) sullo stesso id: una sola riga risultante [lib/db-rls/configurazione-smtp.ts, lib/db-rls/configurazione-smtp.test.ts]
- [x] [Review][Patch] — **risolto**. Nessuna validazione di formato su `mittente`/`destinatario` (solo "non vuoto") — un indirizzo malformato veniva salvato/usato silenziosamente, fallendo solo molto più tardi con un errore SMTP generico. Aggiunto un controllo di formato minimale (`FORMATO_EMAIL`) su entrambi i campi [app/(configurazione)/smtp/actions.ts]
- [x] [Review][Patch] — **risolto**. Una password di soli spazi bianchi (`"   "`) superava il controllo "obbligatoria alla prima configurazione" (truthy ma inutilizzabile). Aggiunto `.trim()` sulla password prima di ogni controllo/uso [app/(configurazione)/smtp/actions.ts]
- [x] [Review][Patch] — **risolto**. `Number("1e2")` è un intero valido (100) ma non è ciò che un Admin che digita per errore "1e2" si aspetta — la porta veniva accettata silenziosamente. Aggiunto un controllo sulla forma della stringa (`/^\d+$/`, solo cifre) prima della conversione numerica [app/(configurazione)/smtp/actions.ts]
- [x] [Review][Patch] — **risolto**. **[Edge Case Hunter]** L'header "From" veniva costruito concatenando `nomeMittente` in una stringa a mano (`"${nome}" <${indirizzo}>`) — un `nomeMittente` contenente virgolette o un ritorno a capo avrebbe potuto produrre un header malformato o iniettato. Sostituito con l'oggetto strutturato `{ name, address }` che Nodemailer stesso si occupa di serializzare/escapare correttamente [lib/email/invia-email.ts]
- [x] [Review][Patch] — **risolto**. **[Acceptance Auditor]** Discrepanza documentale: `package.json` installava `nodemailer@^9.0.3` ma `ARCHITECTURE-SPINE.md` dichiarava `6.x`. Aggiornata la tabella Stack a `9.x` (la versione realmente installata, non c'è motivo di downgradare) [ARCHITECTURE-SPINE.md]
- [x] [Review][Patch] — **risolto**. **[Acceptance Auditor]** `ARCHITECTURE-SPINE.md` conteneva una convenzione generale non aggiornata ("configurazione via variabili d'ambiente") in contraddizione diretta con AD-12, introdotto lo stesso giorno da questa storia. Aggiunta un'eccezione esplicita nella riga "Stato & trasversali" [ARCHITECTURE-SPINE.md]
- [x] [Review][Dismiss] Nessun test dedicato per `ConfigurazioneSmtpForm.tsx`/`InviaEmailProvaForm.tsx` (Blind Hunter) — verificato che **nessun** componente form client di questa codebase ha un file di test dedicato (`NuovoUtenteForm.tsx`, `CaricaCertificatoForm.tsx`, `NuovoGruppoForm.tsx`, ecc. — tutti senza `.test.tsx`), stessa politica deliberata già applicata a `page.tsx`: Vitest copre solo la business logic in `lib/`/Server Action, mai i componenti React che la invocano
- [x] [Review][Dismiss] AC #4 ("configurazione assente → errore chiaro") non è raggiungibile dalla UI di questa storia, perché il form "Invia email di prova" compare solo quando una configurazione esiste già (Acceptance Auditor) — comportamento corretto e intenzionale: non ha senso mostrare un bottone di test quando non c'è nulla da testare. Il meccanismo sottostante è corretto e testato via Vitest (`inviaEmail`/`inviaEmailDiProva`); il vero primo chiamante automatico che potrà davvero raggiungere questo stato è Story 4.3
- [x] [Review][Dismiss] Nessun rate limiting su `inviaEmailDiProva` (Blind Hunter) — Admin-only, nessun AC lo richiede, rischio speculativo di abuso di un account già fidato — vedi deferred-work.md se servisse in futuro
- [x] [Review][Dismiss] `autoComplete="off"` presentato come mitigazione ma non affidabile sui password manager moderni (Blind Hunter) — osservazione corretta ma nessuna azione di codice la risolverebbe meglio di quanto già fatto (la vera protezione è non precompilare mai il campo, già implementata); nessun cambiamento applicato
- [x] [Review][Dismiss] Nessun test end-to-end contro RLS reale in Vitest, solo mock (Blind Hunter) — stessa politica di test a due livelli già stabilita in ogni storia precedente di questo progetto (Vitest per la business logic, verifica dal vivo per RLS) — la RLS di questa storia È stata verificata dal vivo in Task 7 (Dirigente bloccato sia da route-guard sia da REST diretto)
- [x] [Review][Defer] Nessuna coercizione difensiva se un campo del `FormData` atteso come testo arriva come `File` (`String(File)` produce `"[object File]"`) — rischio reale ma basso (solo un Admin autenticato potrebbe auto-infliggerselo con una richiesta manomessa, nessun bypass di sicurezza, solo dati corrotti auto-inflitti) [app/(configurazione)/smtp/actions.ts]
- [x] [Review][Defer] Nessun audit trail (chi ha modificato, quando, valore precedente) sulla tabella di configurazione — speculativo, nessun AC lo richiede, valutare se una storia futura di compliance/audit lo richiedesse esplicitamente [prisma/schema.prisma]

## Dev Notes

- **Se l'utente ha fornito credenziali Aruba reali per la verifica dal vivo, non committarle né lasciarle in file temporanei di verifica** (stesso principio di igiene già seguito per ogni altro segreto di questo progetto) — usarle solo a runtime nello script di verifica, poi ripulire.
- **Nessuna interazione con Story 4.3 in questa storia**: `inviaEmail` è costruita qui ma il SUO PRIMO CONSUMER automatico (invio alla Segreteria) è Story 4.3, non questa — questa storia la esercita solo tramite l'email di prova (AC #3).
- **`sicura` (booleano) non è opzionale**: senza di esso Nodemailer non sa se trattare la porta come SSL implicito o STARTTLS — un default `true` (più comune per SMTP con autenticazione, es. porta 465) è ragionevole ma l'Admin deve poterlo cambiare esplicitamente per provider con porta 587/STARTTLS.
- **Pattern di riferimento più vicino**: `app/(amministrazione)/admin/actions.ts` (Story 1.2) per `requireRuolo("ADMIN")` + Server Action pattern; `lib/matching-codice-fiscale/unisci-certificato.ts` (Story 1.7) per il pattern read-then-branch (qui semplificato, nessun confronto di date); `lib/storage/certificati.ts` (Story 4.1) per il pattern di un servizio condiviso sotto `lib/` che incapsula una libreria esterna dietro funzioni con nomi in italiano.
- **AD-9 è stato esteso da questa storia** (vedi Prerequisito #1) — non ri-fare la stessa estensione, è già in `ARCHITECTURE-SPINE.md`.

### Project Structure Notes

- Nuovo route-group: `app/(configurazione)/smtp/` (`page.tsx`, `actions.ts`, `actions.test.ts`, `ConfigurazioneSmtpForm.tsx`, `InviaEmailProvaForm.tsx`).
- Nuovo modulo: `lib/db-rls/configurazione-smtp.ts` (+ `.test.ts`).
- Nuovo modulo: `lib/email/` (prima volta in questa codebase) — `invia-email.ts` (+ `.test.ts`).
- File nuovi: `prisma/migrations/<timestamp>_add_configurazione_smtp/migration.sql`. File modificati: `prisma/schema.prisma` (model `ConfigurazioneSmtp`), `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`, `package.json`/`package-lock.json` (nuova dipendenza `nodemailer`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1: Configurazione SMTP] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-31] — "L'Admin può configurare i parametri del server SMTP... usati dal sistema per inviare le email transazionali (es. FR-13, FR-16)."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-12] — "tabella dedicata, RLS solo ADMIN... password in chiaro, protetta esclusivamente da RLS ADMIN-only... lib/email/ legge questa configurazione a runtime."
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-18.md] — contesto completo della correzione di rotta che ha originato questa storia.
- [Source: app/(amministrazione)/admin/actions.ts] — pattern Server Action ADMIN-only di riferimento (Story 1.2).
- [Source: lib/matching-codice-fiscale/unisci-certificato.ts] — pattern read-then-branch (Story 1.7).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Bug scoperto durante `npm run build` (non durante la scrittura del codice)**: la storia e l'implementazione iniziale usavano `/configurazione/smtp` (route-guard prefix, `revalidatePath`, commenti) assumendo che il route group `app/(configurazione)/` comparisse nell'URL — errore concettuale, i route group Next.js sono puramente organizzativi e non compaiono mai nel path (stesso motivo per cui `(certificati-medici)/certificato-medico/` è servita su `/certificato-medico`, non `/certificati-medici/certificato-medico`). La build ha mostrato la route reale come `/smtp`. Corretto in `lib/auth/route-guard.ts`/`.test.ts`, `app/(configurazione)/smtp/actions.ts`/`.test.ts`, `page.tsx` — senza questo fix la route-guard non avrebbe mai protetto la pagina reale (`/smtp`), lasciandola raggiungibile da qualunque Ruolo autenticato con solo il controllo `requireRuolo` della Server Action come unica difesa, non la difesa in profondità prevista da AC #5.
- Nessun altro problema imprevisto: `nodemailer` si è comportato come atteso, il pattern read-then-branch per la riga singola di configurazione ha funzionato al primo tentativo.

### Completion Notes List

- Tutti i 7 Task completati con TDD (RED confermato prima di ogni implementazione: `lib/db-rls/configurazione-smtp.ts`, `lib/email/invia-email.ts`, Server Action, route-guard).
- Suite completa verde: `npx vitest run` (342 test, 34 file), `npx tsc --noEmit` (nessun errore), `npm run lint` (pulito), `npm run build` (produzione, `/smtp` generata come route dinamica).
- Verifica dal vivo eseguita con successo su 20/20 controlli: salvataggio/rilettura configurazione (inclusi `porta` come intero e `sicura` come booleano), precompilazione del form con password sempre esclusa, password preservata su un salvataggio senza nuova password ma aggiornata quando fornita, fallimento controllato di un invio con host non raggiungibile, route-guard e RLS per un Ruolo non Admin (sia UI sia REST diretto). L'invio email reale via la casella Aruba dell'utente resta da verificare manualmente da lui in un secondo momento (scelta esplicita dell'utente, non un gap di questa storia — vedi Task 7).
- Nessuna deviazione dal design descritto nei Prerequisiti architetturali della storia, a parte il fix del path `/smtp` vs `/configurazione/smtp` (vedi Debug Log References).
- Code review (3 subagent adversarial paralleli): 2 problemi seri trovati indipendentemente da più subagent (fuga della password in chiaro nel payload RSC; race condition sul salvataggio della riga singola) e risolti con un redisegno dell'accesso dati (id fisso + upsert atomico, funzione dedicata `rimuoviPassword`). Altri 5 problemi minori patchati (validazione email, password whitespace-only, porta in notazione scientifica, injection nell'header From, disallineamenti documentali in `ARCHITECTURE-SPINE.md`). 5 item dismissi con motivazione esplicita, 3 deferred in `deferred-work.md`. Suite e verifica dal vivo (incluso un test di scrittura concorrente reale) ri-eseguite verdi dopo le patch.

### File List

- `prisma/schema.prisma` (modificato: model `ConfigurazioneSmtp`)
- `prisma/migrations/20260718060000_add_configurazione_smtp/migration.sql` (nuovo)
- `package.json`/`package-lock.json` (modificati: nuove dipendenze `nodemailer`, `@types/nodemailer`)
- `lib/db-rls/configurazione-smtp.ts` (nuovo)
- `lib/db-rls/configurazione-smtp.test.ts` (nuovo)
- `lib/email/invia-email.ts` (nuovo)
- `lib/email/invia-email.test.ts` (nuovo)
- `app/(configurazione)/smtp/actions.ts` (nuovo)
- `app/(configurazione)/smtp/actions.test.ts` (nuovo)
- `app/(configurazione)/smtp/page.tsx` (nuovo)
- `app/(configurazione)/smtp/ConfigurazioneSmtpForm.tsx` (nuovo)
- `app/(configurazione)/smtp/InviaEmailProvaForm.tsx` (nuovo)
- `lib/auth/route-guard.ts` (modificato)
- `lib/auth/route-guard.test.ts` (modificato)
