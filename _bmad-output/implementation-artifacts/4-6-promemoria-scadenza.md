---
baseline_commit: b7a74632413252787947a5c5c6cb283834cf7143
---

# Story 4.6: Promemoria scadenza

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Genitore, Atleta, Allenatore o Dirigente,
I want ricevere un promemoria 30 e 7 giorni prima della scadenza del Certificato Medico,
so that ho il tempo di rinnovarlo senza scoprirlo all'ultimo.

## Acceptance Criteria

1. **Given** un Certificato Medico ha `dataFineValidita` tale che mancano esattamente 30 giorni di calendario (fuso Europe/Rome) da oggi, **when** il Route Handler del Cron viene invocato con il segreto corretto, **then** il sistema invia un'email di promemoria per quell'Atleta.
2. **Given** mancano esattamente 7 giorni di calendario, **when** ..., **then** analogo invio (stessa logica di AC #1, soglia diversa — non un percorso di codice separato).
3. **Given** mancano un numero di giorni diverso da 30 e da 7 (es. 29, 8, 0, un numero negativo perché già scaduto), **when** il Cron gira, **then** nessuna email è inviata per quell'Atleta in quella esecuzione.
4. **Given** un'Atleta senza `dataFineValidita` impostata (mai confermato, Story 4.4) o senza alcun Certificato Medico a sistema, **when** il Cron gira, **then** nessuna email è inviata per quell'Atleta — nessuna data nota non è una soglia, nessun crash.
5. **Given** un'Atleta con un Genitore agganciato (Story 1.5), un proprio account Atleta agganciato (Story 2.7) e un Allenatore assegnato al proprio Gruppo per l'Anno Agonistico corrente (Story 2.3), **when** scatta il promemoria (AC #1/#2), **then** l'email è inviata in un solo invio a tutti questi destinatari più ogni Dirigente attivo a sistema, destinatari deduplicati (nessun doppio invio alla stessa persona che ricopre più Ruoli).
6. **Given** un'Atleta per cui non è risolvibile nessun destinatario (nessun Genitore/Atleta agganciato, nessun Allenatore assegnato, nessun Dirigente a sistema — caso limite), **when** scatta il promemoria, **then** nessun invio viene tentato per quell'Atleta: non è un errore, la Server Action/Route Handler continua con le altre Atlete.
7. **Given** una richiesta HTTP al Route Handler senza il segreto corretto (header `Authorization: Bearer <CRON_SECRET>`) o con `CRON_SECRET` non configurato lato server, **when** arriva la richiesta, **then** il sistema risponde `401` senza eseguire alcuna query né alcun invio — l'endpoint è pubblicamente raggiungibile (nessuna sessione Supabase Auth lo protegge) e deve restare protetto da questo segreto (fail-closed se il segreto manca).
8. **Given** la configurazione SMTP (Story 7.1) non è impostata o l'invio fallisce per una singola Atleta, **when** il Cron gira, **then** l'errore è loggato e non impedisce il tentativo per le altre Atlete della stessa esecuzione (nessun invio bloccante interrompe l'intero batch, stesso principio non bloccante di FR-13/Story 4.3).
9. **Given** l'esecuzione del Cron in un giorno senza alcun certificato in scadenza a 30/7 giorni, **when** il Route Handler gira, **then** esegue comunque almeno una query verso il database (tocca Postgres ogni giorno, mitigazione auto-pausa Supabase Free tier già prevista dall'architettura) e risponde `200`.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

### 1. Gap GRANT quasi certo: `service_role` su `certificati_medici` — stesso bug già scoperto due volte (Story 1.5, Story 4.3)

Questa storia gira **senza sessione utente** (nessun login, e' un endpoint invocato da un Cron esterno) — l'unico modo di leggere `certificati_medici` e `atlete` (entrambe RLS-protette, AD-4/AD-9) e' il client service-role (`createAdminClient()`, `lib/auth-admin/client.ts`), passato come `supabase` a `elencaCertificati`/`elencaAtlete` (`lib/db-rls/`, gia' esistenti, nessuna nuova funzione di lettura da scrivere li').

`atlete` ha gia' il GRANT necessario (`prisma/migrations/20260716120000_grant_atlete_service_role/migration.sql`, Story 1.5). **`certificati_medici` non ce l'ha ancora** — senza una nuova migrazione, `elencaCertificati(createAdminClient())` fallirebbe con `permission denied for table certificati_medici` (identico al bug scoperto in verifica dal vivo di Story 4.3 per `configurazione_smtp`, causa radice: `service_role` bypassa la RLS ma non i GRANT di base, le tabelle create via migrazione diretta non hanno GRANT di default). Aggiungi:

```sql
-- Nuova migrazione: 20260723000000_grant_certificati_medici_service_role/migration.sql
GRANT SELECT ON "certificati_medici" TO service_role;
```

### 2. Nessuna nuova tabella/colonna per lo stato "già inviato"

FR-16 richiede l'invio "esattamente" a 30 e 7 giorni: con un Cron giornaliero e un confronto per data di calendario esatta (non un intervallo `<=`), ogni Certificato riceve al massimo un'email per soglia per l'intera sua vita (un solo giorno di calendario coincide con "mancano 30 giorni", un altro con "mancano 7"). Questo rende superfluo un flag/tabella "promemoria già inviato" per l'uso normale (un'esecuzione al giorno) — **scelta deliberata di questa storia**: nessun nuovo modello Prisma, nessuna nuova colonna. Rischio accettato esplicitamente: un'esecuzione manuale ripetuta nello stesso giorno (es. durante la verifica dal vivo, Task 6) invierebbe di nuovo la stessa email — non e' un difetto, e' il comportamento naturale dell'assenza di stato persistito.

### 3. Destinatari: due letture distinte, mai un unico `include` Prisma su tabelle RLS-protette

- **Genitore + Atleta (se stessa)**: entrambi risolti dalla stessa tabella `GenitoreAtleta` (non RLS-protetta, AD-9) — una riga con `autoAggancio: true` e' l'Atleta stessa (Story 2.7), `autoAggancio: false` e' un Genitore (Story 1.5). Per questa storia **non serve distinguere i due casi**: entrambi sono email di persone da avvisare, un'unica query `prisma.genitoreAtleta.findMany({ where: { atletaId }, include: { utente: { select: { email: true } } } })` basta.
- **Allenatore**: scoping via `GruppoAtleta` (FK diretta ad `AnnoAgonistico`, AD-8) per l'Anno Agonistico **corrente** (`trovaAnnoAgonisticoCorrente()`, sola lettura, `lib/anno-agonistico/`, mai `risolviAnnoAgonisticoCorrente` che scrive — questa storia non deve creare un Anno Agonistico) → `Gruppo` → `GruppoAllenatore` → `Allenatore.utenteId` (nullable: un Allenatore non ancora agganciato a un Utente, Story 1.4, non ha email — va escluso, non e' un errore).
- **Dirigente**: **non scoped all'Atleta** (a differenza di Genitore/Atleta/Allenatore) — stesso pattern gia' stabilito per `elencaEmailPerRuolo("SEGRETERIA")` in Story 4.3 (`lib/utenti/email-per-ruolo.ts`, gia' commentato li' come riusabile da questa storia): tutti i Dirigenti attivi ricevono ogni promemoria, coerente con la loro vista d'insieme (Epic 5).
- Tutte le tabelle coinvolte per Genitore/Atleta/Allenatore (`GenitoreAtleta`, `GruppoAtleta`, `Gruppo`, `GruppoAllenatore`, `Allenatore`, `Utente`) **non sono RLS-protette** (AD-9) — leggile via Prisma diretto (`lib/prisma`), mai via client Supabase. Solo `certificati_medici`/`atlete` (RLS-protette) passano dal client service-role.

### 4. Nessun Cloudflare Cron Trigger reale da configurare in questa storia

L'ambiente di deploy (progetto Cloudflare Pages, `wrangler.toml`, adapter `@opennextjs/cloudflare`) e' esplicitamente **Deferred** nell'architettura — non esiste ancora nel repository (nessun `wrangler.toml`, nessuna dipendenza `@opennextjs/cloudflare` in `package.json`). Questa storia costruisce **solo** il Route Handler (`AD-7`: "un solo Route Handler") pronto per essere invocato da un chiamante schedulato esterno con il segreto corretto — la creazione del vero Cron Trigger Cloudflare e la sua configurazione restano fuori perimetro, si aggiungeranno quando l'ambiente di deploy sarà affrontato. Non introdurre `wrangler.toml`/dipendenze Cloudflare in questa storia: sarebbe scope creep non richiesto da nessun AC.

### 5. Autenticazione del Route Handler: nuovo segreto `CRON_SECRET`, nessun pattern esistente da riusare

Questo e' il primo Route Handler (`route.ts`) di questa codebase (nessun precedente in `app/`) ed e' raggiungibile senza login — a differenza di ogni pagina/Server Action esistente, che passa da `requireRuolo`/Proxy (Ruolo + sessione Supabase). Introduci una variabile d'ambiente `CRON_SECRET` (aggiungila a `.env.example`, valore vuoto) e verifica l'header `Authorization: Bearer <valore>` a inizio handler; **fail-closed** se `process.env.CRON_SECRET` non e' impostata (nessuna richiesta accettata), stesso principio del Proxy (`proxy.ts`, fail-closed su errore Auth).

## Tasks / Subtasks

- [x] Task 1: Migrazione GRANT — `service_role` su `certificati_medici` (AC: #1, #2, #3, #4)
  - [x] Nuova cartella `prisma/migrations/20260723000000_grant_certificati_medici_service_role/migration.sql` (vedi SQL nel Prerequisito #1).
- [x] Task 2: `app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts` (nuovo) (AC: #1, #2, #3, #4)
  - [x] `calcolaGiorniAScadenza(dataFineValidita: string | null, oggi: Date): number | null` — `null` se `dataFineValidita` e' assente; altrimenti numero di giorni di calendario (fuso Europe/Rome per "oggi", stesso `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })` di `certificato-scaduto.ts`, Story 4.5) tra oggi e la scadenza — negativo se già passata.
  - [x] Test TDD: `null`/assente → `null`; esattamente +30 giorni → `30`; esattamente +7 giorni → `7`; +15/+8/0/-1 giorni → il numero esatto (non 30 né 7, per dimostrare che il chiamante è responsabile del confronto); un caso con `oggi` a ridosso della mezzanotte UTC (es. `2026-01-14T23:30:00Z`, che è già `2026-01-15` a Roma in CET) per dimostrare che il conteggio usa il calendario di Europe/Rome e non quello UTC (stesso bug di fuso orario già corretto in Story 4.5 — non ripeterlo qui).
- [x] Task 3: `lib/utenti/email-destinatari-atleta.ts` (nuovo) (AC: #5, #6)
  - [x] `elencaEmailCollegateAdAtleta(atletaId: string, annoAgonisticoId: string | null): Promise<string[]>` — via Prisma diretto (non RLS, AD-9): `GenitoreAtleta` (join `Utente.email`, entrambi i casi `autoAggancio` true/false, vedi Prerequisito #3) unito a `GruppoAtleta` (filtrato per `atletaId` + `annoAgonisticoId`, se non null) → `Gruppo.allenatori` (`GruppoAllenatore`) → `Allenatore.utente.email` (escludi `null`, Allenatore non ancora agganciato). Deduplica con un `Set` prima di restituire l'array. Se `annoAgonisticoId` è `null` (nessun Anno Agonistico corrente risolvibile), restituisci solo le email di Genitore/Atleta, nessun Allenatore (non è un errore).
  - [x] Test (mock Prisma, stesso pattern di `lib/utenti/email-per-ruolo.test.ts`): restituisce le email di Genitore + Atleta-se-stessa + Allenatore; deduplica se la stessa persona compare più volte; restituisce array vuoto (mai un errore) se nessuna riga trovata; `annoAgonisticoId: null` esclude l'Allenatore ma non Genitore/Atleta.
- [x] Task 4: `app/api/cron/promemoria-certificati/route.ts` (nuovo) (AC: #1, #2, #3, #6, #7, #8, #9)
  - [x] `export async function GET(request: NextRequest)`: verifica `Authorization: Bearer ${process.env.CRON_SECRET}` — `401` (`Response.json`, nessun corpo sensibile) se assente/errato o se `CRON_SECRET` non configurata (Prerequisito #5).
  - [x] Legge `elencaCertificati(createAdminClient())` ed `elencaAtlete(createAdminClient())` (riuso diretto, nessuna nuova query di lettura su queste tabelle), unione in memoria per `atletaId` (stesso pattern di `presenze/page.tsx`, Story 4.5).
  - [x] Risolve l'Anno Agonistico corrente una sola volta: `trovaAnnoAgonisticoCorrente()` (sola lettura — non usare `risolviAnnoAgonisticoCorrente`, che crea una riga, mai appropriato per un Cron di lettura).
  - [x] Risolve `elencaEmailPerRuolo("DIRIGENTE")` una sola volta (fuori dal ciclo per Atleta — è lo stesso elenco per ogni invio).
  - [x] Per ogni Certificato: calcola `calcolaGiorniAScadenza`; se `30` o `7`, risolve `elencaEmailCollegateAdAtleta(atletaId, annoAgonistico?.id ?? null)`, unisce con i Dirigenti, deduplica (`Set`); se il risultato è vuoto, salta (AC #6, non è un errore); altrimenti `inviaEmail({ destinatario: [...], oggetto, testo })` **dentro un try/catch per singola Atleta** (un fallimento non deve interrompere le altre, AC #8 — stesso principio non bloccante di `caricaCertificato`, Story 4.3).
  - [x] Risponde sempre `200` con un riepilogo JSON (`{ processati, inviati, falliti }`) — anche quando nessun Certificato è in scadenza quel giorno (AC #9, la query verso il DB è già avvenuta).
- [x] Task 5: `.env.example` — aggiungi `CRON_SECRET=""` con un commento breve sul suo scopo.
- [x] Task 6: Test (Vitest)
  - [x] Come elencato nei Task 2/3 sopra.
  - [x] Nessun test automatico per `route.ts`: nessuna storia precedente ha mai testato un Route Handler o un Server Component in questa codebase (solo `actions.ts`/funzioni pure/moduli `lib/` hanno test Vitest, vedi Dev Notes Story 4.5) — verificato invece dal vivo (Task 7).
- [x] Task 7: Verifica dal vivo (manuale)
  - [x] Setup: Docker Desktop + stack Supabase CLI locale (già attivo) + dev server (già attivo), `configurazione_smtp` già impostata da una storia precedente (host `127.0.0.1:2525`, lo stesso pattern "server SMTP finto locale" di Story 4.3). `CRON_SECRET` impostato in `.env.local`. Migrazione applicata (Task 1).
  - [x] Create tre Atlete di test con Certificato Medico a `dataFineValidita` +30/+7/+15 giorni da oggi; Genitore e Allenatore (con Gruppo sull'Anno Agonistico corrente, creato al volo) agganciati solo all'Atleta +30; un Dirigente attivo a sistema (oltre a uno già esistente da una storia precedente).
  - [x] Invocato l'endpoint con `curl -H "Authorization: Bearer <CRON_SECRET>"`: risposta `{"processati":2,"inviati":2,"falliti":0}`, `200`. Il finto server SMTP (socket TCP raw, stesso approccio di Story 4.3) ha catturato le due email attese: Atleta +30 giorni → Genitore+Allenatore+entrambi i Dirigenti (deduplicati, testo "scade tra 30 giorni (il 2026-08-21)"); Atleta +7 giorni → solo i due Dirigenti (nessun Genitore/Allenatore agganciato, AC #6), testo "scade tra 7 giorni (il 2026-07-29)". Nessuna email per l'Atleta +15 giorni (AC #3).
  - [x] AC #7 verificata: richiesta senza header `Authorization` e con segreto errato → entrambe `401` `{"error":"UNAUTHORIZED"}`, nessuna nuova email catturata (contatore invariato a 2).
  - [x] AC #9 verificata: dopo aver spostato `dataFineValidita` delle due Atlete a una data lontana (2030), una nuova invocazione risponde comunque `200` con `{"processati":0,"inviati":0,"falliti":0,"saltati":0}` — il Route Handler tocca il database anche senza scadenze.
  - [x] **AC #6 ri-verificata dopo il review fix** (la prima verifica non aveva mai esercitato il vero percorso "zero destinatari totali", vedi Review Findings sotto): disattivato temporaneamente ogni Dirigente attivo a sistema, creata un'Atleta con Certificato a +30 giorni senza Genitore/Allenatore agganciati → risposta `{"processati":1,"inviati":0,"falliti":0,"saltati":1}`, nessuna email catturata dal finto SMTP. Dirigenti riattivati, dati di test rimossi a fine verifica.
  - [x] **Bug reale scoperto e risolto** (non anticipato nei Prerequisiti della storia): la prima invocazione dell'endpoint restituiva `307` verso `/accedi` invece di eseguire il Route Handler — il Proxy (`proxy.ts`/`route-guard.ts`) applicava la stessa logica di redirect delle pagine anche a `/api/cron/promemoria-certificati`, che non ha mai una sessione Supabase Auth. Corretto in `lib/auth/route-guard.ts`: le rotte `/api/*` bypassano ora la logica di sessione/Ruolo del Proxy (ogni Route Handler gestisce la propria autorizzazione, qui `CRON_SECRET`), con test dedicato in `route-guard.test.ts`. Senza questo fix, nessun AC di questa storia avrebbe mai funzionato in produzione.
  - [x] Dati e file di scratch della verifica (Atlete/Certificati/Genitore/Allenatore/Gruppo/Dirigente di test, l'Anno Agonistico creato al volo, lo script Node temporaneo, il finto server SMTP) rimossi a fine sessione — stato del DB locale ripristinato a com'era prima della verifica.

### Review Findings

- [x] [Review][Patch] Il bypass del Proxy per `/api/*` è troppo ampio: esenta dalla logica di sessione/Ruolo qualunque futura rotta sotto `/api/`, non solo l'endpoint del Cron — dovrebbe essere ristretto a `/api/cron/` [lib/auth/route-guard.ts] — **Fixed**: `isRouteHandlerCron` ora verifica `pathname.startsWith("/api/cron/")` invece di `/api/`; nuovo test che conferma `/api/qualcosa` resta protetto.
- [x] [Review][Patch] La risposta del Cron non conta le Atlete saltate per assenza di destinatari risolvibili: `processati` viene incrementato prima del controllo `destinatari.length === 0`, ma quel ramo non incrementa né `inviati` né `falliti` — rompe l'invariante implicito del riepilogo JSON, un'Atleta saltata è indistinguibile da un conteggio impreciso [app/api/cron/promemoria-certificati/route.ts] — **Fixed**: aggiunto contatore `saltati`, incrementato nel ramo `destinatari.length === 0`; risposta ora `{ processati, inviati, falliti, saltati }`. Ri-verificato dal vivo (vedi Task 7).
- [x] [Review][Patch] Nessun try/catch attorno alla lettura iniziale (`Promise.all` di `elencaCertificati`/`elencaAtlete`/`trovaAnnoAgonisticoCorrente`/`elencaEmailPerRuolo`): un errore qui (es. query fallita) fa fallire l'intera richiesta con una pagina di errore invece della risposta JSON che ogni altro AC presuppone [app/api/cron/promemoria-certificati/route.ts] — **Fixed**: lettura iniziale avvolta in try/catch, risponde `500 { error: "LETTURA_FALLITA" }` su fallimento invece di propagare un errore non gestito.
- [x] [Review][Patch] La verifica dal vivo dichiarata per AC #6 non ha mai esercitato il vero percorso "zero destinatari totali": il setup di Task 7 aveva sempre almeno un Dirigente attivo, quindi lo scenario descritto (Atleta +7 giorni) dimostra solo che Genitore/Allenatore sono opzionali, non che il salto totale sia stato verificato — la nota va corretta e il percorso ri-verificato dal vivo [Dev Agent Record della storia] — **Fixed**: ri-verificato dal vivo disattivando ogni Dirigente attivo, vedi Task 7 aggiornato.
- [x] [Review][Patch] Il conteggio "11 nuovi test" nelle Completion Notes non corrisponde ai blocchi `it(...)` effettivamente aggiunti nel diff (12) [Dev Agent Record della storia] — **Fixed**: conteggio corretto nelle Completion Notes (ora riflette anche il test aggiuntivo di `route-guard.test.ts` e i due nuovi test del review fix).
- [x] [Review][Patch] Deduplica dei destinatari case-sensitive: due indirizzi email differenti solo per maiuscole/minuscole non verrebbero deduplicati, rischio di doppio invio alla stessa persona [lib/utenti/email-destinatari-atleta.ts, app/api/cron/promemoria-certificati/route.ts] — **Fixed**: normalizzazione `.toLowerCase()` prima di ogni inserimento nei `Set` (resolver e merge finale coi Dirigenti in route.ts); nuovo test dedicato.
- [x] [Review][Patch] Due letture indipendenti di "adesso" nella stessa esecuzione: `trovaAnnoAgonisticoCorrente()` è chiamata senza argomento (usa il proprio `new Date()` interno) mentre `oggi` per il calcolo dei giorni è catturato separatamente — in contraddizione col principio "oggi esplicito, mai `new Date()` letta internamente" già dichiarato nelle Dev Notes della storia [app/api/cron/promemoria-certificati/route.ts] — **Fixed**: `oggi` catturato una sola volta a inizio handler e passato esplicitamente a `trovaAnnoAgonisticoCorrente(oggi)`.
- [x] [Review][Patch] Confronto del segreto `CRON_SECRET` non a tempo costante (`!==` su stringa) per l'unico endpoint pubblicamente raggiungibile dell'app [app/api/cron/promemoria-certificati/route.ts] — **Fixed**: nuova funzione `segretoValido` con `crypto.timingSafeEqual` (controllo di lunghezza prima, poi confronto a tempo costante sul contenuto).
- [x] [Review][Defer] Il corpo dell'email identifica l'Atleta solo per `nome` (nessun cognome/matricola per disambiguare atlete omonime) — deferred, pre-existing: stesso identico pattern già usato in `caricaCertificato` (Story 4.3, `app/(certificati-medici)/certificato-medico/actions.ts`), non una regressione introdotta da questa storia; una correzione isolata qui lascerebbe l'altra email inconsistente — meglio affrontarlo trasversalmente in una storia futura [app/api/cron/promemoria-certificati/route.ts]

## Dev Notes

- **Riuso deliberato, nessuna nuova query di lettura su `certificati_medici`/`atlete`**: `elencaCertificati`/`elencaAtlete` (`lib/db-rls/`) esistono già (Story 4.4/1.3) con le colonne già necessarie — questa storia le richiama con `createAdminClient()` invece della sessione utente (nessuna sessione esiste in un Cron), non le modifica.
- **Confronto per sola data di calendario, fuso Europe/Rome** — stesso principio e stessa costante (`Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })`) già stabiliti e corretti dopo un bug reale in Story 4.5 (`certificato-scaduto.ts`): non ripetere l'errore di confrontare in UTC.
- **Funzione pura co-locata con `oggi: Date` esplicito** (mai `new Date()` letta internamente) — stesso pattern di `certificato-scaduto.ts` (Story 4.5) e `calcola-statistiche-presenza.ts` (Story 3.3), per restare testabile senza mock del tempo.
- **Nessuna tabella/colonna "già inviato"** — scelta deliberata (Prerequisito #2), non un'omissione: il confronto a giorni esatti con un'esecuzione giornaliera basta a garantire un solo invio per soglia per Certificato nell'uso normale.
- **`service_role` bypassa la RLS ma non i GRANT** — verificalo per `certificati_medici` prima di dare per scontato che `elencaCertificati(createAdminClient())` funzioni: è il terzo caso di questo stesso bug in questo progetto (Story 1.5 `atlete`, Story 4.3 `configurazione_smtp`), stavolta anticipato nel Prerequisito #1 invece di scoperto in verifica dal vivo.
- **Fuori perimetro esplicito di questa storia**: creazione/configurazione di un vero Cloudflare Cron Trigger, `wrangler.toml`, adapter `@opennextjs/cloudflare` (Prerequisito #4, ambiente di deploy Deferred nell'architettura); qualunque UI per consultare lo storico dei promemoria inviati (nessun AC lo richiede, a differenza delle Notifiche di Story 4.2); retry automatico di un invio fallito (loggato e basta, AC #8).

### Project Structure Notes

- Nuova migrazione: `prisma/migrations/20260723000000_grant_certificati_medici_service_role/migration.sql`.
- Nuovi file: `app/api/cron/promemoria-certificati/route.ts`, `app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts` (+ `.test.ts`), `lib/utenti/email-destinatari-atleta.ts` (+ `.test.ts`).
- File modificati: `.env.example` (nuova variabile `CRON_SECRET`).
- Nessuna nuova tabella, nessun nuovo Server Action (è un Route Handler, non una Server Action — primo caso in questa codebase).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.6: Promemoria scadenza] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-16] — "Il sistema invia promemoria automatici a 30 e a 7 giorni dalla scadenza del Certificato Medico, verso Genitore, Atleta, Allenatore e Dirigente."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-7] — "un solo Cloudflare Cron Trigger invoca un solo Route Handler... delega l'invio al servizio email condiviso"; sezione Deferred sull'ambiente di deploy e sull'auto-pausa Supabase Free tier.
- [Source: lib/db-rls/certificato-medico.ts, lib/db-rls/atleta.ts] — `elencaCertificati`/`elencaAtlete` da riusare con `createAdminClient()`.
- [Source: lib/utenti/email-per-ruolo.ts] — `elencaEmailPerRuolo`, già commentato lì come riusabile da questa storia per i Dirigenti.
- [Source: lib/email/invia-email.ts] — `inviaEmail`, legge già la configurazione SMTP con `createAdminClient()` internamente (nessuna sessione richiesta dal chiamante, corretto in Story 4.3 per lo stesso motivo rilevante qui).
- [Source: lib/anno-agonistico/risolvi-anno-agonistico-corrente.ts] — `trovaAnnoAgonisticoCorrente` (sola lettura) per lo scoping dell'Allenatore.
- [Source: prisma/migrations/20260716120000_grant_atlete_service_role/migration.sql, prisma/migrations/20260719000000_grant_configurazione_smtp_service_role/migration.sql] — pattern GRANT già stabilito, da replicare identico per `certificati_medici`.
- [Source: app/(presenze)/presenze/certificato-scaduto.ts] — pattern di confronto data di calendario Europe/Rome da riusare identico (costante e logica).
- [Source: app/(certificati-medici)/certificato-medico/actions.ts] — pattern di invio email non bloccante (try/catch per singolo effetto collaterale) da replicare per singola Atleta nel ciclo del Cron.
- [Source: proxy.ts] — pattern fail-closed su errore di autenticazione, da replicare per `CRON_SECRET` mancante.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Bug reale scoperto in verifica dal vivo (Task 7), non anticipato nei Prerequisiti**: il Proxy (`proxy.ts` → `lib/auth/route-guard.ts`) applicava la logica di redirect-se-non-autenticato anche a `/api/cron/promemoria-certificati` — un Cron esterno non ha mai una sessione Supabase Auth, quindi ogni richiesta veniva reindirizzata `307` verso `/accedi` prima ancora di raggiungere il Route Handler (nessun AC di questa storia avrebbe mai funzionato in produzione). Corretto rendendo ogni rotta `/api/*` esente dalla logica di sessione/Ruolo del Proxy (`isRouteHandler` in `route-guard.ts`) — ogni Route Handler gestisce la propria autorizzazione (qui `CRON_SECRET`), coerente col fatto che un redirect HTML non ha senso per un chiamante non-browser.
- Nessun altro problema incontrato: il GRANT anticipato nel Prerequisito #1 si è rivelato effettivamente necessario (senza, la query su `certificati_medici` con `createAdminClient()` avrebbe fallito con `permission denied`, stesso bug già visto in Story 1.5/4.3) ed è stato sufficiente una volta applicato.
- **Code review**: la verifica dal vivo iniziale di AC #6 non era probante (Dirigenti sempre presenti nel setup di test) — corretto ri-eseguendo la verifica con ogni Dirigente temporaneamente disattivato, confermando `saltati:1` e nessuna email inviata.

### Completion Notes List

- Tutti i 7 Task completati con TDD dove applicabile (RED confermato prima dell'implementazione nei Task 2/3).
- Suite completa verde: `npx vitest run` (434 test, 42 file — 420 pre-esistenti + 14 nuovi), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun nuovo errore, solo un warning pre-esistente non correlato), `npm run build` (produzione, nessuna regressione — `/api/cron/promemoria-certificati` compare correttamente come rotta dinamica).
- Verifica dal vivo (Task 7) ha confermato tutti gli AC funzionanti: soglie esatte 30/7 giorni (AC #1/#2/#3), destinatari Genitore+Atleta+Allenatore+Dirigente deduplicati (AC #5), segreto mancante/errato → `401` senza query (AC #7), tocco del database anche senza scadenze (AC #9). AC #6 (nessun destinatario → nessun invio) inizialmente verificata in modo insufficiente, poi ri-verificata correttamente dopo il review fix (vedi sotto).
- **Bug reale scoperto e risolto in verifica dal vivo**: gap nel Proxy che impediva a qualunque richiesta di raggiungere il Route Handler (vedi Debug Log References) — corretto in `lib/auth/route-guard.ts`, non anticipato nei Prerequisiti architetturali della storia (il gap GRANT sì, era stato anticipato correttamente).
- **Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor)**: 8 finding `patch`, 1 `defer`, 2 scartati come rumore (query per-Atleta a scala trascurabile, non un vero N+1 dato che il ciclo tocca solo le Atlete effettivamente a 30/7 giorni). Tutti gli 8 patch applicati: scope del bypass Proxy ristretto da `/api/*` a `/api/cron/` (il fix precedente era più ampio del necessario); aggiunto contatore `saltati` nella risposta JSON; try/catch attorno alla lettura iniziale (500 JSON invece di crash su errore di query); AC #6 ri-verificata dal vivo per il vero percorso zero-destinatari (la prima verifica non lo aveva mai esercitato); dedup case-insensitive dei destinatari; un solo `oggi` esplicito threaded anche in `trovaAnnoAgonisticoCorrente`; confronto a tempo costante per `CRON_SECRET`; conteggio test corretto. 1 finding deferred (email con solo `nome`, pattern preesistente da Story 4.3, vedi `deferred-work.md`).
- Nessuna deviazione dal design dei Prerequisiti architetturali della storia per il resto: nessun nuovo modello Prisma, nessuna tabella di stato "già inviato" (scelta deliberata, vedi Dev Notes), nessun `wrangler.toml`/dipendenza Cloudflare introdotta (fuori perimetro esplicito).

### File List

- `prisma/migrations/20260723000000_grant_certificati_medici_service_role/migration.sql` (nuovo)
- `app/api/cron/promemoria-certificati/route.ts` (nuovo)
- `app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts` (nuovo)
- `app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.test.ts` (nuovo)
- `lib/utenti/email-destinatari-atleta.ts` (nuovo)
- `lib/utenti/email-destinatari-atleta.test.ts` (nuovo)
- `lib/auth/route-guard.ts` (modificato: rotte `/api/*` esenti dalla logica di sessione/Ruolo del Proxy, review fix in verifica dal vivo)
- `lib/auth/route-guard.test.ts` (modificato: nuovo test per il fix sopra)
- `.env.example` (modificato: nuova variabile `CRON_SECRET`)
