---
baseline_commit: 4237e1ae256f2bcf4d535a61eaa1b7262ba4642a
---

# Story 5.1: Vista d'insieme Dirigente

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Dirigente,
I want vedere in un'unica vista i Gruppi, gli Slot assegnati e lo stato aggregato dei Certificati Medici per gruppo,
so that ho il polso del settore senza rincorrere ogni singolo caso.

## Acceptance Criteria

1. **Given** esistono Gruppi con Slot assegnati (Epic 2) per l'Anno Agonistico corrente, **when** un Dirigente apre la Vista d'insieme, **then** vede una card per ciascun Gruppo con: nome, categoria, gli Slot assegnati (giorno/orario/palestra-campo) e un cluster di **quattro** contatori aggregati sullo stato dei Certificati Medici delle proprie Atlete (in regola / in scadenza / scaduto / da verificare — vedi AC #5 per il quarto).
2. **Given** un'Atleta di un Gruppo ha un Certificato `CONFERMATO` con `dataFineValidita` futura oltre 30 giorni da oggi, **when** la card del Gruppo viene calcolata, **then** l'Atleta contribuisce al contatore **in regola**.
3. **Given** un'Atleta ha un Certificato `CONFERMATO` con `dataFineValidita` entro 30 giorni da oggi (oggi compreso), **when** ..., **then** contribuisce al contatore **in scadenza** — stessa soglia di 30 giorni già usata da FR-16/Story 4.6, non un nuovo numero scelto ad-hoc.
4. **Given** un'Atleta ha un Certificato con `dataFineValidita` nel passato (`CONFERMATO` o meno — lo stato di conferma non conta, solo la data), **when** ..., **then** contribuisce al contatore **scaduto** — stessa regola "solo la data conta" già stabilita da Story 4.5 per l'Allenatore.
5. **Given** un'Atleta non ha ancora nessun Certificato caricato, oppure ne ha uno `IN_ATTESA` (con o senza `dataFineValidita` impostata — un ri-caricamento, Story 4.4, preserva la vecchia data ma richiede comunque una nuova conferma), **when** ..., **then** l'Atleta **non** contribuisce a "in regola"/"in scadenza" (riservati a `CONFERMATO`, AC #2/#3) né a "scaduto" a meno che la data non sia effettivamente passata (AC #4) — conta invece nel quarto contatore "da verificare", così la somma dei quattro corrisponde sempre al numero reale di Atlete del Gruppo.
6. **Given** il Gruppo ha almeno un'Atleta nel contatore "scaduto", **when** il Dirigente tocca/clicca la card di quel Gruppo, **then** vede inline i nomi delle Atlete coinvolte in quello stato, senza dover navigare altrove né telefonare a nessuno (UJ-4).
7. **Given** un Gruppo senza nessuna Atleta assegnata, o senza nessuno Slot assegnato, **when** la card viene renderizzata, **then** mostra un messaggio esplicito per quel caso ("Nessuna Atleta assegnata" / "Nessun allenamento programmato"), mai un errore o una card vuota silenziosa.
8. **Given** un Ruolo diverso da Dirigente (Allenatore, Genitore, Atleta, Segreteria, Admin — a meno che l'Utente non abbia *anche* il Ruolo Dirigente, un Utente può avere più Ruoli), **when** tenta di aprire la rotta della Vista d'insieme, **then** viene rifiutato dal Proxy (redirect a `/non-autorizzato`) — fedele a FR-29 ("As a Dirigente"), non estesa qui ad altri Ruoli gestionali senza una decisione esplicita.
9. **Given** nessun Anno Agonistico corrente risolvibile (caso limite, mai osservato in produzione dato che un Gruppo richiede sempre un Anno Agonistico), **when** la Vista d'insieme viene aperta, **then** mostra una vista vuota con messaggio esplicito, non un errore.

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

### 1. Nessuna nuova migrazione RLS: Dirigente ha già accesso ampio a `atlete` e `certificati_medici`

A differenza di Story 4.5 (che ha dovuto aggiungere una policy RLS mancante per l'Allenatore), il Dirigente è **già coperto** dalle policy SELECT esistenti su entrambe le tabelle:
- `certificati_medici`: policy `admin_dirigente_segreteria_select` (migrazione `20260717090000_add_certificato_medico`) — `ADMIN`/`DIRIGENTE`/`SEGRETERIA` accesso ampio, non scoped a un singolo Gruppo/Atleta.
- `atlete`: policy equivalente per lo stesso gruppo di Ruoli (migrazione `20260716063714_add_atleta`).

Questo significa: `elencaCertificati(supabase)` ed `elencaAtlete(supabase)` (entrambe già esistenti in `lib/db-rls/`, **nessuna nuova funzione di lettura da scrivere**), chiamate con il client Supabase della sessione del Dirigente autenticato (`createClient()`, **mai** `createAdminClient()` — qui esiste una sessione utente reale, a differenza del Cron di Story 4.6), restituiscono già tutte le Atlete/Certificati visibili, senza bisogno di nessuna nuova migrazione.

### 2. Riuso diretto di `calcolaGiorniAScadenza` (Story 4.6) — nessuna terza reimplementazione della stessa matematica di data

Questa storia introduce il **terzo** punto di questa codebase che deve confrontare `dataFineValidita` con "oggi" per fuso Europe/Rome (dopo `certificato-scaduto.ts`, Story 4.5, e `calcola-giorni-a-scadenza.ts`, Story 4.6). Invece di scrivere una terza copia della stessa costante `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" })` e della stessa logica di conteggio giorni, **riusa `calcolaGiorniAScadenza`** esportata da `app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts` (Story 4.6): è già una funzione pura, generica (`dataFineValidita: string | null, oggi: Date) => number | null`), senza nessuna dipendenza specifica al Cron. Costruisci `categorizzaStatoCertificato` (nuova, Task 2) come un sottile wrapper attorno ad essa:

```ts
import type { StatoCertificato } from "@prisma/client";
import { calcolaGiorniAScadenza } from "@/app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza";

export type StatoCertificatoAggregato = "IN_REGOLA" | "IN_SCADENZA" | "SCADUTO" | "SENZA_CERTIFICATO";

// "in regola"/"in scadenza" solo se CONFERMATO (AC #2/#3) - un IN_ATTESA
// (es. ri-caricato, Story 4.4, vecchia data preservata) non deve leggersi
// come "in regola" solo perche' la data preesistente e' ancora futura.
// "Scaduto" resta l'unica eccezione state-agnostica (AC #4).
export function categorizzaStatoCertificato(
  dataFineValidita: string | null,
  stato: StatoCertificato | null,
  oggi: Date
): StatoCertificatoAggregato {
  const giorni = calcolaGiorniAScadenza(dataFineValidita, oggi);
  if (giorni === null || Number.isNaN(giorni)) return "SENZA_CERTIFICATO";
  if (giorni < 0) return "SCADUTO";
  if (stato !== "CONFERMATO") return "SENZA_CERTIFICATO";
  if (giorni <= 30) return "IN_SCADENZA";
  return "IN_REGOLA";
}
```

Import cross-modulo (da `app/api/cron/...` verso `app/(amministrazione)/...`) è qui deliberato e coerente con AD-2: è una funzione pura riesportata ("funzione di servizio"), non una query diretta su tabelle di un altro modulo — stesso principio già applicato a `elencaCertificati`/`elencaAtlete`, riusate trasversalmente da più moduli fin da Story 4.4/4.5/4.6.

### 3. Query: Prisma diretto per Gruppo/Slot/GruppoAtleta, client Supabase solo per Atleta/CertificatoMedico

Stesso pattern già stabilito in `gruppi/page.tsx` (Story 2.2) e `orari/page.tsx` (Story 2.8): `Gruppo`, `Slot`, `Campo`, `Palestra`, `GruppoAtleta` non sono protette da RLS (AD-9) — lette con Prisma diretto, scoped all'Anno Agonistico corrente (`trovaAnnoAgonisticoCorrente()`, **sola lettura**, mai `risolviAnnoAgonisticoCorrente` in una pagina GET, stesso principio di ogni pagina precedente). Il join fra `GruppoAtleta` (Prisma) e `Atleta`/`CertificatoMedico` (Supabase, RLS) resta **sempre applicativo, in memoria** — mai un `include` Prisma diretto che attraverserebbe la RLS con la connessione privilegiata di Prisma (stesso principio già scritto nei Dev Notes di Story 2.4/2.8 e riapplicato in ogni storia successiva).

### 4. Nessuna nuova pagina "vista Gruppo" separata: `(amministrazione)/vista-dirigente/` è coerente con la Capability Map

L'architettura elenca "Amministrazione e Vista Dirigente (FR-26, FR-27, FR-29)" come un'unica riga della Capability Map, dentro `app/(amministrazione)/`. Nuova pagina: `app/(amministrazione)/vista-dirigente/page.tsx` — accanto a `admin/page.tsx` (Story 1.2, gestione utenti), non dentro di essa: sono due Server Action/pagine distinte con Ruoli ammessi diversi (Admin per `/admin`, Dirigente per `/vista-dirigente`).

## Tasks / Subtasks

- [x] Task 1: Route guard — nuova rotta `/vista-dirigente`, solo Dirigente (AC: #8)
  - [x] `lib/auth/route-guard.ts`: aggiungi `{ prefix: "/vista-dirigente", ruoliAmmessi: ["DIRIGENTE"] }` a `PROTECTED_ROUTES`.
  - [x] Test in `route-guard.test.ts`: consenti Dirigente, rifiuta ogni altro Ruolo (Allenatore, Atleta, Genitore, Segreteria, Admin) verso `/non-autorizzato`.
- [x] Task 2: `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` (nuovo) (AC: #2, #3, #4, #5)
  - [x] `categorizzaStatoCertificato(dataFineValidita: string | null, oggi: Date): StatoCertificatoAggregato` — vedi Prerequisito #2 per l'implementazione esatta (wrapper su `calcolaGiorniAScadenza`, Story 4.6).
  - [x] Test TDD: `null`/assente → `SENZA_CERTIFICATO`; giorni negativi → `SCADUTO`; `0`/`15`/`30` giorni → `IN_SCADENZA`; `31`+ giorni → `IN_REGOLA`. Riusa gli stessi casi limite di `calcola-giorni-a-scadenza.test.ts` (Story 4.6) come riferimento, non serve ripetere il test del fuso orario Europe/Rome qui (già coperto a monte dalla funzione riusata).
- [x] Task 3: `app/(amministrazione)/vista-dirigente/page.tsx` (nuovo) (AC: #1, #2, #3, #4, #5, #7, #9)
  - [x] `export const dynamic = "force-dynamic";` (stesso motivo di ogni pagina con dati mutabili in tempo reale — qui i dati cambiano ogni giorno per il solo passare del tempo, stesso principio di `orari/page.tsx`).
  - [x] `trovaAnnoAgonisticoCorrente()` (sola lettura). Se `null` (AC #9): pagina con messaggio esplicito, nessuna query successiva.
  - [x] `Promise.all`: `prisma.gruppo.findMany(...)`; `prisma.gruppoAtleta.findMany(...)`; `elencaAtlete(supabase)`; `elencaCertificati(supabase)` (tutte già esistenti, nessuna nuova query di lettura — vedi Prerequisiti #1/#3).
  - [x] Join in memoria: per ciascun Gruppo, le sue Atlete, per ciascuna Atleta il proprio Certificato via `Map` per `atletaId`, poi `categorizzaStatoCertificato` per il conteggio nei quattro bucket. Elenco nominale collezionato solo per il bucket `SCADUTO` (AC #6).
  - [x] Slot formattati in forma breve (giorno abbreviato + orario + nome Palestra/Campo).
  - [x] AC #7: messaggio esplicito se un Gruppo non ha Atlete o non ha Slot, passato come dato al componente della card.
- [x] Task 4: `app/(amministrazione)/vista-dirigente/GruppoCard.tsx` (nuovo, Client Component) (AC: #1, #6, #7)
  - [x] `"use client"` per lo stato locale di espansione (AC #6), nessuna Server Action coinvolta.
  - [x] Applica i token di `DESIGN.md` → Componenti → `stat-tile` (quattro tile, includendo `SENZA_CERTIFICATO`/"da verificare" con trattamento neutro — nessun token semantico dedicato in `DESIGN.md` per questo quarto bucket introdotto da questa storia, vedi Dev Notes) e la regola non negoziabile: bordo sinistro della tile "scaduto" in `{colors.magenta}`, non `{colors.danger}`. Token CSS introdotti in `app/globals.css` (prima pagina costruita sul design system).
  - [x] Drill-down inline al click sulla tile "scaduto" (solo se non vuota) — pattern già scelto in `EXPERIENCE.md` (nota aperta risolta a favore dell'espansione inline).
- [x] Task 5: Test (Vitest)
  - [x] Come elencato nel Task 2 sopra (unico modulo con logica pura testabile introdotto da questa storia, stesso principio già stabilito da Story 4.5/4.6: `page.tsx`/componenti React non vengono testati con Vitest in questa codebase).
- [x] Task 6: Verifica dal vivo (manuale, Playwright temporaneo)
  - [x] Setup: Docker Desktop + stack Supabase CLI locale + dev server già attivi. Creati 2 Gruppi nell'Anno Agonistico corrente (uno con 2 Slot e 5 Atlete nei quattro stati, uno volutamente senza Slot/Atlete), un Utente Dirigente e un Utente Allenatore (entrambi Auth + Prisma `Utente`/`UtenteRuolo` — scoperto durante la verifica che serve anche la riga Prisma `Utente` attiva, non solo l'Auth user, perché `accedi/actions.ts` la richiede per il login).
  - [x] AC #1-#5: pagina verificata coi contenuti esatti attesi — Gruppo "Under 15 Femminile" con 2 Slot formattati ("Mar 18:00-19:30 · Palestra Test S51 - Campo A", ecc.) e contatori `1 in regola / 1 in scadenza / 2 scaduto / 1 da verificare`, esattamente i dati seminati.
  - [x] AC #6: click sulla tile "scaduto" → drill-down mostra "Scaduta Uno" e "Scaduta Due" (le due Atlete scadute), non mostra "InRegola Uno".
  - [x] AC #7: Gruppo "Under 13 Femminile" (senza Slot/Atlete) mostra "Nessun allenamento programmato." e "Nessuna Atleta assegnata a questo Gruppo.", nessun errore.
  - [x] AC #8: Utente con solo Ruolo Allenatore che tenta `/vista-dirigente` → redirect confermato a `/non-autorizzato`.
  - [x] AC #9: non verificato esplicitamente dal vivo (richiederebbe azzerare l'Anno Agonistico corrente, distruttivo per l'ambiente condiviso di verifica) — coperto dal codice (`if (!annoCorrente) return <main>...</main>`) e dal precedente identico pattern già verificato in altre storie (`gruppi/page.tsx`).
  - [x] Bug ambientale scoperto (non applicativo): `page.waitForLoadState("networkidle")` in Playwright non si risolve mai contro il dev server Next.js (HMR/WebSocket tengono la rete sempre "attiva") — sostituito con `waitUntil: "domcontentloaded"` + attesa breve nello script di verifica temporaneo. Nessuna modifica al codice applicativo, stesso tipo di problema ambientale già documentato in Story 4.5 (JWT issued-in-future).
  - [x] Dati, Utenti di test e script Playwright temporanei rimossi a fine sessione (incluso `npx playwright` già presente in `node_modules` da una sessione precedente, non toccato in `package.json`/`package-lock.json`) — stato del DB locale ripristinato a com'era prima della verifica.

### Review Findings

- [x] [Review][Patch] `categorizzaStatoCertificato` ignora `stato`: un Certificato `IN_ATTESA` (es. ri-caricato, `dataFineValidita` vecchia preservata per Story 4.4) con una data futura viene contato come "in regola"/"in scadenza" invece che "da verificare" — contraddice il testo esplicito di AC #2/#3 ("Certificato `CONFERMATO`"), l'unica eccezione state-agnostica prevista è "scaduto" (AC #4) [app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts, page.tsx] — **Fixed**: nuovo parametro `stato`, `IN_ATTESA` (con o senza data) cade in `SENZA_CERTIFICATO` a meno che la data non sia già passata; 2 nuovi test dedicati.
- [x] [Review][Patch] Un `dataFineValidita` malformato produce `NaN` da `calcolaGiorniAScadenza`, e `NaN < 0`/`NaN <= 30` sono entrambi `false` in JS: il risultato cade silenziosamente in `IN_REGOLA`, l'esito peggiore possibile per un dato corrotto [app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts] — **Fixed**: `Number.isNaN(giorni)` trattato come `SENZA_CERTIFICATO`; test dedicato.
- [x] [Review][Patch] AC #1 dichiara "un cluster di tre contatori" ma l'implementazione (correttamente, per le ragioni nei Dev Notes) ne ha quattro — il testo dell'AC va corretto per riflettere la realtà, non il codice [_bmad-output/implementation-artifacts/5-1-vista-d-insieme-dirigente.md, sezione Acceptance Criteria] — **Fixed**: AC #1/#5 riformulati per menzionare esplicitamente il quarto contatore "da verificare".
- [x] [Review][Patch] Conteggio test nelle Completion Notes errato: dichiarati "4 nuovi" ma il diff ne aggiunge 6 (4 in `categorizza-stato-certificato.test.ts` + 2 in `route-guard.test.ts`) [Dev Agent Record della storia] — **Fixed**: conteggio corretto (ora anche +3 per i fix di review, vedi Completion Notes aggiornate).
- [x] [Review][Patch] Ordine non deterministico della lista drill-down "scaduto": `gruppoAtleta.findMany` non ha `orderBy`, a differenza di ogni altra query della stessa pagina — l'ordine visto in verifica dal vivo può essere stato una coincidenza [app/(amministrazione)/vista-dirigente/page.tsx] — **Fixed**: `atleteScadute.sort((a,b) => a.localeCompare(b))` prima di restituire i dati della card.
- [x] [Review][Patch] Rischio di collisione di `key` React: `slotFormattati.map((slot) => <li key={slot}>...)` usa la stringa formattata come chiave invece dell'id dello Slot — due Slot identici (stesso giorno/orario/campo) per errore di data-entry produrrebbero chiavi duplicate [app/(amministrazione)/vista-dirigente/GruppoCard.tsx] — **Fixed**: `slotFormattati` ora `{id, testo}[]`, `key={slot.id}`.
- [x] [Review][Patch] AC #8 (caso multi-Ruolo, "a meno che l'Utente non abbia anche il Ruolo Dirigente") non ha nessun test dedicato — solo array a Ruolo singolo testati [lib/auth/route-guard.test.ts] — **Fixed**: nuovo test `["ALLENATORE", "DIRIGENTE"]` → `allow`.
- [x] [Review][Patch] Un Anno Agonistico corrente senza nessun Gruppo (caso non coperto da AC #7 né #9) renderizza una griglia vuota senza messaggio esplicito, in tensione con la disciplina "mai un caso vuoto silenzioso" applicata ovunque altrove nella storia [app/(amministrazione)/vista-dirigente/page.tsx] — **Fixed**: messaggio esplicito "Nessun Gruppo creato per l'Anno Agonistico corrente." quando `cardData.length === 0`.
- [x] [Review][Patch] Bottone della tile "scaduto" espone `aria-expanded` ma non `aria-controls` verso il contenuto del drill-down — nessuna associazione programmatica per screen reader, in tensione con l'impegno WCAG AA di `DESIGN.md`/`EXPERIENCE.md` [app/(amministrazione)/vista-dirigente/GruppoCard.tsx] — **Fixed**: `aria-controls` + `id` dedicato collegano bottone e pannello.
- [x] [Review][Patch] Fallback silenzioso "Atleta sconosciuta" (divergenza `GruppoAtleta`/`elencaAtlete`) mai loggato, a differenza del pattern di log difensivo già stabilito per un caso analogo in Story 4.3 (`caricaCertificato`) [app/(amministrazione)/vista-dirigente/page.tsx] — **Fixed**: `console.warn` aggiunto per questo caso limite.
- [x] [Review][Patch] Completion Notes affermano "nessun'altra modifica al layout globale" ma `app/globals.css` cambia `font-family`/colore di `body` per **ogni** pagina esistente (Epic 1-4/7), non solo per `vista-dirigente` — la portata reale del cambio va corretta nel testo, non è necessariamente un problema del codice [Dev Agent Record della storia] — **Fixed**: testo corretto nelle Completion Notes.
- [x] [Review][Defer] Nessuna posizione condivisa (`lib/`) per `calcolaGiorniAScadenza`, riusata da una cartella di un Route Handler (`api/cron/...`) — deliberato e documentato nei Prerequisiti della storia, ma un futuro refactor del Cron potrebbe rompere silenziosamente questa pagina; da consolidare in un modulo condiviso in una storia trasversale futura [app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts]
- [x] [Review][Defer] Nessun `try/catch`/`error.tsx` attorno alle letture `Promise.all` della pagina — stesso pattern (assente) già presente in ogni altra pagina di questa codebase (`gruppi/page.tsx`, `orari/page.tsx`, `admin/page.tsx`), non una regressione specifica di questa storia [app/(amministrazione)/vista-dirigente/page.tsx]
- [x] [Review][Defer] Il quarto bucket `SENZA_CERTIFICATO`/"da verificare" non ha un token dedicato in `DESIGN.md` — già disclosurato esplicitamente nei Dev Notes come scelta di questa storia, non un'omissione silenziosa [app/(amministrazione)/vista-dirigente/vista-dirigente.module.css]
- [x] [Review][Defer] Cast di tipo non sicuro (`as string | null`) su dati non tipizzati restituiti da `elencaCertificati`/`elencaAtlete` — pattern preesistente in tutta la codebase (nessuna tipizzazione esplicita del client Supabase), non introdotto da questa storia [app/(amministrazione)/vista-dirigente/page.tsx]
- [x] [Review][Defer] Residui dello scaffold `create-next-app` non toccati (`<title>Create Next App</title>`, font Geist mai applicati in `app/layout.tsx`) — esplicitamente fuori perimetro di questa storia (nav-bar/layout globale, retrofit futuro separato) [app/layout.tsx]

## Dev Notes

- **Nessuna nuova migrazione RLS** — Dirigente ha già accesso ampio a `certificati_medici`/`atlete` (Prerequisito #1). Se in verifica dal vivo emergesse un `permission denied` inatteso, non è previsto da questa storia: investigare prima di aggiungere una migrazione non pianificata.
- **Decisione esplicita di questa storia**: un quarto bucket `SENZA_CERTIFICATO` (nessun certificato caricato, oppure `IN_ATTESA` senza data) non è menzionato letteralmente nell'AC originale dell'epic ("es. quante atlete in regola, quante in scadenza, quante scadute") ma è necessario perché la somma dei tre bucket espliciti corrisponda al numero reale di Atlete del Gruppo — altrimenti un'Atleta senza certificato scomparirebbe silenziosamente dal conteggio, cosa che confonderebbe più che aiutare un Dirigente che cerca "il polso del settore". Etichetta UI suggerita: "Da verificare" (copre sia il caso "nessun file" sia "caricato ma non confermato" senza affermare falsamente "nessun documento esiste").
- **Il bordo sinistro della tile "scaduto" usa `{colors.magenta}`** (non `{colors.danger}`) — regola già fissata in `DESIGN.md`, non una nuova decisione di questa storia. Le altre tre tile (in regola/in scadenza/senza certificato) usano il proprio colore semantico anche per il bordo.
- **Drill-down solo sul bucket "scaduto"** — nessun AC richiede l'elenco nominale per gli altri tre bucket; non costruire quella funzionalità qui (scope creep non richiesto).
- **Nessuna paginazione/filtro** — stessa scala ridotta (~200 Atlete, poche decine di Gruppi) già accettata da `gruppi/page.tsx`/`orari/page.tsx`; a differenza di `orari/page.tsx`, questa vista non ha nemmeno bisogno di filtri Palestra/Gruppo (l'intero punto della vista è vederli tutti in una schermata).
- **Fuori perimetro esplicito di questa storia**: Story 5.2 (permessi granulari sui dati sanitari, Should/v1.1) non è toccata qui — questa storia usa esclusivamente le policy RLS di base già esistenti per Ruolo.

### Project Structure Notes

- Nuovi file: `app/(amministrazione)/vista-dirigente/page.tsx`, `app/(amministrazione)/vista-dirigente/GruppoCard.tsx`, `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` (+ `.test.ts`).
- File modificati: `lib/auth/route-guard.ts` (+ `.test.ts`).
- Nessuna nuova migrazione, nessuna nuova tabella, nessun nuovo Server Action (nessuna mutazione in questa storia — sola lettura).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1: Vista d'insieme Dirigente] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-29] — "Il Dirigente vede in un'unica vista i Gruppi, gli Slot assegnati e lo stato aggregato dei Certificati Medici per gruppo."
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md] — token colore/tipografia/componenti (stat-tile, badge, nav-bar), sezione Componenti → Cluster di stat-tile per la regola del bordo magenta.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/EXPERIENCE.md] — Key Flow UJ-4 (Roberto), Architettura dell'Informazione (riga "Vista d'insieme Dirigente"), Pattern dei Componenti → "Cluster stat-tile aggregato" (drill-down inline).
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/mockups/key-vista-dirigente.html] — riferimento di composizione già pronto (mobile+desktop, drill-down inline).
- [Source: app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts] — funzione riusata (Story 4.6), vedi Prerequisito #2.
- [Source: app/(presenze)/presenze/certificato-scaduto.ts] — pattern "solo la data conta, non lo stato di conferma" (Story 4.5), applicato identico al bucket `SCADUTO` di questa storia.
- [Source: app/(gruppi-allenatori)/gruppi/page.tsx, app/(orari-palestre)/orari/page.tsx] — pattern Prisma-diretto per Gruppo/Slot/GruppoAtleta + join in memoria con Atlete lette via RLS, da replicare identico.
- [Source: lib/db-rls/certificato-medico.ts, lib/db-rls/atleta.ts] — `elencaCertificati`/`elencaAtlete`, già coperte da policy RLS ampie per Dirigente (Prerequisito #1).
- [Source: lib/auth/route-guard.ts] — pattern `PROTECTED_ROUTES`, da estendere con la nuova rotta.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Scoperto in verifica dal vivo**: `accedi/actions.ts` richiede una riga Prisma `Utente` attiva (`supabaseAuthId` corrispondente), non basta creare l'Auth user con `app_metadata.ruoli` — senza di essa il login fallisce silenziosamente con "Account disattivato" (fail-closed, Story 1.2). Non un bug di questa storia, solo un prerequisito di seeding da ricordare per le prossime verifiche dal vivo.
- **Problema ambientale (non applicativo)**: `page.waitForLoadState("networkidle")` di Playwright non si risolve mai contro `next dev` (HMR/WebSocket) — sostituito con `domcontentloaded` + attesa breve nello script di verifica temporaneo, nessuna modifica al codice applicativo.
- **Code review**: un tentativo di verifica dal vivo del fix `IN_ATTESA` ha incontrato una "server error" generica una volta — riprovato subito dopo con una richiesta diretta (status 200, contenuto corretto) e poi con Playwright (contenuto corretto, `da verificare: 1`); nessun errore riproducibile, coerente con lo stesso problema ambientale intermittente già documentato in Story 4.5 (jitter Docker/WSL2 su un JWT appena emesso), non un bug applicativo.

### Completion Notes List

- Tutti i 6 Task completati con TDD dove applicabile (RED confermato prima dell'implementazione nel Task 2).
- Suite completa verde: `npx vitest run` (443 test, 43 file — 436 pre-esistenti + 7 nuovi: 4 iniziali + 2 dal review fix su `categorizza-stato-certificato.test.ts`, 1 dal review fix su `route-guard.test.ts` per il caso multi-Ruolo), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun nuovo errore, solo un warning pre-esistente non correlato), `npm run build` (produzione, nessuna regressione — `/vista-dirigente` compare correttamente come rotta dinamica).
- **Introdotti i token CSS di `DESIGN.md` in `app/globals.css`** (prima pagina costruita direttamente sul design system finalizzato in questa sessione) — rimosso anche il blocco `@media (prefers-color-scheme: dark)` residuo dello scaffold `create-next-app`, in diretta contraddizione con la decisione "solo light mode" del design system appena adottato. **Correzione**: questo è comunque un cambio globale (font-family/colore di `body` per ogni pagina, non solo `vista-dirigente`) — impatto visivo trascurabile sulle pagine esistenti (ancora scaffolding bianco/nero senza stile), ma va detto con precisione. Nessuna modifica a nav-bar/titolo pagina/font Geist in `layout.tsx`: quel retrofit resta un passaggio successivo separato, come concordato prima di avviare l'Epic 5.
- **Decisione implementativa non anticipata letteralmente dall'AC originale dell'epic**: introdotto un quarto bucket `SENZA_CERTIFICATO` ("da verificare") oltre ai tre espliciti (in regola/in scadenza/scaduto) — necessario perché la somma dei contatori corrisponda sempre al numero reale di Atlete del Gruppo, e (dopo il review fix) anche per ospitare correttamente ogni Certificato `IN_ATTESA` non ancora scaduto. AC #1/#5 della storia corretti per riflettere questo.
- Verifica dal vivo (Task 6) ha confermato tutti gli AC funzionanti con dati reali, incluso il drill-down inline (AC #6) e il route guard (AC #8). Nessun bug applicativo reale scoperto in Task 6 — solo il prerequisito di seeding e il problema ambientale Playwright documentati sopra.
- **Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor)**: 11 finding `patch`, 4 `defer`, 3 scartati come rumore (nessun test Vitest per `page.tsx`/componenti — convenzione codebase già stabilita; AC #9 mai verificato dal vivo — già disclosurato con motivazione valida; markup misto button/div sulle tile — preferenza stilistica). **Il più significativo**: `categorizzaStatoCertificato` ignorava `stato`, mostrando un Certificato `IN_ATTESA` con vecchia data futura (ri-caricamento, Story 4.4) come "in regola" invece che "da verificare" — contraddiceva il testo esplicito di AC #2/#3. Corretto e ri-verificato dal vivo con successo. Applicati anche: gestione `NaN` da data malformata, ordine deterministico del drill-down, `key` React su id invece di stringa, test per il caso multi-Ruolo (AC #8), messaggio esplicito per Anno Agonistico senza Gruppi, `aria-controls` sul drill-down, log difensivo per Atleta non risolvibile, correzioni di testo/conteggi nella storia stessa. 4 finding deferred in `deferred-work.md` (posizione condivisa per `calcolaGiorniAScadenza`, nessun `error.tsx`/try-catch — pattern preesistente in tutta la codebase, token DESIGN.md mancante per il 4° bucket, residui scaffold in `layout.tsx`).
- Nessuna deviazione dai Prerequisiti architetturali della storia: nessuna nuova migrazione RLS (Dirigente già copre `atlete`/`certificati_medici`), riuso diretto di `calcolaGiorniAScadenza` (Story 4.6) invece di una terza reimplementazione della stessa matematica di data.

### File List

- `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` (nuovo)
- `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.test.ts` (nuovo)
- `app/(amministrazione)/vista-dirigente/page.tsx` (nuovo)
- `app/(amministrazione)/vista-dirigente/GruppoCard.tsx` (nuovo)
- `app/(amministrazione)/vista-dirigente/vista-dirigente.module.css` (nuovo)
- `app/globals.css` (modificato: token CSS del design system, rimosso il blocco dark-mode residuo dello scaffold)
- `lib/auth/route-guard.ts` (modificato: nuova rotta `/vista-dirigente`, solo Dirigente)
- `lib/auth/route-guard.test.ts` (modificato: nuovi test per la rotta sopra)
