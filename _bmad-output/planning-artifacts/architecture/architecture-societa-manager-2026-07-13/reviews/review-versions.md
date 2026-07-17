---
name: 'Review — Stack Version & Reality Check'
type: architecture-review
target: ARCHITECTURE-SPINE.md (Gestione Settore Volley - Polisportiva)
reviewed: '2026-07-14'
method: 'Web search verification of every Stack table entry, plus cross-cutting compatibility checks implied by the invariants (AD-4 RLS, AD-7 Cron)'
---

# Review — Stack Versions & Reality Check

## Scope

The spine's "Stack" table commits to: Next.js 16.x, React 19.2.x, TypeScript 5.x, Supabase (Postgres/Auth/Storage, Free), Prisma 7.x, Resend (Free), Vercel (Free, hosting + Cron). Every row was checked against current (July 2026) web sources. Beyond version numbers, I checked whether the named technologies still fit together the way the invariants assume — in particular AD-4 (RLS via Supabase Auth JWT claims) and AD-7 (single Vercel Cron entry point), since those are load-bearing architectural bets, not just library choices.

## Verdict

Mostly current and real, but one invariant (AD-4) rests on an integration path that does not work out-of-the-box with the chosen data-access invariant (AD-1/AD-3, "all queries via Prisma"), and two of the "Free tier" cost assumptions (Vercel Cron cadence, Vercel Hobby's non-commercial/non-organizational ToS restriction) were asserted without the caveats that current documentation attaches to them.

## Findings

### 1. HIGH — AD-4 (RLS via Supabase Auth JWT) does not compose cleanly with AD-1/AD-3 (all access via Prisma)

This is the most consequential gap. Supabase's RLS policies are designed to read the caller identity from `auth.uid()` / JWT claims that **PostgREST** (or the Supabase client libraries) inject into the Postgres session per request. Prisma connects directly to Postgres (via Supavisor/PgBouncer), bypassing PostgREST entirely. Two consequences documented by Prisma/Supabase community sources:

- By default, Prisma's configured DB role can be a role that bypasses RLS outright (e.g., `postgres`) — you must deliberately provision a restricted, non-superuser role for the Prisma connection, or RLS is silently inert.
- Even with a restricted role, `auth.uid()`/JWT claims are **not automatically present** in a raw Prisma connection. Making AD-4 actually work requires extra plumbing not mentioned anywhere in the spine: setting session-local variables (e.g., `SET LOCAL request.jwt.claims`) per request/transaction, typically via a Prisma Client Extension, with care around SQL-injection (`executeRawUnsafe` is the naive/unsafe approach) and around how this interacts with PgBouncer transaction-mode pooling (session variables must not leak across pooled connections serving different users).

Community workarounds exist (e.g., `prisma-extension-supabase-rls`), but this is not first-party, not mentioned in the spine, and not trivial. AD-4 is marked `[ADOPTED]` as if settled; the mechanism by which JWT-based RLS actually gets enforced through a Prisma-only data path needs its own decision and should probably become its own AD, not an assumed detail.

### 2. MEDIUM — Prisma 7's driver-adapter requirement is a real breaking change not reflected in the spine

Verified: Prisma ORM 7 removed the bundled Rust query engine; **all relational connections now require an explicit driver adapter** (e.g., `@prisma/adapter-pg` + `pg`), configured via `prisma.config.ts` for CLI/migrations and instantiated in app code for runtime. This also means connection-pool sizing now comes from the underlying Node driver, not Prisma defaults — a behavior change from the "Prisma 6 and earlier" model most existing Supabase+Prisma guides (and likely training data) describe. Supabase's own current setup pattern is: `directUrl` (port 5432) in `prisma.config.ts` for migrations, pooled `DATABASE_URL` (port 6543, `pgbouncer=true`) with a driver adapter for runtime queries. The spine's Structural Seed doesn't show a `lib/db/` or Prisma-client-singleton concern at all — worth adding given this is now a required, non-trivial piece of wiring, not an implicit detail.

### 3. MEDIUM — Vercel Hobby (free) plan: Cron cadence and ToS scope both need explicit sign-off, not silent assumption

- **Cadence**: as of 2026, Vercel Hobby cron jobs are capped at **once per day**, UTC only, with timing "guaranteed" only within the hour it's scheduled for. (Good news: the old 2-cron-job cap was removed in Jan 2026 — Hobby now allows up to 100 cron jobs/project — so AD-7's "one Cron job" is not a scarcity problem.) Once-daily is very likely fine for a certificate-expiry reminder (FR-16), but the spine should say so explicitly rather than leave it implicit, since "Vercel Cron" reads as if any schedule is available.
- **ToS scope**: Vercel's Fair Use Guidelines restrict the Hobby plan to **non-commercial, personal use**, and explicitly call out that a project "owned by ... an organization" or run "on behalf of" one is out of scope for Hobby regardless of whether money changes hands on the site itself. This system is being built for a "Polisportiva" (a real sports association) to run its official volleyball-department operations (medical-certificate compliance, federation-facing registrations) — i.e., squarely organizational use, even though no PRD requirement mentions in-app payments. Whether this specific nonprofit deployment crosses Vercel's line is a judgment call Vercel itself reserves the right to make unilaterally (deployments can be disabled "with or without notice"), so treating "Vercel Free" as a durable, risk-free cost line in the architecture is optimistic. This should be flagged to the client/PO as a plan-selection risk, not silently assumed.

