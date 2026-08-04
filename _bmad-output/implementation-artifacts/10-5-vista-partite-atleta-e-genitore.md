---
baseline_commit: 3fb3ebd1c062e7f27ee3b8f11a08377e257d54a3
---

# Story 10.5: Vista partite per Atleta e Genitore

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Atleta o Genitore,
I want vedere le partite del proprio Gruppo/della propria figlia,
so that so quando e dove si gioca, con indicazioni per raggiungere il luogo.

**Note aggiuntive:** ultima story dell'Epic 10 (le altre 6 sono tutte `done`). Estende `/partite` (Story 10.3/10.4, oggi riservata a `["ADMIN","DIRIGENTE","ALLENATORE"]`) per ammettere anche `ATLETA`/`GENITORE`, in sola lettura.

## Acceptance Criteria

1. **Given** un'Atleta **When** visita la vista partite **Then** vede le partite di tutti i Campionati a cui il proprio Gruppo partecipa
2. **Given** un Genitore **When** visita la vista partite **Then** vede le partite del Gruppo della propria figlia (stesso aggancio Genitore↔Atleta già esistente, AD-10/Story 1.5)
3. **Given** una Partita con indirizzo **When** visualizzata **Then** mostra lo stesso pulsante "Naviga" già disponibile per Allenatore/Dirigente/Admin (Story 10.3)
4. **Given** un'Atleta o un Genitore **When** visita la pagina **Then** non ha alcuna possibilità di modifica (sola lettura, a differenza di Allenatore/Admin/Dirigente) — nessun bottone "Modifica"/"Cancella" visibile, colonna "Azioni" assente
5. **And** un'Atleta assegnata a più Gruppi nella stessa stagione (Story 9.21) vede le partite di **tutti** i Gruppi a cui è assegnata, non di uno solo
6. **And** un Genitore con più di un'Atleta agganciata vede un selettore per scegliere quale, stesso identico pattern già stabilito in `certificato-medico/page.tsx` (Story 4.1/1.5) — con una sola Atleta agganciata, nessun selettore, risoluzione automatica
7. **And** nessuna regressione sul comportamento esistente di `/partite` per Admin/Dirigente/Allenatore (Story 10.3/10.4) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [x] Task 1: Route-guard — ammettere ATLETA/GENITORE su `/partite` (AC: #1, #2)
  - [x] `lib/auth/route-guard.ts`: estendere `ruoliAmmessi` della rotta `/partite` da `["ADMIN","DIRIGENTE","ALLENATORE"]` a `["ADMIN","DIRIGENTE","ALLENATORE","ATLETA","GENITORE"]` — stesso pattern già usato per `/certificato-medico` (riga 66, `["GENITORE","ATLETA"]`), che compare anche nella barra di navigazione per questi Ruoli (nessuna azione aggiuntiva richiesta, `navLabel` già esistente) — aggiornato anche `route-guard.test.ts` (il vecchio test asseriva ATLETA rifiutata, ora sostituito con un test che verifica ATLETA/GENITORE ammessi). 61/61 test passati.
- [x] Task 2: `page.tsx` — risoluzione identità Atleta/Genitore (AC: #1, #2, #5, #6)
  - [x] `app/(partite-campionati)/partite/page.tsx`: accettare `searchParams` (Promise, stesso pattern Next.js 16 già usato in `certificato-medico/page.tsx`/`storico-presenze/page.tsx`) per `atletaId` (selezione esplicita quando serve un selettore)
  - [x] Dopo la risoluzione esistente di `eGestionale`/`allenatore`, se nessuno dei due si applica: risolvere `atletaIds` tramite `prisma.genitoreAtleta.findMany({ where: { utente: { supabaseAuthId: user.id } }, select: { atletaId: true } })` — **SENZA** `autoAggancio: true` (a differenza di `storico-presenze`/`dati-fisici`/"il mio storico": qui sia l'aggancio a se stessa sia quello Genitore↔figlia danno lo stesso diritto di visualizzazione, AC #1/#2, stesso principio già stabilito in `certificato-medico/page.tsx` righe 43-46)
  - [x] Se `atletaIds.length === 0` (nessun Allenatore, nessuna Atleta/figlia agganciata): messaggio "account non collegato", stesso testo/pattern già presente
  - [x] Risolvere `proprieAtlete` (via `elencaAtlete(supabase)`, RLS) e `atletaIdCorrente`: **identico** al pattern di `certificato-medico/page.tsx` righe 68-86 (con 1 sola Atleta risolta, auto-selezione; con più di una, richiede `atletaIdSelezionato` esplicito da `searchParams`, altrimenti stringa vuota)
  - [x] Sezione selettore (solo se `proprieAtlete.length > 1`): stesso identico form/markup di `certificato-medico/page.tsx` righe 88-114 (`<select name="atletaId">`, `method="get"`) — riusa `.campo`/`.bottone` già esistenti in `partite.module.css`, esteso `.campo` per stilizzare anche `<select>` (prima copriva solo `<input>`, i due form preesistenti in questo file non avevano mai un `<select>`)
- [x] Task 3: `page.tsx` — query Partite scoped per Atleta (AC: #1, #2, #5)
  - [x] Estendere il filtro esistente (`filtroAllenatore`): per Atleta/Genitore, `{ atlete: { some: { atletaId: atletaIdCorrente } } }` sul Gruppo — **relazione `some`, non un `gruppoId` fisso** (stesso pattern già verificato sicuro in `app/(orari-palestre)/mio-orario/page.tsx` durante l'investigazione della Story 9.21: gestisce correttamente un'Atleta assegnata a più Gruppi, AC #5, senza bisogno di alcun codice aggiuntivo per il caso multi-Gruppo)
  - [x] Se nessuna Atleta è ancora selezionata (Genitore con più figlie, nessuna scelta fatta) la query non deve essere eseguita — nessuna Partita mostrata finché `atletaIdCorrente` non è risolto, mai una query senza filtro che esporrebbe le partite di Gruppi non pertinenti
- [x] Task 4: Vista di sola lettura — nessuna colonna Azioni (AC: #3, #4)
  - [x] Nuova variabile `puoModificare = eGestionale || !!allenatore` in `page.tsx`
  - [x] `<th>Azioni</th>` nell'header renderizzato solo se `puoModificare` (6 colonne invece di 7 per Atleta/Genitore)
  - [x] Nel `.map` delle partite: se `puoModificare`, invariato (`<PartitaRow>`, Story 10.4, Modifica/Cancella già server-autorizzati oltre che ora anche UI-gated); se non `puoModificare`, un `<tr>` statico inline (sola lettura, nessun Client Component, nessun `useActionState` inutile per un Ruolo che non può mai submittare) con le stesse 6 celle di sola visualizzazione già presenti in `PartitaRow.tsx` (data formattata, ora, squadre, luogo+link Naviga tramite `costruisciLinkNaviga` già esistente, Gruppo, Campionato) — **nessuna colonna Azioni**
  - [x] Nessuna modifica a `PartitaRow.tsx`/`EliminaPartitaForm.tsx`/`aggiornaPartita`/`cancellaPartita` — l'autorizzazione server-side di quelle Server Action è già corretta e sufficiente (`requireRuolo(["ADMIN","DIRIGENTE","ALLENATORE"])`), questa storia aggiunge solo il gating UI mancante per un Ruolo che oggi non può nemmeno raggiungere la pagina
- [x] Task 5: Verifica regressione (AC: #7)
  - [x] Suite Vitest completa: tutti i test passano, nessuna regressione sui test esistenti di `aggiornaPartita`/`cancellaPartita`/`raggruppaPerSettimana` — 850/850 (era 849/849, +1 nuovo test route-guard)
  - [x] `npx tsc --noEmit` pulito; ESLint pulito sul modulo `(partite-campionati)` e su `lib/auth/route-guard.ts`
  - [x] Nessun test di rendering per `page.tsx` (Server Component — nessun file di test esiste già per `partite/page.tsx`, coerente con le altre pagine di lista di questo progetto)
  - [x] Verifica manuale dal vivo demandata all'utente dopo il deploy (nessuna istanza Supabase locale disponibile in questa sessione): un'Atleta vede le proprie partite senza bottoni di modifica; un Genitore con una sola figlia vede le sue partite automaticamente; un Genitore con più figlie vede il selettore

## Dev Notes

- **Perimetro esatto**: `lib/auth/route-guard.ts` (`ruoliAmmessi` di `/partite`); `app/(partite-campionati)/partite/page.tsx` (risoluzione identità Atleta/Genitore, selettore multi-Atleta, query scoped, gating colonna Azioni). **Nessuna modifica** a `PartitaRow.tsx`, `EliminaPartitaForm.tsx`, `actions.ts` (`aggiornaPartita`/`cancellaPartita`), `raggruppa-per-settimana.ts`, `campionati/*`.
- **Perché niente `autoAggancio: true`**: a differenza di "Il mio storico" (`storico-presenze`)/"Le mie misurazioni" (`dati-fisici`), dove l'AC richiede esplicitamente di mostrare *solo* i dati della persona che ha effettuato l'accesso (mai un merge Genitore↔figlia), qui l'AC #1/#2 tratta esplicitamente Atleta e Genitore allo stesso modo ("vede le partite del proprio Gruppo"/"del Gruppo della propria figlia") — stesso principio già stabilito in `certificato-medico/page.tsx` (righe 43-46, commento esplicito sul perché lì non si filtra per `autoAggancio`). Usare `prisma.genitoreAtleta.findMany` senza il filtro `autoAggancio` risolve entrambi i casi con lo stesso codice.
- **Perché la query usa `atlete: { some: {...} } }` e non un `gruppoId` risolto a monte**: dalla Story 9.21 (appena chiusa in questa sessione) un'Atleta può essere assegnata a più Gruppi contemporaneamente nella stessa stagione — l'investigazione di quella storia ha già verificato che `app/(orari-palestre)/mio-orario/page.tsx` usa esattamente questo pattern di attraversamento di relazione (`Gruppo.atlete`, `some`) ed è "già corretto per costruzione": nessuna singola risoluzione `gruppoId` andrebbe fatta, la relazione gestisce da sola il caso multi-Gruppo (AC #5).
- **Perché un `<tr>` statico invece di riusare `PartitaRow.tsx` con un nuovo prop `puoModificare`**: stesso principio architetturale già stabilito in questo progetto per `SlotTable.tsx` (sola lettura, condiviso da `/orari`/`/mio-orario`) vs `SlotRow.tsx` (editabile, solo `/slot`, Story 9.13) — due componenti distinti invece di un componente unico con un ramo condizionale, per non montare `useActionState`/gestione di stato che un Ruolo di sola lettura non potrà mai usare. `PartitaRow.tsx` resta quindi **invariata**, usata solo quando `puoModificare` è vero.
- **Perché il filtro Genitore-senza-selezione non deve eseguire la query**: un Genitore con più figlie che non ha ancora scelto (`atletaIdCorrente === ""`) non deve vedere nessuna Partita — una query senza filtro `atlete` per quel caso mostrerebbe (o rischierebbe di mostrare, se scritta in modo distratto) le partite di Gruppi non suoi. Stesso principio già esplicito in `certificato-medico/page.tsx` (`sezioneGestione` calcolata solo `if (atletaIdCorrente)`).
- **File NON da toccare**: `PartitaRow.tsx`, `EliminaPartitaForm.tsx`, `app/(partite-campionati)/partite/actions.ts` (`aggiornaPartita`/`cancellaPartita`, autorizzazione server-side già corretta e sufficiente — questa storia aggiunge solo il gating UI, difesa in profondità, non un cambio di permessi), `lib/raggruppa-per-settimana.ts`, `app/(partite-campionati)/campionati/*`, `app/(partite-campionati)/autorizzazione.ts`.

### Project Structure Notes

- File nuovi: nessuno.
- File modificati: `lib/auth/route-guard.ts` (`ruoliAmmessi` di `/partite`), `app/(partite-campionati)/partite/page.tsx` (risoluzione identità Atleta/Genitore, selettore, query scoped, gating colonna Azioni).
- Nessun file eliminato, nessuna migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.5: Vista partite per Atleta e Genitore]
- [Source: app/(certificati-medici)/certificato-medico/page.tsx righe 43-114 — pattern completo Atleta/Genitore senza autoAggancio, selettore multi-Atleta, da riprodurre]
- [Source: lib/auth/route-guard.ts riga 65-68 — /certificato-medico, stesso pattern ruoliAmmessi GENITORE/ATLETA da applicare a /partite]
- [Source: app/(partite-campionati)/partite/page.tsx — file da estendere, query/rendering esistenti di Admin/Dirigente/Allenatore invariati]
- [Source: app/(partite-campionati)/partite/PartitaRow.tsx — componente editabile invariato, riusato solo se puoModificare]
- [Source: app/(orari-palestre)/mio-orario/page.tsx righe 122-129 — pattern di query via relazione Gruppo.atlete `some`, verificato sicuro per multi-Gruppo durante l'investigazione Story 9.21]
- [Source: app/(orari-palestre)/slot/SlotTable.tsx vs SlotRow.tsx — precedente architetturale per "componente di sola lettura distinto da quello editabile", stesso principio applicato qui]
- [Source: _bmad-output/implementation-artifacts/9-21-atleta-in-piu-gruppi-investigazione.md — Dev Notes/Completion Notes sull'attraversamento di relazione `some` per il caso multi-Gruppo]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Route-guard di `/partite` esteso ad ATLETA/GENITORE — test esistente che asseriva ATLETA rifiutata sostituito con un nuovo test che verifica ATLETA/GENITORE ammessi (comportamento intenzionalmente cambiato da questa storia, non una regressione).
- `page.tsx`: risoluzione identità Atleta/Genitore **senza** `autoAggancio: true` (stesso principio già stabilito in `certificato-medico/page.tsx`, verificato leggendo il file per intero) — Atleta e Genitore trattati allo stesso modo, a differenza di "il mio storico"/"le mie misurazioni" (self-only).
- Selettore multi-Atleta per un Genitore con più figlie: riprodotto 1:1 il pattern già esistente in `certificato-medico/page.tsx` (auto-selezione con una sola Atleta, selettore esplicito altrimenti, nessuna query eseguita finché non è risolta).
- Query Partite per Atleta/Genitore tramite relazione `Gruppo.atlete: { some: { atletaId } } }` (non un `gruppoId` singolo) — gestisce correttamente il caso multi-Gruppo (Story 9.21) senza codice aggiuntivo, stesso pattern già verificato sicuro in `mio-orario/page.tsx` durante l'investigazione di quella storia.
- Vista di sola lettura implementata come `<tr>` statico inline in `page.tsx` (non un nuovo Client Component, non una modifica a `PartitaRow.tsx`) — stesso principio architetturale di `SlotTable.tsx` (sola lettura) vs `SlotRow.tsx` (editabile). Colonna "Azioni" omessa interamente (header + cella) per Atleta/Genitore, non lasciata vuota.
- `partite.module.css`: `.campo` esteso per stilizzare anche `<select>` (prima copriva solo `<input>`, nessuno dei due form preesistenti nel modulo aveva un `<select>`).
- Nessuna modifica a `PartitaRow.tsx`, `EliminaPartitaForm.tsx`, `actions.ts` (`aggiornaPartita`/`cancellaPartita`), `raggruppa-per-settimana.ts` — confermato non necessaria, l'autorizzazione server-side di quelle Server Action era già corretta.
- Verifica finale: 850/850 test Vitest passati (era 849/849, +1 nuovo test su `route-guard.test.ts`), `tsc --noEmit` pulito, ESLint pulito sui file toccati.

### File List

- `lib/auth/route-guard.ts` (modificato — `ruoliAmmessi` di `/partite` esteso ad ATLETA/GENITORE)
- `lib/auth/route-guard.test.ts` (modificato — test ATLETA rifiutata sostituito, nuovo test ATLETA/GENITORE ammessi)
- `app/(partite-campionati)/partite/page.tsx` (modificato — risoluzione identità Atleta/Genitore, selettore multi-Atleta, query scoped, gating colonna Azioni, vista di sola lettura)
- `app/(partite-campionati)/partite/partite.module.css` (modificato — `.campo` esteso a `<select>`)

### Review Findings

- [x] [Review][Patch] Messaggio "Seleziona un'Atleta..." mancante per un Genitore con più figlie che non ha ancora scelto: la pagina mostrava il generico "Nessuna partita programmata" (indistinguibile da un calendario genuinamente vuoto) invece del messaggio esplicito già presente nel pattern di riferimento dichiarato "1:1" (`certificato-medico/page.tsx`, `sezioneGestione`) [app/(partite-campionati)/partite/page.tsx] — risolto: aggiunto lo stesso messaggio, distinto dal caso "davvero nessuna partita". Trovato indipendentemente da tutti e tre i layer di review (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
- [x] [Review][Defer] Se una riga `GenitoreAtleta` esiste ma l'Atleta corrispondente non è leggibile via RLS (dato inconsistente/accesso revocato), l'utente supera il controllo iniziale (`atletaIds.length > 0`) ma `proprieAtlete` risulta vuoto — vede "Nessuna partita programmata" invece di un messaggio che spieghi la situazione [app/(partite-campionati)/partite/page.tsx] — deferred, pre-existing: stessa identica caratteristica già presente nel pattern mirror (`certificato-medico/page.tsx`), non introdotta da questa storia.

**Dismessi come rumore/fuori scope/convenzioni già accettate (10):** nessun test dedicato per la logica di risoluzione identità in `page.tsx` — nessun Server Component di questo progetto ha mai un file di test proprio, convenzione già stabilita; duplicazione della riga di sola lettura tra `page.tsx` e `PartitaRow.tsx` — decisione architetturale deliberata (stesso principio SlotTable.tsx/SlotRow.tsx), già nei Dev Notes; duplicazione del blocco di risoluzione identità Atleta/Genitore tra `certificato-medico/page.tsx` e questo file — coerente con la convenzione di duplicazione locale già stabilita ripetutamente in questo progetto; doppia guardia `filtroAllenatore`/`puoVederePartite` contro una query non filtrata — nessun difetto reale, solo preferenza stilistica; nessuna disambiguazione quando lo stesso utente è sia Atleta sia Genitore di altre figlie — nessun AC lo richiede, caso raro; nessun reset `appearance` sul nuovo `<select>` — nessun precedente in nessun altro `<select>` di questo progetto; copertura test del route-guard limitata a Ruoli singoli — speculativo; boundary RLS di `elencaAtlete` non ri-verificato — assunzione sistemica già accettata in ogni altra pagina che la chiama; "850/850 test" presentato come prova di correttezza della nuova logica — osservazione valida ma non un difetto di codice, già mitigata dalla verifica manuale demandata all'utente nei Completion Notes; `aria-label` con `partita.impianto` unito tramite `||` invece di `??` (rischio spazio finale) — falso positivo verificato, il codice usa già `??`.

## Change Log

- 2026-08-04: Implementata l'estensione di `/partite` ad Atleta/Genitore in sola lettura — route-guard esteso, risoluzione identità senza `autoAggancio` (stesso principio di `certificato-medico/page.tsx`), selettore multi-Atleta, query scoped via relazione `Gruppo.atlete` (gestisce correttamente il multi-Gruppo di Story 9.21 senza codice aggiuntivo), vista di sola lettura come riga statica distinta da `PartitaRow.tsx` (nessuna modifica a quel componente). 850/850 test passati (1 nuovo), 0 errori tsc/eslint. Status: review.
- 2026-08-04: Code review completata (Blind Hunter + Edge Case Hunter + Acceptance Auditor) - entrambe le affermazioni chiave verificate indipendentemente corrette (pattern `certificato-medico/page.tsx` riprodotto fedelmente per la logica di risoluzione identità; `PartitaRow.tsx` genuinamente non necessita modifiche; nessun disallineamento tra colonne header/riga in nessuno dei due rami). 1 patch applicato (messaggio "Seleziona un'Atleta..." mancante, trovato indipendentemente da tutti e tre i layer). 1 defer (messaggio impreciso per un'Atleta non leggibile via RLS - pre-esistente nel pattern mirror). 10 scartati come falsi positivi/fuori scope/convenzioni già accettate. 850/850 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
