---
baseline_commit: f40691ba7cb7d04c2544d969df33b52f3cda857d
---

# Story 9.27: Modifica delle date di un Certificato già confermato

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin o Dirigente,
I want poter aggiornare data inizio/data fine validità (e gli altri dati) di un Certificato Medico già confermato,
so that posso correggere un errore o registrare un rinnovo senza dover prima "sconfermare" il Certificato.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-08-02). Verificato in analisi: la sezione "Confermati" di `/conferma-certificati` (Story 9.25, `ListaConfermati.tsx`) è oggi **di sola lettura** — l'unico form di conferma (`ConfermaCertificatoRow.tsx` + `confermaCertificato`) è mostrato solo nella sezione "Da confermare" (`page.tsx` righe 61-93). La Server Action sottostante (`confermaCertificato`, `lib/db-rls/certificato-medico.ts` — upsert su `atletaId`, chiave unica di `certificati_medici`) è già tecnicamente in grado di aggiornare un Certificato esistente, ma non è raggiungibile dalla UI per una riga già `CONFERMATO`, ed è aperta anche a SEGRETERIA (`requireRuolo(["ADMIN","DIRIGENTE","SEGRETERIA"])`, `actions.ts` riga 35).

**Decisioni prese con l'utente in fase di richiesta:**
- **Ruoli**: questa modifica è riservata a **solo ADMIN/DIRIGENTE** — SEGRETERIA continua a poter confermare/caricare un Certificato per la prima volta (comportamento invariato di `confermaCertificato`), ma **non** può correggere un Certificato già confermato. Nuova Server Action dedicata (`aggiornaCertificatoConfermato`), non un ampliamento del perimetro Ruoli esistente.
- **Campi**: il form di modifica espone **tutti** gli stessi campi già presenti in `ConfermaCertificatoRow` (data inizio/fine validità, mesi validità, modulo, ri-caricamento file) — non solo le due date, per riuso 1:1 del form esistente.

## Acceptance Criteria

1. **Given** un Admin o Dirigente sulla sezione "Confermati" di `/conferma-certificati` **When** apre la modifica di un Certificato già confermato e ne aggiorna i campi (date, mesi validità, modulo, file) **Then** i valori vengono salvati e riflessi immediatamente nella lista (badge di stato ricalcolato in base alla nuova `dataFineValidita`)
2. **Given** una Segreteria sulla sezione "Confermati" **When** visita la pagina **Then** non vede alcun bottone/affordance di modifica per le righe già confermate (gating lato UI) **And**, anche invocando direttamente l'azione lato server, l'operazione viene rifiutata (`FORBIDDEN`, difesa in profondità — stesso principio di ogni altra Server Action del progetto)
3. **And** nessuna regressione sulla conferma iniziale esistente (Story 4.4/9.20 — `confermaCertificato`/`ConfermaCertificatoRow`/sezione "Da confermare" invariate), sull'ordinamento per stato (Story 9.25) né sui badge colorati (Story 9.23) — suite Vitest invariata sui casi esistenti non impattati

## Tasks / Subtasks

