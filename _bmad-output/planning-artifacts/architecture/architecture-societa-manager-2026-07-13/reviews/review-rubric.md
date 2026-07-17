---
title: Review — Architecture Spine (Gestione Settore Volley - Polisportiva)
type: review
reviewed-artifact: ARCHITECTURE-SPINE.md
reviewed-against: PRD (prd-societa-manager-2026-07-13/prd.md)
rubric: good-spine-checklist (solo-dev / hobby-stakes calibration)
date: 2026-07-14
---

# Review: Architecture Spine — Gestione Settore Volley

## Verdict

**Solid, appropriately-scoped spine for a solo-dev hobby project — 8 ADs cover the real divergence points and all 29 FRs are traceable — but it has one load-bearing operational blind spot (data durability / free-tier operational risk for the exact sensitive data the spine otherwise protects) and two implementation-ambiguity defects (dual module ownership of FR-18, silent 1:1 Utente↔Ruolo assumption) that should be closed before build starts.**

---

## 1. Does it fix the real divergence points for the level below?

Mostly yes. The 8 ADs target genuine cross-module/cross-implementer divergence risks, not incidental style choices:

- AD-1 (single monolith) and AD-2 (module boundaries) prevent the two most common solo-AI-assisted-dev failure modes: accidentally standing up a second deployable, and modules reaching into each other's tables.
- AD-3 (Prisma-as-canonical-schema) prevents schema drift from manual Supabase dashboard edits — a real risk for a non-DBA solo builder clicking around in Supabase Studio.
- AD-5 (single Codice-Fiscale matching service) is the single highest-value AD in the document: FR-19/20/21/22/23 all independently need "find/merge person by CF" logic, and without this AD a solo builder (or an AI assistant working feature-by-feature without full context) would very plausibly reimplement matching three times with three different edge-case behaviors (accents, casing, whitespace in CF strings). Correctly identified and correctly bound.
- AD-8 (AnnoAgonistico as FK'd partition) prevents "current season" from being computed ad hoc in every module — exactly the kind of thing that silently diverges when Slot logic and Iscrizione logic are built in different sessions weeks apart.

One gap in this category (see Finding F1 below): the spine is silent on the operational/infra dimension beyond "which environment," even though the checklist calls this dimension out explicitly as one this altitude must own.

## 2. Is every AD's Rule enforceable and does it actually prevent its stated divergence?

| AD | Enforceability | Notes |
|----|----|----|
| AD-1 | Strong | "no separate backend service in another repo" is trivially checkable by looking at the repo list. |
| AD-2 | Convention-level, not tool-enforced | Nothing in the stack (no lint rule, no package boundary, no import-restriction config) technically blocks Module A from importing Module B's Prisma query file. For a solo builder this is an acceptable convention-only rule (per hobby-scale calibration), but it is worth naming explicitly as "enforced by discipline, not tooling" rather than implying enforcement. Minor — not a blocking finding, just a precision gap. |
| AD-3 | Strong | Prisma Migrate is the only sanctioned path; trivially auditable (migration history vs. dashboard change log). |
| AD-4 | Strong | RLS is a DB-level mechanism — genuinely prevents the "forgot one check somewhere in application code" failure mode it names. Good fit for the stated fear (health data of minors leaking via a missed check). |
| AD-5 | Strong | "one shared module, others call it" is directly checkable (grep for CF-matching logic outside `lib/matching-codice-fiscale/`). |
| AD-6 | Strong | Private bucket + server-generated signed URLs is a concrete, verifiable rule. |
| AD-7 | Strong, and verified against real platform constraints | See Finding — this AD accidentally lines up well with a real Vercel Hobby constraint (see §4). |
| AD-8 | Mostly strong, one internal inconsistency | AD-8's **Binds** line lists `Gruppo, Iscrizione, assegnazione Slot, Presenza`, but the **Rule** only specifies that `AnnoAgonistico` is referenced by FK from `Gruppo` and `Iscrizione` — it says nothing about how Slot-assignment or Presenza resolve their season (presumably transitively via Gruppo→Slot→Presenza, which is a reasonable design, but the Rule doesn't say so). Minor — the intent is inferable, but a Rule should not bind more entities than it actually constrains. Worth a one-line addition ("Slot e Presenza ereditano l'Anno Agonistico transitivamente tramite Gruppo, non tramite FK propria") to close the gap explicitly. |

## 3. Deferred — could anything there let independently-built units diverge incompatibly?

Reviewed each Deferred item against "is this actually load-bearing":

- Auth mechanism detail, audit logging, fine-grained permissions, Wizard Nuova Stagione content, multi-sector extension — all correctly deferred; none of these create cross-module incompatibility if left undecided, because each is additive/extractable without touching the AD-4/AD-5/AD-8 mechanisms other modules depend on.
- "Ambiente di deploy" bullet is mis-filed under Deferred — it's actually a **decision** (single prod Supabase project + single Vercel project, preview deploys as informal test env), not an open/deferred item. That's not a defect in itself, but its presence there seems to be standing in for the entire operational-envelope dimension, and it only covers *environment topology*. It does not cover backup/recovery, observability, or free-tier resource-limit handling — see Finding F1, the substantive issue.

