---
baseline_commit: 71f06278cbf5857463fc781f8a316c60b99059e5
---

# Story 9.32: Rimuovere un Allenatore da un Gruppo

Status: ready-for-dev

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

- [ ] Task 1: Server Action `rimuoviAllenatore` (AC: #2, #3, #4, #5)
  - [ ] In `app/(gruppi-allenatori)/gruppi/actions.ts`, nuova funzione `rimuoviAllenatore(_prevState, formData)` — mirror strutturale di `rimuoviAtleta` (righe 273-333) ma **senza** la risoluzione `annoAgonisticoId`/`risolviPossessoGruppo` (quel controllo esiste in `rimuoviAtleta` solo perché ammette anche ALLENATORE self-service, Story 9.15 — qui il perimetro è Admin/Dirigente-only come `assegnaAllenatore`, nessun controllo di possesso necessario).
  - [ ] `requireRuolo(["ADMIN", "DIRIGENTE"])` (stesso array di `assegnaAllenatore`, riga 150).
  - [ ] Legge `gruppoId`/`allenatoreId` da `formData`, valida entrambi non vuoti (stessi messaggi di errore di `assegnaAllenatore`: "Gruppo non specificato."/"Allenatore non specificato.").
  - [ ] `prisma.gruppoAllenatore.deleteMany({ where: { gruppoId, allenatoreId } })` — `deleteMany`, non `delete`, per l'idempotenza richiesta dall'AC #3 (stesso principio di `rimuoviAtleta`, commento riga 316-319).
  - [ ] `catch` generico → `{ error: { code: "INTERNAL", message: "Impossibile rimuovere l'Allenatore. Riprova." } }`, `revalidatePath("/gruppi")` sul percorso felice.
- [ ] Task 2: Componente `AllenatoreAssegnato.tsx` (AC: #1, #2)
  - [ ] Nuovo file `app/(gruppi-allenatori)/gruppi/AllenatoreAssegnato.tsx`, `"use client"` — mirror 1:1 di `AtletaAssegnata.tsx`: `useActionState(rimuoviAllenatore, undefined)`, `<form onSubmit>` con `window.confirm(\`Rimuovere ${allenatore.nome} ${allenatore.cognome} dal Gruppo ${gruppoNome}?\`)`, hidden input `gruppoId`/`allenatoreId`, pulsante con `aria-label` dedicato.
  - [ ] `GruppoRow.tsx`: il ciclo `gruppo.allenatori.map(...)` (riga 79-84, oggi un `<li>` statico) sostituito da `<AllenatoreAssegnato key={allenatore.id} gruppoId={gruppo.id} gruppoNome={gruppo.nome} allenatore={allenatore} />` — stesso schema già usato per `gruppo.atlete.map(...)` due righe sotto (116-125).
- [ ] Task 3: Test
  - [ ] `app/(gruppi-allenatori)/gruppi/actions.test.ts` (esteso): FORBIDDEN per Ruoli diversi da ADMIN/DIRIGENTE (incluso esplicitamente ALLENATORE, a differenza di `rimuoviAtleta`), VALIDATION su `gruppoId`/`allenatoreId` mancanti, successo con `deleteMany`, idempotenza (due chiamate consecutive non generano errore), INTERNAL su errore Prisma.
  - [ ] Nessun test di rendering per `AllenatoreAssegnato.tsx` (convenzione già accettata in tutto il progetto per componenti di riga analoghi, es. `AtletaAssegnata.tsx`/`TesseramentoRow.tsx`).
  - [ ] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

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

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-08-06: File di story creato, stato ready-for-dev.