### 4. LOW–MEDIUM — TypeScript pinned to "5.x" is stale relative to what actually shipped by the doc's own date

TypeScript 6.0 (the last JS-hosted release) shipped March 23, 2026; **TypeScript 7.0 (the Go-native rewrite) reached GA essentially the same week as this architecture doc** (RC June 18, 2026; 7.0.2 published July 14, 2026). Next.js itself only gained TS7 compatibility via an experimental flag (`experimental.useTypeScriptCli`) in the Next.js 16.3 preview — i.e., the ecosystem is mid-transition right now. "TypeScript 5.x" is not broken (Next 16 still works with it), but it reads like a default carried over from training-data assumptions rather than a version actually checked against what's current in July 2026 — by the doc's own date, two newer majors already existed. Recommend the spine either explicitly commit to 5.x with a stated reason (ecosystem/tooling stability during the TS7 transition — which is a legitimate, defensible reason) or bump the floor and note the TS7 caveat above.

### 5. LOW — Supabase free-tier project auto-pause after 7 days of inactivity is a real operational risk for a seasonal app

Confirmed current: Free-tier Supabase projects pause after ~7 days without sufficient database activity, and Free accounts are capped at 2 active projects (fine here — spine already commits to one Supabase project). The domain here is explicitly seasonal (`AnnoAgonistico`, 1 Aug–30 Jun, i.e. a summer off-season). If real usage genuinely drops to near-zero during July–August, the production project can pause itself, which would silently break the AD-7 cron job and login access until someone manually un-pauses it. Not fatal, but worth a one-line mitigation note (e.g., a weekly keep-alive ping, or explicit acceptance of the risk) rather than leaving "Supabase Free" as an unqualified line item.

### 6. Confirmed fine, no material risk found

- **Next.js 16.x / React 19.2.x**: current and correctly paired — Next.js 16 (GA Oct 2025, latest patch 16.2.7 as of June 2026) bundles React 19.2 by default. Accurate.
- **Resend Free tier + attachments**: Free tier (3,000 emails/mo, 100/day, 1 verified domain) does support attachments (up to 40MB post-Base64 total email size); no plan-gating on the attachment feature itself was found. Not directly relevant to this PRD unless certificate PDFs get emailed rather than stored/linked (current design uses signed URLs per AD-6, so this is likely moot anyway).
- **Prisma 7.x + Supabase pooling, mechanically**: works, using Supavisor (transaction mode, port 6543) for runtime and the direct port-5432 connection for migrations — this is a documented, supported pattern. (The catch is the driver-adapter requirement in Finding 2, not pooling compatibility per se.)
- **Supabase free tier limits** (500MB DB, 1GB storage, 50k MAU, 5GB egress) are generously above what a single-club volleyball department needs; no capacity risk identified for v1 scale.

## Recommendation

Before treating the Stack table as settled:
1. Turn Finding 1 into an explicit architectural decision (its own AD) describing exactly how JWT context reaches Postgres given an all-Prisma data path — this is the one item that could force a real design change (e.g., a thin PostgREST/Supabase-client escape hatch for RLS-sensitive reads, or a Prisma extension with session-variable injection) rather than a footnote.
2. Add one line to AD-7 confirming once-daily cadence is acceptable for FR-16.
3. Have the client/PO explicitly confirm Vercel Hobby plan acceptance given the organizational-use question (Finding 3), or budget for Pro ($20/mo) as a fallback.
4. Either justify "TypeScript 5.x" explicitly (ecosystem stability) or reconsider given 6.x/7.x both now exist.