No deferred item, as written, would let two independently-built modules diverge incompatibly. This section passes.

## 4. Named tech — verified against current (July 2026) reality

Checked live (not from training-data memory alone) given the explicit instruction that this was "researched in July 2026":

- **Next.js 16.x** — confirmed real and current; Next.js 16 shipped Oct 2025, is at 16.2.x as of July 2026. ✅ current, not stale.
- **React 19.2.x bundled with Next 16** — consistent with public reporting. ✅
- **Prisma 7.x** — confirmed real; Prisma 7.0 shipped Nov 2025, at 7.7.x by April 2026, actively maintained as "the recommended version for production" with Prisma 8 not yet current. ✅ current, not stale.
- **Vercel Hobby (free) Cron** — confirmed: Hobby-tier cron jobs are restricted to **once per day**, UTC only. AD-7's design (a single daily cron invoking a single Route Handler) is not just compatible but is the *only* shape that fits the free tier — good, this is evidence the spine's author actually checked the constraint rather than assuming Pro-tier cron flexibility.
- **Supabase Free plan** — confirmed real limits (500MB DB, 1GB storage, 50k MAU, 2 active projects) but two of its properties are materially relevant and **not mentioned anywhere in the spine**:
  - Free-tier Supabase **projects auto-pause after 7 days of inactivity**.
  - Free-tier Supabase has **no automated backups**.
  These are load-bearing facts the spine should have surfaced, not just "verified current tech" trivia — see Finding F1.
- **Resend Free plan** — confirmed real (3,000 emails/mo, capped 100/day, 1 domain). At ~200 athletes this ceiling is very unlikely to bind in normal operation, but worth a one-line acknowledgment given FR-16 fans out to 4 recipient roles per expiring certificate (parent, athlete, coach, dirigente) — a bad week (e.g., a bulk-import triggering many simultaneous 30-day reminders) could plausibly approach 100/day. Low risk, noting for completeness only.

No stale or fabricated tech found. The stack table is genuinely current — this is a strength, not a finding.

## 5. FR-1..FR-29 coverage

All 29 FRs are traceable, either via the Capability→Architecture Map or explicitly in Deferred:

- FR-1..5 → `app/(orari-palestre)/` (FR-5 itself is v1.1 per PRD but the module home is already assigned) ✅
- FR-6,7 → `app/(gruppi-allenatori)/` ✅
- FR-8,9,10 → `app/(presenze)/` ✅
- FR-11..16 → `app/(certificati-medici)/` + `lib/storage/`, `lib/email/` ✅
- FR-17 → `app/(iscrizioni)/` ✅
- FR-18..21 → `app/(onboarding-import)/` (but see Finding F2 — FR-18 is double-homed) ⚠️
- FR-22,23 → `app/(rollover-stagionale)/` ✅
- FR-24,25 → `app/(dati-atleta)/` ✅
- FR-26,27,29 → `app/(amministrazione)/` ✅
- FR-28 → not in the Capability Map table, but explicitly handled in Deferred with a clear "when addressed, extends Rollover-Stagionale" note ✅

Full coverage confirmed — no FR silently dropped.

## 6. Dimensions this altitude owns — decided / deferred / open question?

Dimensions checked: data model paradigm, module boundaries, security/authz, sensitive-data handling, deployment topology, naming/format conventions, error-shape convention, scale/growth path, operational envelope, testing/QA posture, observability.

Covered explicitly and well: data model (AD-3, AD-8, ER diagram), module boundaries (AD-2), security/authz (AD-4, AD-6), sensitive-data handling (AD-4+AD-6 jointly resolve PRD open question #2 on medical-data hosting — good, this is a real PRD question the spine actually answers), naming/format/error-shape (Consistency Conventions table), scale/growth path (Deferred: multi-sector note is a genuine, well-reasoned trigger condition).

**Left silent** (findings):
- **Operational envelope beyond topology** — backup/recovery and observability/monitoring are not mentioned at all, anywhere in the document. See F1.
- **Testing/QA posture** — no mention of whether there's any automated test expectation, migration-safety check, or pre-deploy gate. For a one-person hobby project this can legitimately be "none, ship and fix," but the document should say that rather than be silent — a reader can't currently distinguish "decided: no tests" from "forgotten." This is minor at hobby scale but still a silence per the rubric's own wording ("a whole dimension left silent is a finding"). Rated low severity given explicit hobby-stakes calibration.

---

## Findings (severity-tagged)

**F1 — [Major] Operational envelope: sensitive-data durability and free-tier operational risk are unaddressed, right where the spine otherwise cares most about that data.**
AD-4 and AD-6 go out of their way to protect `CertificatoMedico` (RLS + private storage + signed URLs) — the spine clearly treats this as the most sensitive data in the system (medical data of minors). But the Deferred "Ambiente di deploy" note only decides environment topology (single prod project, no staging) and says nothing about:
- Supabase Free tier has **no automated backups** — if the single Postgres project is lost/corrupted, `CertificatoMedico`, `Atleta`, `Presenza` history is gone with no recovery path.
- Supabase Free tier **auto-pauses projects after 7 days of inactivity** — plausible during the off-season gap (the Anno Agonistico itself defines a July lull, and the v1 delivery deadline is Aug 1st) or any lull in usage; a paused DB would silently break AD-7's daily cron (certificate-expiry reminders) exactly when no one is watching, directly undermining SM-1 (the PRD's primary success metric: no athlete "in campo" with an invisible expired certificate).
- Storage quota (1GB free tier) for certificate files has no stated monitoring or fallback plan across multiple seasons of uploads.
Recommendation: add a short explicit stance — even "accepted risk, will ping/self-visit weekly to keep the project warm, manual `pg_dump` backup before each rollover" is a legitimate hobby-scale answer — but it needs to be a stated decision, not silence, given it sits directly downstream of AD-4/AD-6's stated threat model.

