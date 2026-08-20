# Epic 19 Context: Ruolo Site Manager per la gestione del sito pubblico

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Introduce a new stackable role, `SITE_MANAGER`, dedicated to managing the public/static side of the club's site (Epic 18) without granting full Admin access. The role is additive throughout: it gains access alongside existing Admin/Dirigente/Allenatore permissions on public-content features (public contacts, logo, sponsors, team photos, Facebook URL, hero background), never replacing them. The epic's biggest architectural piece is new: today the public nav menu is a hardcoded array with no backing data model, so this epic builds a real menu data model + management UI, and — added mid-epic after a real production gap — a lightweight CMS for custom public pages (rich-text content behind configurable URLs) so a Site Manager can extend the site's navigation without hitting 404s or needing a developer. A final story (added 2026-08-20) extends Allenatore records with a free-text description and additional role labels, surfaced on the public `/staff` page.

## Stories

- Story 19.1: Ruolo `SITE_MANAGER` + accesso a contatti pubblici
- Story 19.2: Accesso a logo e nome Settore
- Story 19.3: Accesso a Sponsor (crea/modifica/disattiva)
- Story 19.4: Vista scoped dedicata alla foto squadra
- Story 19.5: Accesso all'URL della Pagina Facebook (Token escluso)
- Story 19.6: Modello dati per le voci di menu pubblico
- Story 19.7: UI di gestione del menu pubblico
- Story 19.8: Menu pubblico dinamico (letto da DB)
- Story 19.9: Modello dati e rendering pubblico delle Pagine personalizzate
- Story 19.10: Editor (Tiptap) per creare/modificare Pagine personalizzate
- Story 19.11: Accesso alla foto sfondo hero
- Story 19.12 (draft, punti aperti da confermare prima dello sviluppo): descrizione + ruoli aggiuntivi per membri dello Staff

## Requirements & Constraints

- `SITE_MANAGER` is one role among seven, assignable from the user admin screen exactly like the other six, and freely combinable with any other role on the same user — no new exclusivity rule.
- Guiding principle across the whole epic: "affianca, non sostituisce" — every extension adds `SITE_MANAGER` to an existing `requireRuolo(...)` check and to the relevant route-guard entry; no permission is removed from Admin/Dirigente/Allenatore anywhere.
- The Facebook API token (credential, distinct from the Facebook Page URL) is explicitly out of scope for `SITE_MANAGER` in this epic — stays Admin/Dirigente only, to avoid delegating an API credential to a content-focused role.
- Where a feature would otherwise require granting a whole existing admin page (e.g. `/app/gruppi`, staff data management), the pattern instead is a new **scoped** page that exposes only the single relevant control (team photo upload, staff description/roles) — no path from it to unrelated admin actions (Gruppo creation, Allenatore/Atleta assignment, identity field edits).
- New `VoceMenuPubblico` table: seeded with the 5 current hardcoded menu entries so the table is never empty after a correct deploy. An empty table at render time is a hard, logged failure — not a silent fallback to the old hardcoded array (avoids two permanently-diverging sources of truth for the menu).
- Custom pages (Story 19.9/19.10) have no draft/published state — a page is live at its URL the moment it is saved, mirroring the `VoceMenuPubblico` model.
- Page content is HTML from a rich-text editor and must be sanitized twice — at save time and again at render time (defense in depth). This is the project's first use of `dangerouslySetInnerHTML` and is called out as an explicit risk point.
- A shared "reserved route prefixes" check (derived from the existing `PUBLIC_ROUTES`/`PROTECTED_ROUTES`, single source of truth) must reject any menu-entry or custom-page URL that collides with a real app route (`/app/*`, `/api/*`, auth routes, the 5 existing hand-written public pages) — applies both to the new pages editor and retroactively to the existing menu-entry form from Story 19.7.
- Image uploads in the page editor reuse the existing MIME/size validation (`lib/storage/validazione-immagine.ts`, PNG/JPEG, 2MB) and land in a new public per-entity Storage bucket mirroring the existing sponsor-banner bucket pattern.
- Editor choice (Tiptap, MIT, self-hosted) is driven by the project's standing constraint to keep stack/hosting on free tiers — no paid CMS/editor service.
- Any newly created structural table (e.g. `VoceMenuPubblico`, the Pagine table) must still get RLS enabled with explicit REVOKE grants per this project's standing convention, even though these tables are read via Prisma rather than the Supabase RLS runtime path.

## Technical Decisions

- Adding a role touches: the Prisma `Ruolo` enum, `lib/ruoli.ts` (`RUOLI_VALIDI`), `lib/auth/route-guard.ts` (`PROTECTED_ROUTES`/`requireRuolo`), and every Server Action that currently hardcodes an allowed-role list for a feature this epic extends.
- Roles are mirrored from `UtenteRuolo` (Prisma, source of truth) into Supabase `app_metadata` on every write; route guards and middleware read roles only from `app_metadata` in the validated JWT, never via a direct DB query. A role write is only considered successful if both the `UtenteRuolo` row and the `app_metadata` mirror succeed.
- Tables split by access path: sensitive/RLS-protected tables (CertificatoMedico, Atleta, Presenza, Iscrizione, Notifica, ConfigurazioneSmtp) are read/written at runtime via the authenticated Supabase client so PostgREST forwards JWT claims; everything else (including the new menu/page tables, and existing Palestra/Campo/Slot/Gruppo/Allenatore/Utente) is Prisma with a privileged connection. Prisma is always the schema/migration owner regardless of runtime access path.
- Server Action authorization failures return `{ error: { code: 'FORBIDDEN', message } }` — never `NOT_FOUND` — a convention this epic's new `requireRuolo` checks must follow.
- Admin-managed runtime configuration (logo, SMTP, and by extension this epic's menu/page content) is persisted in DB/Storage rather than env vars, specifically so changes don't require a redeploy — the pattern this epic's new tables extend.
- Deploy constraint: the project runs `middleware.ts` (legacy Next.js convention, not `proxy.ts`) with `runtime: "experimental-edge"`, the only combination compatible with both Edge-based role reading and the `@opennextjs/cloudflare` deploy adapter — relevant if any Epic 19 work touches middleware/route-guard.

## UX & Interaction Patterns

- All public-facing rendering this epic touches (dynamic menu, custom pages, staff descriptions) must stay visually consistent with the "Poster Sportivo" design system finalized for the public site (DESIGN.md/EXPERIENCE.md, 2026-08-13) — no ad hoc styling divergent from that system.
- Established scoped-admin-page pattern (first used in Story 19.4, reused in 19.12): list the relevant entities with exactly one purpose-built control per row, with no navigation path to the entity's full admin surface.

## Cross-Story Dependencies

- 19.1 is the foundational story (adds the role + base route-guard/UtenteRuolo wiring) that every other story in the epic builds on when extending its own `requireRuolo` checks.
- 19.5 and 19.11 depend on `/app/impostazioni` already being open to `SITE_MANAGER` from Story 19.1.
- 19.6 (data model) blocks 19.7 (management UI), which blocks 19.8 (switching `NavPubblica.tsx` to read from DB).
- 19.9 (custom-page data model + public rendering + reserved-route check) blocks 19.10 (the Tiptap editor that writes those pages); 19.9's reserved-route check also retrofits the existing menu-entry form built in 19.7.
- Story 19.12 is explicitly a draft — role scope, the shape of "ruoli aggiuntivi" (array field vs. join table), and description constraints are open questions the user must confirm before implementation starts.
