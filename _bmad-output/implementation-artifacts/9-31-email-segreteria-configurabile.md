---
baseline_commit: d14e8b990a1e3e65c49297589da4b47650a85a63
---

# Story 9.31: Email Segreteria configurabile

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin,
I want configurare un indirizzo email dedicato per la Segreteria,
so that l'email automatica di notifica nuovo Certificato Medico caricato (Story 4.3, FR-13) arrivi a un indirizzo affidabile invece di dipendere dall'assegnazione del Ruolo Segreteria a un Utente.

## Acceptance Criteria

1. **Given** sono autenticato come Admin **When** visito `/impostazioni` **Then** vedo, oltre ai link esistenti a Configurazione SMTP/Configurazione logo, un nuovo campo "Email Segreteria" con il valore attualmente configurato (vuoto se mai impostato) e un pulsante "Salva".
2. **Given** imposto un indirizzo email valido nel campo "Email Segreteria" e salvo **When** un'Atleta (o il suo Genitore/Allenatore) carica un nuovo Certificato Medico **Then** l'email di notifica (Story 4.3) viene inviata a quell'indirizzo, non più a chi ha il Ruolo Segreteria.
3. **Given** il campo "Email Segreteria" non è mai stato configurato (valore vuoto/nullo) **When** un Certificato Medico viene caricato **Then** nessuna email di notifica viene inviata, nessun errore mostrato all'utente che carica (stesso comportamento silenzioso di oggi, solo la fonte del "nessun destinatario" cambia da Ruolo a configurazione).
4. **And** validazione base dell'indirizzo (formato email plausibile, lunghezza massima 254 caratteri) prima del salvataggio — un valore chiaramente non valido viene rifiutato con un messaggio, non salvato silenziosamente. Stringa vuota è un valore valido (significa "rimuovi la configurazione", stesso principio di `salvaNomeSettoreAction`).
5. **And** solo Admin può leggere/modificare questo campo (`requireRuolo("ADMIN")`, stesso perimetro di `/smtp`/`/logo`/`salvaNomeSettoreAction`).
6. **And** nessuna regressione sul promemoria di scadenza certificati verso Dirigente (Story 4.6, `app/api/cron/promemoria-certificati/route.ts`) — quel percorso continua a usare `elencaEmailPerRuolo("DIRIGENTE")` invariato, non `emailSegreteria`.

## Tasks / Subtasks

