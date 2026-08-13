# Spine Pair Review — societa-manager (Sito pubblico Settore Volley)

## Overall verdict
This is an unusually rigorous pair: every spot-checked contrast ratio recomputes correctly (6.73:1, 5.33:1, 6.08:1 all verified independently), every `epics.md` Epic 18 AC citation matches the real story text word-for-word, and the sibling-DESIGN.md disambiguation (`surface-alt`/`primary` vs this doc's `grigio-chiaro`/`azzurro`) is not just claimed but verifiably correct against the actual sibling file. The material weakness is Component coverage: three components named in EXPERIENCE.md's behavioral table (social embed, staff list, contacts block) have no DESIGN.md visual counterpart, and one of those (social embed) is for a page section already shipped and explicitly in this session's restyling scope. Everything else is polish-level.

## 1. Flow coverage — strong
Checked both Key Flows for protagonist, numbered steps, climax, failure path.
### Findings
- **low** Neither flow exercises the cookie-consent interaction or the sponsor/social sections — both are law-mandated interactive surfaces covered only in tables, never walked end-to-end (EXPERIENCE.md → Key Flows). *Fix:* not required (both existing flows are structurally complete per spec), but a third short flow ("first-time visitor sees banner, rejects, later reopens Preferenze cookie") would close the only interactive surface left untested.

## 2. Token completeness — strong
Extracted all 21 color / 17 typography / 3 rounded / 17 spacing tokens plus every `{path.to.token}` reference in both files (~230 occurrences). All resolve to real frontmatter entries; no accidental resolution to the sibling DESIGN.md's overlapping names.
### Findings
- **medium** `{colors.grigio}` (`#5B6472`) on `{colors.bianco}` is used for sponsor-strip heading/box text (DESIGN.md → Componenti → `sponsor-strip`) but has no stated contrast ratio anywhere in the Colori section, unlike every other text/background pair in the doc. Independently computed it passes (≈5.99:1), but the doc's own stated discipline ("Contrasto testo/sfondo verificato... calcolato") is broken for this one pair. *Fix:* add the computed ratio to the `{colors.grigio}` bullet in Colori for consistency.
- **low** Tipografia prose states `{typography.body}` is used for "footer (14px)" but `components.footer` in the frontmatter has no typography field for its running text (only `heading-typography` and `copyright-typography` are specified) — the claim in prose isn't backed by a token assignment in the component spec. *Fix:* add a `text-typography: '{typography.body}'` field to `components.footer`.

## 3. Component coverage — thin
Extracted every component name in both files and cross-checked DESIGN.md → Componenti against EXPERIENCE.md → Pattern dei Componenti.
### Findings
- **high** "Embed post social" has a full behavioral row in EXPERIENCE.md → Pattern dei Componenti (consent gating, fail-soft) but no entry at all in DESIGN.md → Componenti — no background, spacing, heading treatment, or card/container spec for the one home-page section that is already live (Story 18.5, per the IA table's "Costruita (Story 18.1-18.5)") and is explicitly in this session's restyling scope. *Fix:* add a `social-embed` (or similar) component to DESIGN.md's frontmatter `components` and Componenti prose.
- **high** "Elenco Allenatori" (Staff, EXPERIENCE.md row) and "Blocco contatti" (Contatti, EXPERIENCE.md row) have behavioral rules but zero visual spec in DESIGN.md — no card/list/table treatment defined for either of the two still-backlog pages (Story 18.10, 18.11) that this session's scope explicitly covers ("restyling ... incluso ... progettazione delle pagine ancora in backlog", `.memlog.md`). A dev implementing `/staff` or `/contatti` has behavior but no look. *Fix:* add `staff-list`/`contact-block` component specs, even minimal ones reusing existing tokens.
- **low** `{typography.display-section}` / `{typography.display-section-mobile}` are defined in frontmatter and mentioned in Tipografia prose ("titoli di sezione") but are never assigned to any named component — no component's typography field references them, leaving "which element actually uses this" ambiguous. *Fix:* tie it explicitly to a section-heading spec, or fold it into an existing component.

## 4. State coverage — adequate
Walked all 7 IA surfaces (Home, Squadre, Calendario, Staff, Contatti, Accedi, Preferenze cookie) against empty/cold-load/focus/error states.
### Findings
- **medium** No surface has an explicit fetch/server-error state distinct from "empty data" — the only failure-mode language in Pattern di Stato is the Story 18.5 AC #3 fail-soft note for the social embed specifically. A Prisma/DB error on the Sponsor, Partite, Gruppi, or Allenatori read path has no defined treatment anywhere in either document. *Fix:* add a generic "errore di caricamento dati" row to Pattern di Stato (even if the answer is "same as empty, log server-side" — that's a decision, currently absent).
- **low** "Scelta cookie già registrata" (returning visitor, banner suppressed) is described in prose (Fondamenta, Pattern dei Componenti) but has no row in the Pattern di Stato table, unlike its sibling state "prima visita" which does. *Fix:* minor symmetry addition, not blocking.

## 5. Visual reference coverage — adequate
Listed all 4 files in `.working/`: `direction-poster-sportivo.html`, `direction-caldo-appartenenza.html`, `direction-dinamico-moderno.html`, `direction-editoriale-pulito.html`.
### Findings
- **low** Only `direction-poster-sportivo.html` (the winning direction) is ever linked by path — it's referenced correctly and repeatedly, with "spec vince in caso di conflitto" explicitly stated (EXPERIENCE.md → Architettura dell'Informazione). The other three files are discussed by name only ("Editoriale Pulito", "Dinamico Moderno", "Caldo e Appartenenza" — EXPERIENCE.md → Ispirazione e Anti-pattern) and never linked by path, making them technically orphaned reference files even though their filenames obviously correspond. *Fix:* not urgent (they're explicitly rejected directions, provenance not implementation guidance), but a one-line path reference would remove the ambiguity.

## 6. Bloat & overspecification — adequate
Checked for pixel specs duplicating tokens, restated source content, and repeated facts.
### Findings
- **medium** The "mockup shows hamburger at 375px, but Story 18.7 already shipped horizontal wrap — don't reintroduce hamburger" fact is restated in full or near-full form in five places: DESIGN.md → Marchio e Stile intro, DESIGN.md → Componenti → `header-nav` ("RISOLTO" note), DESIGN.md → Cose da fare e da evitare, EXPERIENCE.md → Pattern dei Componenti → Header/nav, and EXPERIENCE.md → Responsive & Piattaforma ("Nota critica"). Likely deliberate emphasis given it's the single highest-risk regression in the doc, but it means five places to update if the decision ever changes. *Fix:* keep one full statement (Responsive & Piattaforma) and reduce the rest to a one-line pointer.
- **low** `components.button-primary.padding` is hardcoded as `'16px 32px'` even though `{spacing.4}` (16px) and `{spacing.8}` (32px) already exist as tokens — every other component in the file uses `{spacing.X}` references for padding (e.g. `hero.padding-desktop: '{spacing.hero-padding-desktop}'`). *Fix:* `padding: '{spacing.4} {spacing.8}'` for consistency with the rest of the token discipline.

## 7. Inheritance discipline — strong
Verified frontmatter `sources` resolve to real files, AC citations against the actual Epic 18 text, and sibling-token disambiguation against the actual sibling DESIGN.md.
### Findings
- No broken references. All 4 `sources:` entries in EXPERIENCE.md resolve to real files (`epics.md`, `.memlog.md`, `.working/direction-poster-sportivo.html`, sibling `../ux-societa-manager-2026-07-22/DESIGN.md`). Every `epics.md` AC citation checked (Story 18.2 AC#2, 18.3 AC#2, 18.4 AC#3, 18.5 AC#3, 18.6 AC#4, 18.7 AC#4, 18.8 AC#2/#3/#4, 18.9 AC#2/#3, 18.10 AC#2/#4, 18.11) matches the real epic text exactly. The claimed fix of accidental cross-doc token references checks out: sibling DESIGN.md really does define `surface-alt` (`#E4F5FD`, different hex from this doc's `{colors.grigio-chiaro}` `#F2F5F7`, same *role*) and `primary` (`#00A3E0`, same hex as this doc's `{colors.azzurro}`) exactly as described, and both are referenced only in plain backticks (never `{colors.X}` syntax) — no accidental resolution risk. The cited sibling contrast trap ("`{colors.primary}` su testo bianco piccolo... ~2.87:1") is verbatim-accurate to the sibling file's own Do's/Don'ts table.

## 8. Shape fit — strong
DESIGN.md: Marchio e Stile → Colori → Tipografia → Layout e Spaziatura → Elevazione e Profondità → Forme → Componenti → Cose da fare e da evitare — full canonical order, nothing omitted. EXPERIENCE.md: Fondamenta → IA → Voce e Tono → Pattern dei Componenti → [Fotografia Placeholder, invented] → Pattern di Stato → Primitive di Interazione → Soglia di Accessibilità → Responsive & Piattaforma (triggered) → Ispirazione e Anti-pattern (triggered) → Key Flows — matches the calibration example's slotting of triggered sections after Accessibility Floor and before Key Flows.
### Findings
- **low** "Fotografia Placeholder" earns its place: it encodes a genuinely non-obvious, cross-cutting rule (hero placeholder is long-term, team-card placeholder is launch-phase-only and must disappear once uploads exist) that both DESIGN.md's `placeholder-foto` component and EXPERIENCE.md's Pattern di Stato table depend on. It could not be flattened into either without losing the "two different lifespans" distinction — but see Bloat finding above, it is restated more times than necessary once it also has its own section.

## Mechanical notes
- Component names are identical (kebab-case) across both files for all shared components: `header-nav`, `hero`, `next-match-strip`, `team-card`, `match-card`, `sponsor-strip`, `footer`, `button-primary`, `cookie-banner`, `placeholder-foto`.
- All 21 color tokens have hex values; no missing-hex critical findings.
- Three contrast ratios spot-checked by independent WCAG relative-luminance calculation (azzurro/nero 6.73:1, azzurro-scuro–focus-ring/bianco 5.33:1, testo-chiaro-debole/nero 6.08:1) — all matched the document's stated values exactly.
- DESIGN.md has no `sources:` frontmatter field; this is consistent with both the spec reference (`design-md-spec.md`, no `sources` key documented) and the calibration example (`design-example-editorial.md` also omits it) — not a defect.
- `.memlog.md` and `epics.md` Epic 18 both confirm the Poster Sportivo direction as a genuine discovery decision (4 directions compared, chosen 2026-08-13), matching the DESIGN.md narrative exactly.
