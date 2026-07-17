# Adversarial Review — ARCHITECTURE-SPINE.md (Gestione Settore Volley - Polisportiva)

**Reviewed:** `_bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md`
**Method:** For each pair of units (modules, or two developers/agents assigned to related capabilities), attempt to construct a scenario where both obey every AD (AD-1..AD-8) and the Consistency Conventions to the letter, yet ship code that is incompatible with the other unit's code. Every scenario found is evidence of a gap the spine should close with a new/tightened AD or convention.

**Verdict:** The spine's ADs are individually sound but under-specify *ownership boundaries for shared entities*, *contracts of shared helpers/services*, and *cross-cutting read/aggregation paths* — eight concrete divergence scenarios were constructed below, each fully compliant with the letter of AD-1..AD-8.

---

## Finding 1 — Atleta has no assigned single owner module, so two modules build competing direct-write paths

**Units:** Certificati-Medici (FR-11..FR-16) vs Iscrizioni (FR-17), both mutating state that lives on/near `Atleta`.

**The gap:** AD-2's rule is "ogni modulo possiede le proprie query Prisma... l'accesso da un altro modulo passa solo dalle funzioni di servizio esportate." This assumes every table has one owning module, but the Capability Map only assigns *Atleta CRUD* to Dati-Atleta (FR-24/25) — it never states that **all** Prisma queries/writes touching the `Atleta` table must funnel through Dati-Atleta's exported service functions. Certificati-Medici and Iscrizioni both need to update Atleta-adjacent state (e.g. a "certificato valido" flag, a "iscrizione confermata" flag) as part of their own FRs.

**How each complies yet diverges:**
- Certificati-Medici developer reasons: "I'm not touching another module's *table concept*, I'm recording the consequence of confirming a certificate onto the athlete it belongs to — that's an operation local to my FR, not a cross-module read of someone else's data" → writes `prisma.atleta.update({ certificatoValido: true })` directly inside the Certificati-Medici module's own Server Action.
- Iscrizioni developer makes the mirror-image argument for their own FR and writes `prisma.atleta.update({ iscrizioneConfermata: true })` directly inside the Iscrizioni module.
- Both are "own module's Server Action calling its own Prisma query" — the literal text of AD-2 is satisfied by both. Neither ever imports a function from Dati-Atleta or from each other.
- Result: two independent direct-write paths to the same table with no shared validation, no shared optimistic-locking strategy, and — worse — if Dati-Atleta later adds a computed/derived "stato atleta" field that depends on both flags, two other modules are already writing to the row out of its sight, and a race between concurrent certificate-confirmation and iscrizione-confirmation writes is possible with no coordination.

