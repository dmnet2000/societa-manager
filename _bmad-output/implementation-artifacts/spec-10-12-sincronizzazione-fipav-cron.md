---
title: 'Story 10.12: Sincronizzazione automatica delle Partite dal portale FIPAV/Lega, cadenza configurabile dall''app'
type: 'feature'
created: '2026-09-27'
status: 'done'
review_loop_iteration: 1
context: ['{project-root}/_bmad-output/planning-artifacts/epics.md']
baseline_commit: '6643f8d09365931a818327136c99b4df7b03743c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** oggi la sincronizzazione FIPAV (Story 10.11) è solo manuale — un bottone per Campionato che un Allenatore/Admin/Dirigente deve ricordarsi di cliccare; nessuno si accorge se un Campionato resta indietro per settimane.

**Approach:** nuovo endpoint `app/api/cron/sincronizza-fipav` (mirror di `promemoria-certificati`, Story 4.6), chiamato ogni ora da un workflow GitHub Actions schedulato — ma la CADENZA REALE è decisa dall'app stessa (nuovi campi su `ConfigurazioneApplicazione`, editabile da `/app/impostazioni`), non dal workflow. La logica centrale di `sincronizzaGareFipav` (fetch+parsing+upsert con protezione `modificataManualmente`) viene estratta in una funzione condivisa in `lib/`, riusata sia dalla Server Action esistente sia dal nuovo endpoint.

## Boundaries & Constraints

**Always:**

