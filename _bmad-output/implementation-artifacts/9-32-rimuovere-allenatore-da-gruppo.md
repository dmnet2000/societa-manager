---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 9.32: Rimuovere un Allenatore da un Gruppo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want poter rimuovere un Allenatore già assegnato a un Gruppo,
so that possa correggere assegnazioni errate o riorganizzare gli Allenatori tra Gruppi senza dover ricorrere al database.

## Acceptance Criteria

1. **Given** un Admin o Dirigente su `/gruppi` **When** vede un Allenatore assegnato a un Gruppo **Then** trova un pulsante "Rimuovi" accanto al suo nome (mirror di `AtletaAssegnata.tsx`).
2. **Given** l'Admin/Dirigente clicca "Rimuovi" **When** conferma il `window.confirm` (stesso pattern di conferma di `AtletaAssegnata.tsx`, testo analogo) **Then** l'Allenatore non è più assegnato a quel Gruppo, la lista si aggiorna senza reload.
3. **And** operazione idempotente (`deleteMany`, non `delete` su chiave singola) — un doppio click o un retry di rete non produce errori.
4. **And** nessuna regressione sull'assegnazione esistente (`assegnaAllenatore`) né sulla gestione Atlete nella stessa riga (`assegnaAtleta`/`rimuoviAtleta`/`creaEAssegnaAtleta`) — solo additivo.
5. **And** stesso perimetro di Ruoli di `assegnaAllenatore` (`requireRuolo(["ADMIN", "DIRIGENTE"])`) — a differenza di `rimuoviAtleta`, che ammette anche ALLENATORE sul proprio Gruppo (Story 9.15): qui nessun accesso Allenatore, coerente con `assegnaAllenatore` che è già Admin/Dirigente-only oggi.

## Tasks / Subtasks

