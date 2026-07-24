# Deploy in produzione

Guida ai 7 passi per portare Società Manager in produzione. Stack: **Supabase** (Postgres + Auth, progetto EU) + **Cloudflare Workers** (hosting, via adapter `@opennextjs/cloudflare`, piano **Paid** $5/mese) con integrazione Git automatica.

Stato aggiornato al 2026-07-24. Le fasi completate sono marcate `[x]`.

## Fase 1 — Progetto Supabase di produzione `[x]`

1. Dashboard Supabase (https://supabase.com/dashboard, login con GitHub) → progetto EU creato.
2. Variabili raccolte e scritte in `.env.production` (file locale, **mai committato** — già escluso da `.gitignore`):

   | Variabile | Dove si trova |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API / API Keys → Project URL (dominio base, **senza** `/rest/v1/`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → chiave `anon` `public` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → chiave `service_role` (segreta, dietro "Reveal") |
   | `DATABASE_URL` | Project Settings → Database → Connect → tab **Transaction pooler** (porta 6543) + `?pgbouncer=true` in coda |
   | `DIRECT_URL` | Project Settings → Database → Connect → tab **Direct connection** (porta 5432), host `db.<project-ref>.supabase.co` |
   | `CRON_SECRET` | generato a mano (stringa casuale lunga, es. `openssl rand -hex 32` o `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

   **Attenzione password DB con caratteri speciali**: se la password del database contiene `@`, `:`, `/`, `%` o altri caratteri riservati negli URL, vanno URL-encodati (es. `@` → `%40`) sia in `DATABASE_URL` sia in `DIRECT_URL`, altrimenti il parsing della connection string si rompe silenziosamente.

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
DIRECT_URL="<valore da .env.production>" npx prisma migrate deploy
```

Tutte le migrazioni esistenti applicate con successo, incluse quelle dei bucket Storage (certificati medici, logo), già idempotenti (`ON CONFLICT DO NOTHING`).

**Nota tecnica — Direct connection IPv6-only**: la vera "Direct connection" Supabase (`db.<project-ref>.supabase.co`) risolve **solo su IPv6** (verificato con `nslookup`) — irraggiungibile da reti che non hanno connettività IPv6 in uscita (es. molte reti domestiche italiane). `DIRECT_URL` in `.env.production` usa quindi il **Session pooler** (stesso host del Transaction pooler `aws-0-<regione>.pooler.supabase.com`, ma porta 5432 invece di 6543) — IPv4-compatibile e con supporto ai prepared statement richiesti da Prisma Migrate (a differenza del Transaction pooler, pensato per connessioni brevi e non compatibile con Migrate).

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

## Fase 5 — Variabili d'ambiente runtime su Cloudflare `[ ]`

Nel progetto Worker su Cloudflare: **Settings → Variables and Secrets** (diverse dalle Build variables di Fase 2, usate solo in fase di build). Inserire come *secret*:

```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

`DIRECT_URL` **non serve** qui: la usa solo il CLI Prisma (`migrate`, `generate` in build) via `prisma.config.ts`, mai `lib/prisma.ts` a runtime (che legge solo `DATABASE_URL`).

## Fase 6 — Cloudflare Cron Trigger per i promemoria certificati `[ ]`

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

## Fase 7 — Deploy di verifica ed esposizione pubblica `[ ]`

Il build/deploy tecnico va a buon fine (verificato dopo l'upgrade a Workers Paid), ma resta da completare Fase 5 (variabili runtime) prima che l'app funzioni davvero end-to-end. Poi verificare:

- [ ] Build va a buon fine su Cloudflare (log della dashboard)
- [ ] Login funziona (Supabase Auth, redirect corretti da `middleware.ts`)
- [ ] Connessione DB funziona (una pagina che legge dati via Prisma)
- [ ] Upload Storage funziona (es. certificato medico o logo)
- [ ] Cron Trigger si attiva e l'endpoint risponde correttamente

**Esposizione pubblica dell'app**, due strade:

1. **Sottodominio `workers.dev`** (automatico, gratis): `societa-manager.<account>.workers.dev`, va abilitato la prima volta nelle impostazioni del Worker se non già attivo — nessuna configurazione DNS.
2. **Dominio personalizzato**: il dominio deve avere la zona DNS su Cloudflare (gratis aggiungerlo, anche senza piano a pagamento del dominio), poi **Settings → Domains & Routes → Add Custom Domain** nel progetto Worker — record DNS e certificato SSL creati automaticamente.

## Riferimenti

- Architettura completa: `_bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md` (AD-7 Cron, AD-11 Ruoli/Middleware, stack Cloudflare)
- `.env.example` per l'elenco delle variabili richieste
- `README.md` → sezione "Deploy in produzione" e "Convenzioni di sviluppo" per il riepilogo rapido
