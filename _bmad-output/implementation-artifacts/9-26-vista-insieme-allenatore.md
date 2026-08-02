---
baseline_commit: 4b05ac9c63e4ef425f43806ec7cb191b3f9b8d4a
---

# Story 9.26: Vista d'insieme per l'Allenatore sui propri Gruppi

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Allenatore,
I want una "Vista d'insieme" sui Gruppi che gestisco (conteggi in regola/in scadenza/scaduto dei certificati, come già esiste per il Dirigente),
so that posso valutare a colpo d'occhio la situazione certificati delle mie Atlete senza aprire ogni singola scheda.

**Note aggiuntive:** specchio diretto di `/vista-dirigente` (Story 5.1/5.2) ma scoped ai soli Gruppi dell'Allenatore, non a tutti i Gruppi del club. **Decisione tecnica presa con l'utente in fase di richiesta**: nuova pagina dedicata `/vista-allenatore` — **non** integrata in `/i-miei-gruppi` (Story 9.15, resta invariata per la gestione assegnazione Atlete). **Riuso diretto** del componente `GruppoCard` e della funzione `categorizzaStatoCertificato`, entrambi già esistenti in `app/(amministrazione)/vista-dirigente/` — stesso pattern di cross-import già stabilito in questo progetto (`conferma-certificati/page.tsx`, Story 9.23/9.25, importa già `categorizzaStatoCertificato` da quel modulo per lo stesso motivo). **Nessuna restrizione granulare** tipo `GruppoVisibileDirigente` (Story 5.2) si applica qui: un Allenatore ha già accesso pieno ai certificati delle Atlete dei propri Gruppi (policy RLS `allenatore_tutte_atlete_select`/`allenatore_proprie_atlete_certificato_select`, Story 9.12/9.15/9.19) — `conteggi` non sarà quindi **mai** `null` in questa pagina, il ramo "fuori dai permessi configurati" di `GruppoCard` semplicemente non si attiva mai qui. **Nessuna modifica a `GruppoCard.tsx`/`categorizza-stato-certificato.ts`** — riusati byte-per-byte invariati.

## Acceptance Criteria

