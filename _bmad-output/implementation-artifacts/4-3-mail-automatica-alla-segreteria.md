---
baseline_commit: NO_VCS
---

# Story 4.3: Mail automatica alla Segreteria

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Segreteria,
I want ricevere una mail con il Certificato Medico allegato quando viene caricato,
so that posso verificarlo e confermarlo senza dover andare a cercarlo nell'app.

## Acceptance Criteria

1. **Given** un Certificato Medico viene caricato con successo (Story 4.1, sia primo caricamento sia ri-caricamento), **when** l'upload si completa, **then** ogni Utente con Ruolo Segreteria attivo riceve un'email con il file allegato.
2. L'email indica almeno il nome dell'Atleta, così la Segreteria non deve aprire l'allegato solo per sapere di chi si tratta.
3. L'invio usa la configurazione SMTP impostata dall'Admin (Story 7.1) — se non è stata ancora impostata, il fallimento è silenzioso lato utente (non bloccante, vedi Prerequisito #2) ma registrato nei log server.
4. L'invio dell'email non deve mai far fallire il caricamento del Certificato: resta l'operazione primaria, l'email è un effetto collaterale non bloccante — stesso principio già stabilito per la notifica in-app (Story 4.2).
5. Se nessun Utente ha Ruolo Segreteria attivo, nessuna email viene inviata e nessun errore viene generato (caso legittimo, non un fallimento).

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

Prima storia a consumare realmente `lib/email/` (Story 7.1 lo aveva costruito solo per l'email di prova, senza allegati). Riusa `lib/storage/certificati.ts` (Story 4.1) e il pattern di hook non bloccante già stabilito in Story 4.2.

### 1. `lib/email/invia-email.ts` va esteso per supportare allegati e destinatari multipli

`inviaEmail` (Story 7.1) accetta oggi solo `{ destinatario: string; oggetto; testo }`, senza allegati. Estendere `DatiEmail`:

```ts
export type AllegatoEmail = {
  nomeFile: string;
  contenuto: Buffer;
  tipoMime: string;
};

export type DatiEmail = {
  destinatario: string | string[]; // Nodemailer accetta entrambi nativamente per "to"
  oggetto: string;
  testo: string;
  allegati?: AllegatoEmail[];
};
```

`sendMail({ ..., attachments: dati.allegati?.map(a => ({ filename: a.nomeFile, content: a.contenuto, contentType: a.tipoMime })) })`. **Retrocompatibile**: `inviaEmailDiProva` (Story 7.1) continua a funzionare invariata (nessun allegato, un solo destinatario stringa) — verificare che i test esistenti di `invia-email.test.ts` restino verdi senza modifiche (un valore `attachments: undefined` è equivalente a "chiave assente" per `toEqual`/`toHaveBeenCalledWith`, nessuna rottura attesa).

### 2. Effetto collaterale non bloccante — stesso principio di Story 4.2, non del testo dell'AC #3

L'AC #3 dice "il fallimento è silenzioso" — questo NON significa "meno importante da implementare correttamente", significa che un errore SMTP (host irraggiungibile, credenziali sbagliate, configurazione assente) non deve mai propagarsi all'Utente che ha caricato il Certificato (un Genitore/Atleta) né bloccare l'AC #1 di Story 4.1. Stesso identico pattern try/catch non bloccante già usato per `creaNotifica` (Story 4.2) e `rimuoviFileCertificato` (Story 4.1 review fix) in `caricaCertificato`.

### 3. Destinatari: `Utente` con Ruolo Segreteria, non protetto da RLS (AD-9)

`Utente`/`UtenteRuolo` non sono nel bind-list di AD-4 — lettura via Prisma diretto, come già stabilito per ogni altra query sui Ruoli in questo progetto (es. `contaAltriAdminAttivi`, `app/(amministrazione)/admin/actions.ts`). Solo Utenti **attivi** (`attivo: true`, stesso campo già usato per bloccare il login di un Utente disattivato, Story 1.2) — un Utente disattivato non deve ricevere email operative. Nuovo helper condiviso (riusabile da Story 4.4/4.6, che avranno bisogno dello stesso pattern "email per Ruolo"):

```ts
// lib/utenti/email-per-ruolo.ts
export async function elencaEmailPerRuolo(ruolo: Ruolo): Promise<string[]> {
  const utenti = await prisma.utente.findMany({
    where: { attivo: true, ruoli: { some: { ruolo } } },
    select: { email: true },
  });
  return utenti.map(u => u.email);
}
```

### 4. Scaricare il file allegato dal bucket privato — nuova funzione in `lib/storage/certificati.ts`

`generaUrlFirmato` (Story 4.1) produce un URL, non i byte del file — un'email ha bisogno del contenuto vero e proprio come allegato. Nuova funzione `scaricaFileCertificato(supabase, filePath): Promise<Blob>` — `supabase.storage.from("certificati-medici").download(filePath)`. La sessione del Genitore/Atleta che ha appena caricato il file ha già i permessi per leggerlo (stessa policy RLS SELECT su `storage.objects` di Story 4.1, `utente_possiede_atleta`) — nessun controllo applicativo aggiuntivo, nessuna nuova policy necessaria.

## Tasks / Subtasks

- [x] Task 1: `lib/email/invia-email.ts` — estensione per allegati (AC: #1, #2)
  - [x] Estendere `DatiEmail` con `allegati?: AllegatoEmail[]` e `destinatario: string | string[]` (vedi Prerequisito #1).
  - [x] Passare `attachments` a `transporter.sendMail(...)`.
  - [x] Test TDD: un invio con allegati passa `attachments` correttamente a Nodemailer con `filename`/`content`/`contentType`; un invio senza allegati non regredisce (i test esistenti di Story 7.1 restano verdi).
- [x] Task 2: `lib/storage/certificati.ts` — `scaricaFileCertificato` (nuovo) (AC: #1)
  - [x] `scaricaFileCertificato(supabase: SupabaseClient, filePath: string): Promise<Blob>` — `supabase.storage.from("certificati-medici").download(filePath)`. Propaga l'errore su fallimento (incluso un rifiuto RLS).
  - [x] Test TDD (mock del client Supabase, verifica argomenti, propagazione errori).
- [x] Task 3: `lib/utenti/email-per-ruolo.ts` (nuovo file) (AC: #1, #5)
  - [x] `elencaEmailPerRuolo(ruolo: Ruolo): Promise<string[]>` — query Prisma diretta (Prerequisito #3), solo Utenti attivi. Restituisce array vuoto se nessun Utente ha quel Ruolo (AC #5), mai un errore.
  - [x] Test TDD (mock di `prisma.utente.findMany`, verifica del filtro `attivo: true` + Ruolo, array vuoto gestito correttamente).
- [x] Task 4: Hook non bloccante in `caricaCertificato` (AC: #1, #2, #3, #4, #5)
  - [x] In `app/(certificati-medici)/certificato-medico/actions.ts`, dopo il blocco esistente di `creaNotifica` (Story 4.2, che resta invariato) e ancora dentro il `try` esterno: risolvere `elencaEmailPerRuolo("SEGRETERIA")`; se l'elenco è vuoto, non fare nulla (AC #5, non è un errore); altrimenti scaricare il file (`scaricaFileCertificato`), leggere il nome dell'Atleta (serve una query aggiuntiva — vedi Dev Notes per la fonte RLS-safe già disponibile, `elencaAtlete`), e chiamare `inviaEmail(...)` con l'allegato — tutto avvolto nel proprio try/catch separato, non bloccante (log dell'errore, l'azione ritorna comunque `{ success: true }`), stesso pattern di `creaNotifica`.
  - [x] Aggiornare `actions.test.ts`: verifica che `inviaEmail` sia chiamata con i destinatari/allegato corretti dopo un upload riuscito; verifica che un fallimento di `elencaEmailPerRuolo`/`scaricaFileCertificato`/`inviaEmail` non cambi l'esito dell'azione (`{ success: true }` comunque); verifica che con zero Utenti Segreteria `inviaEmail` non venga chiamata affatto.
- [x] Task 5: Test (Vitest)
  - [x] Come elencato nei Task 1-4 sopra.
  - [x] Nessuna nuova pagina UI in questa storia (FR-13 è un effetto collaterale server-side, nessun AC richiede un'interfaccia).
- [x] Task 6: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] Setup: server SMTP finto locale (socket TCP raw, cattura envelope/DATA) invece di una casella reale — permette di verificare realmente destinatari/corpo/allegato, non solo il percorso non bloccante. Configurazione scritta nella riga `configurazione_smtp` reale via Prisma (stesso id fisso `ID_CONFIGURAZIONE_SMTP`).
  - [x] AC #1/#2: come Genitore, caricato un Certificato per un'Atleta di test; verificato che l'Utente Segreteria attivo riceva un'email con nome dell'Atleta nel corpo e allegato con il filename corretto nel MIME.
  - [x] AC #4: con SMTP configurato su una porta senza listener (connessione rifiutata), verificato che l'upload abbia comunque successo (AC #1 di Story 4.1 intatto) e che nessuna email risulti catturata.
  - [x] AC #5: con zero Utenti Segreteria attivi, verificato che l'upload riesca comunque e che non ci sia alcun tentativo di invio.
  - [x] Verificato che un Ricaricamento genera comunque un nuovo invio (nessuna deduplicazione).
  - [x] **Bug reale scoperto e risolto** (non anticipato nel Prerequisito architetturale della storia): `leggiConfigurazioneSmtp` veniva chiamata con la sessione di chi ha innescato l'upload (Genitore/Atleta) — ma `configurazione_smtp` ha RLS **ADMIN-only** (AD-12), quindi la lettura restituiva sempre `null` e ogni invio falliva con `CONFIGURAZIONE_SMTP_MANCANTE`, per qualunque Ruolo diverso da Admin. AC #1 non avrebbe mai funzionato in produzione. Vedi Dev Agent Record per il fix.

## Dev Notes

- **Nome dell'Atleta per il corpo dell'email**: `elencaAtlete(supabase)` (già usato da `notifiche/page.tsx`, Story 4.2) restituisce `{ id, nome, codiceFiscale, categoria }` — la stessa sessione Genitore/Atleta che sta caricando il file ha già accesso in lettura alla propria Atleta (policy RLS esistenti, Story 1.3/2.4/3.2). Nessuna nuova query necessaria, riusare il pattern "trova la riga per id nell'elenco già filtrato da RLS", mai un `include` Prisma diretto su `atlete` (RLS-protetta, AD-4).
- **Nessuna interazione con Story 4.2 in questa storia**: il blocco `creaNotifica` esistente resta invariato, questa storia aggiunge un blocco try/catch **parallelo e indipendente**, non annidato — un fallimento dell'uno non deve mai impedire il tentativo dell'altro.
- **`lib/utenti/` è un nuovo modulo condiviso** (prima volta in questa codebase) — non specifico di Certificati-Medici, sarà riusato da Story 4.4 (Segreteria conferma) e Story 4.6 (promemoria scadenza a più Ruoli). Non mettere `elencaEmailPerRuolo` dentro `lib/db-rls/` (quella cartella è riservata alle tabelle RLS-protette lette via client Supabase, AD-9 — `Utente` non lo è).
- **Pattern di riferimento più vicino**: il blocco `creaNotifica` in `caricaCertificato` (Story 4.2) per il try/catch non bloccante; `lib/storage/certificati.ts` esistente per lo stile del modulo Storage; `app/(amministrazione)/admin/actions.ts` per query Prisma dirette su `Utente`/Ruoli.

### Project Structure Notes

- Nuovo modulo: `lib/utenti/email-per-ruolo.ts` (+ `.test.ts`).
- File modificati: `lib/email/invia-email.ts` (+ `.test.ts`), `lib/storage/certificati.ts` (+ `.test.ts`, nuova `scaricaFileCertificato`), `app/(certificati-medici)/certificato-medico/actions.ts` (+ hook), `app/(certificati-medici)/certificato-medico/actions.test.ts`.
- Nessun nuovo file di migrazione, nessuna nuova tabella, nessuna nuova pagina.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3: Mail automatica alla Segreteria] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-13] — "Il sistema invia una mail alla Segreteria con il file del Certificato Medico allegato, all'upload."
- [Source: _bmad-output/implementation-artifacts/7-1-configurazione-smtp.md] — `lib/email/invia-email.ts` esistente, pattern di configurazione SMTP runtime (AD-12).
- [Source: _bmad-output/implementation-artifacts/4-2-notifica-automatica-upload.md] — pattern di hook non bloccante in `caricaCertificato`, da riusare identico.
- [Source: lib/storage/certificati.ts, app/(certificati-medici)/certificato-medico/actions.ts] — modulo Storage e Server Action esistenti da Story 4.1.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Ambiente locale non attivo a inizio sessione (ripreso da sessione precedente)**: Docker Desktop e lo stack Supabase CLI locale erano già stati avviati in una sessione precedente per la verifica di Story 3.3 e sono rimasti attivi; il dev server Next.js era ancora in esecuzione in background dalla stessa sessione.
- **Bug reale scoperto in verifica dal vivo**: `inviaEmail` (`lib/email/invia-email.ts`) leggeva `configurazione_smtp` con `leggiConfigurazioneSmtp(supabase)`, passando la sessione di chi aveva innescato l'invio. Questo funzionava per `inviaEmailDiProva` (Story 7.1, chiamata sempre da un Admin autenticato), ma `configurazione_smtp` ha RLS **ADMIN-only** (AD-12) — con la sessione di un Genitore/Atleta (Story 4.3) la query restituiva sempre `null`, e `inviaEmail` falliva sempre con `CONFIGURAZIONE_SMTP_MANCANTE`, catturato dal blocco try/catch non bloccante (quindi silenzioso, l'upload risultava comunque riuscito) — AC #1 non avrebbe mai funzionato in pratica, ma nessun test mockato lo rilevava (i mock bypassano la RLS reale). **Fix**: `inviaEmail` ora legge la configurazione con `createAdminClient()` (client service-role, già esistente per AD-11, `lib/auth-admin/client.ts`) invece della sessione del chiamante — la configurazione non attraversa comunque mai il confine verso il chiamante, resta interna alla funzione. Il parametro `supabase` è stato rimosso dalla firma di `inviaEmail` (non più necessario), aggiornati entrambi i call site (`certificato-medico/actions.ts`, `smtp/actions.ts`) e tutti i test.
- **Secondo bug correlato, stessa causa radice**: dopo il fix sopra, la verifica dal vivo ha rivelato `permission denied for table configurazione_smtp` — il client service-role bypassa la RLS ma non i GRANT di base (stesso identico gap già scoperto in Story 1.5 per `atlete`, `prisma/migrations/20260716120000_grant_atlete_service_role`). Risolto con una nuova migrazione (`20260719000000_grant_configurazione_smtp_service_role`, solo `GRANT SELECT ... TO service_role`).
- **Dato residuo scoperto durante la verifica** (non introdotto da questa storia): un Utente con Ruolo Segreteria di una sessione precedente (`postpatch-ly1xvi@example.com`) era presente nel DB locale. Non eliminato (dato non mio) — disattivato solo temporaneamente per lo scenario AC #5 (zero Segreteria attivi) e riattivato subito dopo, stato originale confermato ripristinato a fine verifica.
- Verificato dal vivo con un server SMTP finto locale (socket TCP raw, non un mock) — permette di ispezionare realmente destinatari/corpo/allegato inviati da Nodemailer, non solo il percorso non bloccante.

### Completion Notes List

- Tutti i 6 Task completati con TDD dove applicabile (RED confermato prima di ogni implementazione nei Task 1-4).
- Suite completa verde: `npx vitest run` (384 test, 38 file — 383 pre-esistenti + 1 nuovo test di regressione), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun nuovo errore), `npm run build` (produzione, nessuna regressione sulle altre route).
- **Verifica dal vivo (Task 6) ha scoperto e fatto risolvere un bug bloccante reale** per AC #1 (lettura configurazione SMTP con la sessione del chiamante invece del client service-role, mai rilevabile dai test mockati) e un gap di GRANT correlato (stesso pattern già noto da Story 1.5) — entrambi corretti, riverificati dal vivo con successo su tutti e 5 gli scenari (AC #1/#2, AC #4, AC #5, ricaricamento senza deduplicazione).
- Nessuna deviazione dal design dei Prerequisiti architetturali della storia per quanto riguarda Task 1-5; i due fix sopra erano necessari per far funzionare quel design nella pratica (RLS ADMIN-only su una tabella letta da un contesto non-Admin) e non erano anticipabili senza una verifica dal vivo contro RLS reale.

### File List

- `lib/email/invia-email.ts` (modificato: allegati/destinatari multipli, Task 1; +review fix, legge la configurazione col client service-role)
- `lib/email/invia-email.test.ts` (modificato)
- `lib/storage/certificati.ts` (modificato: + `scaricaFileCertificato`, Task 2)
- `lib/storage/certificati.test.ts` (modificato)
- `lib/utenti/email-per-ruolo.ts` (nuovo, Task 3)
- `lib/utenti/email-per-ruolo.test.ts` (nuovo)
- `lib/auth-admin/client.ts` (modificato: solo commento, riuso chiarito)
- `app/(certificati-medici)/certificato-medico/actions.ts` (modificato: hook non bloccante, Task 4; +review fix, chiamata `inviaEmail` aggiornata)
- `app/(certificati-medici)/certificato-medico/actions.test.ts` (modificato)
- `app/(configurazione)/smtp/actions.ts` (modificato: chiamata `inviaEmail` aggiornata, review fix)
- `app/(configurazione)/smtp/actions.test.ts` (modificato)
- `prisma/migrations/20260719000000_grant_configurazione_smtp_service_role/migration.sql` (nuovo, review fix)
