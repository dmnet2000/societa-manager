# Epic 18 Context: Sito pubblico Settore Volley

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Build a public, unauthenticated marketing site for the Volley sector — living at the domain root `"/"` in the same Next.js/Cloudflare app as the existing internal dashboard (no separate site, no separate public API) — so a visitor can discover the club, check this week's matches, see teams/staff/sponsors, and follow the club's social posts without logging in. The internal authenticated dashboard moves under a new `/app` prefix to free up `"/"` for this site. Content is read-only mirrors of existing data (Gruppo, Allenatore, Partita/Campionato, Sponsor) — never duplicated into a second system. This is an explicitly open-ended epic: stories accrete one at a time as the live site gets real user feedback (many later stories are corrections/iterations on earlier ones, not new features).

## Stories

- Story 18.1: Migrazione dashboard interna a `/app` e nuova home pubblica (fondativa)
- Story 18.2: Sezione Sponsor pubblica in home
- Story 18.3: Sezione Partite della settimana in home
- Story 18.4: Foto di squadra per Gruppo
- Story 18.5: Sezione post social in home (embed statico Facebook)
- Story 18.6: Banner di consenso cookie
- Story 18.7: Menu di navigazione multi-pagina
- Story 18.8: Pagina pubblica "Squadre"
- Story 18.24: Elenco Atlete a blocchi per categoria su "Squadre", con foto e Numero (inserita fuori sequenza dopo 18.8; dipende anche da Story 19.15 e 9.35 di altre epiche)
- Story 18.9: Pagina pubblica "Calendario"
- Story 18.10: Pagina pubblica "Staff"
- Story 18.11: Pagina pubblica "Contatti"
- Story 18.12: Applicazione del registro visivo "Poster Sportivo" alle pagine pubbliche esistenti
- Story 18.13: Carosello automatico dei post Facebook in home (sostituisce l'embed statico di 18.5)
- Story 18.14: Caricamento della foto di sfondo dell'hero da Admin/Dirigente
- Story 18.15: Rimuovere il nero dal registro visivo "Poster Sportivo" — revisione UX (DESIGN.md)
- Story 18.16: Applicare al codice reale il nuovo colore del registro (blu carbone + azzurro-partite)
- Story 18.17: Rimuovere il pulsante "Preferenze cookie" dopo una scelta registrata
- Story 18.18: Rivedere il menu di navigazione pubblica su mobile — voci su due righe
- Story 18.19: Separare il titolo hero dal blocco Post Facebook, blocco più stretto e più alto
- Story 18.20: Logo della Polisportiva nel footer pubblico, con link al sito e ai social
- Story 18.21: Favicon e titolo della scheda del browser dinamico dal nome del Settore
- Story 18.22: Foto dell'Allenatore nella sezione Staff
- Story 18.23: Riordino dell'header pubblico e larghezza della didascalia Facebook su mobile
- Story 18.25: Contenuto centrato nella pagina pubblica /squadre
- Story 18.26 (BUG, non ancora corretta): `null value in column "accessToken"` su `configurazione_social_facebook` — solo da investigare

## Requirements & Constraints

- `"/"` is reserved for the public site; every route previously reachable without a prefix moves under `/app` with identical role-based authorization, only the path changes. Each new public route must be registered as public in route-guard config, or an anonymous visitor is redirected to login.
- Public pages never expose privileged data: no Atlete roster (except Story 18.24, which deliberately reverses that for `/squadre` only — name + profile photo become public there, explicitly confirmed by the user), no email/credentials/codice fiscale.
- Every conditional home section (sponsor, matches, team photos, social embed) hides entirely when there's no data — never an empty area or "coming soon" placeholder. Listing pages (Squadre/Calendario/Staff/Contatti) instead show an explicit "no data" message when the page would otherwise be empty.
- Public read paths use non-mutating data helpers only (e.g. read-only "find current season", never a "resolve-or-create" variant) — a GET must never have a write side effect.
- Non-essential third-party content (Facebook embed/images, any future analytics) loads only after explicit cookie consent — applies to every current and future story introducing such content, not just 18.6.
- Image uploads (team photo, hero photo, Polisportiva logo) reuse the existing validated pattern: 2MB, PNG/JPEG only, magic-byte check, new image replaces the previous one.
- A Facebook Page Access Token is a real secret: never reaches a Client Component or markup, lives in its own RLS-protected/ADMIN-only table — never in the public-readable `ConfigurazioneApplicazione` singleton where other optional public fields (contacts, social URLs) live.
- Every interactive element needs a 44×44px touch target and a visible keyboard-focus outline (WCAG AA); `prefers-reduced-motion` must be respected by animated components.
- Prefer the simplest working solution when a decision is open (e.g. embed widgets over API integration where sufficient; server-rendered reads over client-side loading states).

## Technical Decisions

- Same codebase, no new public API: public pages call the same Prisma/Supabase read paths as the internal app, fail-soft on error.
- New public images follow the existing "singleton/per-entity bucket, fixed path, existence checked via Storage `list()`, no DB column" pattern already used for the club logo.
- Two visual registers coexist: the public site uses the "Poster Sportivo" system (`ux-designs/ux-societa-manager-2026-08-13/DESIGN.md`+`EXPERIENCE.md`, both `status: final`), deliberately more energetic than the calm register of internal `/app` — intentional divergence, not an inconsistency.
- Poster Sportivo tokens: white/azure dominant surface (NOT dark-mode); `blu-carbone` (#0F2438, replaced an earlier near-black after user feedback) reserved for structural blocks only (header/nav, hero, footer); `azzurro-partite` (#2E6F99) exclusive to match blocks; `azzurro` (#00A3E0) as a solid color block (button, hero accent); magenta used sparingly. No rounded corners except two named exceptions; diagonal `clip-path` cuts instead. System fonts only, weight-900 uppercase via CSS (never uppercase markup).
- Mobile nav is a horizontal wrapping list, explicitly not a hamburger/drawer — decided 18.7, reconfirmed 18.12, revisited again in 18.18; any change needs explicit user confirmation first.
- A photo shown publicly from an otherwise-private bucket (Allenatore for Staff, Atleta for Squadre) is served via a server-generated short-lived signed URL from a privileged client — bucket RLS stays unchanged, never a permanent public URL.
- Carousel step/index arithmetic is a shared utility reused by both the Sponsor and Facebook-post carousels, not duplicated.

## UX & Interaction Patterns

- 5 public pages (Home, Squadre, Calendario, Staff, Contatti) plus a secondary "Accedi" link; footer duplicates key nav links plus contacts/social. No modal stacking beyond the single cookie banner.
- `team-card` is reused with different inclusion rules per page: `/squadre` shows every Gruppo of the season (even without a coach); the home gallery shows only Gruppi with an uploaded photo (partial gallery) — do not conflate the two.
- The diagonal-hatch placeholder-foto is a deliberate, presentable visual state, not a wireframe stand-in; for team photos it applies only pre-adoption (once any upload happens, a Gruppo without one shows no image, not the placeholder).
- Tone is intentionally energetic/evocative here, opposite the calm operational tone inside `/app` — deliberate given the different audience.
- Cookie banner is non-blocking, never a dark pattern; "Preferenze cookie" to revisit consent was required for compliance by 18.6 — 18.17 asks to remove it post-choice, reopening that compliance question, pending user sign-off.

## Cross-Story Dependencies

- 18.1 is foundational (route split + public home skeleton) for everything else in the epic.
- 18.2–18.5 each add one home section after 18.1; 18.7 (nav) is needed for pages to be reachable, though routes are buildable independently.
- 18.24 (Atlete on Squadre) depends on Story 19.15 (Gruppo `ordine`, Epic 19) and Story 9.35 (Atleta `numero`, Epic 9), and reverses a privacy constraint set by 18.8.
- 18.12 restyles 18.1–18.5/18.7/18.8 with Poster Sportivo; 18.15 (UX revision) + 18.16 (its code) further revise that palette and reconcile inconsistent home/Calendario match-card markup.
- 18.13 supersedes 18.5's static embed, reopening its "no API token" decision; 18.19 and 18.23 iterate further on that same hero/Facebook block and the header.
- 18.6 (cookie consent) gates both the embed (18.5) and its carousel replacement (18.13); 18.17 reopens 18.6's compliance requirement, unresolved pending user confirmation.
- 18.18 reopens the mobile-nav decision from 18.7/18.12, also pending user confirmation.
- 18.20 introduces a previously unmodeled "Polisportiva" entity with open questions to resolve at dev-open.
- 18.25 reverses the "no retrofit" decision made for `/squadre`/`/calendario` when `/torneo` (Epic 20, Story 20.14) was centered — applies the same `max-width:1000px; margin:0 auto` to `/squadre` only; `/calendario` stays explicitly out of scope, unretouched.
- 18.26 is a bug report only (unfixed) against the Facebook-token table from 18.13.
