# Epic 18 Context: Sito pubblico Settore Volley

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Build a public, login-free showcase site for the Settore Volley inside this same Next.js/Cloudflare app — no separate site/system, no duplicated public API. It mirrors existing data in read-only (Sponsor, Partite/Campionato, Gruppi/Allenatori, Atlete name+photo+number) and adds new public-only content (team photos, hero photo, social post mirroring, Polisportiva branding, contacts). The epic was added mid-project (2026-08-10) and stays deliberately open-ended, like Epic 9/11/17: most stories after 18.1-18.11 originate from live user/UX feedback on the deployed public site rather than upfront planning, so expect iterative revisits (color, layout, nav pattern) rather than a single fixed spec.

## Stories

- Story 18.1: Migrazione dashboard interna a `/app` e nuova home pubblica su `"/"`
- Story 18.2: Sezione Sponsor pubblica in home
- Story 18.3: Sezione Partite della settimana in home
- Story 18.4: Foto di squadra per Gruppo
- Story 18.5: Sezione post social in home (embed Facebook/Instagram statico)
- Story 18.6: Banner di consenso cookie
- Story 18.7: Menu di navigazione multi-pagina (Home/Squadre/Calendario/Staff/Contatti)
- Story 18.8: Pagina pubblica "Squadre"
- Story 18.24: Elenco Atlete a blocchi per categoria su "Squadre", con foto e Numero
- Story 18.9: Pagina pubblica "Calendario" (intera stagione)
- Story 18.10: Pagina pubblica "Staff"
- Story 18.11: Pagina pubblica "Contatti"
- Story 18.12: Applicazione del registro visivo "Poster Sportivo" alle pagine pubbliche esistenti
- Story 18.13: Carosello automatico dei post Facebook in home (sostituisce l'embed statico)
- Story 18.14: Caricamento della foto di sfondo dell'hero da Admin/Dirigente
- Story 18.15: Rimuovere il nero dal registro visivo "Poster Sportivo" — revisione UX
- Story 18.16: Applicare al codice il nuovo colore del registro (blu carbone + azzurro partite)
- Story 18.17: Rimuovere il pulsante "Preferenze cookie" dopo una scelta registrata
- Story 18.18: Rivedere il menu di navigazione pubblica su mobile (wrap su due righe)
- Story 18.19: Separare il titolo hero dal blocco Post Facebook, blocco più stretto e più alto
- Story 18.20: Logo della Polisportiva nel footer pubblico, con link al sito e ai social
- Story 18.21: Favicon e titolo della scheda del browser dinamico dal nome del Settore
- Story 18.22: Foto dell'Allenatore nella sezione Staff
- Story 18.23: Riordino dell'header pubblico e larghezza della didascalia Facebook su mobile
- Story 18.25: Contenuto centrato nella pagina pubblica `/squadre`
- Story 18.26 (BUG, chiusa): `null value in column "accessToken"` — non un difetto applicativo
- Story 18.27: Scheda Gruppo molto più larga (1 colonna) in `/squadre`

## Requirements & Constraints

- No authentication on public pages; the internal authenticated dashboard moves under `/app`, and `"/"` becomes the public site root.
- Public pages must never expose protected data: no Atleta list beyond name+photo+numero (18.24 deliberately reverses the original exclusion, still no CF/certificati/other fields), no email/credentials/internal identifiers for staff or contacts.
- Fail-soft rendering everywhere content is conditional (Sponsor, weekly matches, team photo, social embed/carousel): the section simply doesn't render when empty/unconfigured — never a visibly empty area — except a few pages that must show an explicit "no data" message (`/squadre`, `/calendario`, `/contatti` when nothing at all is configured).
- Every interactive element on public pages needs a 44×44px minimum touch target and a visible keyboard-focus outline.
- Cookie consent (Garante Privacy/GDPR) gates every non-essential cookie or third-party script on public pages (social embeds, Facebook images) — nothing non-essential loads before explicit consent; revocation must stay possible (open compliance question in 18.17, not resolved — do not remove the reopen control without re-confirming with the user).
- A Facebook Page Access Token is a real secret: must never reach the browser/client and must not be stored in the RLS-free `ConfigurazioneApplicazione` singleton.

## Technical Decisions

- Route exposure: `lib/auth/route-guard.ts` / `route-decision.ts` — a route is public only if explicitly listed in `PUBLIC_ROUTES`; every new public page must be added there or anonymous visitors get redirected to `/accedi`. `PROTECTED_ROUTES` prefixes need the `/app` prefix rewritten wherever the internal dashboard moved.
- Public, non-secret config (contacts, social handles/URLs, Polisportiva links) lives on the existing no-RLS `ConfigurazioneApplicazione` singleton, mirroring `nomeSettore`/`emailSegreteria`. Secrets never go there — they need a dedicated RLS-protected, Admin-only table (mirror of `ConfigurazioneSmtp`), e.g. `ConfigurazioneSocialFacebook`.
- Image uploads (team photo, hero photo, Polisportiva logo) reuse the established pattern end-to-end: `lib/storage/validazione-immagine.ts` (2MB limit, PNG/JPEG, magic-byte check), a dedicated public Storage bucket, and the public SELECT policy written into the *first* migration (a lesson paid twice already — the logo bucket needed a corrective second migration).
- Exposing a technically-private photo on a public page (Allenatore in `/staff`, Atleta in `/squadre`) is done by generating a signed URL server-side with a privileged Supabase client (`createAdminClient()`, bypasses RLS) — the bucket/RLS policy itself is never changed or made public.
- "Current season" on public pages must always use the read-only helper (`trovaAnnoAgonisticoCorrente`) — never `risolviAnnoAgonisticoCorrente`, which has a write side-effect (creates the record) and is inadmissible on a public GET page.
- Visual design system "Poster Sportivo" (`DESIGN.md`, finalized then revised to drop black): key tokens — bianco `#FFFFFF`, blu-carbone `#0F2438` (structural dark background, replaces an earlier literal black `#0B0E14`), azzurro `#00A3E0`/azzurro-scuro `#0072A3`, azzurro-partite `#2E6F99` (match-card background specifically), navy `#312682`, magenta `#E6007C`/magenta-chiaro `#FFCBE6` (accents, "vs" divider), placeholder-hatch-alt `#17384F`. Condensed, weight-900 display typography (Arial Black/Impact stack) on headings/nav/buttons; diagonal `clip-path` cuts are a deliberate recurring motif.
- `app/layout.tsx` is shared between the public site and `/app`; making page metadata (title/favicon) dynamic requires switching from a static `metadata` export to `generateMetadata()` — verify this doesn't force otherwise-static public pages into dynamic rendering.

## UX & Interaction Patterns

- Public nav is a horizontal, wrapping list (Home/Squadre/Calendario/Staff/Contatti/Accedi) — deliberately **not** a hamburger/drawer, decided explicitly twice (18.7, 18.12) even though the reference mockup shows one illustratively. This choice keeps getting revisited under live mobile feedback (18.18, 18.23): confirm the currently-desired direction with the user before changing it, never assume the drawer is now wanted.
- Header layout on narrow screens (<900px, from 18.23): visual order is hamburger → brand → Polisportiva logo → Accedi (DOM/tab-order for screen readers unchanged); when space is tight, gaps shrink first, then the Polisportiva logo — the hamburger, "Accedi", and the Settore name are never sacrificed.
- Placeholder-not-broken-image is a hard rule wherever a photo is optional: initials-circle placeholder for missing staff/atlete photos, a dedicated CSS hatch pattern for missing team/hero photos.
- Carousels (Sponsor, Facebook posts) share one extracted advance/rewind module and follow the same accessibility contract: auto-advance, an explicit pause/resume control (WCAG 2.2.2), and manual prev/next controls.
- Any purely visual restyling story must preserve every conditional-visibility rule already validated by an earlier story's AC — visual/layout changes only, never a change to what shows or hides.
- Mobile-affecting stories require live verification on a real ~360–390px viewport (`cf:preview` or production) before being considered done — a lesson paid repeatedly (e.g. 18.19, 18.23) from shipping mobile changes verified only in devtools.

## Cross-Story Dependencies

Nearly everything chains off 18.1 (dashboard moved to `/app`, public home skeleton on `"/"`). 18.7 (nav) is a precondition for 18.8–18.11 being reachable from the menu, though each of those pages must still independently register its own route in `PUBLIC_ROUTES`. 18.12 (visual registry applied) depends on 18.1–18.5/18.7/18.8 all being done, and is itself superseded/extended by 18.15→18.16 (black removed: a UX-revision story followed by a separate implementation story) and later by 18.23. 18.13 (Facebook carousel) deliberately reopens the "no API/no token, embed only" decision made in 18.5. 18.17 reopens, without resolving, the cookie-conformity design introduced in 18.6. 18.20 introduces a new, previously unmodeled entity (Polisportiva) with several open questions not decided in the epic text. 18.24 depends on two Epic 19/9 stories external to this epic: Story 19.15 (`Gruppo.ordine` field) and Story 9.35 (`Atleta.numero` field). 18.25 and 18.27 both touch `/squadre` layout and reference the `/torneo` centering precedent from Story 20.14 (outside this epic); `/calendario` is explicitly and repeatedly kept out of scope for these layout changes.
