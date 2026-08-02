---
baseline_commit: b66c22acc1fcd7abc29b6a1fd5985eaa8f6f1526
---

# Story 9.23: Colore semantico sui certificati confermati (verde/giallo/rosso)

Status: done

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

- [x] Task 1: Aggiornare `DESIGN.md` con l'eccezione (AC: #3)
  - [x] Aggiunta frase di eccezione esplicita e motivata dopo la regola "non negoziabile" in **Componenti → Badge di stato**
  - [x] Aggiornata anche la tabella **Cose da fare e da evitare** con il rimando all'eccezione
- [x] Task 2: Calcolo dello stato in `page.tsx` (AC: #1, #2, #3)
  - [x] Importato `categorizzaStatoCertificato` e `type StatoCertificato`, riuso diretto
  - [x] `const oggi = new Date();` calcolata una sola volta in cima alla funzione
  - [x] Nel `.map` della sezione "Confermati", calcolato lo stato per riga e renderizzato il badge inline (nessuna modifica a `ConfermaCertificatoRow.tsx`, non usato in quella sezione)
  - [x] Sezione "Da confermare" non toccata (AC #4)
- [x] Task 3: Badge CSS — 3 varianti (AC: #1, #2, #3)
  - [x] Nuove classi `.badgeInRegola`/`.badgeInScadenza`/`.badgeScaduto`, stessa struttura del pattern `.badge` esistente altrove
  - [x] `.rigaConfermata` estesa con `display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);`
- [x] Task 4: Verifica regressione (AC: #4)
  - [x] Suite Vitest completa: 790/790 test passati (invariato)
  - [x] `npx tsc --noEmit` pulito (0 errori); ESLint pulito su `page.tsx`
  - [x] Nessun nuovo file di test (nessuna nuova funzione pura introdotta)

### Review Findings

- [x] [Review][Patch] Il `<span>` con nome Atleta + data di validità non aveva `flex:1`/`min-width:0` accanto al badge (`flex-shrink:0`) — un nome lungo + suffisso data poteva sfondare la riga invece di andare a capo, stesso bug già incontrato e corretto in questo stesso progetto (`presenze.module.css` `.etichetta`). [app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css] — risolto: nuova classe `.nomeConData` (`flex: 1; min-width: 0;`) applicata al `<span>`.
- [x] [Review][Patch] `const oggi = new Date()` era calcolata **prima** del `Promise.all` (fetch Atlete/Certificati), non dopo come nel precedente citato nel commento stesso (`vista-dirigente/page.tsx`) — un fetch lento a cavallo della mezzanotte locale avrebbe classificato i certificati contro un "oggi" stantio. [app/(certificati-medici)/conferma-certificati/page.tsx] — risolto: spostata dopo il `Promise.all`.
- [x] [Review][Patch] `categorizzaStatoCertificato` può restituire `SENZA_CERTIFICATO` anche per una riga già filtrata su `stato === "CONFERMATO"`, se `dataFineValidita` fosse `null` (colonna nullable a livello di schema, nessun vincolo CHECK — non raggiungibile tramite il percorso di scrittura attuale ma non impedito dal DB) — renderizzava silenziosamente senza badge, nessun segnale dell'anomalia. [app/(certificati-medici)/conferma-certificati/page.tsx] — risolto: aggiunto un `console.warn` distintivo per questo ramo difensivo, stesso pattern già usato in `vista-dirigente/page.tsx`.
- [x] [Review][Defer] Lo stesso stato `SCADUTO` viene mostrato in tono warning (giallo) altrove nell'app (badge "Certificato in scadenza"/vista-dirigente) e in tono danger (rosso) qui, senza alcun segnale che la scala colore sia dipendente dal contesto — osservazione UX legittima, nessuna correzione di codice non ambigua possibile senza una decisione di prodotto, non bloccante.
- [x] [Review][Dismiss] Diff di review scoped ai soli file della File List della storia (esclusi `sprint-status.yaml`/il file storia stesso) — scelta deliberata di scoping della review, non un difetto del codice.
- [x] [Review][Dismiss] Eccezione al design system "auto-approvata" dalla stessa storia che la introduce — decisione presa esplicitamente con l'utente in fase di creazione (non un'invenzione unilaterale), già documentata come tale.
- [x] [Review][Dismiss] Terzo blocco CSS badge quasi identico duplicato tra moduli — stesso pattern di duplicazione deliberata già accettato ovunque in questo progetto (nessun componente Badge condiviso esiste).
- [x] [Review][Dismiss] Commenti "mai danger" in `gruppi.module.css`/`presenze.module.css` presunti ora falsi — verificato: sono claim locali sul badge di **quel file**, non un'affermazione trasversale a tutto il progetto; restano vere per il proprio contesto, nessuna modifica necessaria.
- [x] [Review][Dismiss] Nessun test per `CLASSE_BADGE`/`ETICHETTA_BADGE`/il ramo di rendering condizionale — coerente con la convenzione "nessun test di rendering" già stabilita e accettata in tutto il progetto.
- [x] [Review][Dismiss] Cast `as StatoCertificato | null` su un valore Supabase non validato a runtime — stesso pattern identico già usato ovunque nel progetto (es. `vista-dirigente/page.tsx`), non introdotto da questa storia.
- [x] [Review][Dismiss] Tabella "Cose da fare e da evitare" di `DESIGN.md` richiede ora di leggere un rimando incrociato per l'eccezione — nitpick cosmetico sulla leggibilità della documentazione, non un difetto di codice.
- [x] [Review][Dismiss] Riuso di `categorizzaStatoCertificato` in un contesto dove 2 dei 4 rami possibili non sono mai raggiungibili, non documentato a sufficienza — già spiegato nel commento di codice esistente ("SENZA_CERTIFICATO non e' raggiungibile in pratica... gestito comunque in modo difensivo").
- [x] [Review][Dismiss] Stile di datazione incoerente tra l'eccezione nuova (datata) e quella preesistente del magenta (non datata) in `DESIGN.md` — nitpick stilistico cosmetico.

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

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Task 1: aggiunta eccezione esplicita e motivata in `DESIGN.md` (Componenti → Badge di stato + tabella Cose da fare e da evitare) per il badge danger a livello di singola atleta, limitata a `/conferma-certificati`.
- Task 2: `page.tsx` calcola `oggi` una sola volta, riusa `categorizzaStatoCertificato` per ogni riga della sezione "Confermati" (badge inline, nessuna modifica a `ConfermaCertificatoRow.tsx`/sezione "Da confermare"). Gestito difensivamente anche `SENZA_CERTIFICATO` (nessun badge) pur non essendo raggiungibile in pratica.
- Task 3: 3 nuove classi badge (`.badgeInRegola`/`.badgeInScadenza`/`.badgeScaduto`) in `conferma-certificati.module.css`, stesso pattern strutturale già usato altrove nel progetto; `.rigaConfermata` estesa a flex per allineare nome e badge.
- Task 4: 790/790 test passati (invariato), `tsc --noEmit` pulito, ESLint pulito. Nessun nuovo test (nessuna nuova funzione pura, `categorizzaStatoCertificato` già coperta da Story 5.1/9.19).
- Code review (2026-08-02): Blind Hunter + Edge Case Hunter + Acceptance Auditor — 0 decision-needed, 3 patch applicati (nuova classe `.nomeConData` con `flex:1`/`min-width:0` per evitare overflow su nome+data lunghi accanto al badge, stesso bug già corretto altrove nel progetto; `oggi` spostata dopo il `Promise.all` invece che prima; `console.warn` aggiunto per il ramo difensivo `SENZA_CERTIFICATO` non raggiungibile in pratica ma non impedito dallo schema). 1 defer (inconsistenza percettiva cross-pagina sullo stesso stato SCADUTO, warning altrove/danger qui — osservazione UX, non bloccante). 10 scartati come rumore/già accettati esplicitamente. 790/790 test passati, 0 errori tsc/eslint dopo i fix.

### File List

- `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-07-22/DESIGN.md` (modificato — eccezione danger documentata)
- `app/(certificati-medici)/conferma-certificati/page.tsx` (modificato — calcolo stato + badge sezione "Confermati", ordine `oggi` corretto in review, `console.warn` difensivo aggiunto)
- `app/(certificati-medici)/conferma-certificati/conferma-certificati.module.css` (modificato — 3 nuove classi badge + `.rigaConfermata` estesa + `.nomeConData` aggiunta in review)

## Change Log

- 2026-08-02: Implementata Story 9.23 — badge verde/giallo/rosso sulla sezione "Confermati" di `/conferma-certificati`, riusando `categorizzaStatoCertificato` (Story 5.1/9.19). Aggiunta un'eccezione esplicita e motivata in `DESIGN.md` per il tono danger a livello di singola atleta, limitata a questa pagina. Sezione "Da confermare" invariata. 790/790 test passati, 0 errori tsc/eslint.
- 2026-08-02: Code review completata — 3 patch applicati (overflow layout su nome+badge, ordine di calcolo di `oggi`, log difensivo per anomalia dati), 1 defer, 10 scartati come rumore. 790/790 test passati, 0 errori tsc/eslint dopo i fix. Status: done.
