---
baseline_commit: b66c22acc1fcd7abc29b6a1fd5985eaa8f6f1526
---

# Story 9.24: Menu principale "Impostazioni" (raggruppa SMTP e Logo)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want una voce di navigazione principale "Impostazioni" che raggruppi "Configurazione SMTP" e "Configurazione logo",
so that la barra di navigazione resti pulita invece di avere due voci separate per due impostazioni correlate.

**Note aggiuntive:** oggi `/smtp` e `/logo` (Story 7.1/7.2) sono due voci separate e piatte in `PROTECTED_ROUTES` (`lib/auth/route-guard.ts` righe 64-65), entrambe ADMIN-only. **Decisione tecnica presa con l'utente in fase di creazione**: implementare come **pagina hub** `/impostazioni` (una nuova voce di navigazione unica) con due link a `/smtp` e `/logo` — **non** un sottomenu espandibile nella barra laterale (che sarebbe il primo pattern di navigazione annidata del progetto: oggi `NavBarClient.tsx` renderizza una lista piatta, nessun concetto di gruppo/sottomenu esiste). `/smtp` e `/logo` restano **esattamente come sono** (stesse rotte, stessa route-guard, stesso comportamento) ma **spariscono dalla barra di navigazione come voci dirette** — raggiungibili solo passando da `/impostazioni`. Nessun'altra voce (es. `/permessi-certificati`, anch'essa ADMIN-only) viene inclusa in questo raggruppamento — solo SMTP e Logo, come richiesto esplicitamente dall'utente.

## Acceptance Criteria

1. **Given** un Admin **When** guarda la barra di navigazione **Then** vede una sola voce "Impostazioni" al posto delle due voci separate "Configurazione SMTP" e "Configurazione logo"
2. **Given** un Admin **When** visita `/impostazioni` **Then** vede due link verso "Configurazione SMTP" (`/smtp`) e "Configurazione logo" (`/logo`)
3. **Given** un Admin **When** visita direttamente `/smtp` o `/logo` (es. link salvato, indirizzo digitato a mano) **Then** la pagina funziona esattamente come oggi, nessuna regressione — queste rotte restano protette e raggiungibili, solo non più elencate direttamente in barra
4. **And** nessuna regressione sul comportamento di autorizzazione esistente (Admin-only su `/smtp`/`/logo`, invariato) né sulle altre voci di navigazione — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [ ] Task 1: Route-guard — nuova voce + flag "nascosta dalla nav" (AC: #1, #3, #4)
  - [ ] `lib/auth/route-guard.ts`: estendere il tipo dell'array `PROTECTED_ROUTES` (riga 24) aggiungendo un campo opzionale `nascostaDallaNav?: boolean` a `{ prefix: string; ruoliAmmessi: Ruolo[]; navLabel: string }` — quando `true`, la voce resta protetta (autorizzazione invariata, `getRouteDecision` non la legge) ma non compare nell'elenco di navigazione
  - [ ] Aggiungere una nuova voce `{ prefix: "/impostazioni", ruoliAmmessi: ["ADMIN"], navLabel: "Impostazioni" }` **nella stessa posizione** occupata oggi da `/smtp` (riga 64), per preservare l'ordine di navigazione esistente
  - [ ] Sulle due voci esistenti `/smtp` (ora spostata subito dopo `/impostazioni`) e `/logo`, aggiungere `nascostaDallaNav: true` — **non toccare** `ruoliAmmessi`/`navLabel`/`prefix` di entrambe, l'autorizzazione resta identica
  - [ ] `lib/auth/route-guard.test.ts`: aggiungere un test per `/impostazioni` (ADMIN ammesso, altri Ruoli rediretti a `/non-autorizzato`), stesso pattern già usato per `/admin`. **Non serve modificare** i test esistenti per `/smtp`/`/logo` (se presenti) — la loro autorizzazione via `getRouteDecision` non cambia, solo un campo dati aggiuntivo ignorato da quella funzione
- [ ] Task 2: Nascondere `/smtp`/`/logo` dall'elenco di navigazione (AC: #1)
  - [ ] `lib/auth/voci-navigazione.ts`: in `filtraVociNavigazione` (riga 12-16), aggiungere un `.filter((route) => !route.nascostaDallaNav)` (prima o dopo il filtro sui Ruoli, indifferente) — nessuna nuova funzione, estensione della stessa pipeline esistente
  - [ ] `lib/auth/voci-navigazione.test.ts`: aggiornare il test `"un Admin vede tutte le voci Admin-ammesse"` (righe 33-52) — **rimuovere** `"/smtp"` e `"/logo"` dall'array atteso, **aggiungere** `"/impostazioni"`. Aggiungere un nuovo test esplicito che verifica che `/smtp`/`/logo` **non** compaiono più nell'output per un ADMIN, nonostante l'accesso resti consentito (comportamento nuovo, non solo un'omissione implicita da testare esplicitamente)
- [ ] Task 3: Pagina hub `/impostazioni` (AC: #2)
  - [ ] Nuovo `app/(configurazione)/impostazioni/page.tsx` — stesso route group `(configurazione)` di `/smtp`/`/logo` (nessun controllo di Ruolo nel componente, la route-guard è già il cancello, stesso pattern di `smtp/page.tsx` riga 14-17). Nessun `dynamic = "force-dynamic"` necessario: pagina puramente statica, nessun dato mutabile
  - [ ] Markup: riusa le classi globali `.pagina-form`/`.riquadro-form` (`app/globals.css` righe 116-129, stesso pattern già usato in `smtp/page.tsx`/`logo/page.tsx`) — `<main className="pagina-form"><div className="riquadro-form"><h1>Impostazioni</h1>...</div></main>`. Dentro il riquadro, un elenco di due `<Link>` verso `/smtp` ("Configurazione SMTP") e `/logo` ("Configurazione logo") stilati come righe/pulsanti cliccabili (non un form)
  - [ ] Nuovo `app/(configurazione)/impostazioni/impostazioni.module.css`: classi locali per la lista di link (`.lista`, `.link` — bordo inferiore tra le righe, padding, focus-visible con `outline: 2px solid var(--color-focus-ring); outline-offset: 2px;` stesso pattern accessibilità già usato in ogni altro link/pulsante del progetto, es. `smtp.module.css`/`certificato-medico.module.css`)
- [ ] Task 4: Verifica regressione (AC: #4)
  - [ ] Suite Vitest completa: tutti i test esistenti devono continuare a passare (con gli aggiornamenti di Task 1/2)
  - [ ] `npx tsc --noEmit` ed ESLint puliti
  - [ ] Nessuna modifica a `app/(configurazione)/smtp/*`, `app/(configurazione)/logo/*` (pagine/Server Action/componenti invariati) — solo la loro visibilità in barra cambia, non il loro comportamento

## Dev Notes

- **Perimetro esatto**: `lib/auth/route-guard.ts` (1 campo nuovo + 1 nuova voce + flag su 2 voci esistenti), `lib/auth/voci-navigazione.ts` (1 riga di filtro), `lib/auth/voci-navigazione.test.ts` (test aggiornati), `lib/auth/route-guard.test.ts` (1 nuovo test), nuova cartella `app/(configurazione)/impostazioni/`. Nessuna migrazione, nessuna nuova Server Action, nessuna modifica a `NavBarClient.tsx`/`NavBar.tsx` (il componente già renderizza qualunque array `voci` riceva, non serve toccarlo — riceve un elenco più corto, non una struttura diversa).
- **`VoceNavigazione` resta invariato** (`{ href: string; label: string }`, `lib/auth/voci-navigazione.ts` riga 4) — questa storia non introduce alcuna struttura annidata/gruppo nel tipo di dato della navigazione, deliberatamente (vedi Note aggiuntive sulla decisione presa con l'utente). Se in futuro servisse un vero sottomenu, sarà una storia/decisione separata.
- **`getRouteDecision` non va toccato** (`lib/auth/route-guard.ts` righe 140+) — legge solo `ruoliAmmessi`, il nuovo campo `nascostaDallaNav` è ignorato da quella funzione per costruzione (nessun rischio di introdurre un bypass di autorizzazione).
- **Perché una pagina hub e non un sottomenu**: deciso esplicitamente con l'utente in fase di creazione — un sottomenu espandibile nella sidebar richiederebbe un nuovo pattern di interazione (stato apri/chiudi, auto-espansione quando su una sotto-pagina, gestione da tastiera/aria-expanded) mai costruito prima in questo progetto; la pagina hub riusa invece pattern già esistenti (route protetta + pagina con link, stesso principio di ogni altra pagina dell'app) con un rischio di implementazione molto più basso.
- **`/permessi-certificati` NON va toccata** — resta una voce diretta separata in barra, non inclusa nel raggruppamento "Impostazioni" nonostante sia anch'essa ADMIN-only. Nessun AC di questa storia lo richiede; decisione esplicita dell'utente in fase di creazione.
- **File NON da toccare**: `app/(configurazione)/smtp/*`, `app/(configurazione)/logo/*` (comportamento identico, solo la loro voce di navigazione diretta sparisce), `app/NavBar.tsx`/`app/NavBarClient.tsx` (nessuna modifica: continuano a renderizzare l'array `voci` così com'è, più corto ma stessa forma), `lib/auth/route-guard.ts` → `getRouteDecision`/`matchProtectedRoute` (logica di autorizzazione invariata).

### Project Structure Notes

- File nuovi: `app/(configurazione)/impostazioni/page.tsx`, `app/(configurazione)/impostazioni/impostazioni.module.css`.
- File modificati: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`, `lib/auth/voci-navigazione.ts`, `lib/auth/voci-navigazione.test.ts`.
- Nessun file eliminato, nessuna migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.24: Menu principale "Impostazioni" (raggruppa SMTP e Logo)]
- [Source: lib/auth/route-guard.ts righe 24-89 — PROTECTED_ROUTES, voci /smtp (riga 64) e /logo (riga 65) da modificare/spostare, posizione della nuova voce /impostazioni]
- [Source: lib/auth/route-guard.ts righe 140-165 — getRouteDecision, conferma che legge solo ruoliAmmessi/prefix, invariato da questa storia]
- [Source: lib/auth/voci-navigazione.ts — filtraVociNavigazione (righe 12-16) da estendere con un filtro aggiuntivo, VoceNavigazione (riga 4) da NON estendere]
- [Source: lib/auth/voci-navigazione.test.ts righe 33-52 — test da aggiornare (rimuovere /smtp,/logo dall'atteso, aggiungere /impostazioni) e nuovo test da aggiungere]
- [Source: app/(configurazione)/smtp/page.tsx — pattern .pagina-form/.riquadro-form e "nessun controllo di Ruolo nel componente" da replicare identico in impostazioni/page.tsx]
- [Source: app/globals.css righe 116-129 — classi globali .pagina-form/.riquadro-form da riusare invariate]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
