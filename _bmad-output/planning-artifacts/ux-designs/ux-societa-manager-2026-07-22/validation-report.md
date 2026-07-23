# Validation Report — Mogliano Volley — Società Manager

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md`
- **Run at:** 2026-07-22

## Overall verdict

The spine pair is disciplined on inheritance — UJ text is verbatim from the PRD, glossary terms and FR citations resolve cleanly, and the Pattern di Stato table's claims about `StatoCertificato`/`dataFineValidita` were checked against the live `prisma/schema.prisma` and are accurate. Canonical section shape and order are correct in both files. However, one **critical**, self-contradicting accessibility defect sits in the nav-bar's active-state color combination, and a cluster of **high/medium** coverage gaps (no focus state anywhere, no generic technical-error state for the write-heavy flows, an orphaned logo asset, thin behavioral rows for two DESIGN.md components) mean a downstream builder will hit real, unresolved questions on the very first pages built (nav bar, first save action). Fixable without restructuring either document — this is a punch list, not a redo.

The dedicated accessibility pass adds two more **high**-severity gaps the rubric walk did not surface — no numeric touch-target minimum for the mobile-first, tired-parent-at-night audience, and no accessible-error-handling guidance for the form-heavy, sensitive-data flows (medical certificate uploads, bulk imports) — plus three medium findings (including a same-state/different-severity consistency risk between individual and aggregate certificate views) and two low findings (a contrast-number correction, a hardcoded-uppercase risk). It does not change the overall shape of the verdict but sharpens it: the accessibility floor the rubric flagged as "qualitative only" is not just imprecise, it is the same gap an independent accessibility-focused read considers severe enough to block confidently shipping the mobile attendance flow.

## Category verdicts
- Flow coverage — adequate
- Token completeness — adequate (one critical defect)
- Component coverage — adequate
- State coverage — thin
- Visual reference coverage — thin (one real orphan)
- Bloat & overspecification — strong
- Inheritance discipline — strong
- Shape fit — strong (one judgment call)

## Findings by severity

### Critical (1)

**[Token completeness]** — Nav-bar active-item color fails contrast, contradicting the document's own stated rationale (DESIGN.md → Componenti → Barra di navigazione / Colori)
`nav-bar`'s active item uses `{colors.primary}` (`#00A3E0`) as background with white text ("voce attiva con sfondo `{colors.primary}` e testo bianco"). Computed contrast ratio ≈ 2.87:1 — fails both the 4.5:1 normal-text threshold and the 3:1 large-text/UI threshold. This directly contradicts Colori's own rationale, which created `{colors.button-bg}` specifically because `{colors.primary}` alone "non garantirebbe altrettanto comodamente... testo bianco piccolo" — the same problem was solved for buttons but reintroduced here with the identical failing combination. Traced to `.working/color-themes-1.html` (`.v3 .mock-navitem.active { background: #00A3E0; color: #fff; }`), where — unlike the adjacent button-bg line, annotated "contrasto testo bianco ~5.6:1" — no contrast check was ever run on this pairing before it was carried into DESIGN.md unchanged.
Fix: Give the active nav item `{colors.button-bg}` (or an equally dark accent) as background, or use a non-fill treatment (underline/left-border) instead of white-on-primary.

### High (5)

**[Component coverage]** — Nav-item link text has no assigned typography (DESIGN.md → Componenti → Barra di navigazione)
DESIGN.md specifies `{typography.nav-title}` only for the brand/app-name text, not for the clickable items themselves ("Il mio orario", "Presenze", etc.), and no `nav-item` token exists in the frontmatter `components.nav-bar` object either.
Fix: Add an explicit typography assignment for nav items.

**[State coverage]** — No focus-visible state is specified anywhere (EXPERIENCE.md → Soglia di Accessibilità)
No color/outline token, no behavioral rule, despite Soglia di Accessibilità committing to WCAG AA sitewide — which requires a visible keyboard-focus indicator (SC 2.4.7) regardless of this being a "touch/click-first, not keyboard-first" product.
Fix: Add a focus token (ring/outline color) and a one-line rule.

**[Visual reference coverage]** — Logo asset is never referenced by path or placement in either spine file (`imports/logo-mogliano-volley.png`; DESIGN.md → Componenti → Barra di navigazione)
`imports/logo-mogliano-volley.png` is never referenced by path or named as an asset in either DESIGN.md or EXPERIENCE.md, even though `reconcile-logo-mogliano-volley.md` explicitly confirms it as "confermata come asset da mostrare nell'app (probabile posizione: nav-bar)" and its colors were sampled directly into the palette. DESIGN.md's nav-bar component spec describes only text (`{typography.nav-title}`) with no mention of the crest image — a builder has no instruction to place the actual logo anywhere.
Fix: Add a line to the nav-bar entry placing the logo asset (or explicitly state it's deferred until Story 7.2's logo-config feature is used).

