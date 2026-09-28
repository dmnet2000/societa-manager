# Deploy in produzione

Guida ai 7 passi per portare Società Manager in produzione. Stack: **Supabase** (Postgres + Auth, progetto EU) + **Cloudflare Workers** (hosting, via adapter `@opennextjs/cloudflare`, piano **Paid** $5/mese) con integrazione Git automatica.

Stato aggiornato al 2026-07-25. Le fasi completate sono marcate `[x]`.

## Fase 1 — Progetto Supabase di produzione `[x]`

1. Dashboard Supabase (https://supabase.com/dashboard, login con GitHub) → progetto EU creato.
2. Variabili raccolte e scritte in `.env.production` (file locale, **mai committato** — già escluso da `.gitignore`):

   | Variabile | Dove si trova |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API / API Keys → Project URL (dominio base, **senza** `/rest/v1/`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → chiave `anon` `public` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → chiave `service_role` (segreta, dietro "Reveal") |
   | `DATABASE_URL` | Project Settings → Database → Connect → tab **Transaction pooler** (porta 6543) + `?pgbouncer=true&sslmode=require` in coda |
   | `DIRECT_URL` | Project Settings → Database → Connect → tab **Direct connection** (porta 5432), host `db.<project-ref>.supabase.co` + `?sslmode=require` in coda |
   | `CRON_SECRET` | generato a mano (stringa casuale lunga, es. `openssl rand -hex 32` o `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

   **Attenzione password DB con caratteri speciali**: se la password del database contiene `@`, `:`, `/`, `%` o altri caratteri riservati negli URL, vanno URL-encodati (es. `@` → `%40`) sia in `DATABASE_URL` sia in `DIRECT_URL`, altrimenti il parsing della connection string si rompe silenziosamente.

   **Attenzione `sslmode=require` obbligatorio in produzione**: il pooler Supabase (Supavisor) richiede sempre TLS sulle connessioni esterne, ma `pg`/`@prisma/adapter-pg` non attivano SSL a meno che non sia esplicito nella connection string. Senza `sslmode=require` il login sembra fallire con "Servizio momentaneamente non disponibile" (la query Prisma che verifica l'utente in `app/(auth)/accedi/actions.ts` va in errore silenzioso, senza messaggio utile nei log Cloudflare — verificato in produzione il 2026-07-25). In locale (Supabase locale, `127.0.0.1`) non serve, quindi non è nell'esempio di `.env.example`.

## Fase 2 — Account Cloudflare + progetto collegato a GitHub `[x]`

1. Account creato su https://dash.cloudflare.com/sign-up.
2. Progetto **Workers** (non "Pages" a soli asset statici, dato che il progetto usa `wrangler.jsonc` con un vero Worker) creato e collegato al repo GitHub `dmnet2000/societa-manager` via Git integration ("Workers Builds").
3. Configurazione build impostata nel progetto Worker:
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
   - Build variable **`DIRECT_URL`** (vedi nota sotto — necessaria già in fase di build)
4. Piano upgradato a **Workers Paid** ($5/mese) per il limite Worker a 10 MiB (vedi Fase 4).
5. Una volta collegato: ogni push su `main` builda e deploya automaticamente in produzione; ogni branch/PR genera un deploy di anteprima automatico (URL temporaneo, usato come test informale — non esiste uno staging dedicato, contesto solo-dev).

**Nota su `DIRECT_URL` come build variable**: `prisma.config.ts` richiede sempre `DIRECT_URL` per caricare la configurazione, anche solo per `prisma generate` (lanciato dallo script `postinstall`) — va quindi impostata come **Build variable** (sezione "Build configuration" del progetto Worker), separata dalle variabili **runtime** del Worker (Fase 5).

## Fase 3 — Migrazioni Prisma sul DB di produzione `[x]`

```bash
DIRECT_URL="<valore da .env.production, con ?sslmode=require>" npx prisma migrate deploy
```

Tutte le migrazioni esistenti applicate con successo, incluse quelle dei bucket Storage (certificati medici, logo), già idempotenti (`ON CONFLICT DO NOTHING`).

**Nota tecnica — Direct connection IPv6-only**: la vera "Direct connection" Supabase (`db.<project-ref>.supabase.co`) risolve **solo su IPv6** (verificato con `nslookup`) — irraggiungibile da reti che non hanno connettività IPv6 in uscita (es. molte reti domestiche italiane). `DIRECT_URL` in `.env.production` usa quindi il **Session pooler** (stesso host del Transaction pooler `aws-0-<regione>.pooler.supabase.com`, ma porta 5432 invece di 6543) — IPv4-compatibile e con supporto ai prepared statement richiesti da Prisma Migrate (a differenza del Transaction pooler, pensato per connessioni brevi e non compatibile con Migrate).

## Fase 3bis — ⚠️ Ad ogni nuova migrazione: applicarla PRIMA o CONTESTUALMENTE al push del codice

**Regola non negoziabile, aggiunta dopo due incidenti reali in produzione nella stessa settimana** (Story 11.1 — colonna `Allenatore.cognome`; Story 11.2 — colonne `Palestra.latitudine`/`longitudine`, entrambe 2026-07-27): ogni volta che una storia aggiunge una migrazione Prisma, `postinstall: prisma generate` (Fase 4) rigenera il Client con le colonne nuove **ad ogni build su Cloudflare**, quindi il codice deployato interroga da subito quelle colonne — se la migrazione non è ancora stata applicata al database di produzione, ogni richiesta che tocca quella tabella fallisce (500 se la query non è avvolta in un `try/catch`, come per una pagina; risposta 200 con errore generico se è dentro una Server Action con gestione errori).

**Prima di fare `git push` su `main`** per una storia con una nuova cartella in `prisma/migrations/`:

```bash
DIRECT_URL="<valore da .env.production, con ?sslmode=require>" npx prisma migrate deploy
```

Poi (e solo poi) push del codice. Se il push è già avvenuto per errore, la stessa identica correzione va lanciata subito — il downtime dura solo fino a quando questo comando non viene eseguito.

## Fase 3ter — ⚠️ Dopo il deploy della Story 9.31: configurare l'Email Segreteria

**Regola aggiunta il 2026-08-06, prima che si ripeta lo stesso schema di incidente silenzioso di Fase 3bis** (lì una migrazione non applicata, qui una configurazione non impostata — stesso effetto: una funzionalità smette di funzionare senza errori visibili). La Story 9.31 ha sostituito l'invio dell'email di notifica "nuovo Certificato Medico caricato" (Story 4.3) — prima mandata a ogni Utente con Ruolo Segreteria — con un singolo indirizzo configurabile su `/impostazioni`. **Se quel campo resta vuoto dopo il deploy, nessuna notifica parte più**, anche se un Utente ha già il Ruolo Segreteria assegnato — comportamento silenzioso per design (AC #3), nessun errore in log.

**Subito dopo il primo deploy di questa storia**: accedere come Admin, andare su `/impostazioni` e impostare l'indirizzo email della Segreteria.

## Fase 4 — Adapter Cloudflare + wrangler + dimensione bundle `[x]`

**Setup adapter:**

- `next` aggiornato a `16.2.11` (richiesto da `@opennextjs/cloudflare`, che vuole `>=16.2.11`)
- Installati `@opennextjs/cloudflare` e `wrangler` come devDependencies
- Creati `wrangler.jsonc` (config Worker: assets, self-reference service binding, binding immagini) e `open-next.config.ts`
- `next.config.ts`: aggiunta `initOpenNextCloudflareForDev()` per i binding Cloudflare in dev locale, più `serverExternalPackages: ["pg", "pg-cloudflare"]`
- Script npm aggiunti: `cf:build`, `cf:preview`, `cf:deploy`
- `package.json`: script `postinstall: "prisma generate"` (necessario perché una `npm clean-install` — come quella di Cloudflare — non genera mai il client Prisma da sola)

**Nota tecnica — Proxy/Middleware**: Next.js 16 rinomina `middleware.ts` in `proxy.ts` e lo fa girare solo su runtime Node.js (non più configurabile su Edge, l'opzione `runtime` nel file lancia un errore). L'adapter `@opennextjs/cloudflare` però rifiuta il build se rileva un middleware/proxy Node.js. Soluzione verificata: il progetto resta sulla **vecchia convenzione `middleware.ts`** (deprecata solo con warning, non rimossa) con `export const config = { runtime: "experimental-edge", ... }` — l'unica combinazione compatibile sia con Cloudflare sia con AD-11 (che già prevedeva un middleware Edge). Nessuna logica di autenticazione è stata riscritta.

**Nota tecnica — `pg`/`pg-cloudflare`**: questi pacchetti (usati da `@prisma/adapter-pg` per le connessioni TCP dentro un Worker) hanno export condizionali diversi per il runtime `workerd`; senza `serverExternalPackages`, Next li impacchetta con le condizioni Node.js di default e il build Cloudflare fallisce a risolvere l'entry point corretto. Vedi https://opennext.js.org/cloudflare/howtos/workerd.

**Nota tecnica — cache incrementale R2**: rimossa dalla configurazione (`wrangler.jsonc`/`open-next.config.ts`) perché richiederebbe abilitare R2 sul dashboard Cloudflare; l'app è quasi interamente server-rendered dinamico, il beneficio dell'ISR/PPR su R2 non giustificava il servizio in più da gestire.

**Limite dimensione Worker e generator Prisma**: il piano Free di Cloudflare Workers limita ogni Worker a **3 MiB** (gzip); il bundle di questo progetto (Prisma + Next + Supabase + exceljs) lo supera. Migrato `prisma/schema.prisma` al nuovo generator Rust-free (`provider = "prisma-client"`, `output = "../generated/prisma"`, cartella generata esclusa da `.gitignore`/ESLint) — aggiornati tutti gli import da `"@prisma/client"` a `"@/generated/prisma/client"` in tutto il codebase. **Nota**: contrariamente a quanto promesso nella documentazione Prisma (fino a -90% di bundle), in pratica il motore WASM di fallback resta comunque nel bundle finale (dietro un `import()` dinamico mai eseguito quando si usa sempre un driver adapter, ma comunque incluso staticamente dal bundler) — la dimensione non è scesa sotto 3 MiB. Il generator `prisma-client` resta comunque adottato (è la direzione futura ufficiale, `prisma-client-js` verrà rimosso in una prossima major di Prisma), ma **il limite di dimensione è stato risolto passando al piano Cloudflare Workers Paid ($5/mese, limite 10 MiB)**, non con la migrazione del generator.

**Limite Windows**: `cf:build`/`cf:preview` creano symlink in `node_modules`; su Windows falliscono con `EPERM` a meno di attivare la Modalità sviluppatore (Impostazioni → Privacy e sicurezza → Per sviluppatori) o di eseguire da WSL. Il build su Cloudflare (Linux) non ha questo problema.

## Fase 5 — Variabili d'ambiente runtime su Cloudflare `[x]`

Nel progetto Worker su Cloudflare: **Settings → Variables and Secrets** (diverse dalle Build variables di Fase 2, usate solo in fase di build). Inserire come *secret*:

```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

`DIRECT_URL` **non serve** qui: la usa solo il CLI Prisma (`migrate`, `generate` in build) via `prisma.config.ts`, mai `lib/prisma.ts` a runtime (che legge solo `DATABASE_URL`).

`DATABASE_URL` **deve** includere `&sslmode=require` (vedi nota in Fase 1) — senza, le query Prisma a runtime falliscono in modo silenzioso (nessun messaggio d'errore utile nei log Cloudflare) e il login resta bloccato su "Servizio momentaneamente non disponibile".

## Fase 6 — ⚠️ Cloudflare Cron Trigger nativo: NON funzionante con questo build, non solo "da configurare" `[ ]`

**Scoperta durante lo sviluppo della Story 10.12 (2026-09-27):** questa fase era rimasta `[ ]` non perché mai completata, ma perché **strutturalmente non può funzionare** con l'adapter `@opennextjs/cloudflare` usato da questo progetto. Verificato leggendo il file Worker realmente generato (`node_modules/@opennextjs/cloudflare/dist/cli/templates/worker.js`, diventa `.open-next/worker.js` in produzione): esporta **solo** un handler `fetch`, mai `scheduled` — e non esiste alcun punto di estensione ufficiale in `defineCloudflareConfig()` (`@opennextjs/cloudflare` v1.20.2) per aggiungerne uno. Un Cron Trigger nativo di Cloudflare invoca proprio quell'evento `scheduled()` sul Worker: se non esiste, il trigger non ha nulla da chiamare, indipendentemente da quanto accuratamente venga configurato lato dashboard o in `wrangler.jsonc`.

Le istruzioni sotto (dashboard **Settings → Triggers → Cron Triggers**, o `triggers.crons` in `wrangler.jsonc`) restano storicamente corrette per un Worker "puro" scritto a mano, ma **non si applicano a questo progetto** finché il Worker continua a essere generato da OpenNext in questa forma. Non seguirle: non produrrebbero un cron funzionante, solo un trigger configurato che non fa nulla.

**La sincronizzazione automatica FIPAV (Story 10.12) usa invece un meccanismo diverso — vedi Fase 6bis sotto.** Lo stesso meccanismo è stato replicato anche per il promemoria certificati — vedi Fase 6ter.

<details>
<summary>Istruzioni originali (non applicabili a questo build — lasciate come riferimento storico)</summary>

Endpoint: `app/api/cron/promemoria-certificati` (Story 4.6), protetto da `CRON_SECRET` (già in `.env.production`/Fase 5).

1. Nel progetto Worker: **Settings → Triggers → Cron Triggers → Add**.
2. Espressione cron a scelta (es. una volta al giorno).
3. In alternativa, aggiungere direttamente in `wrangler.jsonc`:
   ```jsonc
   "triggers": {
     "crons": ["0 6 * * *"] // ogni giorno alle 6:00 UTC, esempio
   }
   ```
4. Il Worker dovrà gestire l'evento `scheduled` per chiamare l'endpoint con l'header/secret atteso — verificare l'implementazione in `app/api/cron/promemoria-certificati/route.ts` per il meccanismo esatto di autenticazione atteso (`CRON_SECRET`).

</details>

## Fase 6bis — GitHub Actions schedulato per la sincronizzazione automatica FIPAV (Story 10.12) `[ ]`

Endpoint: `app/api/cron/sincronizza-fipav` (Story 10.12), protetto dallo stesso `CRON_SECRET` di Fase 5/6 (riusato, non un nuovo segreto). Workflow: `.github/workflows/sincronizza-fipav.yml`, già presente nel repository — gira **ogni 10 minuti** come "battito" fisso, ma **elabora un solo Campionato per invocazione** (il meno recentemente sincronizzato, in rotazione) — mai tutti insieme: un tentativo reale in produzione ha rivelato che sincronizzare più Campionati nella stessa chiamata rischiava sia un timeout lato workflow sia di bombardare il portale FIPAV con più richieste ravvicinate. Con più Campionati, la rotazione completa richiede più battiti (es. 5 Campionati ≈ 50 minuti per il giro completo). La cadenza REALE di ri-sincronizzazione di un singolo Campionato resta configurabile da un Admin su `/app/impostazioni` (nessun redeploy necessario per cambiarla).

1. Nel repository GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
2. Nome: `CRON_SECRET` — valore: lo stesso segreto già in `.env.production`/Fase 5 (Cloudflare) e in `.github/workflows/sincronizza-fipav.yml` come riferimento (`secrets.CRON_SECRET`).
3. Nome: `CRON_ENDPOINT_URL` — valore: l'URL pubblico dell'app in produzione (es. `https://societa-manager.dmnet2000.workers.dev`), usato dal workflow per costruire l'URL completo dell'endpoint.
4. Il workflow si attiva automaticamente secondo lo schedule già definito nel file — nessuna azione aggiuntiva richiesta dopo aver impostato i due secret sopra.

⚠️ **GitHub disattiva automaticamente un workflow schedulato (`on: schedule`) dopo 60 giorni senza alcuna attività nel repository** (nessun commit/push/PR, indipendentemente dal fatto che il workflow stesso continui a girare). Se il repository resta a lungo senza modifiche, ricontrollare **Actions → Sincronizzazione automatica FIPAV** e riattivarlo manualmente se risulta disabilitato (un push qualsiasi lo riattiva automaticamente).

## Fase 6ter — GitHub Actions schedulato per il promemoria scadenza Certificati Medici (Story 4.6) `[ ]`

Endpoint: `app/api/cron/promemoria-certificati` (Story 4.6), stesso `CRON_SECRET`/`CRON_ENDPOINT_URL` già impostati per la Fase 6bis — **nessun nuovo secret da configurare**. Workflow: `.github/workflows/promemoria-certificati.yml`, già presente nel repository — **una sola volta al giorno** (`0 6 * * *`, 6:00 UTC = 7:00 CET/8:00 CEST), a differenza del battito orario di Fase 6bis: l'endpoint confronta i giorni alla scadenza per data di calendario, non per timestamp — una seconda esecuzione nello stesso giorno rimanderebbe lo stesso promemoria a Dirigenti e famiglie collegate.

Se i due secret di Fase 6bis sono già stati impostati, questo workflow si attiva automaticamente senza altre azioni — vale lo stesso avviso sulla disattivazione dopo 60 giorni di inattività del repository (**Actions → Promemoria scadenza Certificati Medici**).

⚠️ **Stesso schema di incidente silenzioso della Fase 3ter**: l'endpoint risponde sempre `200` anche quando nessuna email parte davvero — SMTP non configurato (`/app/smtp`), nessun Utente con Ruolo Dirigente, o nessun Certificato che cade esattamente a 30/7 giorni dalla scadenza nel giorno dell'esecuzione producono tutti un riepilogo silenzioso (`inviati: 0`), mai un errore visibile. Verificare il corpo della risposta (`processati`/`inviati`/`falliti`), non solo che il workflow sia andato a buon fine.

**Per testare davvero l'invio** (un giorno qualunque quasi certamente non ha un Certificato esattamente a 30 o 7 giorni dalla scadenza): impostare temporaneamente `dataFineValidita` di un Certificato di prova a oggi+30 o oggi+7, lanciare il workflow a mano (`workflow_dispatch`), verificare `inviati: 1` nel corpo della risposta, poi ripristinare la data originale.

## Fase 7 — Deploy di verifica ed esposizione pubblica `[ ]`

Il build/deploy tecnico va a buon fine (verificato dopo l'upgrade a Workers Paid), ma resta da completare Fase 5 (variabili runtime) prima che l'app funzioni davvero end-to-end. Poi verificare:

- [ ] Build va a buon fine su Cloudflare (log della dashboard)
- [ ] Login funziona (Supabase Auth, redirect corretti da `middleware.ts`)
- [ ] Connessione DB funziona (una pagina che legge dati via Prisma)
- [ ] Upload Storage funziona (es. certificato medico o logo)
- [ ] Workflow GitHub Actions di Fase 6bis si attiva e l'endpoint `sincronizza-fipav` risponde correttamente (il Cron Trigger nativo di Fase 6 non è applicabile a questo build, vedi nota lì)
- [ ] Workflow GitHub Actions di Fase 6ter si attiva e l'endpoint `promemoria-certificati` risponde `200` **con un corpo JSON coerente** (`inviati`/`falliti`, non solo l'assenza di errore HTTP — vedi l'avviso in Fase 6ter)

**Esposizione pubblica dell'app**, due strade:

1. **Sottodominio `workers.dev`** (automatico, gratis): `societa-manager.<account>.workers.dev`, va abilitato la prima volta nelle impostazioni del Worker se non già attivo — nessuna configurazione DNS.
2. **Dominio personalizzato**: il dominio deve avere la zona DNS su Cloudflare (gratis aggiungerlo, anche senza piano a pagamento del dominio), poi **Settings → Domains & Routes → Add Custom Domain** nel progetto Worker — record DNS e certificato SSL creati automaticamente.

## Fase 8 — Story 22.1: Cloudflare Web Analytics `[ ]`

1. Account Cloudflare → **Analytics & Logs → Web Analytics → Aggiungi un sito** (dominio di produzione) → copiare il `token` dal tag JS mostrato (`data-cf-beacon='{"token": "..."}'`). Non è un segreto (pensato per essere incluso lato client), ma va comunque impostato come le altre `NEXT_PUBLIC_*` di questo progetto: aggiungerlo alla stessa lista della Fase 5 (**Settings → Variables and Secrets**) come `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` — stesso meccanismo già verificato funzionante per `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` sopra, non una Build variable di Fase 2.
2. **Attenzione ai deploy di anteprima** (Fase 2, punto 5: ogni branch/PR genera un deploy automatico): se le Variables and Secrets sono condivise a livello di intero progetto Worker (non scoping per ambiente), ogni visita a un URL di anteprima durante test/QA finisce nella STESSA dashboard Web Analytics della produzione, sporcando le statistiche. Se questo diventa un problema reale, valutare un secondo "sito" Web Analytics dedicato all'ambiente di anteprima (token diverso) o l'uso degli Environment separati di Cloudflare Workers Builds (non ancora configurati da questo progetto).
3. Dopo il deploy, verificare (DevTools → Network, su una pagina pubblica) la richiesta a `static.cloudflareinsights.com/beacon.min.js` - se assente, il token non è stato propagato in fase di build (mai a runtime per una `NEXT_PUBLIC_*`, vedi Fase 5 sopra).

## Riferimenti

- Architettura completa: `_bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md` (AD-7 Cron, AD-11 Ruoli/Middleware, stack Cloudflare)
- `.env.example` per l'elenco delle variabili richieste
- `README.md` → sezione "Deploy in produzione" e "Convenzioni di sviluppo" per il riepilogo rapido
