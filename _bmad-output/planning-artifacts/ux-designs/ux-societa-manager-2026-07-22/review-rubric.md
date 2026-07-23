# Spine Pair Review — societa-manager

## Overall verdict

The spine pair is disciplined on inheritance — UJ text is verbatim from the PRD, glossary terms and FR citations resolve cleanly, and the `Pattern di Stato` table's claims about `StatoCertificato`/`dataFineValidita` were checked against the live `prisma/schema.prisma` and are accurate. Canonical section shape and order are correct in both files. However, one **critical**, self-contradicting accessibility defect sits in the nav-bar's active-state color combination, and a cluster of **high/medium** coverage gaps (no focus state anywhere, no generic technical-error state for the write-heavy flows, an orphaned logo asset, thin behavioral rows for two DESIGN.md components) mean a downstream builder will hit real, unresolved questions on the very first pages built (nav bar, first save action). Fixable without restructuring either document — this is a punch list, not a redo.

## 1. Flow coverage — adequate

Checked: PRD §2.2 lists UJ-1/UJ-2/UJ-3 verbatim; EXPERIENCE.md's Key Flows carries all three plus a new UJ-4 (Roberto/Vista Dirigente, transparently labeled as tied to not-yet-built Story 5.1). All four flows have a named protagonist and numbered steps with a marked **Climax**.

### Findings
- **medium** UJ-2 (Marco, EXPERIENCE.md lines ~162–171) has no failure path — unlike UJ-1 (explicit "Nota di fallimento") and UJ-4 (explicit "nessuno stato di fallimento narrato... per una ragione dichiarata"). *Fix:* add a one-line failure branch (e.g., conflicting/duplicate save for the same past slot) or an explicit justification matching UJ-4's pattern.
- **medium** UJ-3 (Dirigente import, EXPERIENCE.md lines ~173–182) has no failure path, despite bulk import being the most error-prone operation in the system (malformed file, Codice Fiscale collisions). *Fix:* add a failure branch or explicit justification.
- **medium** The decision that Segreteria/Admin/Atleta get no dedicated Key Flow narrative exists only in `.memlog.md` ("Segreteria/Admin/Atleta trattati come flussi diretti senza journey narrata dedicata"), not in EXPERIENCE.md itself. A consumer reading only the spine pair can't tell this is deliberate scope, not an oversight. *Fix:* one sentence at the top of Key Flows stating the scoping decision.
- **low** UJ-4 is coined during UX discovery, not present in the PRD's UJ-1..UJ-3 list — fine since it's transparently marked as new and tied to Story 5.1, but worth noting for anyone doing strict source-verbatim checks.

## 2. Token completeness — adequate (one critical defect)

Checked: all 16 `colors`, 8 `typography`, 2 `rounded`, 7 `spacing`, and 5 `components` frontmatter tokens have hex/values and every `{path.to.token}` reference in prose resolves to a defined key, with one exception noted below. Contrast ratios are stated numerically for `button-bg` (~4.5:1), `success` (~5.3:1), `warning` (~5.2:1), plus a blanket closing claim that every listed pair meets AA.

### Findings
- **critical** `nav-bar`'s active item uses `{colors.primary}` (`#00A3E0`) as background with white text (DESIGN.md → Componenti → Barra di navigazione: "voce attiva con sfondo `{colors.primary}` e testo bianco"). Computed contrast ratio ≈ **2.87:1** — fails both the 4.5:1 normal-text threshold and the 3:1 large-text/UI threshold. This directly contradicts the document's own rationale in Colori, which created `{colors.button-bg}` specifically *because* `{colors.primary}` "da solo non garantirebbe altrettanto comodamente... testo bianco piccolo" — the same problem was solved for buttons but reintroduced for the nav item using the identical failing combination. Traced to `.working/color-themes-1.html` (`.v3 .mock-navitem.active { background: #00A3E0; color: #fff; }`), where — unlike the adjacent button-bg line, annotated "contrasto testo bianco ~5.6:1" — no contrast check was ever run on this pairing before it was carried into DESIGN.md unchanged. *Fix:* give the active nav item `{colors.button-bg}` (or an equally dark accent) as background, or use a non-fill treatment (underline/left-border) instead of white-on-primary.
- **low** `{colors.danger}`/`{colors.danger-bg}` is the only semantic pair in Colori without its own stated contrast number (success and warning both get one). Covered only by the blanket closing statement. *Fix:* add the number for consistency.
- **low** `rounded.full` is referenced in Forme ("Nessuna forma a pillola (`rounded.full`)") as a `{path.to.token}`-style reference to a token that doesn't exist in the frontmatter `rounded` object. Intent (documenting deliberate absence) is clear, but the backticked-token syntax implies it should resolve. *Fix:* drop the token-reference formatting for this mention.