- [ ] Task 1: Estrarre la validazione condivisa (AC: #1)
  - [ ] `app/(certificati-medici)/conferma-certificati/actions.ts`: estrarre il blocco di validazione oggi inline in `confermaCertificato` (righe 38-141: `dataFineValidita` obbligatoria, `dataInizioValidita` opzionale con controllo `<=` fine, `mesiValidita` intero ≥1, validazione file MIME/dimensione/contenuto) in una funzione pura `validaCampiCertificato(formData): { error } | { valori }` — stesso principio di estrazione già seguito in `app/(orari-palestre)/slot/actions.ts` (`validaCampiSlot`, riusata da `creaSlot`/`aggiornaSlot`, Story 9.13)
  - [ ] `confermaCertificato` riscritta per chiamare `validaCampiCertificato` — **comportamento identico**, nessun test esistente di `actions.test.ts` deve cambiare risultato
- [ ] Task 2: Nuova Server Action `aggiornaCertificatoConfermato` (AC: #1, #2)
  - [ ] Aggiunta allo stesso `actions.ts`: `requireRuolo(["ADMIN","DIRIGENTE"])` (SEGRETERIA esclusa deliberatamente, a differenza di `confermaCertificato`) → `validaCampiCertificato(formData)` (helper del Task 1) → stessa gestione file di `confermaCertificato` (upload opzionale via `caricaFileCertificato`) → `salvaCertificatoConfermato` (alias già esistente per `confermaCertificato` di `lib/db-rls/certificato-medico.ts`, upsert — **nessuna nuova funzione DB necessaria**, l'upsert su `atletaId` aggiorna già una riga esistente) → `revalidatePath("/conferma-certificati")`
  - [ ] Nuovi test in `actions.test.ts` (nuovo `describe("aggiornaCertificatoConfermato")`): FORBIDDEN per SEGRETERIA (**caso critico da non dimenticare** — differenzia questa azione da `confermaCertificato`), FORBIDDEN per ALLENATORE/altri Ruoli, successo ADMIN, successo DIRIGENTE, `atletaId` mancante, riuso della validazione (un solo caso rappresentativo per campo, es. `dataFineValidita` mancante — la matrice completa di validazione è già coperta dai test esistenti di `confermaCertificato` sullo stesso helper condiviso, non duplicarla interamente)
- [ ] Task 3: `page.tsx` — Ruolo del chiamante + dati completi per le righe confermate (AC: #1, #2)
  - [ ] `app/(certificati-medici)/conferma-certificati/page.tsx`: aggiungere risoluzione Ruolo (oggi assente in questa pagina) — stesso pattern di `app/(partite-campionati)/partite/page.tsx` righe 30-40 (`supabase.auth.getUser()`, `parseRuoli(user?.app_metadata?.ruoli)` da `@/lib/ruoli`), calcolare `puoModificareCertificatiConfermati = ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE")`
  - [ ] Estendere il mapping di `confermati` (righe 101-140) per includere anche `dataInizioValidita`/`dataFineValidita` **grezze** (sliced a 10 caratteri, stesso pattern già usato per `daConfermare` righe 76-87), `mesiValidita`, `modulo`, `filePath` — questi campi sono **già letti** da `elencaCertificati` (`lib/db-rls/certificato-medico.ts` riga 54, seleziona già tutte queste colonne), oggi solo scartati nel mapping di `confermati`: nessuna nuova query necessaria
  - [ ] Passare `puoModificare={puoModificareCertificatiConfermati}` a `<ListaConfermati>`
- [ ] Task 4: UI — riga "Confermati" modificabile (AC: #1, #2)
  - [ ] Nuovo `app/(certificati-medici)/conferma-certificati/CertificatoConfermatoRow.tsx` (Client Component) — estrae il singolo `<li>` oggi inline nel `.map` di `ListaConfermati.tsx` (righe 68-80), con `useState<boolean>` locale (`inModifica`, default `false`)
  - [ ] Vista di default (sempre, per ogni Ruolo): identica a oggi (nome + data + badge) — se `puoModificare`, aggiunge un bottone "Modifica" (riusa lo stile `.bottoneVisualizza` già esistente in `conferma-certificati.module.css`, nessuna nuova classe necessaria per il trigger)
  - [ ] Vista di modifica (solo se `puoModificare && inModifica`): stesso identico form di `ConfermaCertificatoRow.tsx` (date, mesi validità, modulo, file, più il bottone "Visualizza certificato caricato" via `ottieniUrlCertificatoConferma.bind(null, filePath)` se `filePath` presente — riuso invariato, già ammesso per ADMIN/DIRIGENTE/SEGRETERIA) ma bound a `aggiornaCertificatoConfermato` (`useActionState`) invece di `confermaCertificato`, bottone "Salva" invece di "Conferma", più un bottone "Annulla" (`type="button"`, riusa `.bottoneVisualizza`, riporta `inModifica` a `false` senza inviare nulla — stesso pattern di toggle proposto per `PartitaRow.tsx`, Story 10.4)
  - [ ] `useEffect` che collassa `inModifica` a `false` quando l'azione ha successo (`state?.success === true`) — stesso principio di `PartitaRow.tsx` (Story 10.4)
  - [ ] `ListaConfermati.tsx`: estendere `RigaConfermata` con i nuovi campi (Task 3) + `puoModificare`, sostituire il `<li>` inline con `<CertificatoConfermatoRow>` — `ordinaPerPrioritaStato` (Story 9.25) resta invariato: opera solo su `nome`/`stato`/`dataFineValiditaFormattata`, i nuovi campi non lo riguardano
- [ ] Task 5: Verifica regressione (AC: #3)
  - [ ] Suite Vitest completa: tutti i test passano, nessuna regressione sui test esistenti di `confermaCertificato`/`ottieniUrlCertificatoConferma`, `categorizzaStatoCertificato`, `ordinaPerPrioritaStato`
  - [ ] `npx tsc --noEmit` pulito; ESLint pulito sul modulo `(certificati-medici)`
  - [ ] Nessun test di rendering per `CertificatoConfermatoRow.tsx` (Client Component — convenzione già stabilita, coerente con `ConfermaCertificatoRow.tsx`/`SlotRow.tsx`/`AllenatoreRow.tsx`, nessuno ha un file di test dedicato)
  - [ ] Confermato: nessuna modifica a `confermaCertificato` (comportamento osservabile identico dopo l'estrazione del Task 1), `collegaFileCertificato`, `categorizzaStatoCertificato`, `ordinaPerPrioritaStato`

## Dev Notes

- **Perimetro esatto**: `app/(certificati-medici)/conferma-certificati/actions.ts` (+ test) esteso con `validaCampiCertificato` (estratta) + `aggiornaCertificatoConfermato` (nuova); `page.tsx` esteso con risoluzione Ruolo + dati completi per `confermati`; `ListaConfermati.tsx` esteso; nuovo `CertificatoConfermatoRow.tsx`. **Nessuna migrazione, nessuna nuova entità, nessuna nuova funzione in `lib/db-rls/certificato-medico.ts`** — `confermaCertificato` (la funzione DB, non la Server Action) fa già esattamente l'upsert corretto su una riga esistente.
- **Perché nessuna nuova funzione DB**: `lib/db-rls/certificato-medico.ts` `confermaCertificato` (righe 165-185) è un `upsert(..., { onConflict: "atletaId" })` — chiamarla di nuovo su un `atletaId` che ha già una riga `CONFERMATO` la **sovrascrive** con i nuovi valori, esattamente il comportamento voluto qui. La nuova Server Action `aggiornaCertificatoConfermato` la richiama tale e quale (stesso import già presente in `actions.ts` riga 14, `confermaCertificato as salvaCertificatoConfermato`) — l'unica differenza reale tra le due Server Action è il perimetro di `requireRuolo`.
- **CRITICO — perimetro Ruoli diverso da `confermaCertificato`**: `confermaCertificato` ammette `["ADMIN","DIRIGENTE","SEGRETERIA"]` (comportamento di conferma/inserimento iniziale, invariato). `aggiornaCertificatoConfermato` ammette **solo** `["ADMIN","DIRIGENTE"]` — non riusare la stessa chiamata `requireRuolo` per copia-incolla, e non dimenticare il test FORBIDDEN specifico per SEGRETERIA (l'unico Ruolo che ha accesso alla pagina ma non a questa azione — un test che verificasse solo "ruolo generico non ammesso" senza testare proprio SEGRETERIA non dimostrerebbe l'AC #2).
- **Gating UI, non solo server**: l'AC #2 richiede che una Segreteria **non veda** il bottone "Modifica" (non solo che venga rifiutata se lo invoca) — richiede risolvere il Ruolo del chiamante in `page.tsx`, cosa che oggi questa pagina **non fa affatto** (nessuna chiamata a `getUser()`/`parseRuoli` esiste in `page.tsx` — verificato leggendo il file per intero). Pattern di riferimento più vicino: `app/(partite-campionati)/partite/page.tsx` righe 30-40 (stesso identico scopo: distinguere l'accesso ampio Admin/Dirigente da un Ruolo più ristretto). Passare il risultato (`puoModificare`, un booleano) come prop fino a `CertificatoConfermatoRow` — non ricalcolare i Ruoli lato client (nessun accesso a `app_metadata` in un Client Component in questo progetto).
- **`elencaCertificati` già restituisce tutti i campi necessari**: `lib/db-rls/certificato-medico.ts` riga 54 seleziona già `filePath, dataInizioValidita, dataFineValidita, mesiValidita, modulo` — `page.tsx` oggi li scarta nel mapping di `confermati` (righe 101-140, tiene solo `dataFineValidita`/`stato` derivato). Estendere quel mapping per includerli tutti (stesso slicing/casting già fatto per `daConfermare`, righe 76-87: `(certificato?.dataInizioValidita as string | undefined)?.slice(0, 10) ?? ""`) — **nessuna nuova query, nessun cambio a `elencaCertificati`**.
- **Perché un Client Component per riga (`CertificatoConfermatoRow`) e non un form/stato unico su `ListaConfermati`**: ogni riga confermata ha bisogno del proprio `inModifica`/`useActionState` indipendente — stesso motivo già stabilito per `SlotRow.tsx`/`AllenatoreRow.tsx` (Story 9.9/9.13) e per il pattern equivalente proposto in `PartitaRow.tsx` (Story 10.4, stesso Epic diverso, stesso principio).
- **Nessuna conferma `window.confirm()`**: la modifica non è un'operazione distruttiva (a differenza di una cancellazione) — stesso principio già implicito per `aggiornaSlot`/`aggiornaAllenatore`, mai richiesta conferma per un semplice salvataggio.
- **File NON da toccare**: `ConfermaCertificatoRow.tsx` (sezione "Da confermare", invariata — il nuovo `CertificatoConfermatoRow.tsx` è un componente **distinto**, non un riuso diretto del primo: Ruoli ammessi e Server Action target sono diversi), `collegaFileCertificato`/`certificato-medico/actions.ts` (Story 4.1/9.20, flusso di upload da Genitore/Atleta, non toccato), `lib/ordina-certificati-per-stato.ts` (Story 9.25, invariato), `categorizzaStatoCertificato` (Story 5.1/9.19/9.23, invariato — il ricalcolo del badge dopo un salvataggio riuscito avviene naturalmente perché `page.tsx` è `force-dynamic` e la chiamano di nuovo dopo `revalidatePath`).

### Project Structure Notes

- File nuovi: `app/(certificati-medici)/conferma-certificati/CertificatoConfermatoRow.tsx`.
- File modificati: `app/(certificati-medici)/conferma-certificati/actions.ts` (+ `validaCampiCertificato` estratta, + `aggiornaCertificatoConfermato`), `app/(certificati-medici)/conferma-certificati/actions.test.ts` (+ test), `app/(certificati-medici)/conferma-certificati/page.tsx` (risoluzione Ruolo + dati completi per `confermati`), `app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx` (righe estese, delega a `CertificatoConfermatoRow`).
- Nessun file eliminato, nessuna migrazione, nessuna nuova classe CSS strettamente necessaria (`.card`/`.campo`/`.bottone`/`.errore`/`.bottoneVisualizza` già esistenti in `conferma-certificati.module.css` coprono l'intero form di modifica).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.27: Modifica delle date di un Certificato già confermato]
- [Source: app/(certificati-medici)/conferma-certificati/actions.ts — confermaCertificato, validazione da estrarre e Server Action da cui derivare aggiornaCertificatoConfermato]
- [Source: lib/db-rls/certificato-medico.ts righe 156-185 — confermaCertificato (funzione DB), upsert da riusare invariato]
- [Source: lib/db-rls/certificato-medico.ts riga 54 — elencaCertificati, colonne già selezionate]
- [Source: app/(certificati-medici)/conferma-certificati/page.tsx righe 39-146 — mapping daConfermare/confermati da estendere]
- [Source: app/(certificati-medici)/conferma-certificati/ConfermaCertificatoRow.tsx — form di riferimento da riprodurre per la modifica]
- [Source: app/(certificati-medici)/conferma-certificati/ListaConfermati.tsx — Client Component da estendere con CertificatoConfermatoRow]
- [Source: app/(orari-palestre)/slot/actions.ts — validaCampiSlot, pattern di estrazione validazione condivisa (Story 9.13)]
- [Source: app/(partite-campionati)/partite/page.tsx righe 30-40 — pattern di risoluzione Ruolo/parseRuoli in una pagina di lista]
- [Source: _bmad-output/implementation-artifacts/10-4-modifica-singola-partita.md — pattern parallelo "riga con toggle Modifica/Annulla" nello stesso periodo di sviluppo]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

### File List