**[State coverage / Accessibility reviewer — combined finding]** — Touch-target minimum is qualitative only, no concrete number (EXPERIENCE.md → Primitive di Interazione "Target di tocco generosi"; → Soglia di Accessibilità "Target di tocco dimensionati per l'uso mobile-first")
This gap was flagged independently by both reviewers, at different severities: the rubric walker rated it **medium** ("The Accessibility Floor's touch-target rule is qualitative only... unlike comparable spines (44pt/48dp)"), and the accessibility reviewer rated it **high** (no concrete minimum size — e.g. 44×44px, or 24×24px per WCAG 2.2 SC 2.5.8 — for checkbox di presenza, righe elenco, pulsanti primari; material because the two canonical Key Flows, UJ-1 and UJ-2, both happen on a phone in the evening for an explicitly non-power-user audience, and an undersized touch target in a 15–25-athlete list produces real, repeated mis-taps). Both severities were assigned to the same underlying gap; the higher one (**high**) governs this combined entry.
Fix: Commit to an explicit numeric minimum in EXPERIENCE.md (Primitive di Interazione or Soglia di Accessibilità), e.g.: "area di tocco minima 44×44px per checkbox/riga/pulsante primario su viewport mobile, coerente con WCAG 2.5.8 e le linee guida delle piattaforme mobile."

**[Accessibility reviewer]** — No accessible way to surface form validation errors (EXPERIENCE.md → Primitive di Interazione; → Pattern di Stato, absence)
The document treats non-blocking status alerts (badge/tile) in depth but is silent on how form validation errors are signaled: no mention of error-text/field association (e.g. `aria-describedby`), no mention that errors must not be conveyed by border color alone, no mention of focus management or announcement (`aria-live`) on a failed save. The product includes uploads of minors' medical certificates and several management forms (Excel import, SMTP config, group assignment) — an error communicated only visually/by color would be a real barrier for a screen-reader user, on a flow that handles sensitive health data.
Fix: Add a new sub-section to EXPERIENCE.md (under Primitive di Interazione or Soglia di Accessibilità) with base rules: every validation error is text associated with the field (not just color), focus moves to the first errored field on failed submit (or a summary is announced via `aria-live`), consistent with the "no noise" principle but applied to errors too, not only routine notifications.

### Medium (10)

**[Flow coverage]** — UJ-2 has no failure path (EXPERIENCE.md, Key Flows, ~lines 162–171)
Unlike UJ-1 (explicit "Nota di fallimento") and UJ-4 (explicit "nessuno stato di fallimento narrato... per una ragione dichiarata"), UJ-2 (Marco) has no failure branch at all.
Fix: Add a one-line failure branch (e.g., conflicting/duplicate save for the same past slot) or an explicit justification matching UJ-4's pattern.

**[Flow coverage]** — UJ-3 (Dirigente import) has no failure path (EXPERIENCE.md, Key Flows, ~lines 173–182)
No failure path is narrated despite bulk import being the most error-prone operation in the system (malformed file, Codice Fiscale collisions).
Fix: Add a failure branch or explicit justification.

**[Flow coverage]** — Scoping decision for Segreteria/Admin/Atleta flows is undocumented in the spine pair (`.memlog.md`, not in EXPERIENCE.md)
The decision that Segreteria/Admin/Atleta get no dedicated Key Flow narrative exists only in `.memlog.md` ("Segreteria/Admin/Atleta trattati come flussi diretti senza journey narrata dedicata"), not in EXPERIENCE.md itself. A consumer reading only the spine pair can't tell this is deliberate scope, not an oversight.
Fix: One sentence at the top of Key Flows stating the scoping decision.

**[Component coverage]** — nav-bar has no Pattern dei Componenti row (EXPERIENCE.md → Pattern dei Componenti)
`nav-bar` (a DESIGN.md component) has no row in EXPERIENCE.md's Pattern dei Componenti table — its behavior (role-based item visibility, single-level nav, no drawer) is described instead under Architettura dell'Informazione. A consumer scanning Component Patterns specifically will miss it.
Fix: Add a nav-bar row, or a cross-reference from that table.

**[Component coverage]** — button-primary has no dedicated Component Patterns row (EXPERIENCE.md → Pattern dei Componenti)
Its one behavioral rule ("azione esplicita a fine lista") is only implied inside the `attendance-row` row and in Primitive di Interazione.
Fix: Add a short button-primary row.