**Fix direction:** AD-2 needs a per-entity ownership table (which module's service layer is the *sole* writer of each Prisma model), not just a per-FR capability map. Any other module needing to mutate that entity must go through the owner's exported function, even for "just a flag."

---

## Finding 2 — AD-8's shared season helper has a narrower contract than what AD-8 itself binds, so Presenza gets a second date-math implementation

**Units:** Orari-Palestre (Slot assignment) vs Presenze, both explicitly bound by AD-8.

**The gap:** AD-8 says: "una sola entità AnnoAgonistico... è referenziata da FK da Gruppo e Iscrizione; la 'stagione corrente' è risolta da un solo helper condiviso." Two problems compound:
1. The Invariants section binds AD-8 to `Gruppo, Iscrizione, assegnazione Slot, Presenza` — four things — but the FK rule only mentions `Gruppo` and `Iscrizione`, and the Structural Seed ERD shows no FK from `SLOT` or `PRESENZA` to `ANNO_AGONISTICO` (Slot connects to Campo/Gruppo; Presenza connects to Atleta/Slot). So Slot and Presenza can only resolve "their" season *transitively* through Gruppo.
2. The shared helper's contract, as written, only resolves "stagione corrente" (the current season) — there's no stated function for "which season does this past record belong to," which Presenza needs (a Presenza row from May must stay attached to last season's Gruppo even after the season helper reports a new "current" season starting Aug 1).

**How each complies yet diverges:**
- Orari-Palestre developer implements Slot→season resolution by joining Slot→Gruppo→AnnoAgonistico and calling the shared `getStagioneCorrente()` helper only for filtering "current season's slots" in scheduling UI — fully compliant.
- Presenze developer needs to classify a historical Presenza's season for reporting (FR-8..FR-10 area) and finds the shared helper only exposes "current season," not "season for this record's date." Rather than extend the shared helper (which lives in someone else's `lib/anno-agonistico/` and isn't Presenze's to modify unilaterally per AD-2), they write a local date-range comparison against the hardcoded 1 agosto–30 giugno boundary directly inside the Presenze module — this does not "duplicate stagione corrente logic for the current season" (the literal prohibition in AD-8's Prevents clause), so it is arguably compliant, yet it is a second, independently-maintained season-boundary algorithm that can drift from the shared helper's if the boundary rule is ever adjusted (e.g., a mid-season federal calendar exception).

**Fix direction:** Extend AD-8's rule to require the shared helper to expose season-resolution-by-date/by-entity (not just "current"), and add the missing FK from Slot/Presenza (or their assignment records) to AnnoAgonistico so "season of a Presenza" is a stored fact, not a recomputation.

---

## Finding 3 — Gruppo↔Slot assignment is a relationship owned by neither module, so both build a mutation path for it

**Units:** Orari-Palestre (owns Campo/Slot, FR-1..FR-5) vs Gruppi-Allenatori (owns Gruppo/Allenatore, FR-6/7).

**The gap:** The ERD states `GRUPPO ||--o{ SLOT : "assegnato a"`. This is a cross-module relationship by construction — the FK presumably lives on `Slot` (Orari-Palestre's table) but the *business action* of "assign this Gruppo to this Slot" is equally describable as a Gruppi-Allenatori concern (managing a group's schedule) or an Orari-Palestre concern (managing a court's timetable). AD-2 assigns table ownership per module but never assigns ownership of the *join/assignment action* itself.

**How each complies yet diverges:**
- Orari-Palestre developer builds `assegnaGruppoASlot(slotId, gruppoId)` inside `app/(orari-palestre)/`, writing to their own `Slot.gruppoId` column — compliant, it's their own table.
- Gruppi-Allenatori developer, working FR-6/7 ("gestione gruppi e allenatori" naturally extended to "which slots this group meets in"), builds `assegnaSlotAGruppo(gruppoId, slotId)` inside `app/(gruppi-allenatori)/`, also writing directly to `Slot.gruppoId` — reasoning that assigning a schedule is part of managing "their" Gruppo entity, and AD-2 only forbids touching *another* module's data, which is ambiguous exactly at a shared FK column.
- Now two Server Actions in two different modules can each set the same FK, independently. If one enforces a double-booking/capacity check and the other doesn't (each team wrote its own validation, unaware of the other's action), the invariant "a Slot has at most one Gruppo, no time overlap" can be silently violated depending on which UI path a user takes.

**Fix direction:** AD-2 (or a new AD) needs an explicit single-writer rule for every FK/join that crosses module boundaries, naming exactly one module as the mutation owner of each such relationship, with the other module only reading it via an exported query.

---

## Finding 4 — AD-5's "one shared matching engine" mandate doesn't specify merge semantics, so Import and Rollover need contradictory behavior from the same function

**Units:** Onboarding-Import (FR-19) vs Rollover-Stagionale (FR-22/23), both explicitly required by AD-5 to call the single shared `lib/matching-codice-fiscale/` engine and never reimplement locally.

**The gap:** AD-5 prevents "tre implementazioni divergenti della stessa logica di riconoscimento/merge" but only mandates *code reuse*, not a *parameterized contract*. "Merge" has at least two legitimate, mutually exclusive semantics:
- Import (first-time federal CSV import): when an existing Atleta is found by Codice Fiscale with different field values than the imported row, the import is meant to be the authoritative refresh — overwrite.
- Rollover (season-to-season carry-forward): when an existing Atleta is found by CF, the existing record (possibly hand-corrected during the season) must NOT be clobbered by stale carried-forward data — preserve-existing, only attach a new Iscrizione/Gruppo for the new season.

**How each complies yet diverges:**
- Both modules call the exact same `trovaOMerge(cf, datiInCorso)` function from `lib/matching-codice-fiscale/` — zero violation of AD-5's letter (one implementation, both callers reuse it, neither reimplements matching logic).
- Whichever caller's expectation the shared function's author encoded first (say, "overwrite" for Import) is silently wrong for the other caller (Rollover), corrupting hand-corrected athlete data every season rollover — a functional break produced by two units that never touched each other's code and both fully honored AD-2 and AD-5.

**Fix direction:** AD-5 should specify (or defer to a companion doc) the merge-conflict contract as an explicit parameter (e.g., `strategy: 'overwrite' | 'preserve-existing'`) chosen per caller, not an implicit default baked into the shared engine.

---

## Finding 5 — AD-4's "app code is never the only gate" leaves the app-level authorization failure contract unspecified, breaking the uniform error-shape convention

**Units:** Certificati-Medici vs Iscrizioni, both bound by AD-4 and both subject to the Consistency Convention `errori dei Server Action come { error: { code, message } }`.

**The gap:** AD-4 mandates RLS as the non-bypassable filter but says nothing about what the *application layer* should do when RLS silently filters out a row a user tried to act on (RLS makes an unauthorized row invisible/updates 0 rows — it does not throw an app-visible "forbidden" error by itself).

**How each complies yet diverges:**
- Certificati-Medici's `confermaCertificato(id)` Server Action calls Prisma, RLS silently matches 0 rows (because the caller isn't the owning Genitore), and the action's existing "record not found" branch fires — returning `{ error: { code: 'NOT_FOUND', message: ... } }`. AD-4 is satisfied: RLS filtered the row, app code was never the only gate.
- Iscrizioni's equivalent confirmation action adds an explicit app-level pre-check ("does this Iscrizione belong to the caller's Genitore?") before touching Prisma, and returns `{ error: { code: 'FORBIDDEN', message: ... } }` when it fails — also fully AD-4 compliant (RLS is still present underneath as defense-in-depth).
- A client (or Amministrazione dashboard) trying to build one generic "handle authorization failure" branch across both modules' actions cannot: one module reports the exact same real-world condition (unauthorized access attempt) as `NOT_FOUND`, the other as `FORBIDDEN`. The shared error-shape convention (`{ code, message }`) is honored by both in isolation, but the *code taxonomy* was never standardized, so the two modules silently disagree on what code an authorization failure produces.

**Fix direction:** Add a convention entry defining a fixed, shared error-code enum (e.g., `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`) and require that an RLS-caused zero-row result on an action targeting a specific known ID be reported as `FORBIDDEN`, not `NOT_FOUND`, uniformly.

---

## Finding 6 — AD-6's "verifica dei permessi" before generating a signed URL has no assigned owner between the shared storage wrapper and the calling module

**Units:** Certificati-Medici (the module that owns certificate files) vs Amministrazione/Vista Dirigente (FR-27/29, also AD-4-bound, needing to view certificates in aggregate).

**The gap:** AD-6's rule: "l'accesso avviene solo tramite URL firmati... generati lato server dopo verifica dei permessi" — it does not say whether the permission check lives inside `lib/storage/` (the shared wrapper) or inside each calling module's Server Action.

**How each complies yet diverges:**
- Certificati-Medici developer, owning the feature end-to-end, puts the permission check in their own Server Action before calling the shared `lib/storage.generaUrlFirmato(path)` — treating the shared wrapper as a "dumb" signer. This satisfies AD-6 literally: a permission check does happen, server-side, before the URL is generated.
- Amministrazione developer, arriving later and reusing the same shared `lib/storage.generaUrlFirmato(path)` function for the Vista Dirigente aggregate view, reasonably assumes — since AD-6 phrases the requirement as a property of *the signed-URL-generation step*, not of the caller — that the shared wrapper itself enforces the check (otherwise every future caller would have to reimplement it, contradicting the whole point of a shared `lib/storage/` module). They call it directly with no additional check of their own.
- Since the wrapper was actually built "dumb" by the first mover, Amministrazione's code path now generates signed URLs to sanitary documents with **no permission check at all** — a real security hole, produced even though each developer, in isolation, satisfies a literal reading of AD-6 ("a check happens somewhere in the flow I built").

**Fix direction:** AD-6 must explicitly assign the permission check to one layer — recommended: inside `lib/storage/` itself, taking the caller's resolved role/entity claims as a required parameter, so it cannot be bypassed by a new caller who assumes it's someone else's job.

---

## Finding 7 — No reporting/aggregation path is defined for Amministrazione, so two teams solve the same "read across modules" problem in opposite, incompatible ways

**Units:** Amministrazione/Vista Dirigente (FR-26/27/29) vs any feature module needing a cross-module summary (e.g., Iscrizioni wanting a "certificati mancanti per iscrizione" indicator).

**The gap:** AD-2 forces cross-module access through "funzioni di servizio esportate," which are designed around each module's own feature needs (e.g., Certificati-Medici exports functions shaped for confirming/listing certificates in its own UI). Vista Dirigente's job is precisely to aggregate across nearly every module (Presenze, Certificati-Medici, Gruppi, Iscrizioni) in ways no single owning module's existing service function was designed for. AD-2 provides no escape valve or defined pattern for read-only cross-module aggregation/reporting.

**How each complies yet diverges:**
- One developer building Vista Dirigente reasons: "AD-2 forbids direct reads of *another module's data*, but a report needs raw joins no module exports (e.g. presence-rate per gruppo per season); since no owning module offers this shape, and it's read-only, I'll query Prisma directly across tables from within Amministrazione" — building a shadow direct-Prisma reporting layer, arguing this is not really "another module's" query since Amministrazione is itself a first-class module per AD-2's Binds list.
- Another developer, building a similar cross-module indicator for Iscrizioni (whether an athlete's certificate is on file), takes the opposite reading of the same AD-2 text — refuses to touch Certificati-Medici's tables directly and instead asks that module to add a new exported function `haCertificatoValido(atletaId)` specifically for this dashboard-style need, growing each owning module's service surface with callers' bespoke aggregate queries.
- Both are literally compliant with AD-2 (one never crosses module Prisma boundaries; the other treats Amministrazione's Binds-list membership as license to query broadly) — but the codebase ends up with two contradictory patterns for the same class of problem, and no reviewer can point to the spine to say which one is "correct."

**Fix direction:** Add an AD (or extend AD-2) that defines a sanctioned read-only cross-module query/reporting path — e.g., a `lib/reporting/` layer allowed to read across module tables for aggregate/dashboard purposes only, never to write, explicitly carved out as the one exception to AD-2's "no direct cross-module queries" rule.

---

## Finding 8 — The "confirm" action pattern is named and shaped differently per module because only the error shape, not the success shape or verb vocabulary, is a governed convention

**Units:** Certificati-Medici (`confermaCertificato`, the convention table's own example) vs Iscrizioni (whose ERD relation is literally labeled `ATLETA ||--o| ISCRIZIONE : "conferma"`, i.e. the same "confirm" concept).

**The gap:** The Consistency Conventions table only mandates: (a) explicit-verb Italian Server Action names, and (b) `{ error: { code, message } }` on failure. Nothing governs the **success** return shape, nor a shared verb vocabulary for equivalent business concepts ("confermare" vs "approvare" vs "registrare" for what is conceptually the same "confirm" action across entities).

**How each complies yet diverges:**
- Certificati-Medici's `confermaCertificato(id)` returns the updated `CertificatoMedico` record on success (so the UI can optimistically re-render from the response) — fully compliant with both conventions.
- Iscrizioni developer, independently naming and shaping the analogous action, calls it `approvaIscrizione(id)` (a different verb for the same "conferma" concept the ERD itself names) and returns only `{ success: true }` with no updated entity, expecting the client to refetch — also fully compliant with both stated conventions (explicit verb present; error shape present on failure).
- A later Amministrazione feature that wants one generic "pending confirmations" widget spanning Certificati-Medici and Iscrizioni (both are AD-4-bound, both plausibly surfaced to a Dirigente) cannot share one client-side handler: one action's verb doesn't match a predictable pattern, and the two success payloads are shaped differently, forcing bespoke per-module glue code exactly where the spine's naming convention was supposed to make things predictable.

**Fix direction:** Extend the Consistency Conventions to (1) fix a canonical verb per business concept (e.g., always `conferma*` for confirmation-type actions, never a synonym), and (2) mandate a uniform success-envelope shape for Server Actions (e.g., `{ data: T }` on success, mirroring `{ error: {...} }` on failure) alongside the existing error convention.

---

## Summary Table

| # | Two units | Shared thing each treats as unowned | Divergence produced |
| --- | --- | --- | --- |
| 1 | Certificati-Medici / Iscrizioni | `Atleta` row writes | Two independent direct-write paths to the same table, race-prone |
| 2 | Orari-Palestre / Presenze | AD-8 season helper contract | Second, hand-rolled date-boundary implementation for historical records |
| 3 | Orari-Palestre / Gruppi-Allenatori | Gruppo↔Slot assignment FK | Two Server Actions can both mutate the same FK, inconsistent validation |
| 4 | Onboarding-Import / Rollover-Stagionale | `matching-codice-fiscale` merge semantics | Same shared function, opposite correctness needs — one caller is silently wrong |
| 5 | Certificati-Medici / Iscrizioni | Authorization-failure error code | `NOT_FOUND` vs `FORBIDDEN` for the identical real condition |
| 6 | Certificati-Medici / Amministrazione | AD-6 permission-check layer | Assumed-checked-elsewhere signed URL generation — potential real bypass |
| 7 | Amministrazione / Iscrizioni | Cross-module read/aggregation path | Shadow direct-Prisma reporting layer vs. bespoke per-module service bloat |
| 8 | Certificati-Medici / Iscrizioni | "Confirm" action verb & success shape | Divergent verbs/payloads block a shared cross-module UI component |

Each of these is constructed so that both units satisfy AD-1 through AD-8 and the Consistency Conventions as literally written — the incompatibility lives entirely in what the spine leaves silent: single ownership of shared entities and relationships, contracts (not just presence) of shared helpers, the taxonomy of cross-cutting concerns (authz error codes, permission-check layer), and a sanctioned path for cross-module read/aggregation.
