# Società Manager

Gestionale web per una polisportiva (Settore Volley): orari di allenamento, gruppi/allenatori, presenze e certificati medici — in sostituzione di WhatsApp e fogli Excel scollegati. Sei ruoli (Atleta, Genitore, Allenatore, Segreteria, Dirigente, Admin), ciascuno con un accesso costruito sul proprio bisogno reale.

Per una panoramica di prodotto (perché esiste, roadmap per Epic, glossario) vedi [`docs/panoramica-prodotto.md`](docs/panoramica-prodotto.md).

## Stack

- **Next.js 16** (App Router, Turbopack) — vedi `node_modules/next/dist/docs/` prima di modificare pattern del framework: questa versione ha breaking change rispetto alle versioni precedenti.
- **Prisma 7** con `@prisma/adapter-pg` (driver adapter, obbligatorio in Prisma 7) — modello dati canonico e migrazioni.
- **Supabase** (Postgres + Auth) — RLS per le tabelle sensibili (`Atleta`, `Iscrizione`, `CertificatoMedico`, `Presenza`), Prisma diretto per il resto (schema strutturale).
- **TypeScript**, **Vitest** per i test.

## Prerequisiti

- Node.js e npm
- Docker (per Supabase locale)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Setup locale

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia lo stack Supabase locale (Postgres, Auth, Studio, ...)
supabase start

# 3. Copia i valori stampati da `supabase start` in .env
cp .env.example .env
# poi compila DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL,
# NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 4. Applica le migrazioni, genera il client e semina l'utente Admin
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# 5. Avvia il server di sviluppo
npm run dev
```

L'app è disponibile su [http://localhost:3000](http://localhost:3000). Lo Studio Supabase locale è su `http://127.0.0.1:54323`.

L'utente Admin di seed (solo contro Supabase locale) è `admin@societa-manager.local` / `password`.

## Comandi principali

```bash
npm run dev      # dev server (Turbopack)
npm run build    # build di produzione
npm run lint     # ESLint
npm test         # Vitest (npx vitest run)
npx tsc --noEmit # type check
```

Dopo ogni modifica a `prisma/schema.prisma`: scrivere a mano la migrazione in `prisma/migrations/<timestamp>_descrizione/migration.sql` (lo shadow DB di `prisma migrate dev` non è utilizzabile in questo progetto una volta introdotte policy RLS con `auth.jwt()`), poi `npx prisma migrate deploy && npx prisma generate` e riavviare il dev server.

## Struttura del progetto

```
app/(nome-modulo)/   # route group per modulo (es. (orari-palestre), (gruppi-allenatori))
lib/                 # helper condivisi (anno-agonistico, auth, db-rls, ...)
prisma/              # schema.prisma, migrazioni scritte a mano, seed
_bmad-output/         # planning artifacts (PRD, architettura, epics) e story di implementazione
docs/                 # panoramica di prodotto
```

Ogni modulo (`app/(nome-modulo)/`) possiede in esclusiva la mutazione delle proprie entità — un modulo legge le entità di un altro solo tramite le sue funzioni/query, mai scrivendo direttamente sulle sue tabelle. Le tabelle protette da RLS si leggono/scrivono solo tramite client Supabase autenticato (`lib/db-rls/`), mai con una query Prisma diretta a runtime.

## Stato di avanzamento

20/32 storie completate su 7 Epic. Epic 1 (Accesso, Popolamento e Iscrizioni) ed Epic 2 (Palestre, Gruppi e Orari) completati; Epic 3 (Presenze) completo per il perimetro v1 (2/3 — la terza storia, trend/percentuale, è "Could" e fuori perimetro v1 per PRD); Epic 4 (Compliance Visite Mediche) in corso (2/6: upload certificato e notifica automatica completati). Epic 7 (Configurazione Applicazione) aggiunto in corso d'opera il 2026-07-18 — la polisportiva invia le email transazionali tramite la propria casella SMTP (Aruba) invece di un provider terzo, con parametri configurabili da un'interfaccia Admin (vedi [`_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-18.md`](_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-18.md)) — eseguito prima di Story 4.3, da cui è un prerequisito. Stato dettagliato in [`_bmad-output/implementation-artifacts/sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml), roadmap discorsiva in [`docs/panoramica-prodotto.md`](docs/panoramica-prodotto.md).

## Convenzioni di sviluppo

Le decisioni architetturali vincolanti (AD-1..AD-11) sono in [`_bmad-output/planning-artifacts/architecture/`](_bmad-output/planning-artifacts/architecture/). In sintesi:

- TDD per tutta la business logic (Server Action, helper `lib/`); nessun test per pagine/Server Component o Client Component — solo verifica manuale/dal vivo.
- `AnnoAgonistico` (1 agosto – 30 giugno) come partizione temporale: helper condiviso in `lib/anno-agonistico/`, mai calcoli di date ripetuti per modulo.
- Naming Server Action: verbo nudo, nessun suffisso (`creaGruppo`, non `creaGruppoAction`).
- Errori Server Action nella forma `{ error: { code, message } }`; `"FORBIDDEN"` riservato ai rifiuti di autorizzazione.
