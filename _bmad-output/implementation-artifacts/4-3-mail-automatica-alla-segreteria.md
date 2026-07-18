---
baseline_commit: NO_VCS
---

# Story 4.3: Mail automatica alla Segreteria

Status: ready-for-dev

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
- [ ] Task 6: Verifica dal vivo (manuale, Playwright temporaneo)
  - [ ] Setup: impostare una configurazione SMTP di test (Story 7.1, `/smtp`) — se non disponibile una casella reale, usare parametri che falliscono in modo controllato (stesso approccio già usato in Story 7.1) per verificare il percorso non bloccante; se l'utente fornisce credenziali reali, verificare anche la ricezione effettiva con l'allegato.
  - [ ] AC #1/#2: come Genitore/Atleta, caricare un Certificato; verificare (via log server o ricezione reale) che ogni Utente Segreteria attivo riceva un'email con il nome dell'Atleta e l'allegato.
  - [ ] AC #4: con una configurazione SMTP che fa fallire l'invio (host non raggiungibile, stesso pattern di Story 7.1), verificare che l'upload del Certificato abbia comunque successo (AC #1 di Story 4.1 intatto).
  - [ ] AC #5: con zero Utenti Segreteria attivi (es. tutti disattivati), verificare che l'upload riesca comunque e che non ci sia alcun tentativo di invio nei log.
  - [ ] Verificare che un Ricaricamento (Story 4.1 AC #4) generi comunque un nuovo invio (nessuna deduplicazione, stesso principio già stabilito per le notifiche in-app, Story 4.2).

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

### Debug Log References

### Completion Notes List

### File List
