---
title: "Story 19.12: Descrizione e ruoli aggiuntivi dello Staff (gestione Site Manager)"
type: 'feature'
created: '2026-08-20'
status: 'done'
review_loop_iteration: 1
context: []
baseline_commit: '1894a7d4b91d344a69adec27b726c376333620f0'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/staff` (Story 18.10/18.22) mostra solo nome, foto e Gruppi allenati di ogni Allenatore - nessun modo di comunicare ruoli aggiuntivi (es. "Team Manager", "Preparatore Atletico") o una breve descrizione personale. Nessuna pagina di gestione esiste oggi per questi dati.

**Approach:** Il modello `Allenatore` (`prisma/schema.prisma`) guadagna due campi opzionali: `descrizione String?` e `ruoliAggiuntivi String[]` (`@default([])`, prima occorrenza di un array Postgres in questo progetto - una tabella di giunzione è stata scartata esplicitamente, le etichette non servono condivise/riutilizzate tra Allenatori). Nuova rotta scoped `/app/staff-descrizioni` (mirror strutturale di `/app/foto-squadre`, Story 19.4: stesso elenco Allenatori-con-Gruppo-nella-stagione-corrente, un solo controllo per riga) per `SITE_MANAGER`+`ADMIN`+`DIRIGENTE` (decisione esplicita 2026-08-20: "affianca", stesso principio di tutta l'Epic 19 - a differenza di `/app/foto-squadre`, SITE_MANAGER-only, qui non c'è un permesso preesistente di Admin/Dirigente da NON toccare, quindi entrano subito insieme). `/staff` (pubblica) mostra i nuovi campi quando presenti: ruoli aggiuntivi subito sotto il nome, descrizione sotto l'elenco Gruppi.

## Boundaries & Constraints

**Always:** dalla nuova pagina non è raggiungibile nessun'altra azione di `/app/gruppi` o `/app/precaricamento-allenatori` (creazione Allenatori, assegnazione a Gruppi, modifica nome/cognome/codice fiscale) - mirror esatto del vincolo già stabilito per `/app/foto-squadre` (Story 19.4). Stesso filtro Allenatori di `/staff` (assegnati a un Gruppo nella stagione corrente) - un Allenatore fuori da quel filtro non è gestibile da questa pagina (nessun Gruppo a cui associare visivamente la modifica).

**Ask First:** nessuna aggiuntiva - tutti e 4 i punti aperti originali risolti esplicitamente con l'utente il 2026-08-20 (vedi epics.md, Story 19.12).

**Never:** nessun limite di lunghezza sulla descrizione (decisione esplicita, mirror di `Sponsor.descrizione`). Nessuna tabella di giunzione per `ruoliAggiuntivi` (decisione esplicita, scartata). Non toccare `/app/gruppi`, `/app/i-miei-gruppi`, `/app/precaricamento-allenatori`, `/app/vista-dirigente`, `/app/vista-allenatore` - questa storia aggiunge solo lettura+scrittura dei due nuovi campi e la loro visualizzazione pubblica, nessun'altra pagina esistente cambia comportamento.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SITE_MANAGER/ADMIN/DIRIGENTE imposta descrizione + aggiunge un ruolo aggiuntivo | form su `/app/staff-descrizioni` | riga Allenatore aggiornata, entrambi i campi persistiti | N/A |
| Rimuove un ruolo aggiuntivo esistente | click su "rimuovi" per quella singola etichetta | l'array salvato non contiene più quella voce, le altre invariate | N/A |
| Etichetta ruolo aggiuntivo vuota/solo spazi | submit con un campo vuoto | rifiutata, non aggiunta all'array | `VALIDATION` |
| Utente senza `SITE_MANAGER`/`ADMIN`/`DIRIGENTE` | apre `/app/staff-descrizioni` o invoca l'azione direttamente | bloccato, stesso pattern di ogni altra rotta protetta | redirect rotta / `FORBIDDEN` azione |
| Allenatore senza descrizione né ruoli aggiuntivi | `/staff` pubblica | resta visibile come oggi, nessun campo vuoto mostrato (invariato, Story 18.10/18.22) | N/A |
| Allenatore con solo uno dei due campi impostato | `/staff` pubblica | mostra solo quel campo, non un "vuoto" per l'altro | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- model `Allenatore`: aggiungere `descrizione String?` e `ruoliAggiuntivi String[] @default([])` (prima occorrenza `String[]` nel progetto - Postgres `TEXT[]`, nessuna tabella di giunzione)
- **Nuova migrazione** `prisma/migrations/<timestamp>_add_allenatore_descrizione_ruoli/migration.sql` -- `ALTER TABLE allenatori ADD COLUMN "descrizione" TEXT, ADD COLUMN "ruoliAggiuntivi" TEXT[] NOT NULL DEFAULT '{}'` - nessun cambio RLS/GRANT (Allenatore non è protetta da RLS, AD-9, invariato)
- **Nuovo file** `lib/staff-descrizioni.ts` -- `aggiornaDescrizioneStaff(allenatoreId, { descrizione, ruoliAggiuntivi })` (mirror strutturale di `lib/pagine-pubbliche.ts`/`lib/menu-pubblico.ts`: nessuna validazione qui, vive nel Server Action), nessuna funzione di lettura dedicata - la pagina di gestione riusa una query Prisma diretta mirror di `foto-squadre/page.tsx`
- `lib/auth/route-guard.ts` -- nuova entry `{ prefix: "/app/staff-descrizioni", ruoliAmmessi: ["SITE_MANAGER","ADMIN","DIRIGENTE"], navLabel: "Staff", gruppo: "Gestione sito" }`, ultima figlia (dopo `/app/pagine-pubbliche`, Story 19.10)
- **Nuovo file** `app/app/(gruppi-allenatori)/staff-descrizioni/actions.ts` -- `aggiornaDescrizioneStaffAction`, `requireRuolo(["SITE_MANAGER","ADMIN","DIRIGENTE"])`; valida ogni etichetta di `ruoliAggiuntivi` inviata (trim, non vuota, lunghezza massima 40 caratteri - stesso tetto di `LUNGHEZZA_MASSIMA_ETICHETTA` già in uso in `menu-pubblico/actions.ts`), nessun limite su `descrizione`
- **Nuovo file** `app/app/(gruppi-allenatori)/staff-descrizioni/page.tsx` -- mirror strutturale di `foto-squadre/page.tsx`: stesso filtro Allenatori-con-Gruppo-nella-stagione-corrente (query mirror di `app/staff/page.tsx`), una `DescrizioneStaffForm` per riga
- **Nuovo file** `app/app/(gruppi-allenatori)/staff-descrizioni/DescrizioneStaffForm.tsx` -- client component: `<textarea>` per la descrizione, un elenco di chip per `ruoliAggiuntivi` (ciascuna con un bottone "rimuovi", area di tocco ≥44×44px) + un campo testo/bottone "Aggiungi" che accoda una nuova etichetta allo stato locale prima del submit - array serializzato in un campo hidden (JSON, mirror del pattern "campo hidden aggiornato da JS" già in uso in `PaginaPubblicaEditor.tsx` per `contenutoHtml`) - un solo submit salva descrizione + intero array insieme, nessuna Server Action separata per aggiungi/rimuovi singolo
- `lib/guida/contenuti.ts` -- nuova entry per `/app/staff-descrizioni`
- `app/staff/page.tsx` -- query estesa con `select: { ..., descrizione: true, ruoliAggiuntivi: true }`; nel markup, `ruoliAggiuntivi` (se non vuoto) subito sotto `nomeAllenatore`, `descrizione` (se presente) sotto `listaGruppi`
- `app/staff/staff.module.css` -- nuove classi per ruoli aggiuntivi (badge/chip) e descrizione (paragrafo secondario)

## Tasks & Acceptance

**Execution:**
- [x] `schema.prisma` -- `descrizione`/`ruoliAggiuntivi` su `Allenatore`
- [x] migrazione -- `ALTER TABLE` (nessun cambio RLS)
- [x] `lib/staff-descrizioni.ts` -- `aggiornaDescrizioneStaff`
- [x] `route-guard.ts` -- nuova entry `/app/staff-descrizioni`
- [x] `staff-descrizioni/actions.ts` -- Server Action + validazione etichette
- [x] `staff-descrizioni/page.tsx` -- elenco Allenatori + form
- [x] `DescrizioneStaffForm.tsx` -- textarea + chip aggiungibili/rimovibili
- [x] `contenuti.ts` -- guida in-app
- [x] `app/staff/page.tsx` + `staff.module.css` -- rendering pubblico dei due campi

**Acceptance Criteria:** vedi epics.md Story 19.12 (5 AC, verbatim - non duplicati qui).

## Spec Change Log

**2026-08-21 — review a 3 livelli (Blind Hunter, Edge Case Hunter, Verification Gap), review_loop_iteration 1.** Nessun `intent_gap`/`bad_spec` (nessuna modifica al blocco frozen). 3 finding reali su 8+ segnalati:

- **PATCH** — `lib/staff-descrizioni.ts` non aveva un test dedicato (Verification Gap): a differenza dei mirror strutturali `lib/menu-pubblico.ts`/`lib/pagine-pubbliche.ts`, e `actions.test.ts` mocka interamente il modulo, quindi nessun test esercitava mai la vera forma della chiamata `prisma.allenatore.update`. Aggiunto [`lib/staff-descrizioni.test.ts`](../../lib/staff-descrizioni.test.ts) (3 casi).
- **PATCH** — gap di copertura test bassa severità (Edge Case Hunter): boundary esatto a 40 caratteri mai testato, test "rimozione ruolo" inviava un array a un solo elemento (non genuinamente probante per "le altre invariate"), nessun test isolato per DIRIGENTE su `voci-navigazione.test.ts` (prima volta che questo Ruolo ottiene una rotta in "Gestione sito"). Rinforzati [`actions.test.ts`](../../app/app/(gruppi-allenatori)/staff-descrizioni/actions.test.ts) (2 nuovi/modificati casi) e [`voci-navigazione.test.ts`](../../lib/auth/voci-navigazione.test.ts) (1 nuovo caso).
- **REJECT** (matches precedent) — Blind Hunter: nessun controllo server-side che `allenatoreId` sia tra gli Allenatori-con-Gruppo-nella-stagione-corrente. Stesso identico precedente già stabilito da `risolviPossessoGruppo` (`gruppi/actions.ts`): per i Ruoli privilegiati (ADMIN/DIRIGENTE/SITE_MANAGER) quella funzione non applica alcuna restrizione di possesso, il filtro è un affordance della UI di gestione, non un confine di sicurezza. Aggiunto solo un commento esplicativo in [`staff-descrizioni/actions.ts`](../../app/app/(gruppi-allenatori)/staff-descrizioni/actions.ts) per documentare il precedente, nessuna modifica di comportamento.
- **REJECT** (matches precedent) — Blind Hunter: zero-width space (U+200B) aggira il controllo "etichetta vuota" (`.trim()` non lo rimuove). Stesso identico gap già presente in `menu-pubblico/actions.ts` (`etichetta`, stessa validazione `.trim()`-based) - non introdotto da questa storia.
- **DEFER** — Blind Hunter: nessun limite sul numero di elementi dell'array `ruoliAggiuntivi` (solo la singola etichetta è limitata a 40 caratteri). Rischio basso/teorico, nessuna decisione esplicita con l'utente su questo tetto. Loggato in `deferred-work.md`.
- **REJECT** (matches precedent) — Edge Case Hunter: messaggio "Riprova" generico per il caso `allenatoreId` cancellato tra caricamento pagina e submit (P2025) - stesso identico pattern di messaggio generico già in uso in ogni altra Server Action `INTERNAL` del progetto.

Riverificato dopo le patch: `npx vitest run` (106 file, 1408 test, tutti verdi), `npx tsc --noEmit` (pulito).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: `/app/staff-descrizioni` compare come rotta dynamic, nessuna regressione

**Manual checks (if no CLI):**
- Dopo il deploy: un Site Manager/Admin/Dirigente apre `/app/staff-descrizioni`, imposta una descrizione e due ruoli aggiuntivi per un Allenatore, ne rimuove uno, salva; apre `/staff` e vede il risultato nell'ordine atteso (ruoli sotto il nome, descrizione sotto i Gruppi)

## Suggested Review Order

**La Server Action (il cancello reale)**

- Perimetro Ruoli (`requireRuolo`, primo passo) e validazione delle etichette di `ruoliAggiuntivi` (trim, non vuote, lunghezza max 40).
  [`staff-descrizioni/actions.ts:71-108`](../../app/app/(gruppi-allenatori)/staff-descrizioni/actions.ts#L71-L108)
- Parsing/validazione del JSON malformato o di forma inattesa (non array di stringhe) - mai passato a Prisma così com'è.
  [`staff-descrizioni/actions.ts:37-49`](../../app/app/(gruppi-allenatori)/staff-descrizioni/actions.ts#L37-L49)
- Nessun controllo di possesso/scope su `allenatoreId` (deciso in review, stesso precedente di `risolviPossessoGruppo`) - commento esplicativo.
  [`staff-descrizioni/actions.ts:83-89`](../../app/app/(gruppi-allenatori)/staff-descrizioni/actions.ts#L83-L89)

**Il form a chip (prima volta in questo progetto)**

- Verificare che l'array serializzato nel campo hidden rifletta esattamente aggiunte/rimozioni fatte lato client prima del submit; area di tocco ≥44×44px sul bottone "rimuovi" (`width`/`height` diretti, non `min-height` sul contenitore).
  [`DescrizioneStaffForm.tsx:41-87`](../../app/app/(gruppi-allenatori)/staff-descrizioni/DescrizioneStaffForm.tsx#L41-L87)

**Il rendering pubblico (nessuna regressione sulle righe senza i nuovi campi)**

- Un Allenatore senza descrizione/ruoli aggiuntivi deve restare visivamente identico a prima di questa storia; ruoli/descrizione condizionali indipendenti.
  [`app/staff/page.tsx:145-183`](../../app/staff/page.tsx#L145-L183)

**Copertura test (aggiunta in review)**

- Chiamata reale a `prisma.allenatore.update` (prima non esercitata da nessun test, `actions.test.ts` mocka l'intero modulo).
  [`lib/staff-descrizioni.test.ts`](../../lib/staff-descrizioni.test.ts)
