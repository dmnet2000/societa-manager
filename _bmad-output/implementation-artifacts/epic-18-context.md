# Epic 18 Context: Sito pubblico Settore Volley

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Build a public, login-free marketing site for the Settore Volley inside the same Next.js/Cloudflare app (no separate system, no duplicated data, no public API) — a visually striking "Poster Sportivo" showcase covering a homepage, and dedicated pages for Squadre, Calendario, Staff and Contatti. It mirrors existing data read-only (Sponsor, Partita/Campionato, Gruppo/Allenatore) and mirrors the club's social presence (Facebook posts, live FIPAV results/standings) without ever writing back to those platforms. This is an explicitly open-ended epic (like Epic 9/11/17): stories keep being added one at a time as the live site gets used and the user gives visual/UX feedback.

## Stories

- Story 18.1: Migrazione dashboard interna a `/app` e nuova home pubblica (fondativa)
- Story 18.2: Sezione Sponsor pubblica in home
- Story 18.3: Sezione Partite della settimana in home
- Story 18.4: Foto di squadra per Gruppo
- Story 18.5: Sezione post social in home (embed statico, poi sostituito da 18.13)
- Story 18.6: Banner di consenso cookie
- Story 18.7: Menu di navigazione multi-pagina
- Story 18.8: Pagina pubblica "Squadre"
- Story 18.9: Pagina pubblica "Calendario"
- Story 18.10: Pagina pubblica "Staff"
- Story 18.11: Pagina pubblica "Contatti"
- Story 18.12: Applicazione del registro visivo "Poster Sportivo" alle pagine pubbliche esistenti
- Story 18.13: Carosello automatico dei post Facebook in home (sostituisce l'embed statico)
- Story 18.14: Caricamento della foto di sfondo dell'hero da Admin/Dirigente
- Story 18.15: Rimuovere il nero dal registro visivo "Poster Sportivo" — revisione UX con Sally
- Story 18.16: Applicare al codice reale il nuovo colore del registro (blu-carbone + azzurro-partite)
- Story 18.17: Rimuovere il pulsante "Preferenze cookie" dopo una scelta registrata
- Story 18.18: Rivedere il menu di navigazione pubblica su mobile (voci su due righe)
- Story 18.19: Separare il titolo hero dal blocco Post Facebook, blocco più stretto e più alto
- Story 18.20: Logo della Polisportiva nel footer pubblico, con link al sito e ai social
- Story 18.21: Favicon e titolo della scheda del browser dinamico dal nome del Settore
- Story 18.22: Foto dell'Allenatore nella sezione Staff
- Story 18.23: Riordino dell'header pubblico e larghezza didascalia Facebook su mobile
- Story 18.24: Elenco Atlete a blocchi per categoria su "Squadre", con foto e Numero
- Story 18.25: Contenuto centrato nella pagina pubblica `/squadre`
- Story 18.26 (BUG): `null value` su `accessToken` — chiusa, non un difetto applicativo
- Story 18.27: Scheda Gruppo molto più larga in `/squadre`
- Story 18.32: Vista mensile "stile Google Calendar" per `/calendario` (solo analisi, nessuno sviluppo)
- Story 18.33: Risultati e classifiche recuperati in tempo reale dal portale FIPAV, in home

## Requirements & Constraints

- No page under this epic requires authentication, and none may expose data reserved to authenticated Roles: no Atleta list/details (the one deliberate exception is Story 18.24, which reverses 18.8's exclusion on explicit user confirmation to show only Atleta nome/foto/numero — never email, codice fiscale, credentials, or internal-only fields).
- Social integration direction is strictly platform-to-site (mirroring/read-only); the site never publishes or writes to social platforms.
- Prefer the simplest solution over a more "complete" one (e.g. official read-only embeds over managing API tokens) unless the user explicitly reopens that trade-off (as happened for the Facebook carousel, Story 18.13).
- Every public section that depends on optional/external data is fail-soft: if the data is absent, misconfigured, or the fetch fails, that section is silently omitted — never an error, a broken image, or a placeholder saying "not available" (contrast: interior pages actively show "no results" messages, e.g. Story 18.9/18.10 AC).
- Cookie/GDPR compliance (Garante Privacy Italia): no non-essential cookie or third-party script (social embeds, future analytics) loads on a public page before explicit visitor consent; consent must stay revocable — do not silently regress that guarantee (open, unresolved tension flagged in Story 18.17).
- Accessibility baseline for every interactive public element: minimum 44×44px touch target, visible keyboard focus outline, WCAG 2.2.2 pause/resume control on any auto-advancing carousel.
- Every new public route must be explicitly added to `PUBLIC_ROUTES` (`lib/auth/route-guard.ts`) or an anonymous Visitor is redirected to `/accedi` — this is not automatic from removing a route from `PROTECTED_ROUTES`.

## Technical Decisions

- Foundational split (Story 18.1): the authenticated internal dashboard moved from `"/"` to `/app` (all `PROTECTED_ROUTES` prefixes, internal `<Link>`s, and post-login/registration redirects updated accordingly); the public site now owns `"/"`. Role-based authorization logic itself is unchanged, only paths moved.
- Public pages read existing Prisma models directly and read-only (`Sponsor`, `Partita`/`Campionato`, `Gruppo`/`GruppoAllenatore`, `Allenatore`) — no separate public API/schema, no data duplication.
- Season resolution on public pages must use the read-only `trovaAnnoAgonisticoCorrente` helper, never `risolviAnnoAgonisticoCorrente` (which has a write side-effect of creating the season if missing) — a write side-effect is never acceptable on a public GET page.
- Image uploads (team photo, hero photo, Polisportiva logo) follow the established mirror pattern from logo/Sponsor: `lib/storage/validazione-immagine.ts` (2MB limit, PNG/JPEG, magic-byte check), a dedicated public Storage bucket with its SELECT policy set from the very first migration (a lesson paid for twice already on earlier buckets), existence tracked via Storage `list()` rather than a Prisma column when the asset is a site/entity-level singleton, and a dedicated `lib/storage/<nome>.ts` module mirroring `lib/storage/logo.ts`.
- Site-wide public settings (Facebook page URL, public contacts, Polisportiva links) live as new optional fields on the existing `ConfigurazioneApplicazione` singleton (no-RLS by design, AD-9 exception, mirrors `nomeSettore`/`emailSegreteria`). A real secret (the Facebook Graph API Page Access Token) must NOT go there — it needs its own RLS-protected singleton table, mirroring the `ConfigurazioneSmtp` pattern (AD-12: runtime-configurable by Admin, never hardcoded, never sent to the client).
- Privately-stored images that must surface on a public page (Allenatore/Atleta foto profilo) are fetched server-side with the privileged admin client (bypasses RLS) and served via short-lived signed URLs — the bucket's RLS/policies are never relaxed or made permanently publicly readable.
- Shared carousel index arithmetic (`lib/carosello-indice.ts`, promoted out of the Sponsor carousel, Story 16.3) is reused by every new auto-advancing carousel (e.g. Facebook posts, Story 18.13) instead of being duplicated.
- Public data-fetching pages are generally `force-dynamic` Server Components with fail-soft `.catch(() => [])` reads; the FIPAV live results/standings feature (18.33) instead uses Next.js `fetch` with a short `revalidate` window to avoid hammering a third-party site with no SLA while still feeling "live".

## UX & Interaction Patterns

- Visual register "Poster Sportivo" (`ux-designs/ux-societa-manager-2026-08-13/DESIGN.md`+`EXPERIENCE.md`, `status: final`, since revised by Story 18.15/18.16): white/azzurro dominate; the only dark structural color is `{colors.blu-carbone}` `#0F2438` (header, hero, footer) — pure/near-black (`#0B0E14`) is explicitly banned per direct user feedback, do not reintroduce it. Match-cards use their own dedicated `{colors.azzurro-partite}` `#2E6F99`, never blu-carbone.
- Diagonal `clip-path` cuts and condensed weight-900 typography on titles/nav/buttons are structural, not decorative. `{colors.magenta}` is reserved for a single hero eyebrow badge only (never repeated elsewhere); the "vs" divider on match-cards uses the lighter `{colors.magenta-chiaro}` instead (full magenta fails contrast on azzurro-partite).
- Mobile navigation is a deliberate horizontal list with wrap, not a hamburger/drawer — a mockup showing a drawer is illustrative only and must not be copied literally; this decision has been reopened by user feedback more than once (18.18, 18.23) without changing the outcome so far.
- Missing images (team photo, hero photo, staff/Atleta photo) always render the shared `placeholder-foto` diagonal-hatch/initials treatment from `DESIGN.md`, never a broken image or empty area.
- Every interactive element (nav item, primary button, cookie-banner action, social icon, carousel control) needs a 44×44px touch target and a visible focus outline using the `focus-*` tokens.

## Cross-Story Dependencies

- Story 18.1 is foundational; nearly every other story in this epic depends on it (the `/app` migration and the public home skeleton).
- Story 18.7 (nav menu) is a precondition for Squadre/Calendario/Staff/Contatti (18.8–18.11) being reachable, but each of those stories must still independently register its own route in `PUBLIC_ROUTES`.
- Story 18.12 (apply visual register) depends on 18.1–18.5, 18.7, 18.8 plus the UX session; Story 18.15 (remove black) revises the same `DESIGN.md` again and Story 18.16 applies that revised palette to code — 18.15 must land before 18.16.
- Story 18.13 (Facebook carousel) reopens 18.5's original decision to use a passive official embed; Story 18.19 then iterates again on 18.13's hero layout, and Story 18.23 iterates again on both the header and the Facebook caption layout for mobile.
- Story 18.24 (Atlete list on `/squadre`) depends on Story 19.15 (Epic 19, Gruppo `ordine` field) and Story 9.35 (Atleta `numero` field) — both were opened specifically to unblock this story; it also explicitly reverses the privacy exclusion set by Story 18.8.
- Story 18.27 depends on the `/squadre` centered-layout decision from Story 18.25 and must not reopen it.
- Story 18.33 (FIPAV live results) is an independent, read-only addition to the home page, ordered immediately before the existing Story 18.3 "partite della settimana" section, and explicitly does not touch the pre-existing manual FIPAV sync from Story 10.11 (Epic 10).
- Story 18.32 is analysis-only; any future development story implementing it depends on the open decisions it lists being closed with the user first.