**[State coverage]** — No generic technical-error state for write-heavy flows (EXPERIENCE.md → Pattern di Stato, absence; registrazione presenze, upload certificato, import atlete)
No generic technical-error state (network/server failure, as opposed to a data-quality issue) is defined for any of the write-heavy flows. The only narrated failure (UJ-1) is a Segreteria data-quality catch, not a save/upload failure.
Fix: Add one Pattern di Stato row for save/upload failure + retry.

**[Shape fit]** — No "Inspiration & Anti-patterns" section; imocovolley.it rejection restated three times instead (DESIGN.md → Marchio e Stile; → Cose da fare e da evitare; EXPERIENCE.md → Voce e Tono)
Judgment: the omission itself is defensible — there's exactly one rejected reference and zero "lifted-from" positive references, versus 3+ substantive bullets each in the reference examples that earned the section. But the same rejection is independently restated three separate times with no single canonical home, rather than stated once and cross-referenced.
Fix: Either add a minimal 2–3 line Inspiration & Anti-patterns section consolidating the imocovolley.it call, or keep one canonical mention (recommend DESIGN.md → Marchio e Stile, since it's the register decision) and have the other two spots cross-reference it instead of re-narrating it.

**[Accessibility reviewer]** — "Never color/icon alone" rule is not codified at the stat-tile component level (DESIGN.md → Componenti → stat-tile; EXPERIENCE.md → Soglia di Accessibilità)
The hard rule "every alert state... must remain understandable without color alone" is textually scoped only to the "badge certificato". It is not repeated in the DESIGN.md `stat-tile` component definition, nor does it appear as an entry in the "Cose da fare e da evitare" table. A dev could implement the tile with color + number only, with no status label, while remaining "faithful" to the spec as written.
Fix: Add an entry to DESIGN.md's "Cose da fare e da evitare" table requiring the textual status label (in regola/in scadenza/scaduto) always present alongside color in the stat-tile; extend EXPERIENCE.md's rule from "badge certificato" to "every component using semantic color (badge, stat-tile)".

**[Accessibility reviewer]** — No minimum readability floor or 200% zoom/reflow mention for the smallest text sizes (DESIGN.md → Tipografia: stat-label 10.5px/600, badge-label 10.5px/700, section-label 11px/900; EXPERIENCE.md → Soglia di Accessibilità)
The declared audience explicitly includes non-tech-savvy (plausibly also older) parents, but there is no discussion of a minimum readability floor for the system's smallest text, nor any reference to 200% browser-zoom/reflow behavior (WCAG 1.4.4, 1.4.10) in either document. The heavy type weight (600/700/900) partially mitigates readability at 10.5–11px, but is not equivalent to a tested reflow requirement.
Fix: Add a note in EXPERIENCE.md → Soglia di Accessibilità committing to verify that the layout (single column on mobile, already planned) holds up without horizontal scroll or text clipping at 200% zoom, and evaluate raising the stat-label/badge-label floor to 11–12px.

**[Accessibility reviewer]** — Same real-world state ("certificato scaduto") changes color/severity between individual and aggregate views with no on-screen explanation (DESIGN.md → badge/stat-tile "Regola specifica e non negoziabile"; EXPERIENCE.md → Pattern di Stato, certificate status table)
The same "scaduto" state is warning at the individual-athlete level and danger at the aggregate count level (Vista Dirigente) — a well-motivated and consistent choice (FR-15, different audience). The risk is for a user who sees both views, as explicitly anticipated in UJ-4: Roberto is "dirigente, spesso anche allenatore" — the same person can see the same athlete's state in a different color across two screens of the same product, same day. No non-negotiable rule protects the shared text label from future drift, and no on-screen microcopy explains the intentional severity difference at first encounter.
Fix: Add a non-negotiable rule analogous to the badge one requiring parity of the status word ("scaduto") between individual and aggregate views even when color changes; consider brief help text in Vista Dirigente (e.g. "the color here reflects urgency for whoever must act, not medical severity") to reduce first-encounter confusion.

### Low (10)

**[Flow coverage]** — UJ-4 is not sourced from the PRD's UJ list (EXPERIENCE.md, Key Flows)
UJ-4 is coined during UX discovery, not present in the PRD's UJ-1..UJ-3 list — fine since it's transparently marked as new and tied to Story 5.1, but worth noting for anyone doing strict source-verbatim checks.
Fix: None required; disclosure is already adequate.

**[Token completeness]** — danger/danger-bg pair has no stated contrast number (DESIGN.md → Colori)
`{colors.danger}`/`{colors.danger-bg}` is the only semantic pair in Colori without its own stated contrast number (success and warning both get one). Covered only by the blanket closing statement.
Fix: Add the number for consistency.

**[Token completeness]** — rounded.full referenced as a token-style path but not defined in frontmatter (DESIGN.md → Forme)
`rounded.full` is referenced in Forme ("Nessuna forma a pillola (`rounded.full`)") as a `{path.to.token}`-style reference to a token that doesn't exist in the frontmatter `rounded` object. Intent (documenting deliberate absence) is clear, but the backticked-token syntax implies it should resolve.
Fix: Drop the token-reference formatting for this mention.

**[Component coverage]** — Two EXPERIENCE.md component patterns have no DESIGN.md visual-spec counterpart (EXPERIENCE.md → Pattern dei Componenti: "Wizard bozza-revisione-conferma", "Grafico progresso multi-serie")
Both are explicitly `[NOTA UX APERTA]` and tied to not-yet-built Stories 6.3/6.2, so the gap is disclosed, not silent — flagged so it isn't forgotten when those stories start.
Fix: None required now; revisit when Stories 6.2/6.3 start.

**[Component coverage]** — Component naming form differs between files (DESIGN.md kebab-case keys vs. EXPERIENCE.md descriptive labels)
DESIGN.md's kebab-case keys (`badge`, `stat-tile`, `attendance-row`) vs. EXPERIENCE.md's descriptive labels ("Alert non bloccante (badge stato certificato)", "Cluster stat-tile aggregato", "Riga presenza con checkbox"). Human-traceable via the parenthetical/naming overlap, but not verbatim-identical, so a literal string match across files would miss the pairing.
Fix: None required; cosmetic only.

**[State coverage]** — No cold-load/loading-skeleton state defined for any surface (EXPERIENCE.md → Pattern di Stato, absence; e.g. /mio-orario, /presenze)
Lower stakes given the small dataset (~200 atlete, always-short lists), but currently undecided for every surface at once.
Fix: Decide and document a minimal loading treatment, even if "instant, no skeleton needed."

**[State coverage]** — /non-autorizzato route has no state/content spec (EXPERIENCE.md → Architettura dell'Informazione, IA route table)
Named as a route in the IA table but has no corresponding state/content spec (what it says, what if anything the user can do next).
Fix: Add a short content spec for the route.

**[Visual reference coverage]** — color-themes-1.html referenced by description only, no path (DESIGN.md → Layout e Spaziatura; EXPERIENCE.md → Responsive & Piattaforma)
`.working/color-themes-1.html` is referenced twice by description only ("il mockup di esplorazione colore") with no path/link, unlike the linking convention shown in the reference examples ("→ Composition reference: `mockups/today.html`").
Fix: Add the relative path on first mention in each file.

**[Accessibility reviewer]** — Declared success/success-bg contrast ratio is imprecise, understated (DESIGN.md → Colori, `{colors.success}` on `{colors.success-bg}`, #256029 on #DFF2E1, "Contrasto verificato ~5.3:1")
Recomputing WCAG relative luminance for #256029/#DFF2E1 gives ≈6.4:1, not ~5.3:1. Not a safety issue (the real value is higher than the AA threshold, not lower), but it is an inaccuracy in a number stated as "verified" — it undermines trust in the other listed figures (e.g. warning ~5.2:1, which recomputes correctly).
Fix: Recompute the success/success-bg pair and correct the figure (or replace point values with thresholds like "≥5:1" to avoid false precision), before a future contributor blindly trusts an unverified number for a new color pair.

**[Accessibility reviewer]** — Uppercase button CSS mechanism is correct, but no explicit ban on hardcoded uppercase text (DESIGN.md → frontmatter `components.button-primary` text-transform: uppercase; → Componenti → pulsante primario)
The token correctly specifies `text-transform: uppercase` as a CSS property applied to a normal-case source string — the right approach for accessibility (screen readers/braille displays read the underlying string, not the visual rendering). However, neither document contains an explicit instruction forbidding a dev/copywriter from writing the button text already in uppercase (e.g. hardcoding "SALVA" instead of "Salva" + CSS).
Fix: Add a sentence to DESIGN.md's button-primary entry: source text stays in natural case (e.g. "Salva"); uppercase rendering is delegated exclusively to CSS `text-transform`, never written in uppercase in the string — so as not to penalize screen readers and braille displays set to character-by-character verbosity.

## Reviewer files
- `review-rubric.md`
- `review-accessibility.md`