## 3. Component coverage — adequate

Checked: every component in DESIGN.md's frontmatter (`nav-bar`, `button-primary`, `badge`, `stat-tile`, `attendance-row`) has a matching prose row in DESIGN.md → Componenti. Every row in EXPERIENCE.md → Pattern dei Componenti maps to a DESIGN.md component by name or clear parenthetical.

### Findings
- **high** `nav-bar`'s individual nav-item link text has no assigned typography anywhere — DESIGN.md specifies `{typography.nav-title}` only for the brand/app-name text, not for the clickable items themselves ("Il mio orario", "Presenze", etc.), and no `nav-item` token exists in the frontmatter `components.nav-bar` object either. *Fix:* add an explicit typography assignment for nav items.
- **medium** `nav-bar` (a DESIGN.md component) has no row in EXPERIENCE.md's Pattern dei Componenti table — its behavior (role-based item visibility, single-level nav, no drawer) is described instead under Architettura dell'Informazione. A consumer scanning Component Patterns specifically will miss it. *Fix:* add a nav-bar row, or a cross-reference from that table.
- **medium** `button-primary` likewise has no dedicated Component Patterns row; its one behavioral rule ("azione esplicita a fine lista") is only implied inside the `attendance-row` row and in Primitive di Interazione. *Fix:* add a short button-primary row.
- **low** EXPERIENCE.md's "Wizard bozza-revisione-conferma" and "Grafico progresso multi-serie" component patterns have no DESIGN.md visual-spec counterpart. Both are explicitly `[NOTA UX APERTA]` and tied to not-yet-built Stories 6.3/6.2, so the gap is disclosed, not silent — flagged so it isn't forgotten when those stories start.
- **low** Component naming differs in form between files: DESIGN.md's kebab-case keys (`badge`, `stat-tile`, `attendance-row`) vs. EXPERIENCE.md's descriptive labels ("Alert non bloccante (badge stato certificato)", "Cluster stat-tile aggregato", "Riga presenza con checkbox"). Human-traceable via the parenthetical/naming overlap, but not verbatim-identical, so a literal string match across files would miss the pairing.

## 4. State coverage — thin

Checked every IA surface against empty / cold-load / focus / error / offline / permission-denied. Certificate-status coverage (Pattern di Stato) is thorough and correctly derived from the real `StatoCertificato` enum. Empty-state coverage (Stati vuoti) covers 4 surfaces reasonably. Offline is correctly and deliberately out of scope (NFR3).

### Findings
- **high** No focus-visible state is specified anywhere (no color/outline token, no behavioral rule), despite Soglia di Accessibilità committing to WCAG AA sitewide — which requires a visible keyboard-focus indicator (SC 2.4.7) regardless of this being a "touch/click-first, not keyboard-first" product. *Fix:* add a focus token (ring/outline color) and a one-line rule.
- **medium** No generic technical-error state (network/server failure, as opposed to a data-quality issue) is defined for any of the write-heavy flows — registrazione presenze, upload certificato, import atlete. The only narrated failure (UJ-1) is a Segreteria data-quality catch, not a save/upload failure. *Fix:* add one Pattern di Stato row for save/upload failure + retry.
- **medium** The Accessibility Floor's touch-target rule is qualitative only ("dimensionati per l'uso mobile-first... implicito nel fatto che...") with no concrete minimum, unlike comparable spines (44pt/48dp). *Fix:* commit to a number.
- **low** No cold-load/loading-skeleton state is defined for any surface (e.g. `/mio-orario`, `/presenze` while data fetches). Lower stakes given the small dataset (~200 atlete, always-short lists), but currently undecided for every surface at once.
- **low** `/non-autorizzato` is named as a route in the IA table but has no corresponding state/content spec (what it says, what if anything the user can do next).

## 5. Visual reference coverage — thin (one real orphan)

Files present: `imports/logo-mogliano-volley.png`, `.working/color-themes-1.html` (no `mockups/`/`wireframes/` folders yet — expected, key-screen mocks arrive in a later Finalize step, not a finding).