**F2 — [Moderate] FR-18 (registrazione autonoma per ruolo) is dual-homed, contradicting AD-2's module-ownership rule.**
The Structural Seed lists FR-18 under `app/(auth)/` ("login, registrazione per ruolo (FR-18)"), while the Capability→Architecture Map assigns FR-18 to `app/(onboarding-import)/` (governed by AD-2, AD-5). AD-2's entire purpose is unambiguous module ownership ("ogni modulo possiede le proprie query Prisma e Server Action"); with FR-18 claimed by two folders and no stated split of responsibility (e.g., "(auth) does credential creation, (onboarding-import) does role-data attachment"), two independently-built pieces of this feature could diverge on where registration logic and validation actually live. Recommendation: pick one home for FR-18 or explicitly state the split in one line.

**F3 — [Minor] AD-8's Rule doesn't cover all entities it Binds.**
AD-8 binds `Gruppo, Iscrizione, assegnazione Slot, Presenza` to the AnnoAgonistico partition, but the Rule text only specifies FK placement on `Gruppo` and `Iscrizione`. How Slot-assignment and Presenza resolve their season (presumably transitively via Gruppo) is left implicit. Low risk since the transitive path is the obviously-correct design, but worth one added sentence to remove any ambiguity for the implementer.

**F4 — [Minor] Silent 1:1 Utente↔Ruolo assumption may not hold in practice.**
The ER diagram models `UTENTE ||--|| RUOLO` (one role per user), which AD-4's RLS policies key off of. In a small polisportiva it's plausible a real person holds two hats (e.g., a Dirigente who personally coaches one Gruppo, common in small clubs) — the PRD doesn't rule this out and doesn't confirm it's excluded either. If it happens in practice, the RLS model (and the data model) would need rework mid-build. This isn't necessarily wrong for v1, but it's a silent structural decision baked into the ER diagram without being called out as a decision or a risk, unlike the other role/permission tradeoffs (FR-27) which *are* explicitly flagged. Recommendation: one line either confirming "un utente ha un solo ruolo per v1, i casi multi-ruolo si gestiscono con più account" or flagging it as an open assumption.

**F5 — [Minor / informational] Testing & observability posture is silent.**
No mention anywhere of automated tests, migration safety checks, error tracking, or logging. Given explicit hobby-scale calibration this may be an intentional "none for v1," but the document should say so rather than leave it unaddressed, per the same silence-is-a-finding standard applied to F1.

**F6 — [Informational, not a defect] Stack currency verified.**
Next.js 16.x, Prisma 7.x, Vercel Hobby cron (1x/day, matches AD-7 exactly), Supabase Free, and Resend Free were all checked against live July-2026 sources and are real, current, and correctly characterized. No stale or fabricated technology found — this is a genuine strength of the document, worth calling out positively rather than only flagging gaps.

---

## Strengths worth preserving

- AD-5 (single CF-matching service) is the single best call in the document — it is the one place three features (Import, Onboarding, Rollover) would otherwise independently reinvent fuzzy-matching/merge logic, and the spine correctly isolates it.
- AD-4 + AD-6 jointly and concretely answer PRD open question #2 (medical-data hosting/handling) — this is exactly the kind of PRD-flagged ambiguity an architecture spine should resolve, and it does so with a real, DB-enforced mechanism rather than an application-level promise.
- AD-7's single-daily-cron design happens to be the *only* shape compatible with the Vercel Hobby free tier's 1x/day cron restriction — whether by design or luck, it's correct.
- Full FR-1..FR-29 traceability with no silent drops.

## Overall Calibration Note

Per the brief's own framing (solo developer, no budget, hobby stakes), the level of rigor here is appropriate — this is not being judged against enterprise standards, and most "convention-only, not tool-enforced" rules (AD-2 in particular) are fine at this scale. The findings above are not about under-engineering relative to enterprise norms; F1 in particular is flagged because it's a gap *relative to the spine's own stated threat model* (protecting sensitive medical data of minors), not because a hobby project needs enterprise-grade ops.
