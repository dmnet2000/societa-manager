---
baseline_commit: NO_VCS
---

# Story 1.4: Precaricamento Allenatori

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want precaricare un Allenatore con dati minimi (nome, Codice Fiscale),
so that l'allenatore può registrarsi in autonomia riconoscendo i propri dati già presenti.

## Acceptance Criteria

1. **Given** sono autenticato come Admin o Dirigente, **when** precarico un Allenatore inserendo nome e Codice Fiscale, **then** viene creato un record `Allenatore` minimale (non ancora collegato a nessun account), in attesa che la persona si registri.
2. **Given** un Codice Fiscale è già stato precaricato (o appartiene a un Allenatore già registrato), **when** provo a precaricarlo di nuovo, **then** ricevo un messaggio d'errore chiaro, non un duplicato silenzioso.
3. **Given** un Allenatore è stato precaricato con un certo Codice Fiscale, **when** quella persona si registra (Story 1.1) selezionando il Ruolo Allenatore e inserendo lo stesso Codice Fiscale, **then** il suo nuovo `Utente` viene collegato al record `Allenatore` precaricato (stesso record, nessun duplicato) — il nome/Codice Fiscale del precaricamento restano quelli originali.
4. **Given** mi registro come Allenatore con un Codice Fiscale che non corrisponde a nessun precaricamento esistente, **when** invio il form, **then** la registrazione procede comunque normalmente (nessun record `Allenatore` viene creato in questo caso — è compito di una storia futura, non di questa).
5. **Given** sono autenticato con un Ruolo diverso da Admin/Dirigente, **when** provo a chiamare la Server Action di precaricamento direttamente, **then** ricevo un rifiuto `FORBIDDEN`.

## Tasks / Subtasks

