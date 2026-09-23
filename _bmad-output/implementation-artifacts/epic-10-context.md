# Epic 10 Context: Gestione Partite e Campionati

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Introduce match/championship management on top of the existing Gruppo model: an Allenatore (scoped to their own Gruppo) or Admin/Dirigente (broad access) can create a Campionato, import or sync its fixture list, and manage individual Partite (day/time/venue), while Atlete and Genitori get a read-only view of their team's calendar with map navigation to away venues. The goal is to eliminate manual calendar upkeep (today done outside the app) and give coaches, management, athletes and parents a single, always-current source for weekly fixtures and travel logistics. Epic 10 was added mid-project (2026-07-25); most of its stories are refinements/corrections discovered during implementation (10.6-10.11), not upfront planning — the epics.md entries themselves are the primary and most authoritative source for this epic, since the PRD/architecture/UX planning docs predate it and do not describe it in detail.

## Stories

- Story 10.1: Creazione di un Campionato per un Gruppo
- Story 10.2: Import Excel delle partite di un Campionato
- Story 10.3: Vista partite settimana per settimana (Allenatore, Dirigente, Admin)
- Story 10.4: Modifica di una singola partita
- Story 10.5: Vista partite per Atleta e Genitore
- Story 10.6: Cancellazione di una Partita o di un Campionato
- Story 10.7: Il Campionato appartiene a un solo Gruppo (rimozione della condivisione)
- Story 10.8: Modifica nome Campionato e link al portale FIPAV
- Story 10.9: Raggruppamento tabellare delle Partite per Gruppo, a scomparsa
- Story 10.10: Sincronizzazione automatica del calendario Partite dal portale FIPAV/Lega — analisi di fattibilità (no implementation, decisions only)
- Story 10.11: Sincronizzazione manuale delle Partite di un Campionato dal portale FIPAV/Lega

## Requirements & Constraints

- A Campionato belongs to exactly one Gruppo (corrected in 10.7 — originally many-to-many); a Gruppo can still join multiple Campionati at once (e.g. league + cup), unchanged. Duplicate names are blocked only within the same Gruppo/season.
- A Campionato has a direct FK to the current Anno Agonistico and does not survive a season change.
- Excel import uses the real federal export format (columns: Campionato, Gara N, Giornata, Data, Ora, SquadraCasa, SquadraOspite, Risultato, Parziali, StatoDescrizione, Impianto, IndirizzoImpianto; date gg/mm/aaaa). `Gara N` + Gruppo + Campionato is the natural idempotent upsert key (re-importing updates existing rows, never duplicates). Missing/unrecognized columns reject the whole file with a clear error, no partial import; a success summary (N created, M updated) is shown, mirroring the Atlete import (Story 1.3).
- `Impianto`/`IndirizzoImpianto` are free text present on every row (including home games); no dedicated "venue" entity, no reuse of Palestra — reuses the existing generic Maps navigation link (`lib/link-naviga-palestra.ts`, Story 9.6) unchanged.
- Authorization: Allenatore limited to their own Gruppo(s); Admin/Dirigente have broad access to all Gruppi — same access pattern as Gruppo management (Story 2.2), extended here to also let Allenatore manage (not just view). Unauthorized attempts are rejected server-side, not just hidden in the UI.
- Editing a Partita touches only giorno/ora/impianto/indirizzoImpianto — never the identity fields (Gara N, Campionato, team names).
- Deletions (Partita or Campionato) require the same explicit confirmation pattern as other destructive deletes (Slot/Allenatore/Atleta — Story 9.9/9.13/9.14); deleting a Campionato cascades to its Partite.
- Atleta sees all Campionati/Partite of their own Gruppo; Genitore sees their child's Gruppo (same Genitore↔Atleta linkage as Story 1.5). Both are strictly read-only — no edit/delete capability.
- Story 10.9's per-Gruppo grouped table is additive only (never replaces the existing weekly view) and only appears when the currently visible Partite span more than one Gruppo; read-only, no Azioni column.
- FIPAV portal sync (10.11): manual "Sincronizza da FIPAV" button only, no cron. Source is `Campionato.linkFipav` (empty → button hidden/disabled). Always overwrites risultato/parziali/statoDescrizione/giornata; overwrites data/ora/impianto/indirizzoImpianto only when the Partita's new `modificataManualmente` flag is false (set to true by `aggiornaPartita`, Story 10.4, whenever a human edits those fields). Fail-soft per row (bad row skipped, reported) and for the whole call (unreachable portal / changed markup → explicit failure, no partial writes); Excel import remains available as fallback. Needs a new server-side HTML parsing dependency (project currently has none — exceljs/xlsx cover Excel only).

## Technical Decisions

- Campionato/Partita are **structural data, no RLS** — same treatment as Gruppo/Slot (AD-9): read/written via Prisma with a privileged connection, not the RLS-scoped Supabase client used for sensitive tables (Atleta, CertificatoMedico, Presenza, Iscrizione).
- Season scoping follows the AnnoAgonistico pattern (AD-8): Campionato carries a direct FK, no separate "current season" logic per module.
- Authorization follows the general convention: server-side rejection returns `{ error: { code: 'FORBIDDEN', message } }`, never `NOT_FOUND`, for any resource that exists but isn't accessible (AD-4 convention, applies project-wide via Consistency Conventions, not just RLS-backed tables).
- Single-entity update/delete Server Actions should mirror the existing reference pattern (`aggiornaPalestra`): role check → validation → `prisma.<model>.update`/`delete` → generic `INTERNAL` error on failure → `revalidatePath`.
- FIPAV sync source decided (2026-09-23): `fipavtreuno.net`'s `/gare` HTML page — not `portalefipav.net`'s iCalendar feed (its `robots.txt` disallows automated fetching for that domain; the HTML page also covers results, which the ICS feed does not). The search URL's `SId` parameter already filters rows to the club's own team, so no client-side name matching is needed. Portal season/girone URL identifiers (`StId`/`CId`) change every season with no predictable formula — must be re-entered by a human once per season, not "set once forever". A future scheduled (cron) version, if built, would mirror the existing `app/api/cron/promemoria-certificati/route.ts` pattern (`CRON_SECRET`, fail-closed) — out of scope for Story 10.11 itself.

## Cross-Story Dependencies

- **10.6 depends on 10.7 being completed first**: unconditionally-safe cascade delete of a Campionato requires the 1:1 Gruppo↔Campionato model from 10.7; deleting a Partita alone has no such dependency.
- **10.7 corrects a decision made in 10.1** (removes the many-to-many `GruppoCampionato` sharing and the "collega Campionato esistente" flow) — must not regress Story 10.1 AC #5 (a Gruppo participating in multiple Campionati) nor the Excel import (10.2).
- **10.8 adds `Campionato.linkFipav`**, which Stories 10.10/10.11 reuse as the sync source URL (no new field introduced for that purpose); the Campionato name stays the reconciliation key against the Excel import's `Campionato` column, unaffected by 10.8's rename capability.
- **10.11 depends on 10.4's `aggiornaPartita`** being extended to set a new `modificataManualmente` flag, and reuses 10.2's idempotent upsert key (`gruppoId + campionatoId + garaNumero`) rather than a parallel implementation.
- **10.9 builds on 10.3** (weekly view) and 10.3/9.6 (Naviga button) purely additively, and its visibility rule depends on 10.5 (Atleta/Genitore always see a single Gruppo, so never get the extra grouping control).
- **10.10 is analysis-only** and directly feeds 10.11's design (source choice, upsert key reuse, manual-vs-cron decision) — no product behavior of its own.