### Findings
- **high** `imports/logo-mogliano-volley.png` is never referenced by path or named as an asset in either DESIGN.md or EXPERIENCE.md, even though `reconcile-logo-mogliano-volley.md` explicitly confirms it as "confermata come asset da mostrare nell'app (probabile posizione: nav-bar)" and its colors were sampled directly into the palette. DESIGN.md's nav-bar component spec describes only text (`{typography.nav-title}`) with no mention of the crest image — a builder has no instruction to place the actual logo anywhere. *Fix:* add a line to the nav-bar entry placing the logo asset (or explicitly state it's deferred until Story 7.2's logo-config feature is used).
- **low** `.working/color-themes-1.html` is referenced twice by description only ("il mockup di esplorazione colore" — DESIGN.md → Layout e Spaziatura; EXPERIENCE.md → Responsive & Piattaforma) with no path/link, unlike the linking convention shown in the reference examples ("→ Composition reference: `mockups/today.html`"). *Fix:* add the relative path on first mention in each file.
- Not a finding: no explicit "spines win on conflict" statement exists, but none is needed yet since there are no mockups to conflict with — DESIGN.md's own tokens are already the source of truth.

## 6. Bloat & overspecification — strong

No material bloat. DESIGN.md's editorial voice (discovery narrative, discarded variants) is proportionate and matches the editorial-example shape; hex/px restatement in prose mirrors the reference examples' own pattern rather than padding. EXPERIENCE.md prose stays clinical/behavioral throughout, as required. One low-grade redundancy noted below (ties into §8).

## 7. Inheritance discipline — strong

- UJ-1/UJ-2/UJ-3 verified verbatim-identical to PRD §2.2, character for character.
- Glossary terms (Anno Agonistico, Gruppo, Slot, Certificato Medico, Codice Fiscale, Palestra, Campo, Iscrizione) used identically to PRD §3 throughout both spines.
- ~20 of 32 FR citations spot-checked against PRD numbering; all resolve correctly, including the less obvious ones (FR-30 addition, FR-31/32 Epic 7 addendum).
- `StatoCertificato` enum values (`IN_ATTESA`, `CONFERMATO`) and the `dataFineValidita` field name, cited in EXPERIENCE.md's Pattern di Stato, were checked against the live `prisma/schema.prisma` and match exactly — a real code-level cross-reference that resolves cleanly, not just a planning-doc citation.
- EXPERIENCE.md's `sources` frontmatter resolves to all three listed files. DESIGN.md carries no `sources` field, consistent with both reference DESIGN.md examples (not part of that file's contract).
- Component-name form mismatch and the UJ-4 sourcing note are the only frictions found; both logged under §1/§3 above rather than repeated here.

## 8. Shape fit — strong, one judgment call

- DESIGN.md's 8 sections map 1:1 in canonical order: Marchio e Stile → Colori → Tipografia → Layout e Spaziatura → Elevazione e Profondità → Forme → Componenti → Cose da fare e da evitare.
- EXPERIENCE.md's 8 required sections plus the correctly-triggered Responsive & Piattaforma are present in canonical order: Fondamenta, Architettura dell'Informazione, Voce e Tono, Pattern dei Componenti, Pattern di Stato, Primitive di Interazione, Soglia di Accessibilità, Responsive & Piattaforma, Key Flows.

### Findings
- **medium** No "Inspiration & Anti-patterns" section exists, despite imocovolley.it being explicitly consulted and rejected as a UI model. Judgment: the omission itself is defensible — there's exactly one rejected reference and zero "lifted-from" positive references, versus 3+ substantive bullets each in the reference examples that earned the section. But the same rejection is independently restated three separate times with no single canonical home (DESIGN.md → Marchio e Stile, DESIGN.md → Cose da fare e da evitare, EXPERIENCE.md → Voce e Tono) rather than stated once and cross-referenced. *Fix:* either add a minimal 2–3 line Inspiration & Anti-patterns section consolidating the imocovolley.it call, or keep one canonical mention (recommend DESIGN.md → Marchio e Stile, since it's the register decision) and have the other two spots cross-reference it instead of re-narrating it.

## Mechanical notes

- No broken frontmatter or cross-refs found: all `{colors.*}`/`{typography.*}`/`{rounded.*}` references in both files resolve to defined frontmatter keys, except the `rounded.full` mention noted in §2 (documents an intentional absence, not a broken link).
- EXPERIENCE.md's IA route table (`/mio-orario`, `/presenze`, `/palestre`, etc.) correctly nests under the Architecture Spine's route groups (`(orari-palestre)`, `(presenze)`, `(amministrazione)`, `(rollover-stagionale)`, `(dati-atleta)`, `(configurazione)`) with no contradictions found against the Capability → Architecture Map.
- No Mermaid diagrams appear in either file — none to validate.
- Spacing scale keys (`1,2,3,4,5,6,8`, skipping `7`) is a minor naming quirk, not an error — all listed keys have values and are referenced generically via `{spacing}` in Layout e Spaziatura.
