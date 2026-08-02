---
baseline_commit: b66c22acc1fcd7abc29b6a1fd5985eaa8f6f1526
---

# Story 9.23: Colore semantico sui certificati confermati (verde/giallo/rosso)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin/Dirigente/Segreteria che consulta `/conferma-certificati`,
I want vedere a colpo d'occhio, nella sezione "Confermati", quali certificati sono in regola (verde), in scadenza entro un mese (giallo) o già scaduti (rosso),
so that posso dare priorità a chi richiede un rinnovo urgente senza dover controllare una per una le date di ogni Atleta.

**Note aggiuntive:** riusa `categorizzaStatoCertificato` (Story 5.1/9.19, `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts`) — stessa soglia di 30 giorni, nessun nuovo calcolo. **Ambito confermato con l'utente in fase di creazione**: solo la sezione "Confermati" — ogni riga lì ha sempre una `dataFineValidita` reale (obbligatoria in `confermaCertificato`, `app/(certificati-medici)/conferma-certificati/actions.ts` riga 50-57), quindi `categorizzaStatoCertificato` non restituirà mai `SENZA_CERTIFICATO` per queste righe in pratica. La sezione "Da confermare" resta **invariata**, nessun colore.

**Decisione importante presa con l'utente (2026-08-02) — eccezione esplicita al design system**: `DESIGN.md` (Componenti → Badge) ha una regola dichiarata "non negoziabile": il badge "Certificato scaduto" a livello di singola atleta usa il tono **warning**, mai **danger**, motivata da FR-15 ("l'alert non impedisce in nessun caso di registrare la presenza" — il flusso presenze non deve mai sembrare allarmante). `/conferma-certificati` è un contesto diverso: qui la Segreteria/Admin/Dirigente sta **gestendo attivamente** i certificati (non registrando una presenza per un altro motivo), quindi un segnale rosso pieno per gli scaduti aiuta a dare priorità invece di "allarmare fuori contesto". L'utente ha confermato esplicitamente di volere `{colors.danger}` pieno qui. **Task 1 di questa storia aggiorna `DESIGN.md` con questa eccezione, motivata esplicitamente** (stesso trattamento finora riservato solo al magenta come singolo accento eccezionale, vedi Componenti → Badge/Colori) — non silenziosamente ignorata. **Non toccare** il badge "Certificato in scadenza" già esistente altrove (`/gruppi`, `/i-miei-gruppi`, Story 9.19), che resta in tono warning: quella regola resta valida ovunque tranne in questa pagina.

## Acceptance Criteria

1. **Given** un certificato confermato con più di 30 giorni alla scadenza **When** mostrato nella sezione "Confermati" **Then** appare con un badge verde (`{colors.success}`/`{colors.success-bg}`)
2. **Given** un certificato confermato in scadenza entro 30 giorni **When** mostrato nella sezione "Confermati" **Then** appare con un badge giallo/ambra (`{colors.warning}`/`{colors.warning-bg}`)
3. **Given** un certificato confermato con data di fine validità già passata **When** mostrato nella sezione "Confermati" **Then** appare con un badge rosso (`{colors.danger}`/`{colors.danger-bg}`) — eccezione esplicita e documentata alla regola generale "mai danger a livello di singola riga" (vedi Note aggiuntive)
4. **And** la sezione "Da confermare" resta invariata (nessun colore) — nessuna regressione sul comportamento esistente di conferma/inserimento manuale (Story 4.4/9.20), suite Vitest invariata

## Tasks / Subtasks

