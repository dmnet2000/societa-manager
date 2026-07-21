---
baseline_commit: 6696ea4a084a587805a74a155528c3a2689ab4c6
---

# Story 4.4: Conferma validazione certificato

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Segreteria,
I want confermare/validare un Certificato Medico caricato, o inserirne uno ricevuto fuori app,
so that lo stato a sistema riflette la realtà anche per i casi non passati dall'upload in app.

## Acceptance Criteria

1. **Given** un Certificato Medico è stato caricato da Genitore/Atleta (Story 4.1) e si trova in stato `IN_ATTESA`, **when** la Segreteria (o Admin/Dirigente — stesso gruppo di Ruoli ad accesso ampio già stabilito su questa tabella, AD-4) inserisce almeno la data di fine validità e conferma, **then** lo stato del Certificato passa a `CONFERMATO` e le date inserite sono salvate.
2. **Given** nessun Certificato è mai stato caricato per un'Atleta (nessuna riga esistente in `certificati_medici`), **when** la Segreteria inserisce manualmente i dati di validità per quell'Atleta (opzionalmente allegando un file scansionato del documento ricevuto cartaceo), **then** viene creato un Certificato collegato a quell'Atleta, con stato `CONFERMATO` direttamente (dato inserito da una fonte già fidata, nessun passaggio di conferma ulteriore necessario).
3. **Given** un Certificato già `CONFERMATO`, **when** Genitore/Atleta lo ri-caricano con un nuovo file (Story 4.1, AC #4: il ri-caricamento sostituisce il file), **then** lo stato torna a `IN_ATTESA` — le date di validità precedenti restano a sistema ma non sono più garantite valide per il nuovo documento finché la Segreteria non conferma di nuovo.
4. **Given** un Ruolo diverso da ADMIN/DIRIGENTE/SEGRETERIA, **when** tenta di accedere alla pagina di conferma o di invocare l'azione direttamente, **then** riceve un rifiuto `FORBIDDEN` (route-guard + `requireRuolo`, stesso pattern di ogni altra pagina riservata di questa codebase).
5. **Given** più Atlete con Certificati in stati diversi, **when** la Segreteria apre la pagina di conferma, **then** vede distintamente quali richiedono conferma (`IN_ATTESA`, incluse le Atlete senza alcun Certificato ancora caricato) e quali sono già a posto (`CONFERMATO`) — nessun rumore per ciò che è già confermato (principio guida del PRD, "niente rumore").

## Prerequisiti architetturali di questa storia (da leggere prima di iniziare)

Questa storia introduce il concetto di **stato** del Certificato Medico, assente fino ad ora: `certificati_medici` (Story 1.7/4.1) ha solo colonne di dato (date di validità, `filePath`), mai un campo che distingua "caricato ma non ancora verificato da un umano" da "verificato". FR-14 lo richiede esplicitamente ("lo stato a sistema è aggiornato di conseguenza").

### 1. Migrazione Prisma: nuovo enum `StatoCertificato` + colonna `stato`

Aggiungere in `prisma/schema.prisma`, vicino al modello `CertificatoMedico`:

```prisma
enum StatoCertificato {
  IN_ATTESA
  CONFERMATO
}
```

E nel modello `CertificatoMedico`, aggiungere:

```prisma
stato StatoCertificato @default(CONFERMATO)
```

Migrazione (nuova cartella `prisma/migrations/20260721000000_add_stato_certificato_medico/migration.sql`):

```sql
CREATE TYPE "StatoCertificato" AS ENUM ('IN_ATTESA', 'CONFERMATO');
ALTER TABLE "certificati_medici" ADD COLUMN "stato" "StatoCertificato" NOT NULL DEFAULT 'CONFERMATO';
```

**Nessun nuovo GRANT necessario**: `GRANT SELECT, INSERT, UPDATE ON "certificati_medici" TO authenticated` (Story 1.7) è a livello di tabella, copre automaticamente la nuova colonna — a differenza del gap GRANT su `service_role` incontrato in Story 1.5/4.3 (quello riguardava una tabella letta con un client **diverso** da chi l'aveva scritta; qui lo stesso `authenticated` legge/scrive la colonna esistente più quella nuova, nessun nuovo attore coinvolto).

**Perché il default è `CONFERMATO` e non `IN_ATTESA`**: tutte le righe che esistono già in `certificati_medici` prima di questa migrazione provengono dall'import federale (Story 1.3/1.7, `unisciCertificato` — dati già validati esternamente) — devono restare `CONFERMATO` dopo la migrazione, non retrocedere a "in attesa". Le righe create dal solo upload (Story 4.1, `collegaFileCertificato`, nessuna data di validità) sono l'eccezione: gestite esplicitamente dal punto 2 sotto, non dal default della colonna. (Se nel DB locale di sviluppo esistono righe di test create dal solo upload — mai confermate — la migrazione le marcherà erroneamente `CONFERMATO`: nessuna conseguenza, sono dati di sviluppo, il progetto non è ancora in produzione.)

### 2. `collegaFileCertificato` (Story 4.1) va aggiornato: ogni upload forza `stato: 'IN_ATTESA'`

File esistente: `lib/db-rls/certificato-medico.ts`. Oggi il suo upsert (righe ~102-120) scrive **solo** `{ id, atletaId, filePath, updatedAt }`, deliberatamente senza toccare i campi di validità (commento esplicito: "cosi' su un conflitto i valori di validita' esistenti restano intatti"). Questa storia aggiunge `stato: "IN_ATTESA"` a quel payload, **incondizionatamente** (sia primo caricamento sia ri-caricamento):

- Primo caricamento: nessuna riga esistente, l'upsert crea la riga con `stato: IN_ATTESA` (invece di ereditare il default `CONFERMATO` della colonna, che sarebbe sbagliato qui — un Certificato mai visto da un umano non può essere "confermato").
- Ri-caricamento di un Certificato già `CONFERMATO` (AC #3 di questa storia): lo stesso upsert lo riporta a `IN_ATTESA` — comportamento voluto, il nuovo file richiede una nuova verifica, le vecchie date restano a sistema ma non sono più garantite valide per il documento appena caricato.

Questo riusa esattamente la stessa funzione, nessuna nuova diramazione codice insert-vs-update — l'upsert PostgREST già scrive `stato` in entrambi i casi allo stesso modo.

**⚠️ Rottura di un test esistente**: `lib/db-rls/certificato-medico.test.ts`, test `"upserts solo id/atletaId/filePath/updatedAt, mai i campi di validita' (Story 4.1 AC #4)"` (righe ~148-163) asserisce `Object.keys(payload).sort()).toEqual(["atletaId", "filePath", "id", "updatedAt"].sort())` — con `stato` aggiunto al payload, questa riga va aggiornata per includere `"stato"` nell'array atteso, e va aggiunta un'asserzione `expect(payload.stato).toBe("IN_ATTESA")`. Non è una regressione da correggere: è un test da aggiornare consapevolmente perché il contratto della funzione cambia in modo intenzionale con questa storia.

### 3. Nessuna modifica a `unisciCertificato`/`creaCertificato`/`aggiornaCertificato` (percorso import, Story 1.3/1.7)

Questi restano invariati: `creaCertificato` non include mai `stato` nel payload di insert, quindi eredita il default `CONFERMATO` della colonna (corretto: dato di import, già fidato). `aggiornaCertificato` non tocca mai `stato` (coerente con la filosofia "merge per-campo" già stabilita in `unisciCertificato` — un campo assente nel payload non deve mai azzerare/alterare un valore esistente). **Caso limite noto e accettato, non da risolvere in questa storia**: se l'import aggiorna `dataFineValidita` per un'Atleta il cui Certificato è ancora `IN_ATTESA` (caricato ma non confermato), lo stato resta `IN_ATTESA` — nessun AC di questa storia o del rollover richiede che l'import interagisca con la conferma.

### 4. Nuova funzione dedicata `confermaCertificato` in `lib/db-rls/certificato-medico.ts`

Non riusare `aggiornaCertificato` (richiede un `id` di riga già esistente — non copre il caso "nessun Certificato mai caricato", AC #2) né `creaCertificato` (mai imposta `stato`). Nuova funzione che copre **entrambi** gli AC #1 e #2 con un solo upsert su `atletaId` (stessa chiave unica già usata da `collegaFileCertificato`):

```ts
export type DatiConferma = DatiCertificato & { filePath?: string | null };

export async function confermaCertificato(
  supabase: SupabaseClient,
  atletaId: string,
  dati: DatiConferma
): Promise<void> {
  const { error } = await supabase.from("certificati_medici").upsert(
    {
      id: randomUUID(),
      atletaId,
      ...serializza(dati), // riusa la stessa serializzazione esistente (date -> ISO)
      ...(dati.filePath !== undefined ? { filePath: dati.filePath } : {}),
      stato: "CONFERMATO",
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "atletaId" }
  );

  if (error) {
    throw new Error(error.message);
  }
}
```

`serializza` è già privata al modulo (usata da `creaCertificato`/`aggiornaCertificato`) — riusarla direttamente, non duplicarne la logica. `filePath` è opzionale: omesso quando la Segreteria conferma un Certificato già caricato senza sostituire il file (AC #1); presente quando allega un file scansionato in un inserimento manuale (AC #2).

### 5. Nuova Server Action + pagina, nel gruppo di route `(certificati-medici)` esistente

Terza sottocartella dentro `app/(certificati-medici)/` (accanto a `certificato-medico/` e `notifiche/`, già esistenti): `app/(certificati-medici)/conferma-certificati/`. `requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"])` come primo passo della Server Action (stesso gruppo di Ruoli delle policy RLS ampie su `certificati_medici`, non solo Segreteria — coerente con AD-4, non introduce un'asimmetria RLS-più-ampia-della-UI). Aggiungere la rotta a `PROTECTED_ROUTES` in `lib/auth/route-guard.ts`:

```ts
{ prefix: "/conferma-certificati", ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"] },
```

Upload del file allegato (solo per l'inserimento manuale, AC #2): riusare `caricaFileCertificato(supabase, atletaId, file)` (`lib/storage/certificati.ts`, Story 4.1) — le policy RLS `storage.objects` INSERT/UPDATE per `ADMIN`/`DIRIGENTE`/`SEGRETERIA` esistono già dalla migrazione `20260718030000_certificati_storage_fix_policy`, creata **esplicitamente in previsione di questa storia** (vedi commento in quella migrazione). Nessuna nuova policy Storage necessaria.

Visualizzare il file già caricato prima di confermare (AC #1, la Segreteria deve poter aprire il documento per leggere le date reali): riusare `generaUrlFirmato(supabase, filePath)` (stesso modulo) — la policy RLS SELECT su `storage.objects` per questi tre Ruoli esiste già (migrazione `20260718020000_certificati_storage_e_rls`).

### 6. Nessuna notifica/email da questa storia

A differenza dell'upload (Story 4.2/4.3, che notificano Allenatore/Dirigente e inviano un'email alla Segreteria), **nessun AC di questa storia richiede di notificare qualcuno quando la Segreteria conferma** — non introdurre hook aggiuntivi verso `creaNotifica`/`inviaEmail` per questa azione, sarebbe scope creep non richiesto da FR-14.

## Tasks / Subtasks

- [x] Task 1: Migrazione Prisma — enum `StatoCertificato` + colonna `stato` (AC: #1, #2, #3)
  - [x] Aggiungere `enum StatoCertificato { IN_ATTESA CONFERMATO }` e il campo `stato StatoCertificato @default(CONFERMATO)` su `CertificatoMedico` in `prisma/schema.prisma`.
  - [x] Nuova migrazione `20260721000000_add_stato_certificato_medico` (vedi SQL nel Prerequisito #1). Nessun nuovo GRANT.
- [x] Task 2: `lib/db-rls/certificato-medico.ts` — `confermaCertificato` (nuova) + aggiornamento `collegaFileCertificato` (AC: #1, #2, #3)
  - [x] Aggiungere `confermaCertificato` come da Prerequisito #4 (upsert su `atletaId`, `stato: "CONFERMATO"`, `filePath` opzionale).
  - [x] Aggiornare `collegaFileCertificato`: aggiungere `stato: "IN_ATTESA"` al payload dell'upsert esistente (Prerequisito #2).
  - [x] Test TDD: `confermaCertificato` crea una nuova riga se non esiste (AC #2), aggiorna quella esistente se già presente (AC #1), sempre con `stato: CONFERMATO`; propaga errori (incluso un rifiuto RLS).
- [x] Task 3: Aggiornare il test esistente di `collegaFileCertificato` (AC: #3)
  - [x] In `lib/db-rls/certificato-medico.test.ts`, aggiornare l'asserzione `Object.keys(payload).sort()` per includere `"stato"` e aggiungere `expect(payload.stato).toBe("IN_ATTESA")` (vedi Prerequisito #2 — rottura consapevole e attesa, non una regressione).
- [x] Task 4: Server Action `confermaCertificato` + route-guard (AC: #1, #2, #4)
  - [x] Nuovo file `app/(certificati-medici)/conferma-certificati/actions.ts`: `requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"])`, valida `atletaId` + `dataFineValidita` (obbligatoria) + `dataInizioValidita`/`mesiValidita`/`modulo` (opzionali) + `file` opzionale (stessa allowlist MIME/dimensione/magic-byte di `certificato-medico/actions.ts`, Story 4.1, ora condivisa via `lib/storage/certificati.ts`), chiama `caricaFileCertificato` solo se un file è presente, poi `confermaCertificato` (db-rls).
  - [x] Aggiunto `{ prefix: "/conferma-certificati", ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"] }` a `PROTECTED_ROUTES` in `lib/auth/route-guard.ts`.
  - [x] Test TDD: azione rifiuta Ruoli non ammessi (AC #4); conferma con successo aggiorna lo stato (AC #1); conferma senza Certificato esistente lo crea (AC #2); validazione file allegato riusa le stesse regole di Story 4.1 quando un file è presente.
- [x] Task 5: Pagina `app/(certificati-medici)/conferma-certificati/page.tsx` (AC: #5)
  - [x] Server Component: elenca tutte le Atlete (`elencaAtlete`) e tutti i Certificati in un'unica query (`elencaCertificati`, nuova, evita N+1), join applicativo in memoria per `atletaId`, distinguendo `IN_ATTESA` (incluse le Atlete senza alcuna riga in `certificati_medici`) da `CONFERMATO`.
  - [x] Componente Client `ConfermaCertificatoRow.tsx` per ogni Atleta non ancora confermata: input date validità + file opzionale, submit alla Server Action (pattern `useActionState` + hidden `atletaId`, come `UtenteRow.tsx` in `app/(amministrazione)/admin/`).
  - [x] Link "Visualizza certificato caricato" per un file già presente, nuova azione `ottieniUrlCertificatoConferma` (stesso pattern di `ottieniUrlCertificato`, Story 4.1, con Ruoli ammessi diversi).
- [x] Task 6: Test (Vitest)
  - [x] Come elencato nei Task 2-4 sopra, incluso `elencaCertificati` e `ottieniUrlCertificatoConferma`. Suite completa verde (409 test, 39 file), `tsc --noEmit` pulito, `npm run lint` nessun nuovo errore, `npm run build` produzione senza regressioni (`/conferma-certificati` registrata correttamente).
- [ ] Task 7: Verifica dal vivo (manuale)
  - [ ] AC #1: come Segreteria, confermare un Certificato `IN_ATTESA` con date di validità; verificare che lo stato passi a `CONFERMATO` a sistema.
  - [ ] AC #2: inserire manualmente un Certificato per un'Atleta senza alcun caricamento precedente, con e senza file allegato.
  - [ ] AC #3: come Genitore, ri-caricare un Certificato già `CONFERMATO`; verificare che torni `IN_ATTESA`.
  - [ ] AC #4: verificare il rifiuto per un Ruolo non ammesso (es. Allenatore).
  - [ ] AC #5: verificare che la pagina distingua chiaramente `IN_ATTESA` da `CONFERMATO` con più Atlete in stati misti.

## Dev Notes

- **Nessuna FR/AC richiede la rimozione di un Certificato** — nessuna policy/GRANT DELETE esiste né va aggiunta (stessa scelta già fatta per `iscrizioni`/`presenze`).
- **`serializza` in `lib/db-rls/certificato-medico.ts` non è esportata oggi** — se `confermaCertificato` viene aggiunta nello stesso file (raccomandato, stesso modulo), può chiamarla direttamente senza esportarla; se per qualunque motivo finisse in un file diverso, andrebbe esportata (valutare in fase di implementazione, ma restare nello stesso file è la scelta più semplice e coerente con come il modulo è organizzato oggi).
- **Il file allegato nell'inserimento manuale (AC #2) è opzionale** — un certificato "ricevuto cartaceo" può non avere mai una scansione digitale; non renderlo un campo obbligatorio nel form/validazione.
- **Nessuna rimozione del vecchio file su una nuova conferma con un file diverso** — a differenza del ri-caricamento Genitore/Atleta (Story 4.1 review fix, `rimuoviFileCertificato`), questa storia non lo richiede esplicitamente (nessun AC lo copre); se lo si implementa comunque per coerenza, usare lo stesso pattern non bloccante già stabilito, ma è accettabile ometterlo per questa storia (nessuna crescita illimitata attesa: un solo file per Atleta alla volta, il vecchio path viene semplicemente sovrascritto a livello di riga).
- **`certificato-medico/page.tsx` (Genitore/Atleta, Story 4.1) non viene toccata da questa storia** — non mostra oggi lo `stato` del proprio Certificato ("in attesa di conferma" vs "confermato"). Nessun AC di questa storia lo richiede (gli AC riguardano il flusso della Segreteria); un'estensione di quella pagina per mostrarlo è un miglioramento UX plausibile ma esplicitamente fuori perimetro qui — da valutare come storia futura se emergesse la necessità.
- **Query N+1 nella pagina di elenco (Task 5)**: `trovaCertificatoPerAtleta` è per singola Atleta — con ~200 Atlete (NFR5) chiamarla in un ciclo produce fino a 200 query. Se il pattern via client Supabase lo permette in modo pulito, preferire un'unica lettura di tutti i Certificati (`supabase.from("certificati_medici").select("*")`, senza `.eq`) e un join applicativo in memoria per `atletaId` (stesso pattern già usato in `notifiche/page.tsx` e `storico-presenze/page.tsx`) — coerente con le policy RLS ampie di Admin/Dirigente/Segreteria su questa tabella (leggono comunque tutte le righe visibili al loro Ruolo, `trovaCertificatoPerAtleta` filtra solo lato applicativo un `atletaId`).

### Project Structure Notes

- Nuova migrazione: `prisma/migrations/20260721000000_add_stato_certificato_medico/migration.sql`.
- Nuovo modulo: nessuno — `confermaCertificato` va in `lib/db-rls/certificato-medico.ts` (file esistente, modificato).
- File modificati: `prisma/schema.prisma`, `lib/db-rls/certificato-medico.ts` (+ `.test.ts`), `lib/auth/route-guard.ts` (+ `.test.ts`).
- Nuovi file: `app/(certificati-medici)/conferma-certificati/actions.ts` (+ `.test.ts`), `app/(certificati-medici)/conferma-certificati/page.tsx`, `app/(certificati-medici)/conferma-certificati/ConfermaCertificatoRow.tsx` (o nome equivalente per il form per-riga).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4: Conferma/validazione certificato] — user story e Acceptance Criteria originali.
- [Source: _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md#FR-14] — "La Segreteria può confermare/validare un Certificato Medico caricato, aggiornandone lo stato a sistema... può anche inserire manualmente un Certificato Medico ricevuto fuori dall'app."
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-4, AD-9] — RLS per `certificati_medici`, split Prisma/client Supabase.
- [Source: prisma/migrations/20260718020000_certificati_storage_e_rls, 20260718030000_certificati_storage_fix_policy] — policy RLS `certificati_medici`/`storage.objects` per ADMIN/DIRIGENTE/SEGRETERIA, quest'ultima creata esplicitamente in previsione di questa storia.
- [Source: lib/db-rls/certificato-medico.ts, lib/storage/certificati.ts, app/(certificati-medici)/certificato-medico/actions.ts] — funzioni e pattern esistenti da Story 4.1 da riusare.
- [Source: app/(amministrazione)/admin/UtenteRow.tsx] — pattern Client Component riga + form per-entità con `useActionState`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