- Nessun Cloudflare Cron Trigger nativo — verificato non funzionante con questo build (`@opennextjs/cloudflare` genera un Worker che espone solo `fetch`, mai `scheduled`). Trigger: workflow `.github/workflows/sincronizza-fipav.yml` (`on: schedule`, ogni ora), chiama l'endpoint via HTTPS con header `Authorization: Bearer <CRON_SECRET>` — stesso segreto di `promemoria-certificati`, stesso `timingSafeEqual`, stesso fail-closed se la variabile manca.
- Cadenza reale: `ConfigurazioneApplicazione.frequenzaSincronizzazioneFipavOre Int?` (fallback 24 se null) + `ultimaSincronizzazioneFipavAutomaticaIl DateTime?`. L'endpoint calcola se sono passate almeno N ore da `ultimaSincronizzazioneFipavAutomaticaIl` PRIMA di contattare il portale FIPAV; se no, risponde `{ eseguito: false, motivo: "..." }` senza alcuna richiesta esterna. Aggiorna `ultimaSincronizzazioneFipavAutomaticaIl` SOLO quando esegue davvero (mai su uno skip).
- Logica centrale estratta in `lib/sincronizza-gare-fipav/sincronizza.ts`: dato `{ gruppoId, campionatoId, linkFipav }`, fa fetch (stessa config di `sincronizza-fipav-actions.ts:79-92`: `redirect:"follow"`, timeout 10s, `User-Agent`) + `analizzaHtmlGareFipav` + upsert con la stessa regola `modificataManualmente` già scritta (campi sempre scritti vs campi bloccabili) — stesso risultato `{ create, aggiornate, bloccate, scartate } | { error }` di oggi. `sincronizzaGareFipav` (Server Action) e il nuovo endpoint diventano entrambi chiamanti sottili di questa funzione, mai due implementazioni parallele.
- L'endpoint enumera `prisma.campionato.findMany({ where: { linkFipav: { not: null } } })` e sincronizza ognuno con try/catch **per Campionato** (un fallimento non blocca gli altri, mirror di `promemoria-certificati`).
- Bottone manuale (Story 10.11) invariato e indipendente — non tocca `ultimaSincronizzazioneFipavAutomaticaIl`.
- Nessuna email di notifica su fallimento — solo `console.error` + riepilogo JSON in risposta (mirror esatto di `promemoria-certificati`, che non ha mai avuto un'email nemmeno per sé).
- `docs/deploy-produzione.md` già aggiornato in questa story (Fase 6 corretta, Fase 6bis aggiunta) — non ri-scrivere, solo coerenza col codice.

**Ask First:** nessuna — le 5 decisioni rilevanti sono già chiuse (epics.md, Story 10.12, 2026-09-27, dopo una conversazione di chiarimento con l'utente).

**Never:** nessun Cloudflare Cron Trigger nativo (`triggers.crons` in `wrangler.jsonc`) — non funzionerebbe. Nessun nuovo `CRON_SECRET` dedicato (riuso di quello esistente). Nessuna modifica al bottone manuale/Server Action esistente oltre a farla chiamare la funzione condivisa. Nessun secondo Worker/Durable Object.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Chiamata cron senza `CRON_SECRET` corretto | Header assente/sbagliato | 401, nessuna sincronizzazione tentata | `{ error: "UNAUTHORIZED" }` |
| Finestra di frequenza non trascorsa | `ultimaSincronizzazioneFipavAutomaticaIl` recente rispetto a `frequenzaSincronizzazioneFipavOre` | Nessun fetch al portale, risposta esplicita "saltato" | `{ eseguito: false }` |
| Finestra trascorsa (o mai eseguito), almeno un Campionato con `linkFipav` | Chiamata autorizzata | Ogni Campionato sincronizzato con la stessa logica del bottone manuale; `ultimaSincronizzazioneFipavAutomaticaIl` aggiornato | N/A |
| Un Campionato fallisce (portale irraggiungibile/formato cambiato) | Fetch/parsing fallisce per quel Campionato | Gli altri Campionati vengono comunque processati | contato nel riepilogo, log server-side |
| Nessun Campionato con `linkFipav` impostato | `findMany` vuoto | Esecuzione "vuota" riuscita, nessun errore | `{ eseguito: true, campionatiTotali: 0 }` |
| Nessuna `frequenzaSincronizzazioneFipavOre` impostata | Campo `null` | Fallback 24 ore, nessun errore | N/A |
| Bottone manuale su un Campionato dopo un'esecuzione automatica recente | Story 10.11 invariata | Funziona come oggi, non influenzato dalla cadenza automatica | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- `ConfigurazioneApplicazione`: aggiungere `frequenzaSincronizzazioneFipavOre Int?` e `ultimaSincronizzazioneFipavAutomaticaIl DateTime?`; nuova migrazione additiva (mirror di quelle esistenti per questo model).
- Nuovo file `lib/sincronizza-gare-fipav/sincronizza.ts` -- estrarre da `sincronizza-fipav-actions.ts:70-213` la logica fetch+parsing+upsert (campi sempre scritti vs bloccabili, gestione P2002 concorrente) in una funzione pura `sincronizzaCampionatoFipav({ gruppoId, campionatoId, linkFipav })`, stesso tipo di ritorno di oggi.
- `app/app/(partite-campionati)/campionati/sincronizza-fipav-actions.ts` -- `sincronizzaGareFipav` diventa un chiamante sottile: autorizzazione + lookup Campionato (invariati) + chiamata alla funzione sopra + `revalidatePath` (invariati).
- Nuovo file `app/api/cron/sincronizza-fipav/route.ts` -- mirror esatto di `app/api/cron/promemoria-certificati/route.ts` per `CRON_SECRET`/`timingSafeEqual`/`Authorization: Bearer`; legge frequenza+ultima esecuzione da `ConfigurazioneApplicazione`, enumera Campionati con `linkFipav`, cicla con try/catch per Campionato chiamando la funzione condivisa, aggiorna `ultimaSincronizzazioneFipavAutomaticaIl` solo se ha eseguito, risponde con riepilogo JSON.
- `lib/configurazione-applicazione.ts` -- nuove `leggiFrequenzaSincronizzazioneFipavOre`/`salvaFrequenzaSincronizzazioneFipavOre` (mirror esatto di `leggiEmailSegreteria`/`salvaEmailSegreteria`, righe 56-70) e `leggiUltimaSincronizzazioneFipavAutomaticaIl`/`segnaSincronizzazioneFipavAutomaticaEseguita` (quest'ultima aggiorna solo quel campo).
- `app/app/(configurazione)/impostazioni/actions.ts` + `page.tsx` -- nuovo campo Admin-only "Cadenza sincronizzazione FIPAV (ore)", mirror del pattern `EmailSegreteriaForm`/`salvaEmailSegreteriaAction` (righe 42-70 di actions.ts, 69-157 di page.tsx).
- Nuovo file `.github/workflows/sincronizza-fipav.yml` -- `on: schedule` (ogni ora, es. `0 * * * *`), un job che fa `curl`/HTTP GET verso l'endpoint con l'header `Authorization: Bearer ${{ secrets.CRON_SECRET }}`, URL da `secrets.CRON_ENDPOINT_URL`.
- `docs/deploy-produzione.md` -- già aggiornato in questa sessione (Fase 6 corretta, Fase 6bis aggiunta, checklist Fase 7 aggiornata) prima di questa spec.

## Tasks & Acceptance

**Execution:**

- [x] `prisma/schema.prisma` + migrazione -- 2 nuovi campi nullable su `ConfigurazioneApplicazione`
- [x] `lib/sincronizza-gare-fipav/sincronizza.ts` (nuovo) -- logica condivisa estratta, + test
- [x] `sincronizza-fipav-actions.ts` -- ridotta a chiamante sottile della funzione condivisa, test esistenti adattati (stesso comportamento osservabile)
- [x] `lib/configurazione-applicazione.ts` -- 4 nuove funzioni leggi/salva, mirror del pattern esistente, + test
- [x] `app/api/cron/sincronizza-fipav/route.ts` (nuovo) -- endpoint completo (auth, gate frequenza, ciclo fail-soft, aggiornamento timestamp), + test (mirror di `promemoria-certificati/route.test.ts`)
- [x] `app/app/(configurazione)/impostazioni/actions.ts` + `page.tsx` -- nuovo campo cadenza, Admin-only, + test
- [x] `.github/workflows/sincronizza-fipav.yml` (nuovo) -- workflow schedulato
- [x] `lib/guida/contenuti.ts` -- aggiornare le voci `/app/campionati` e `/app/impostazioni` per menzionare la sincronizzazione automatica e il nuovo campo cadenza
- [x] Review fix: `segnaSincronizzazioneFipavAutomaticaEseguita` avvolta in try/catch (500 esplicito invece di un'eccezione non gestita dopo una sincronizzazione già riuscita) + test
- [x] Review fix: `scartate` aggregato in un conteggio `scartati` nel riepilogo JSON del cron (prima calcolato ma mai esposto) + test
- [x] Review fix: workflow GitHub Actions -- `timeout-minutes`, `curl --max-time`, rimozione dello slash finale da `CRON_ENDPOINT_URL`
- [x] Review fix: timestamp "ultima sincronizzazione" mostrato con `timeZone: "Europe/Rome"` esplicito (era senza fuso, sfalsato di 1-2h sotto Cloudflare Workers/UTC)
- [x] Review fix: `docs/deploy-produzione.md` Fase 6bis -- avviso sulla disattivazione automatica di un workflow schedulato dopo 60 giorni di inattività del repository
- [x] Review fix: aggiunti i 2 test mancanti sui rami `LETTURA_FALLITA` (500) del nuovo endpoint (gap analogo già presente, non risolto, in `promemoria-certificati/route.ts`)

**Acceptance Criteria:**

- Vedi Story 10.12 completa in `_bmad-output/planning-artifacts/epics.md` (Epic 10) — 8 AC con le 5 decisioni chiuse il 2026-09-27, riportate qui per intero come parte del contratto di questa spec.

## Design Notes

**Perché il "battito" del workflow è fisso (ogni ora) ma la cadenza reale è nel DB:** un cambio di cadenza (es. da 24 a 8 ore) non deve richiedere di modificare un file YAML e rifare il deploy — un Admin lo cambia da `/app/impostazioni` come qualunque altra configurazione del progetto. Il workflow resta il "battito" più fine ragionevole (un'ora), l'endpoint decide da solo se è davvero il momento.

**Perché estrarre la logica invece di far chiamare `sincronizzaGareFipav` direttamente dall'endpoint:** la Server Action inizia con `requireRuolo`/`risolviAutorizzazioneGruppo`, entrambi basati su una sessione utente che un cron non ha — chiamarla direttamente fallirebbe sempre. La funzione condivisa non fa alcuna autorizzazione (la fa il chiamante: sessione per l'azione, `CRON_SECRET` per l'endpoint).

## Suggested Review Order

### Meccanismo di trigger (il vincolo tecnico centrale della storia)

- Entry point: auth `CRON_SECRET`, gate di frequenza (nessun fetch se la finestra non è trascorsa), ciclo fail-soft per Campionato.
  [`route.ts:38`](../../app/api/cron/sincronizza-fipav/route.ts#L38)

- Workflow GitHub Actions — battito fisso ogni ora, secrets passati via `env:` (mai interpolati nello script `run:`, evita injection), review fix: timeout + slash finale.
  [`sincronizza-fipav.yml:22`](../../.github/workflows/sincronizza-fipav.yml#L22)

### Logica condivisa (estratta da Story 10.11)

- `sincronizzaCampionatoFipav` — stessa fetch+parsing+upsert di prima, ora senza alcuna autorizzazione al suo interno (la fa il chiamante).
  [`sincronizza.ts:31`](../../lib/sincronizza-gare-fipav/sincronizza.ts#L31)

- `sincronizzaGareFipav` (Server Action, Story 10.11) — verificare che sia rimasta un chiamante sottile, stesso comportamento osservabile di prima.
  [`sincronizza-fipav-actions.ts:33`](../../app/app/(partite-campionati)/campionati/sincronizza-fipav-actions.ts#L33)

### Cadenza configurabile dall'app

- `segnaSincronizzazioneFipavAutomaticaEseguita` — review fix: ora avvolta in try/catch nel chiamante (500 esplicito invece di un'eccezione non gestita dopo una sincronizzazione già riuscita).
  [`configurazione-applicazione.ts:227`](../../lib/configurazione-applicazione.ts#L227)

- Nuovo campo Admin-only "Cadenza sincronizzazione FIPAV (ore)".
  [`FrequenzaSincronizzazioneFipavForm.tsx:11`](FrequenzaSincronizzazioneFipavForm.tsx#L11)

- Timestamp "ultima sincronizzazione" — review fix: `timeZone: "Europe/Rome"` esplicito (era sfalsato di 1-2h sotto Cloudflare Workers/UTC).
  [`page.tsx:272`](page.tsx#L272)

### Schema

- 2 campi nullable additivi su `ConfigurazioneApplicazione`, nessun backfill.
  [`schema.prisma`](../../prisma/schema.prisma)

### Documentazione (scoperta tecnica di questa storia)

- Fase 6 corretta (Cron Trigger nativo strutturalmente non funzionante con questo build) + Fase 6bis nuova, incluso l'avviso sulla disattivazione automatica dopo 60 giorni di inattività (review fix).
  [`deploy-produzione.md:138`](../../docs/deploy-produzione.md#L138)

### Test (peripherali)

- Copertura completa del nuovo endpoint, incluso i 2 rami `LETTURA_FALLITA` aggiunti in review (gap analogo, non risolto, in `promemoria-certificati/route.test.ts`).
  [`route.test.ts`](../../app/api/cron/sincronizza-fipav/route.test.ts)

## Verification

**Commands:**

- `npx prisma validate` -- expected: schema valido
- `npx vitest run` -- expected: tutti i test passano, inclusi quelli nuovi
- `npx tsc --noEmit` -- expected: nessun errore
- `npx eslint <file toccati>` -- expected: nessun errore

**Manual checks (dopo il deploy, dev locale non disponibile su questa macchina):**

- Impostare i secret GitHub Actions (`CRON_SECRET`, `CRON_ENDPOINT_URL`) come da `docs/deploy-produzione.md` Fase 6bis
- Verificare che il workflow si attivi all'ora prevista e che l'endpoint risponda 200 con un riepilogo coerente
- Impostare una cadenza breve da `/app/impostazioni`, verificare che la sincronizzazione automatica esegua davvero al successivo battito orario
- Verificare che il bottone manuale su `/app/campionati` continui a funzionare invariato