- [ ] Task 1: Aggiornare `DESIGN.md` con l'eccezione (AC: #3)
  - [ ] In `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`, sezione **Componenti → Badge di stato**: dopo la frase "La variante danger è riservata al conteggio aggregato (vedi stat-tile)", aggiungere una frase di eccezione esplicita, motivata: `/conferma-certificati` (Story 9.23) è l'unica pagina in cui il badge "Scaduto" a livello di singola atleta usa la variante **danger** invece di warning — contesto di gestione attiva dei certificati da parte di Admin/Dirigente/Segreteria, non il flusso presenze (FR-15) che motiva la regola generale altrove
  - [ ] Aggiornare anche la tabella **Cose da fare e da evitare** (riga "Badge 'certificato scaduto' a livello di singola atleta in tono warning...") con un rimando a questa eccezione, per non renderla apparentemente contraddittoria a chi legge solo quella tabella
- [ ] Task 2: Calcolo dello stato in `page.tsx` (AC: #1, #2, #3)
  - [ ] `app/(certificati-medici)/conferma-certificati/page.tsx`: importare `categorizzaStatoCertificato` da `@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato` (riuso diretto, nessuna nuova funzione di calcolo)
  - [ ] Calcolare `const oggi = new Date();` una sola volta nella funzione della pagina (stesso pattern di `vista-dirigente/page.tsx`)
  - [ ] Nel `.map` della sezione "Confermati" (righe 93-105 circa), per ciascuna riga calcolare `const stato = categorizzaStatoCertificato(dataFineValidita ?? null, certificato?.stato as StatoCertificato | null ?? null, oggi);` e passarlo come prop a `ConfermaCertificatoRow` (o renderizzare il badge direttamente in `page.tsx`, essendo la sezione "Confermati" oggi renderizzata inline in `page.tsx`, non tramite `ConfermaCertificatoRow` — verificare la struttura attuale prima di scegliere dove mettere la logica, non duplicare markup)
  - [ ] **Non toccare** la sezione "Da confermare" né il componente `ConfermaCertificatoRow.tsx` usato lì (AC #4) — quel componente resta per il form di conferma, indipendente da questa storia
- [ ] Task 3: Badge CSS — 3 varianti (AC: #1, #2, #3)
  - [ ] `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css`: nuove classi `.badgeInRegola` (`background: var(--color-success-bg); color: var(--color-success);`), `.badgeInScadenza` (`background: var(--color-warning-bg); color: var(--color-warning);`), `.badgeScaduto` (`background: var(--color-danger-bg); color: var(--color-danger);`) — stessa struttura del pattern `.badge` già esistente altrove (`gruppi.module.css` riga 218, `presenze.module.css` riga 142: `font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: var(--radius-sm); white-space: nowrap;`), solo il colore cambia per variante — **non** introdurre una quarta variante generica riusabile cross-modulo: questo progetto duplica deliberatamente questo pattern per modulo (nessun componente Badge condiviso esiste), coerente con ogni occorrenza precedente
  - [ ] `.rigaConfermata` (riga 122 di `conferma-certificati.module.css`) va esteso con `display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);` per allineare il nome dell'Atleta a sinistra e il badge a destra (oggi è un blocco di solo testo)
- [ ] Task 4: Verifica regressione (AC: #4)
  - [ ] Suite Vitest completa: nessun test esistente tocca `page.tsx` (nessun file di test per questa pagina, coerente con la convenzione "nessun test di rendering" già stabilita nel progetto) — verificare comunque che `actions.test.ts` (Server Action, non toccate da questa storia) resti verde
  - [ ] `npx tsc --noEmit` ed ESLint puliti
  - [ ] Nessun nuovo file di test atteso (nessuna nuova funzione pura introdotta, `categorizzaStatoCertificato` è già testata da `categorizza-stato-certificato.test.ts`, Story 5.1/9.19)

## Dev Notes

- **Perimetro esatto**: solo `app/(certificati-medici)/conferma-certificati/page.tsx` (logica + markup badge) e `conferma-certificati.module.css` (stile) + `DESIGN.md` (documentazione dell'eccezione). Nessuna migrazione, nessuna nuova Server Action, nessuna nuova funzione pura — `categorizzaStatoCertificato` esiste già ed è generica abbastanza (richiede solo `dataFineValidita`, `stato`, `oggi`).
- **Perché niente `SENZA_CERTIFICATO` in pratica per questa sezione**: `confermaCertificato` (`actions.ts` riga 50-57) rifiuta la conferma se `dataFineValiditaRaw` è vuoto — ogni riga della sezione "Confermati" (filtrata su `stato === "CONFERMATO"`, `page.tsx` riga 42-44) ha quindi sempre una `dataFineValidita` valida. `categorizzaStatoCertificato` restituirà quindi sempre uno tra `IN_REGOLA`/`IN_SCADENZA`/`SCADUTO` per queste righe — gestire comunque il caso `SENZA_CERTIFICATO` in modo difensivo (nessun badge, o badge neutro) per coerenza col tipo di ritorno della funzione, senza però assumerlo raggiungibile.
- **Struttura attuale della sezione "Confermati"** (`page.tsx` righe 87-108): renderizzata **inline** dentro `page.tsx`, non tramite `ConfermaCertificatoRow.tsx` (quel componente è usato solo per la sezione "Da confermare", righe 55-84). Il badge va quindi aggiunto direttamente nel JSX di `page.tsx`, non in `ConfermaCertificatoRow.tsx`.
- **`categorizzaStatoCertificato` firma esatta**: `(dataFineValidita: string | null, stato: StatoCertificato | null, oggi: Date) => "IN_REGOLA" | "IN_SCADENZA" | "SCADUTO" | "SENZA_CERTIFICATO"` — importare anche `type StatoCertificato` da `@prisma/client` per il cast, stesso pattern già usato in `lib/certificato-in-scadenza-per-atleta.ts` e `vista-dirigente/page.tsx`.
- **Non riusare `lib/certificato-in-scadenza-per-atleta.ts`** (`calcolaAtleteConCertificatoInScadenza`) — quella funzione restituisce solo un booleano `certificatoInScadenza` (per il badge "in scadenza" esistente altrove), non la categoria completa a 3 vie necessaria qui. Chiamare `categorizzaStatoCertificato` direttamente.
- **File NON da toccare**: `ConfermaCertificatoRow.tsx` (sezione "Da confermare", fuori scope), `app/(certificati-medici)/conferma-certificati/actions.ts` (nessuna Server Action cambia), `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` (riusata invariata, non modificarla), `lib/certificato-in-scadenza-per-atleta.ts` (non riusabile qui, vedi sopra, ma non toccarlo).

### Project Structure Notes

- File modificati: `app/(certificati-medici)/conferma-certificati/page.tsx`, `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css`, `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md`.
- Nessun file nuovo, nessun file eliminato, nessuna migrazione.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.23: Colore semantico sui certificati confermati (verde/giallo/rosso)]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md — sezione Colori (righe 166-168, token success/warning/danger) e Componenti → Badge (riga 212, regola "non negoziabile" da cui questa storia crea un'eccezione esplicita), tabella Cose da fare e da evitare (riga 227)]
- [Source: app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts — funzione da riusare invariata]
- [Source: app/(certificati-medici)/conferma-certificati/page.tsx righe 1-111 — struttura attuale della pagina, sezione "Confermati" righe 87-108 da estendere]
- [Source: app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css righe 117-127 — .listaConfermati/.rigaConfermata da estendere]
- [Source: app/(certificati-medici)/conferma-certificati/actions.ts righe 50-57 — conferma che dataFineValidita è sempre obbligatoria per confermare, quindi SENZA_CERTIFICATO non è raggiungibile in pratica in questa sezione]
- [Source: app/(gruppi-allenatori)/gruppi/gruppi.module.css riga 218, app/(presenze)/presenze/presenze.module.css riga 142 — pattern .badge esistente da cui derivare le 3 nuove varianti di colore]
- [Source: lib/certificato-in-scadenza-per-atleta.ts — funzione simile ma insufficiente (solo booleano), non riusabile per questa storia]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