- [x] Task 1: Server Action `rimuoviAllenatore` (AC: #2, #3, #4, #5)
  - [x] In `app/(gruppi-allenatori)/gruppi/actions.ts`, nuova funzione `rimuoviAllenatore(_prevState, formData)` — mirror strutturale di `rimuoviAtleta` (righe 273-333) ma **senza** la risoluzione `annoAgonisticoId`/`risolviPossessoGruppo` (quel controllo esiste in `rimuoviAtleta` solo perché ammette anche ALLENATORE self-service, Story 9.15 — qui il perimetro è Admin/Dirigente-only come `assegnaAllenatore`, nessun controllo di possesso necessario).
  - [x] `requireRuolo(["ADMIN", "DIRIGENTE"])` (stesso array di `assegnaAllenatore`, riga 150).
  - [x] Legge `gruppoId`/`allenatoreId` da `formData`, valida entrambi non vuoti (stessi messaggi di errore di `assegnaAllenatore`: "Gruppo non specificato."/"Allenatore non specificato.").
  - [x] `prisma.gruppoAllenatore.deleteMany({ where: { gruppoId, allenatoreId } })` — `deleteMany`, non `delete`, per l'idempotenza richiesta dall'AC #3 (stesso principio di `rimuoviAtleta`, commento riga 316-319).
  - [x] `catch` generico → `{ error: { code: "INTERNAL", message: "Impossibile rimuovere l'Allenatore. Riprova." } }`, `revalidatePath("/gruppi")` sul percorso felice.
- [x] Task 2: Componente `AllenatoreAssegnato.tsx` (AC: #1, #2)
  - [x] Nuovo file `app/(gruppi-allenatori)/gruppi/AllenatoreAssegnato.tsx`, `"use client"` — mirror 1:1 di `AtletaAssegnata.tsx`: `useActionState(rimuoviAllenatore, undefined)`, `<form onSubmit>` con `window.confirm(\`Rimuovere ${allenatore.nome} ${allenatore.cognome} dal Gruppo ${gruppoNome}?\`)`, hidden input `gruppoId`/`allenatoreId`, pulsante con `aria-label` dedicato.
  - [x] `GruppoRow.tsx`: il ciclo `gruppo.allenatori.map(...)` (riga 79-84, oggi un `<li>` statico) sostituito da `<AllenatoreAssegnato key={allenatore.id} gruppoId={gruppo.id} gruppoNome={gruppo.nome} allenatore={allenatore} />` — stesso schema già usato per `gruppo.atlete.map(...)` due righe sotto (116-125).
- [x] Task 3: Test
  - [x] `app/(gruppi-allenatori)/gruppi/actions.test.ts` (esteso): FORBIDDEN per Ruoli diversi da ADMIN/DIRIGENTE (incluso esplicitamente ALLENATORE, a differenza di `rimuoviAtleta`), VALIDATION su `gruppoId`/`allenatoreId` mancanti, successo con `deleteMany`, idempotenza (due chiamate consecutive non generano errore), INTERNAL su errore Prisma.
  - [x] Nessun test di rendering per `AllenatoreAssegnato.tsx` (convenzione già accettata in tutto il progetto per componenti di riga analoghi, es. `AtletaAssegnata.tsx`/`TesseramentoRow.tsx`).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Pattern da riusare (non reinventare)

- **Server Action di rimozione idempotente**: mirror quasi 1:1 di `rimuoviAtleta` (`app/(gruppi-allenatori)/gruppi/actions.ts:273-333`, letto per intero in fase di analisi) — stessa forma `deleteMany`, stesso stile di errore. L'unica differenza reale è l'assenza del controllo `risolviPossessoGruppo`/risoluzione `annoAgonisticoId`, che in `rimuoviAtleta` esiste solo per ammettere l'Allenatore self-service (Story 9.15) — non applicabile qui, dove il perimetro resta Admin/Dirigente come in `assegnaAllenatore`.
- **Componente riga con conferma**: mirror 1:1 di `AtletaAssegnata.tsx` (letto per intero) — stesso `window.confirm`, stesso `useActionState` isolato per riga (necessario: il numero di Allenatori per Gruppo è variabile, gli Hook non possono essere chiamati in un ciclo).
- **Nessuna modifica al modello dati**: `GruppoAllenatore` esiste già (Story 2.3), tabella di giunzione pura senza colonne aggiuntive necessarie per questa storia.

### Perché nessun controllo di possesso Gruppo

A differenza di `assegnaAtleta`/`rimuoviAtleta` (che ammettono anche ALLENATORE sul proprio Gruppo, Story 9.15, e quindi hanno bisogno di `risolviPossessoGruppo` per limitare l'azione al Gruppo posseduto), `assegnaAllenatore` è **già oggi** Admin/Dirigente-only (`requireRuolo(["ADMIN", "DIRIGENTE"])`, riga 150) — un Allenatore non può assegnare né quindi (per simmetria, AC #5) rimuovere altri Allenatori. Nessun controllo di possesso necessario: Admin/Dirigente hanno già accesso ampio a ogni Gruppo.

### Riferimenti

- [Source: app/(gruppi-allenatori)/gruppi/actions.ts] — `assegnaAllenatore` (146-180, perimetro Ruoli da mirrorare), `rimuoviAtleta` (273-333, pattern da mirrorare).
- [Source: app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx] — componente da mirrorare 1:1.
- [Source: app/(gruppi-allenatori)/gruppi/GruppoRow.tsx] — punto di integrazione (righe 78-84).
- [Source: _bmad-output/implementation-artifacts/9-14-rimozione-atleta-da-gruppo.md] — story originale del pattern rimosso, decisioni già prese da riusare invariate.

### Project Structure Notes

- Nuovo file: `app/(gruppi-allenatori)/gruppi/AllenatoreAssegnato.tsx`.
- Modificati: `app/(gruppi-allenatori)/gruppi/actions.ts` (+`rimuoviAllenatore`), `GruppoRow.tsx` (sostituzione ciclo allenatori).
- Nessuna migrazione, nessuna modifica a `prisma/schema.prisma`.

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor) sul diff completo della story (contro il baseline pre-story, non solo le modifiche non ancora committate).

**Acceptance Auditor**: nessuna violazione degli AC — tutti e 5 verificati indipendentemente, incluso il controllo puntuale su AC #4 (nessuna riga di `assegnaAllenatore`/`assegnaAtleta`/`rimuoviAtleta`/`creaEAssegnaAtleta` toccata).

- [x] [Review][Patch] `rimuoviAllenatore` non chiamava `revalidatePath("/i-miei-gruppi")` — quella pagina calcola i Gruppi propri di un Allenatore filtrando proprio su `GruppoAllenatore` (`allenatori: { some: { allenatoreId } }`), la stessa tabella appena modificata. Stesso identico bug già trovato e corretto per `assegnaAtleta`/`rimuoviAtleta` in questo file (commento "review fix Story 9.15"). Trovato dal Blind Hunter. Corretto: aggiunta `revalidatePath("/i-miei-gruppi")`, test aggiornato. [app/(gruppi-allenatori)/gruppi/actions.ts:219-224]

- [x] [Review][Defer] `assegnaAllenatore` (funzione sorella, non toccata da questo diff) ha lo stesso identico gap — mai chiamato `revalidatePath("/i-miei-gruppi")` fin dalla sua introduzione (Story 2.3) — deferred, pre-esistente: fuori dal perimetro di questo diff, non introdotto né aggravato da questa storia; segnalato qui perché scoperto durante la stessa indagine, da correggere in una story dedicata insieme al fix sopra se si vuole simmetria completa. [app/(gruppi-allenatori)/gruppi/actions.ts]
- [x] [Review][Defer] Nessun controllo `findUnique`/"Gruppo non trovato" prima di `deleteMany`, a differenza di `rimuoviAtleta` — un `gruppoId` inesistente produce un `{ success: true }` silenzioso invece di un errore esplicito, asimmetrico rispetto ad `assegnaAllenatore` (che fallisce rumorosamente su violazione FK) (Blind Hunter + Edge Case Hunter, trovato indipendentemente da entrambi). Deferred: e' la semantica intrinseca di un `deleteMany` idempotente (esattamente il comportamento richiesto dall'AC #3 — "rimuovere qualcosa che non c'e' piu' appare come successo, per design"), non un difetto — gli id provengono sempre da un bottone realmente renderizzato in una pagina Admin/Dirigente-only, mai da input libero, stesso principio gia' accettato ripetutamente in questo progetto. [app/(gruppi-allenatori)/gruppi/actions.ts]
- [x] [Review][Defer] `window.confirm()` duplicato per la terza volta nel progetto (dopo `AtletaAssegnata.tsx` e, per lo stesso pattern, `AllenatoreRow.tsx`/`SlotRow.tsx`) senza un hook/componente condiviso (Blind Hunter) — deferred: refactoring architetturale che tocca file gia' spediti, sproporzionato per una story di mirroring; nessun precedente di estrazione nonostante due occorrenze gia' esistenti prima di questa storia. [app/(gruppi-allenatori)/gruppi/AllenatoreAssegnato.tsx]
- [x] [Review][Defer] `AllenatoreAssegnato.tsx` riusa la classe CSS `styles.atletaAssegnata` (nome che cita "Atleta") per una riga di Allenatore (Blind Hunter) — deferred: puramente cosmetico (nessun impatto visivo o funzionale, la classe rappresenta correttamente il pattern "riga entita'-assegnata"), un rename pulito richiederebbe toccare anche `AtletaAssegnata.tsx` (gia' spedito) per coerenza, fuori scope per una singola story di mirroring.

**Dismessi come rumore/convenzioni già accettate (7)**: nessun test di rendering per `AllenatoreAssegnato.tsx` (stessa convenzione già accettata per `AtletaAssegnata.tsx`/`TesseramentoRow.tsx` e praticamente ogni componente-riga del progetto); verifica dal vivo del flusso UI reale non eseguibile in questo sandbox (stesso limite di ogni storia precedente); `rimuoviAllenatore` non collegata al sistema di permessi configurabili dell'Epic 12 (`requireRuolo(..., rotta)`) — mirror esatto di `assegnaAllenatore`, mai migrata, migrazione deliberatamente incrementale una rotta alla volta (Story 12.4); i test di autorizzazione verificano solo che `requireRuolo` sia stato chiamato con l'array corretto, non la sua logica interna — stesso identico pattern di mock usato in ogni file di test di Server Action di questo progetto; percorso `console.error(err)` non asserito da alcun test — stessa convenzione non testata ovunque nel progetto; nessun caso di test dedicato "ultimo Allenatore rimosso da un Gruppo" — già indirizzato esplicitamente nei Dev Notes della story (stesso principio di `GruppoAtleta`, Story 9.14 AC #1, tabella di giunzione pura senza righe dipendenti, confermato anche dall'Edge Case Hunter dopo aver verificato lo schema); tipo `Allenatore` dichiarato in `AllenatoreAssegnato.tsx` non condiviso col punto di query Prisma — stesso identico pattern già presente e accettato per `Atleta` in `AtletaAssegnata.tsx`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

Nessuno — nessuna migrazione, nessun accesso DB necessario.

### Completion Notes List

- Implementate tutte le 3 Task/5 AC della story: `rimuoviAllenatore` (mirror di `rimuoviAtleta` ma senza risoluzione `annoAgonisticoId`/`risolviPossessoGruppo`, perimetro Admin/Dirigente-only come `assegnaAllenatore`), `AllenatoreAssegnato.tsx` (mirror 1:1 di `AtletaAssegnata.tsx`), `GruppoRow.tsx` aggiornato per usare il nuovo componente (tipo `Allenatore` ora importato da `AllenatoreAssegnato.tsx` invece che dichiarato localmente).
- Nessuna deviazione dal piano della story — tutti i pattern erano già identificati in Dev Notes (mirror diretto di `rimuoviAtleta`/`AtletaAssegnata.tsx`).
- Verifica dal vivo (click reale su "Rimuovi", conferma `window.confirm`) non eseguibile in questo sandbox — stesso limite delle storie precedenti. Verificato tutto il resto: 948/948 test Vitest passati (era 942, +6), `eslint` pulito, `npx tsc --noEmit` pulito, `npm run build` riuscita.

### File List

**Nuovi:**
- `app/(gruppi-allenatori)/gruppi/AllenatoreAssegnato.tsx`

**Modificati:**
- `app/(gruppi-allenatori)/gruppi/actions.ts` (+`rimuoviAllenatore`)
- `app/(gruppi-allenatori)/gruppi/actions.test.ts` (+6 test)
- `app/(gruppi-allenatori)/gruppi/GruppoRow.tsx` (ciclo allenatori sostituito, tipo `Allenatore` importato invece di dichiarato localmente)

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
- 2026-08-06: Story implementata (Task 1-3 completi). `rimuoviAllenatore` (mirror di `rimuoviAtleta`, Admin/Dirigente-only, `deleteMany` idempotente), `AllenatoreAssegnato.tsx` (mirror 1:1 di `AtletaAssegnata.tsx`), `GruppoRow.tsx` aggiornato. 948/948 test Vitest passati (era 942), 0 errori tsc/eslint, build produzione riuscita. Status: review, in attesa di code review adversariale.
- 2026-08-06: Code review completata (3 layer adversariali paralleli su tutto il diff della story, non solo le modifiche non committate: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: nessuna violazione degli AC. 1 patch applicato: mancava `revalidatePath("/i-miei-gruppi")` — stesso identico bug già corretto per `assegnaAtleta`/`rimuoviAtleta` nello stesso file (Story 9.15), qui perpetuato dal mirroring; corretto, test aggiornato. 4 defer (gap identico pre-esistente in `assegnaAllenatore`, funzione sorella non toccata da questo diff; nessun controllo "Gruppo non trovato" prima di `deleteMany` — semantica intrinseca di un delete idempotente, non un difetto; `window.confirm()` triplicato senza hook condiviso; classe CSS `atletaAssegnata` riusata per una riga Allenatore) — tutti coerenti con pattern/limiti già accettati ripetutamente in questo progetto, vedi `deferred-work.md`. 7 dismessi come convenzioni già accettate. 948/948 test Vitest passati, 0 errori tsc/eslint dopo il fix, build produzione riuscita. Status: done.