- [x] Task 1: Campo `emailSegreteria` su `ConfigurazioneApplicazione` (AC: #1, #2, #3)
  - [x] Aggiunto a `prisma/schema.prisma`, model `ConfigurazioneApplicazione`: `emailSegreteria String?` (nullable, stesso principio di `nomeSettore`).
  - [x] Migrazione `20260806000000_add_email_segreteria` scritta a mano (nessun accesso DB in questo sandbox, stesso limite di Story 12.4/13.1) — `ALTER TABLE "configurazione_applicazione" ADD COLUMN "emailSegreteria" TEXT;`, nessuna RLS/GRANT toccati. `npx prisma generate` eseguito con successo (non richiede connessione DB).
  - [x] `lib/configurazione-applicazione.ts`: aggiunte `leggiEmailSegreteria`/`salvaEmailSegreteria`, mirror esatto di `leggiNomeSettore`/`salvaNomeSettore`.
- [x] Task 2: Server Action di salvataggio (AC: #4, #5)
  - [x] Nuovo file `app/(configurazione)/impostazioni/actions.ts`, `"use server"`.
  - [x] `salvaEmailSegreteriaAction(_prevState, formData)`: `requireRuolo("ADMIN")`.
  - [x] Validazione: stringa vuota → valida (`null`); regex email semplice + lunghezza massima 254 caratteri.
  - [x] Chiama `salvaEmailSegreteria`, `revalidatePath("/impostazioni")`, `{ success: true }`/`{ error: { code: "INTERNAL", ... } }` sul catch.
- [x] Task 3: UI su `/impostazioni` (AC: #1)
  - [x] Nuovo componente `app/(configurazione)/impostazioni/EmailSegreteriaForm.tsx` (`"use client"`), mirror 1:1 di `NomeSettoreForm.tsx`.
  - [x] `page.tsx` diventato `async`, legge `leggiEmailSegreteria()`, passa il valore a `EmailSegreteriaForm`, renderizzato sotto l'elenco di link esistente con `.titoloSezione`.
  - [x] `impostazioni.module.css`: aggiunte `.campo`/`.bottone`/`.errore`/`.successo`/`.titoloSezione`, mirror esatto di `logo.module.css`.
- [x] Task 4: Collegare il consumer reale — Story 4.3 (AC: #2, #3, #6)
  - [x] `app/(certificati-medici)/certificato-medico/actions.ts`: `elencaEmailPerRuolo("SEGRETERIA")` sostituito con `leggiEmailSegreteria()` nel blocco AC #4/#5 esistente. `null`/stringa vuota → nessun invio, stesso `try/catch` non bloccante.
  - [x] `destinatario` passato a `inviaEmail` è ora la singola stringa email — `DatiEmail.destinatario` (`string | string[]`) non modificato.
  - [x] `app/api/cron/promemoria-certificati/route.ts` (Story 4.6, Ruolo Dirigente) **non toccato**, verificato — resta su `elencaEmailPerRuolo("DIRIGENTE")`. `lib/utenti/email-per-ruolo.ts` non rimosso (ha ancora quel consumer).
- [x] Task 5: Test
  - [x] `lib/configurazione-applicazione.test.ts` (esteso): +5 test per `leggiEmailSegreteria`/`salvaEmailSegreteria`.
  - [x] `app/(configurazione)/impostazioni/actions.test.ts` (nuovo file): 6 test — FORBIDDEN, salvataggio con trim, stringa vuota→null, formato non valido, lunghezza massima, INTERNAL su errore Prisma.
  - [x] `app/(certificati-medici)/certificato-medico/actions.test.ts` (esteso): i 6 test esistenti del blocco Story 4.3 riscritti (stesso conteggio, non ampliato) per `leggiEmailSegreteriaMock` (stringa singola, non più array).
  - [x] `lib/auth/route-decision.test.ts`: nessuna modifica necessaria, confermato.
  - [x] Suite completa: 942/942 test Vitest passati (era 931, +11 netti: +5 `configurazione-applicazione.test.ts`, +6 `impostazioni/actions.test.ts` nuovo file), 0 errori tsc/eslint, build produzione riuscita (`/impostazioni` presente, ancora dinamica).

## Dev Notes

### Contesto e decisioni prese in fase di creazione storia (2026-08-06)

- Nata da un chiarimento, non da un bug: la Story 4.3 (email a Segreteria su upload certificato) era già completa e funzionante, ma i destinatari erano derivati in tempo reale da `elencaEmailPerRuolo("SEGRETERIA")` (ogni `Utente` attivo con quel Ruolo in `/admin`), non da un indirizzo configurato esplicitamente — da qui la sensazione dell'utente che la funzionalità "non fosse stata sviluppata".
- **Sostituisce, non si aggiunge**: decisione esplicita dell'utente — l'indirizzo configurato è l'unico destinatario per questa notifica, il Ruolo Segreteria non la determina più.
- **Dove si configura**: `/impostazioni` (hub esistente, Story 9.24), non `/smtp` — scelta esplicita dell'utente tra le due opzioni proposte. `/smtp` resta concettualmente solo per i dati di trasporto (host/porta/credenziali/mittente).
- **Fuori scope esplicito**: Story 4.6 (promemoria scadenza certificati) invia a `elencaEmailPerRuolo("DIRIGENTE")`, un Ruolo diverso — nessuna richiesta dell'utente di toccare quel percorso, resta invariato.

### Pattern da riusare (non reinventare)

- **Lettura/scrittura config singleton**: mirror esatto di `leggiNomeSettore`/`salvaNomeSettore` (`lib/configurazione-applicazione.ts`) — stesso `ID_CONFIGURAZIONE_APPLICAZIONE`, stesso `upsert` atomico (evita la race condition già documentata lì per un read-then-branch).
- **Server Action di settings ADMIN-only**: mirror di `salvaNomeSettoreAction` (`app/(configurazione)/logo/actions.ts:118-149`) — `requireRuolo("ADMIN")` come unico cancello (questa tabella non ha una seconda difesa RLS, stesso principio già commentato lì).
- **Form client**: mirror 1:1 di `NomeSettoreForm.tsx` — `useActionState`, un solo campo, error/success, bottone Salva.
- **Effetto collaterale non bloccante su upload certificato**: il blocco Task 4 in `certificato-medico/actions.ts` è già `try/catch` non bloccante (Story 4.3 AC #4) — cambia solo la fonte del destinatario (`leggiEmailSegreteria()` invece di `elencaEmailPerRuolo("SEGRETERIA")`), non la struttura del blocco né il resto della logica (nome Atleta nel testo, allegato, ecc.).

### Riferimenti

- [Source: app/(configurazione)/logo/NomeSettoreForm.tsx, actions.ts] — pattern esatto da mirrorare per campo/Server Action di config singleton ADMIN-only.
- [Source: lib/configurazione-applicazione.ts] — dove aggiungere le nuove funzioni.
- [Source: app/(certificati-medici)/certificato-medico/actions.ts:157-194] — punto di integrazione reale, Story 4.3.
- [Source: lib/email/invia-email.ts:16-24] — `DatiEmail.destinatario` accetta già `string | string[]`, nessuna modifica necessaria lì.
- [Source: app/api/cron/promemoria-certificati/route.ts] — consumer NON toccato di `elencaEmailPerRuolo`, verificare che resti invariato dopo l'implementazione.
- [Source: prisma/schema.prisma, model ConfigurazioneApplicazione] — forma esatta del model da estendere.

### Project Structure Notes

- Nessun nuovo route group — tutto dentro `app/(configurazione)/impostazioni/`, gruppo già esistente (Story 9.24).
- `app/(configurazione)/impostazioni/page.tsx` passa da puro hub statico ad `async` Server Component (prima lettura DB su questa pagina) — nessun impatto sul resto (route-guard/nav invariati, ADMIN-only già in vigore).

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff vs `baseline_commit`.

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 6 verificati indipendentemente (AC #6 in particolare: `promemoria-certificati/route.ts` confermato non toccato, ancora su `elencaEmailPerRuolo("DIRIGENTE")`).

- [x] [Review][Patch] `leggiEmailSegreteria()` in `page.tsx` non era avvolta in try/catch — un errore DB avrebbe fatto crashare l'intera pagina hub `/impostazioni`, bloccando anche l'accesso ai link a `/smtp`/`/logo` (trovato dall'Edge Case Hunter). Corretto: try/catch fail-soft su `null`. [app/(configurazione)/impostazioni/page.tsx:27]
- [x] [Review][Patch] Rischio di regressione silenziosa al deploy: ogni società con Utenti attivi con Ruolo Segreteria oggi riceve la notifica di upload certificato; dopo questo deploy la riceverà SOLO se un Admin configura esplicitamente il nuovo campo — nessun avviso in UI né promemoria di deploy lo segnalava (trovato dal Blind Hunter, due osservazioni correlate unite). Corretto: avviso visibile su `/impostazioni` quando il campo è vuoto + nuova Fase 3ter in `docs/deploy-produzione.md`. [app/(configurazione)/impostazioni/page.tsx, docs/deploy-produzione.md]
- [x] [Review][Patch] Commento obsoleto e fuorviante in `lib/email/invia-email.ts` — citava ancora "ogni Utente Segreteria" come esempio d'uso della forma `string[]`, ma questo diff rimuove esattamente quell'uso (trovato dal Blind Hunter). Corretto. [lib/email/invia-email.ts:17-19]
- [x] [Review][Patch] `epics.md` non riportava il limite di 254 caratteri presente invece nell'AC #4 del file di story — drift di documentazione (trovato dal Blind Hunter). Corretto. [_bmad-output/planning-artifacts/epics.md]

- [x] [Review][Defer] Nessuno step di verifica/invio di prova per l'indirizzo configurato — un refuso passa la regex e viene salvato silenziosamente, disabilitando la notifica indefinitamente (Blind Hunter) — deferred: esiste già un workaround manuale parziale (form "invia email di prova" su `/smtp`, digitando lì l'indirizzo da verificare), stessa scala ridotta/singolo Admin già accettata ripetutamente in questo progetto. [app/(configurazione)/impostazioni/EmailSegreteriaForm.tsx]
- [x] [Review][Defer] Nessuna normalizzazione (minuscolo) dell'indirizzo salvato (Blind Hunter) — deferred: nessun impatto funzionale reale sulla consegna email, puro dato cosmetico. [app/(configurazione)/impostazioni/actions.ts]
- [x] [Review][Defer] Nessun test sulla scrittura concorrente di campi diversi sulla stessa riga singleton (`nomeSettore` vs `emailSegreteria`) (Blind Hunter) — deferred: garantito meccanicamente sicuro dall'`UPDATE` mirato generato da Prisma per un `upsert`, stessa classe di rischio a bassa probabilità (singolo Admin) già accettata ripetutamente in questo progetto. [lib/configurazione-applicazione.ts]

**Dismessi come rumore/convenzioni già accettate (6)**: `salvaEmailSegreteria` (lib) non ri-valida il formato/la lunghezza autonomamente (Edge Case Hunter) — stesso identico pattern di `salvaNomeSettore`, nessuna validazione a livello lib in nessuna delle due funzioni, validazione vive solo nella Server Action; `&lt;input&gt;` con `defaultValue` non sincronizzato dopo il trim server-side post-salvataggio (Edge Case Hunter) — stesso identico pattern (non controllato) già presente in `NomeSettoreForm.tsx`, non introdotto da questa storia; messaggio di successo che resta visibile su una modifica successiva non salvata (Blind Hunter) — stesso identico pattern di `NomeSettoreForm.tsx`; regex di validazione email "debole"/non RFC-completa (Blind Hunter) — scelta deliberata e documentata nell'AC #4/Dev Notes ("formato plausibile", stesso livello di rigore già accettato nel progetto, nessuna libreria dedicata); `console.error(err)` logga l'errore grezzo senza redazione (Blind Hunter) — stesso identico pattern di `salvaNomeSettoreAction`/`caricaLogoAction`; migrazione mai verificata contro un DB reale (Blind Hunter) — limite già accettato e già coperto da un processo di deploy documentato (`docs/deploy-produzione.md`, Fase 3bis, nata proprio da Story 11.1/11.2).

### Post-deploy — azione richiesta dall'utente

A prescindere dai patch sopra: **dopo il deploy di questa storia, vai su `/impostazioni` e configura l'Email Segreteria** — finché il campo resta vuoto, nessuna notifica di nuovo certificato caricato verrà inviata (comportamento silenzioso per design, AC #3), anche se oggi qualcuno ha già il Ruolo Segreteria assegnato.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx prisma migrate dev` non raggiunge il DB in questo sandbox — migrazione scritta a mano mirrorando l'`ALTER TABLE ... ADD COLUMN` nullable già usato per `nomeSettore` in Story precedenti; `npx prisma generate` (non richiede connessione DB) eseguito con successo, verificato che `emailSegreteria` compaia nel client generato (`npx tsc --noEmit` pulito su tutti i file che lo consumano).

### Completion Notes List

- Implementate tutte le 5 Task/6 AC della story: campo `emailSegreteria` (no-RLS, mirror di `nomeSettore`), Server Action `salvaEmailSegreteriaAction`, form su `/impostazioni` (da hub puro a hub+form), consumer reale collegato in `certificato-medico/actions.ts` (Story 4.3), `promemoria-certificati/route.ts` (Story 4.6) verificato invariato.
- Nessuna deviazione dal piano della story — tutti i pattern erano già identificati in Dev Notes (mirror di `NomeSettoreForm.tsx`/`salvaNomeSettoreAction`).
- Verifica dal vivo (invio email reale) non eseguibile in questo sandbox (nessun accesso di rete al DB/SMTP Supabase) — stesso limite già incontrato in Story 12.4/13.1. Verificato tutto il resto: 942/942 test Vitest passati (era 931), `eslint` pulito, `npx tsc --noEmit` pulito, `npm run build` riuscita con `/impostazioni` ancora presente nell'elenco route generato (dinamica).

### File List

**Nuovi:**
- `prisma/migrations/20260806000000_add_email_segreteria/migration.sql`
- `app/(configurazione)/impostazioni/actions.ts`
- `app/(configurazione)/impostazioni/actions.test.ts`
- `app/(configurazione)/impostazioni/EmailSegreteriaForm.tsx`

**Modificati:**
- `prisma/schema.prisma` (model `ConfigurazioneApplicazione` + campo `emailSegreteria`)
- `lib/configurazione-applicazione.ts` (nuove funzioni `leggiEmailSegreteria`/`salvaEmailSegreteria`)
- `lib/configurazione-applicazione.test.ts` (+5 test)
- `app/(configurazione)/impostazioni/page.tsx` (da hub statico ad `async` Server Component + form)
- `app/(configurazione)/impostazioni/impostazioni.module.css` (+`.campo`/`.bottone`/`.errore`/`.successo`/`.titoloSezione`)
- `app/(certificati-medici)/certificato-medico/actions.ts` (consumer reale: `leggiEmailSegreteria()` sostituisce `elencaEmailPerRuolo("SEGRETERIA")`)
- `app/(certificati-medici)/certificato-medico/actions.test.ts` (6 test del blocco Story 4.3 riscritti)

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
- 2026-08-06: Story implementata (Task 1-5 completi). Campo `emailSegreteria` su `ConfigurazioneApplicazione` (no-RLS, mirror di `nomeSettore`), Server Action `salvaEmailSegreteriaAction` (ADMIN-only, validazione formato/lunghezza), form su `/impostazioni` (pagina passa da hub puro ad `async` Server Component con form), consumer reale in `certificato-medico/actions.ts` (Story 4.3) aggiornato per leggere l'indirizzo configurato invece di derivarlo dal Ruolo Segreteria — `promemoria-certificati/route.ts` (Story 4.6, Ruolo Dirigente) verificato invariato, fuori scope. Migrazione scritta a mano (nessun accesso DB nel sandbox, stesso limite di Story 12.4/13.1) ma `prisma generate` verificato con successo. 942/942 test Vitest passati (era 931), 0 errori tsc/eslint, build produzione riuscita. Status: review, in attesa di code review adversariale.
- 2026-08-06: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: nessuna violazione degli AC (AC #6 in particolare verificato indipendentemente: `promemoria-certificati/route.ts` confermato non toccato). 4 patch applicati: `leggiEmailSegreteria()` in `page.tsx` avvolta in try/catch fail-soft (un errore DB non deve più far crashare l'intero hub `/impostazioni`, bloccando anche `/smtp`/`/logo`); avviso visibile su `/impostazioni` quando l'Email Segreteria non è configurata, più nuova Fase 3ter in `docs/deploy-produzione.md` (rischio reale: le società con Ruolo Segreteria già assegnato smettono silenziosamente di ricevere la notifica finché il campo non viene configurato dopo il deploy); commento obsoleto corretto in `lib/email/invia-email.ts`; drift di documentazione corretto in `epics.md` (limite 254 caratteri mancante). 3 defer (nessuno step di verifica/invio di prova per l'indirizzo configurato — workaround manuale già disponibile su `/smtp`; nessuna normalizzazione minuscolo; nessun test sulla scrittura concorrente di campi diversi sulla riga singleton) — tutti coerenti con limiti/rischi già accettati ripetutamente in questo progetto, vedi `deferred-work.md`. 6 dismessi come convenzioni già accettate (pattern identici a `NomeSettoreForm.tsx`/`salvaNomeSettoreAction`/`caricaLogoAction` copiati intenzionalmente, regex "plausibile" deliberata per AC #4, limite migrazione-non-verificata già coperto da Fase 3bis). 942/942 test Vitest passati, 0 errori tsc/eslint dopo i fix, build produzione riuscita. **Promemoria per l'utente**: dopo il deploy, configurare l'Email Segreteria su `/impostazioni` — finché resta vuota nessuna notifica di certificato caricato viene inviata. Status: done.