1. **Given** un Allenatore agganciato al proprio profilo **When** visita `/vista-allenatore` **Then** vede una card per ciascun proprio Gruppo (stagione corrente) con i conteggi in regola/in scadenza/scaduto delle proprie Atlete, stesso drill-down cliccabile già esistente in `/vista-dirigente`
2. **Given** un Allenatore che non gestisce ancora nessun Gruppo **When** visita la pagina **Then** vede un messaggio esplicito, nessun errore
3. **Given** un Utente con un Ruolo diverso da ALLENATORE **When** tenta di visitare `/vista-allenatore` **Then** l'operazione viene rifiutata (route-guard, stesso pattern di ogni altra rotta a Ruolo singolo)
4. **And** nessuna regressione su `/vista-dirigente` né su `/i-miei-gruppi` (entrambe invariate) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [ ] Task 1: Route-guard (AC: #3)
  - [ ] `lib/auth/route-guard.ts`: nuova voce `{ prefix: "/vista-allenatore", ruoliAmmessi: ["ALLENATORE"], navLabel: "Vista d'insieme" }` — stessa `navLabel` di `/vista-dirigente` (riga 88, `ruoliAmmessi: ["DIRIGENTE"]`) per coerenza semantica: un Utente vede solo una delle due voci nella pratica (Ruoli mutuamente esclusivi nel caso comune). **Caso limite noto e accettato**: un Utente con **entrambi** i Ruoli ALLENATORE e DIRIGENTE vedrebbe due voci di navigazione identiche ("Vista d'insieme") che puntano a pagine diverse — nessuna azione richiesta, stesso livello di tolleranza già accettato altrove nel progetto per casi multi-Ruolo a bassa probabilità
  - [ ] `lib/auth/route-guard.test.ts`: nuovo test — ALLENATORE ammesso, altri Ruoli (es. ADMIN, DIRIGENTE) rediretti a `/non-autorizzato`
  - [ ] `lib/auth/voci-navigazione.test.ts`: **nessuna modifica necessaria** — `filtraVociNavigazione`/`isVoceAttiva` sono già generici, derivano automaticamente dalla nuova voce di `PROTECTED_ROUTES` senza bisogno di codice nuovo (verificare comunque che i test esistenti restino verdi)
- [ ] Task 2: Nuova pagina `/vista-allenatore` (AC: #1, #2)
  - [ ] Nuova cartella `app/(gruppi-allenatori)/vista-allenatore/page.tsx` (stesso route group `(gruppi-allenatori)` di `/i-miei-gruppi`, non `(amministrazione)`: questa pagina è self-service Allenatore, non gestione Admin/Dirigente — AD-2, stesso principio già seguito per `/i-miei-gruppi`)
  - [ ] `export const dynamic = "force-dynamic"` (i conteggi dipendono da "oggi", stesso motivo di `/vista-dirigente`)
  - [ ] Risolvere l'Allenatore dalla sessione (`prisma.allenatore.findFirst({ where: { utente: { supabaseAuthId: user.id } } })`, stesso pattern esatto di `i-miei-gruppi/page.tsx` righe 29-33) — se nullo, stesso messaggio "account non ancora collegato a un profilo Allenatore" già usato lì
  - [ ] Risolvere `annoCorrente` (`trovaAnnoAgonisticoCorrente()`, mai `risolviAnnoAgonisticoCorrente()` in una pagina GET — Dev Notes Story 1.6/2.2)
  - [ ] Query Gruppi propri: `prisma.gruppo.findMany({ where: { annoAgonisticoId: annoCorrente.id, allenatori: { some: { allenatoreId: allenatore.id } } }, orderBy: { nome: "asc" }, include: { slot: { include: { campo: { include: { palestra: true } } }, orderBy: [{ giorno: "asc" }, { oraInizio: "asc" }] } } })` — combina il filtro di possesso di `i-miei-gruppi/page.tsx` (righe 51-59) con l'`include` di `vista-dirigente/page.tsx` (righe 48-57, necessario per popolare `slotFormattati` di `GruppoCard`)
  - [ ] `Promise.all` per `gruppoAtleteRows` (scoped a `gruppoId: { in: gruppiPropri.map(g => g.id) }`, stesso pattern di `i-miei-gruppi/page.tsx` righe 71-79), `elencaAtlete(supabase)`, `elencaCertificati(supabase)` — **nessuna query `gruppoVisibileDirigente`** (non applicabile ad Allenatore, vedi Note aggiuntive)
  - [ ] Costruire `GruppoCardData[]` con lo stesso identico ciclo di calcolo di `vista-dirigente/page.tsx` (righe 82-173: `oggi`, mappe per id, ciclo `categorizzaStatoCertificato` per Atleta, popolamento `atleteScadute`/`atleteInScadenza` ordinati alfabeticamente, `console.warn` difensivo se un'Atleta non risolvibile) — **`conteggi` calcolato sempre** (mai il ramo `null` di Story 5.2, che non si applica qui)
  - [ ] Import diretti: `import { categorizzaStatoCertificato } from "@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato"` e `import { GruppoCard, type GruppoCardData } from "@/app/(amministrazione)/vista-dirigente/GruppoCard"` — **nessuna copia**, riuso letterale
  - [ ] Markup: `<h1>Vista d'insieme</h1>`, messaggio vuoto se `gruppiPropri.length === 0` ("Non gestisci ancora nessun Gruppo."), altrimenti `<div className={stylesVistaDirigente.lista}>{cardData.map(...)}</div>` — riusando la classe `.lista` da `@/app/(amministrazione)/vista-dirigente/vista-dirigente.module.css` (stesso import cross-modulo di `GruppoCard`, nessun nuovo file CSS necessario per questa storia)
- [ ] Task 3: Verifica regressione (AC: #4)
  - [ ] Suite Vitest completa: tutti i test esistenti devono continuare a passare, più il nuovo test di `route-guard.test.ts`
  - [ ] `npx tsc --noEmit` ed ESLint puliti
  - [ ] Nessuna modifica a `/vista-dirigente` (pagina, `GruppoCard.tsx`, `categorizza-stato-certificato.ts`) né a `/i-miei-gruppi` — solo lettura/riuso
  - [ ] Nessun test di rendering per la nuova pagina (coerente con la convenzione già stabilita nel progetto)

## Dev Notes

- **Perimetro esatto**: 1 nuova voce in `lib/auth/route-guard.ts` (+ 1 test), nuova cartella `app/(gruppi-allenatori)/vista-allenatore/page.tsx`. Nessuna migrazione, nessuna nuova Server Action, nessuna nuova funzione pura, nessun file CSS nuovo (riuso cross-modulo di `vista-dirigente.module.css` e del componente `GruppoCard.tsx`).
- **Perché il riuso cross-modulo è già un pattern accettato**: `app/(certificati-medici)/conferma-certificati/page.tsx` (Story 9.23) importa già `categorizzaStatoCertificato` da `@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato` — questa storia estende lo stesso principio a `GruppoCard.tsx` (componente puramente presentazionale, nessuna mutazione, nessun accoppiamento specifico al Ruolo DIRIGENTE se non nel ramo `conteggi === null`, che qui non si attiva mai).
- **`GruppoCard` non necessita ALCUNA modifica**: accetta già `conteggi: {...} | null` — per questa storia sarà sempre l'oggetto calcolato (mai `null`), il ramo "Fuori dai permessi configurati" resta morto codice per questa pagina ma non causa danno (non è mai raggiunto). Non aggiungere logica per "nascondere" quel ramo: non necessario, non richiesto da alcun AC.
- **Pattern di risoluzione Allenatore identico a `/i-miei-gruppi`**: stesso blocco `prisma.allenatore.findFirst` + messaggio "non ancora collegato" — copiare quel pattern esatto, non reinventarlo.
- **Nessuna restrizione `GruppoVisibileDirigente`**: quella tabella/quel concetto (Story 5.2) è specifico del Ruolo DIRIGENTE e dei permessi granulari sui dati sanitari per Dirigente — non ha alcun significato per un Allenatore che vede sempre e solo i propri Gruppi (accesso già naturalmente scoped dall'assegnazione `GruppoAllenatore`). Non introdurre alcuna query/verifica analoga qui.
- **Route group `(gruppi-allenatori)`, non `(amministrazione)`**: questa è una pagina self-service Allenatore (AD-2, stesso principio di `/i-miei-gruppi`, `/mio-orario`, `/il-mio-profilo`) — pur riusando componenti dal modulo `(amministrazione)`, la pagina stessa appartiene al modulo dell'Allenatore.
- **File NON da toccare**: `app/(amministrazione)/vista-dirigente/page.tsx`, `GruppoCard.tsx`, `categorizza-stato-certificato.ts`, `vista-dirigente.module.css` (riusati invariati, solo importati), `app/(gruppi-allenatori)/i-miei-gruppi/*` (pagina distinta, resta come oggi).

### Project Structure Notes

- File nuovi: `app/(gruppi-allenatori)/vista-allenatore/page.tsx`.
- File modificati: `lib/auth/route-guard.ts`, `lib/auth/route-guard.test.ts`.
- Nessun file eliminato, nessuna migrazione, nessun nuovo file CSS.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.26: Vista d'insieme per l'Allenatore sui propri Gruppi]
- [Source: app/(amministrazione)/vista-dirigente/page.tsx — struttura completa da replicare (query, ciclo di calcolo conteggi/drill-down, righe 25-189), da NON modificare, solo da leggere come riferimento]
- [Source: app/(amministrazione)/vista-dirigente/GruppoCard.tsx — componente da riusare invariato via import cross-modulo]
- [Source: app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts — funzione da riusare invariata]
- [Source: app/(gruppi-allenatori)/i-miei-gruppi/page.tsx — pattern di risoluzione Allenatore/Gruppi propri da replicare (righe 17-59)]
- [Source: lib/auth/route-guard.ts riga 88 — voce /vista-dirigente esistente, pattern da replicare per /vista-allenatore]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