- [x] Task 1: Modello dati `Allenatore` (AC: #1, #2, #3)
  - [x] `prisma/schema.prisma`: nuovo modello `Allenatore` (id UUID, `nome`, `codiceFiscale` univoco, `utenteId` **nullable e univoco** — `null` finché non c'è un aggancio, valorizzato all'aggancio — `createdAt`). **Non** protetto da RLS: Allenatore è esplicitamente elencato in AD-9 tra le tabelle non-RLS gestibili via Prisma diretto (a differenza di `Atleta`, Story 1.3) — usare `prisma.allenatore.*` direttamente, **non** un client Supabase.
  - [x] Migrazione Prisma standard (nessun SQL grezzo necessario qui, a differenza della Story 1.3 — niente RLS da abilitare).
  - [x] `@@map("allenatori")` per coerenza di naming.
- [x] Task 2: Funzione di lookup nel modulo condiviso `lib/matching-codice-fiscale/` (AC: #2, #3)
  - [x] Aggiungere `trovaAllenatorePerCodiceFiscale(codiceFiscale)` allo stesso modulo che ospita `trovaPerCodiceFiscale` (Story 1.3, per Atleta) — **implementazione diversa** (Prisma diretto, non client Supabase) perché Allenatore non è RLS-protetta, ma stesso modulo/cartella per coerenza con AD-5 ("un solo modulo condiviso"). Normalizzare il Codice Fiscale (trim + maiuscolo) prima della query, stesso fix applicato in Story 1.3 code review.
- [x] Task 3: Server Action `precaricaAllenatore` (AC: #1, #2, #5)
  - [x] `app/(onboarding-import)/precaricamento-allenatori/actions.ts`: `requireRuolo(["ADMIN", "DIRIGENTE"])` (riuso diretto, Story 1.2/1.3), valida nome/Codice Fiscale, verifica assenza di un record esistente con lo stesso CF (precaricato o già agganciato) tramite `trovaAllenatorePerCodiceFiscale` — se trovato, errore chiaro (AC #2); altrimenti crea il record con `utenteId: null`.
  - [x] Errori nella forma `{ error: { code, message } }`, try/catch fail-closed (convenzioni stabilite dalle Story precedenti).
- [x] Task 4: Aggancio in fase di registrazione (AC: #3, #4)
  - [x] Modificare `app/(onboarding-import)/registrati/actions.ts` (file esistente, **non** ricreare): se il Ruolo `ALLENATORE` è tra quelli selezionati **e** viene fornito un Codice Fiscale, dopo la creazione di `Utente`/`UtenteRuolo` cercare un `Allenatore` precaricato con quel CF (`trovaAllenatorePerCodiceFiscale`); se trovato e non ancora agganciato (`utenteId` nullo), impostare `utenteId` al nuovo Utente; se il CF non corrisponde a nessun precaricamento, non fare nulla (AC #4 — nessun record creato qui). Stesso pattern try/catch e "nessun rollback automatico" già deciso in Story 1.1 per il resto della funzione.
  - [x] Modificare `app/(onboarding-import)/registrati/page.tsx`: aggiungere un campo opzionale "Codice Fiscale" (es. `codiceFiscaleAllenatore`), mostrato quando il Ruolo Allenatore è selezionato — usare stato React lato client per mostrarlo/nasconderlo (il componente è già `"use client"`).
- [x] Task 5: UI di precaricamento (AC: #1, #2, #5)
  - [x] `app/(onboarding-import)/precaricamento-allenatori/page.tsx`: form con nome + Codice Fiscale, protetto dal route guard (`PROTECTED_ROUTES`, nuova entry `{ prefix: "/precaricamento-allenatori", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] }` — stesso pattern di Story 1.3).
- [x] Task 6: Test (Vitest)
  - [x] `trovaAllenatorePerCodiceFiscale`, Server Action `precaricaAllenatore`: mock di Prisma (stesso pattern delle Story 1.1/1.2, non del client Supabase — Allenatore non è RLS).
  - [x] Estendere `registrati/actions.test.ts` con i casi: aggancio riuscito a un Allenatore precaricato, nessun aggancio quando il CF non corrisponde a nulla, nessun aggancio quando il Ruolo Allenatore non è selezionato.
  - [x] Estendere `lib/auth/route-guard.test.ts` con la nuova route.

### Review Findings

- [x] [Review][Defer] Usare la sola conoscenza del Codice Fiscale come prova d'identità per l'aggancio automatico (come letteralmente previsto dall'AC/FR-20) significa che chiunque conosca (o possa derivare) il CF reale di un allenatore potrebbe registrarsi per primo e reclamarne l'identità precaricata, senza alcuna verifica aggiuntiva — **deciso con l'utente: accettabile per ora** (piccola società, singolo Admin che conosce già i propri allenatori). Da riconsiderare (conferma manuale dell'Admin prima che l'aggancio diventi effettivo) se l'applicazione venisse estesa a tutta la polisportiva. `app/(onboarding-import)/registrati/actions.ts`.
- [x] [Review][Patch] `Allenatore.utenteId` non è una vera relazione Prisma verso `Utente` (solo una colonna `String? @unique`, nessun vincolo FK nella migrazione) — nessuna integrità referenziale, un riferimento potrebbe restare "pendente" senza alcun vincolo a livello DB. [prisma/schema.prisma, prisma/migrations/20260716090000_add_allenatore/migration.sql] — Risolto: aggiunta relazione Prisma esplicita (`utente Utente? @relation(...)`, `onDelete: SetNull`) e vincolo FK via migrazione dedicata (`prisma/migrations/20260716100000_allenatore_utente_fk/migration.sql`, applicata con `prisma migrate deploy`).
- [x] [Review][Patch] Nessuna validazione di formato sul Codice Fiscale in `precaricaAllenatore` (solo controllo di non-vuoto) — un valore palesemente non valido (es. `"123"`) occuperebbe permanentemente lo slot univoco, impedendo che il CF reale dell'allenatore possa mai corrispondere. [app/(onboarding-import)/precaricamento-allenatori/actions.ts] — Risolto: nuovo validatore `isCodiceFiscaleValido` (formato base, 16 caratteri alfanumerici) in `lib/matching-codice-fiscale/valida-codice-fiscale.ts`, integrato in `precaricaAllenatore` prima del controllo duplicati.
- [x] [Review][Patch] Incoerenza nella normalizzazione del Codice Fiscale: in `registrati/actions.ts` il CF veniva solo "trimmato", non reso maiuscolo, prima di essere passato a `trovaAllenatorePerCodiceFiscale` — funzionava comunque perché la funzione normalizza a sua volta, ma era un'incoerenza rispetto alla convenzione che le Dev Notes di questa storia si impegnano esplicitamente a rispettare "fin da subito". [app/(onboarding-import)/registrati/actions.ts] — Risolto: aggiunto `.toUpperCase()` oltre al `.trim()` esistente.
- [x] [Review][Defer] Race condition (check-then-create) su Codice Fiscale duplicato, sia in `precaricaAllenatore` sia nell'aggancio in registrazione — bassa probabilità reale (singolo Admin, piccola società, submission quasi simultanee identiche), stessa classe di problema già accettata come Defer in Story 1.3. [app/(onboarding-import)/precaricamento-allenatori/actions.ts, app/(onboarding-import)/registrati/actions.ts]
- [x] [Review][Defer] Nessun percorso di riconciliazione se il precaricamento avviene dopo l'autoregistrazione (l'Allenatore si registra senza CF, poi viene precaricato) — esplicitamente fuori scope per questa storia (AC #4/Dev Notes: "compito di una storia futura"). [app/(onboarding-import)/registrati/actions.ts]
- [x] [Review][Defer] Nessuna UI di modifica/eliminazione/elenco per i precaricamenti — fuori scope (nessun AC lo richiede), coerente con NFR6 ("keep it simple"). [app/(onboarding-import)/precaricamento-allenatori/page.tsx]
- [x] [Review][Defer] Il route guard permette per difetto ("fail-open") varianti di maiuscole/slash non normalizzate — caratteristica preesistente già loggata in `deferred-work.md` dalla Story 1.3, non introdotta qui. [lib/auth/route-guard.ts]
- [x] [Review][Defer] Nessuna validazione di lunghezza massima sul campo `nome` in `precaricaAllenatore` — valore basso/sproporzionato per uno strumento interno riservato all'Admin. [app/(onboarding-import)/precaricamento-allenatori/actions.ts]

## Dev Notes

- **Continuità dalle Story precedenti — cosa riusare:**
  - `requireRuolo` (Story 1.2, esteso in Story 1.3 per più Ruoli) per la Server Action di precaricamento.
  - `lib/ruoli.ts` (`RUOLI_VALIDI`) — già usato in `registrati/actions.ts`.
  - Convenzione errori `{ error: { code, message } }`, pattern try/catch fail-closed, normalizzazione Codice Fiscale (trim + maiuscolo — lezione di Story 1.3 code review, da applicare fin da subito qui, non solo dopo un'eventuale review).
  - Decisione già presa in Story 1.1: nessun rollback automatico se un passaggio a metà registrazione fallisce — lo stesso vale qui per l'eventuale fallimento dell'aggancio Allenatore (l'Utente resta comunque creato, l'aggancio può essere ritentato/corretto manualmente).
- **Allenatore NON è protetta da RLS — differenza esplicita dalla Story 1.3 (`Atleta`):** AD-9 elenca `Allenatore` tra le tabelle gestibili via Prisma diretto (insieme a Palestra, Campo, Slot, Gruppo, Utente, UtenteRuolo), non tra quelle RLS (`CertificatoMedico`, `Atleta`, `Presenza`, `Iscrizione`, AD-4). Questo significa: **nessuna migrazione SQL grezza per RLS qui**, `prisma.allenatore.*` diretto va benissimo (stesso pattern di `prisma.utente.*` di Story 1.1), **non** serve un modulo `lib/db-rls/` per questa entità.
- **AD-5 (motore di matching Codice Fiscale) — nuova sfumatura scoperta in questa storia:** il modulo condiviso `lib/matching-codice-fiscale/` (creato in Story 1.3 con `trovaPerCodiceFiscale` per `Atleta`) resta la casa comune per la ricerca via CF, ma l'implementazione concreta varia in base a se l'entità è RLS-protetta o no: `trovaPerCodiceFiscale` (Atleta) usa il client Supabase autenticato; `trovaAllenatorePerCodiceFiscale` (questa storia) usa Prisma diretto. Stessa cartella/modulo per coerenza con l'intento di AD-5 ("un solo posto per la logica di matching"), non un'unica funzione generica — le due entità hanno percorsi di accesso ai dati diversi per via di AD-9. Se in fase di dev-story questa interpretazione risultasse sbagliata, fermarsi e chiedere prima di procedere diversamente.
- **Cosa NON fare in questa storia:** non creare alcuna UI/logica per la gestione successiva dell'Allenatore (assegnazione a Gruppo, ecc. — Epic 2). Non introdurre alcun campo Codice Fiscale per il Ruolo Genitore (Story 1.5, aggancio a un'Atleta — logica e significato diversi, campo separato quando arriverà quella storia, non anticipare/riusare lo stesso campo). Non gestire il caso di un Allenatore precaricato che non si registra mai (nessuna pulizia/scadenza richiesta).
- **Scala e semplicità (NFR5/NFR6):** numero di Allenatori atteso piccolo (una manciata per società) — nessuna necessità di paginazione nella UI di precaricamento.

### Project Structure Notes

- File nuovi attesi: `app/(onboarding-import)/precaricamento-allenatori/actions.ts`, `app/(onboarding-import)/precaricamento-allenatori/page.tsx`, relativi test, una nuova funzione in `lib/matching-codice-fiscale/`.
- File esistenti da modificare (non ricreare): `prisma/schema.prisma` (nuovo modello), `app/(onboarding-import)/registrati/actions.ts` e `page.tsx` (Story 1.1 — logica di aggancio e nuovo campo form), `app/(onboarding-import)/registrati/actions.test.ts`, `lib/auth/route-guard.ts` e il relativo test (nuova entry).
- Nessuna modifica a `proxy.ts`, `lib/auth-admin/*`, `lib/db-rls/*` (quel modulo resta specifico per le tabelle RLS-protette, Allenatore non lo è).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1: Accesso, Popolamento e Iscrizioni / Story 1.4]
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-20]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-2, AD-5, AD-9, Structural Seed (lib/matching-codice-fiscale/)]
- [Source: _bmad-output/implementation-artifacts/1-1-registrazione-e-login-per-ruolo.md — registrati/actions.ts esistente da estendere, convenzione errori]
- [Source: _bmad-output/implementation-artifacts/1-3-import-archivio-atlete-da-export-federale.md — modulo lib/matching-codice-fiscale/ esistente, normalizzazione Codice Fiscale, pattern requireRuolo multi-Ruolo]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- **Il problema del database "shadow" di Prisma (scoperto in Story 1.3) si ripresenta per QUALSIASI migrazione futura**, non solo per quelle con SQL Supabase-specifico: `prisma migrate dev` (anche solo `--create-only`) rigioca *tutte* le migrazioni esistenti sul database shadow per calcolare il diff, quindi fallisce appena una migrazione precedente nella cronologia referenzia `auth.jwt()` — condizione ormai permanente per questo progetto da Story 1.3 in poi. Risolto scrivendo la migrazione a mano (SQL standard, nessuna sintassi Supabase-specifica qui) e applicandola con `prisma migrate deploy` (non usa il database shadow) — verificato con `prisma migrate status` che non c'è drift. Questo sarà necessario per ogni storia futura che tocca lo schema.
- Verifiche eseguite e passate: `npx vitest run` (93/93 test), `npx tsc --noEmit` (nessun errore), `npm run lint` (nessun errore), `npm run build` (build completata).
- **Verifica end-to-end reale eseguita** (Playwright, contro il backend Supabase locale, non mockato): precaricamento di un Allenatore riuscito (AC #1); secondo precaricamento con lo stesso Codice Fiscale correttamente rifiutato (AC #2, verificato via query diretta al DB: un solo record esiste); registrazione come Allenatore con lo stesso Codice Fiscale → `utenteId` del record precaricato aggiornato correttamente con l'id del nuovo Utente, nessun duplicato (AC #3, confermato via query diretta).
- **Post-review (patch applicate):** aggiunta relazione Prisma/FK `Allenatore.utenteId → Utente.id` (migrazione `20260716100000_allenatore_utente_fk`, applicata via `prisma migrate deploy` — il problema del database shadow descritto sopra si ripresenta identico anche per questa migrazione, stesso workaround). Nuovo validatore di formato `isCodiceFiscaleValido` (TDD: 4 test dedicati, poi wiring in `precaricaAllenatore` con test aggiuntivo per il caso di rifiuto). Fix normalizzazione maiuscolo in `registrati/actions.ts`. Verifiche complete ripetute e tutte verdi: `npx vitest run` (98/98 test), `npx tsc --noEmit`, `npm run lint`, `npm run build`. Verifica end-to-end ripetuta contro il backend reale: un CF di formato non valido (`"123"`) viene correttamente rifiutato (nessun record creato, confermato via query diretta al DB); un Allenatore precaricato con CF maiuscolo viene agganciato correttamente a un nuovo Utente registrato con lo stesso CF inserito in minuscolo (case-insensitive grazie alla normalizzazione simmetrica), confermato via query diretta. Dati di test ripuliti dal DB al termine.

### Completion Notes List

- Implementati Task 1-6: modello `Allenatore` (non protetto da RLS, gestito via Prisma diretto — a differenza di `Atleta`), `trovaAllenatorePerCodiceFiscale` nel modulo condiviso `lib/matching-codice-fiscale/`, Server Action `precaricaAllenatore`, aggancio in `registrati/actions.ts` (Story 1.1, esteso non ricreato), nuovo campo condizionale nel form di registrazione, UI di precaricamento, route guard esteso.
- Nessuna tabella `lib/db-rls/` creata per Allenatore (correttamente, dato che non è RLS-protetta) — coerente con la distinzione esplicita di AD-9 tra Atleta (Story 1.3) e Allenatore.
- Nessun elemento bloccato da vincoli ambientali (Docker/Supabase locale già disponibili dalle Story precedenti).

### File List

**Creati:**
- `prisma/migrations/20260716090000_add_allenatore/migration.sql`
- `prisma/migrations/20260716100000_allenatore_utente_fk/migration.sql` (post-review: FK `Allenatore.utenteId → Utente.id`)
- `lib/matching-codice-fiscale/trova-allenatore-per-codice-fiscale.ts`
- `lib/matching-codice-fiscale/trova-allenatore-per-codice-fiscale.test.ts`
- `lib/matching-codice-fiscale/valida-codice-fiscale.ts` (post-review: validazione formato CF)
- `lib/matching-codice-fiscale/valida-codice-fiscale.test.ts`
- `app/(onboarding-import)/precaricamento-allenatori/actions.ts`
- `app/(onboarding-import)/precaricamento-allenatori/actions.test.ts`
- `app/(onboarding-import)/precaricamento-allenatori/page.tsx`

**Modificati:**
- `prisma/schema.prisma` (modello `Allenatore`; post-review: relazione Prisma esplicita `utente Utente? @relation`, back-reference `Utente.allenatore`)
- `lib/matching-codice-fiscale/index.ts` (esporta anche `trovaAllenatorePerCodiceFiscale`; post-review: esporta anche `isCodiceFiscaleValido`)
- `app/(onboarding-import)/precaricamento-allenatori/actions.ts` (post-review: integrata la validazione di formato del Codice Fiscale)
- `app/(onboarding-import)/precaricamento-allenatori/actions.test.ts` (post-review: nuovo test per il rifiuto di formato non valido, fixture aggiornate a CF di formato valido)
- `app/(onboarding-import)/registrati/actions.ts` (aggancio Allenatore precaricato — Utente ora catturato dalla create per ottenerne l'id; post-review: normalizzazione maiuscolo del Codice Fiscale)
- `app/(onboarding-import)/registrati/actions.test.ts` (nuovi test per l'aggancio e i casi limite; post-review: assert aggiornato per il valore normalizzato in maiuscolo)
- `app/(onboarding-import)/registrati/page.tsx` (campo Codice Fiscale condizionale per il Ruolo Allenatore)
- `lib/auth/route-guard.ts` (nuova entry per `/precaricamento-allenatori`)
- `lib/auth/route-guard.test.ts` (nuovi test per la nuova route)

## Change Log

- 2026-07-16: Implementazione completa Story 1.4 (Task 1-6). Prima entità del progetto gestita interamente via Prisma diretto in un modulo condiviso che ospita anche una funzione RLS-aware (Atleta, Story 1.3) — differenza esplicita documentata. Tutti gli AC verificati anche contro un backend reale (Playwright + query dirette DB).
- 2026-07-16: Code review — applicate le 3 patch (FK Prisma su `Allenatore.utenteId`, validazione formato Codice Fiscale, normalizzazione maiuscolo in `registrati/actions.ts`) e 1 decisione utente (verifica d'identità solo via Codice Fiscale accettata per ora, deferita a `deferred-work.md` per un'eventuale estensione pluri-settore). Suite completa e verifica end-to-end ripetute con esito positivo. Status → done.
