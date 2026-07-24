# Deploy in produzione

Guida ai 7 passi per portare Società Manager in produzione. Stack: **Supabase** (Postgres + Auth, progetto EU) + **Cloudflare Workers** (hosting, via adapter `@opennextjs/cloudflare`) con integrazione Git automatica.

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

## Fase 2 — Account Cloudflare + progetto collegato a GitHub `[ ]` (in corso)

1. Crea l'account su https://dash.cloudflare.com/sign-up.
2. Nella dashboard: **Compute (Workers)** → **Workers & Pages** → **Create**.
3. Scegli la scheda **Workers** (non "Pages" a soli asset statici — questo progetto usa `wrangler.jsonc` con un vero Worker, quindi serve il prodotto Workers con "Workers Builds"/Git integration).
4. Collega il repository GitHub `dmnet2000/societa-manager`, autorizzando l'accesso Cloudflare → GitHub quando richiesto.
5. Configurazione build:
   - Comando di build: `npx opennextjs-cloudflare build`
   - Config file: `wrangler.jsonc` (nella root del repo, di solito rilevato automaticamente)
   - Branch di produzione: `main`
6. Una volta collegato: ogni push su `main` builda e deploya automaticamente in produzione; ogni branch/PR genera un deploy di anteprima automatico (URL temporaneo, usato come test informale — non esiste uno staging dedicato, contesto solo-dev).

## Fase 3 — Migrazioni Prisma sul DB di produzione `[ ]`

Con `.env.production` compilato (Fase 1):

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

(puntato a `.env.production` — verificare che il comando legga quel file, es. tramite `dotenv -e .env.production -- npx prisma migrate deploy` se necessario). Applica tutte le migrazioni esistenti, incluse quelle dei bucket Storage (certificati medici, logo), già idempotenti (`ON CONFLICT DO NOTHING`).

## Fase 4 — Adapter Cloudflare + wrangler `[x]`

Fatto in questa sessione:

- `next` aggiornato a `16.2.11` (richiesto da `@opennextjs/cloudflare`, che vuole `>=16.2.11`)
- Installati `@opennextjs/cloudflare` e `wrangler` come devDependencies
- Creati `wrangler.jsonc` (config Worker: assets, R2 bucket per cache incrementale ISR, binding immagini) e `open-next.config.ts`
- `next.config.ts`: aggiunta `initOpenNextCloudflareForDev()` per i binding Cloudflare in dev locale
- Script npm aggiunti: `cf:build`, `cf:preview`, `cf:deploy`

**Nota tecnica importante — Proxy/Middleware**: Next.js 16 rinomina `middleware.ts` in `proxy.ts` e lo fa girare solo su runtime Node.js (non più configurabile su Edge, l'opzione `runtime` nel file lancia un errore). L'adapter `@opennextjs/cloudflare` però rifiuta il build se rileva un middleware/proxy Node.js. Soluzione verificata: il progetto resta sulla **vecchia convenzione `middleware.ts`** (deprecata solo con warning, non rimossa) con `export const config = { runtime: "experimental-edge", ... }` — l'unica combinazione compatibile sia con Cloudflare sia con AD-11 (che già prevedeva un middleware Edge). Nessuna logica di autenticazione è stata riscritta: stessa route-guard, stesso refresh dei cookie di sessione Supabase (i Server Component non possono scrivere cookie in Next.js — è per questo che serve comunque un middleware, non solo per il redirect dei ruoli).

**Limite Windows**: `cf:build`/`cf:preview` creano symlink in `node_modules`; su Windows falliscono con `EPERM` a meno di attivare la Modalità sviluppatore (Impostazioni → Aggiornamento e sicurezza → Per sviluppatori) o di eseguire da WSL. Il build su Cloudflare (Linux) non ha questo problema.

## Fase 5 — Variabili d'ambiente su Cloudflare `[ ]`

Nel progetto Worker su Cloudflare: **Settings → Variables and Secrets**. Inserire (come *secret*, non variabili in chiaro, tutte quelle di `.env.production`):

```
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

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

## Fase 7 — Deploy di verifica `[ ]`

Dopo Fasi 2-6, verificare end-to-end sul primo deploy reale:

- [ ] Build va a buon fine su Cloudflare (log della dashboard)
- [ ] Login funziona (Supabase Auth, redirect corretti da `middleware.ts`)
- [ ] Connessione DB funziona (una pagina che legge dati via Prisma)
- [ ] Upload Storage funziona (es. certificato medico o logo)
- [ ] Cron Trigger si attiva e l'endpoint risponde correttamente

## Riferimenti

- Architettura completa: `_bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md` (AD-7 Cron, AD-11 Ruoli/Middleware, stack Cloudflare)
- `.env.example` per l'elenco delle variabili richieste
- `README.md` → sezione "Deploy in produzione" e "Convenzioni di sviluppo" per il riepilogo rapido
