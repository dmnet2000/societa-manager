---
baseline_commit: 0180d83
---

# Story 18.2: Sezione Sponsor pubblica in home

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want vedere sulla home pubblica i Banner pubblicitari e le Convenzioni della società,
so that possa scoprire gli sponsor senza dover fare login.

## Acceptance Criteria

1. **Given** un Visitatore senza sessione **When** visita la home pubblica (`"/"`) **Then** vede una sezione Sponsor con i Banner pubblicitari e le Convenzioni attivi (stessi dati di `/app/sponsor`: nome, descrizione, immagine, link esterno se impostato per i Banner).
2. **And** se non ci sono Sponsor attivi (né Banner né Convenzioni), la sezione non compare in home (nessuna area vuota).
3. **And** nessun dato riservato dell'app (Utenti, Atlete, dati di gestione Sponsor come lo stato "disattivato") è raggiungibile da questa sezione pubblica — solo Sponsor con `attiva: true`, stessi campi già pubblici nella vetrina esistente.

## Tasks / Subtasks

- [x] Task 1: Lettura e raggruppamento Sponsor attivi in `app/page.tsx` (AC: #1, #2, #3)
  - [x] Aggiungere a `HomePubblicaPage` (`app/page.tsx`) una query `prisma.sponsor.findMany({ where: { attiva: true }, orderBy: { createdAt: "desc" } })` — stessa identica query già in uso in `app/app/(sponsor)/sponsor/page.tsx` (Sponsor non è protetto da RLS, AD-9, Prisma diretto).
  - [x] Riusare `raggruppaSponsorPerTipo` (`lib/sponsor/raggruppa-sponsor-per-tipo.ts`, pura, già testata) per separare `banner`/`convenzioni` — **non duplicare** questa logica.
  - [x] Sezione Sponsor renderizzata solo se `banner.length > 0 || convenzioni.length > 0` (AC #2), stesso pattern già in uso in `sponsor/page.tsx` (`nessunoSponsorAttivo`).

- [x] Task 2: Nuovo componente scheda pubblica (AC: #1)
  - [x] Nuovo file `app/SponsorPubblicoCard.tsx` — **non riusare** `SponsorVetrinaCard.tsx` (`app/app/(sponsor)/sponsor/SponsorVetrinaCard.tsx`) direttamente: quel componente include il pulsante "Genera voucher" verso `/app/sponsor/[id]/voucher`, out of scope per questa story (vedi Dev Notes, punto aperto sul voucher per un Visitatore anonimo). Stessa struttura visiva (immagine con cache-busting via `updatedAt`, immagine cliccabile verso `linkEsterno` solo per i Banner, nome, descrizione) ma **senza** il pulsante voucher — nessuna Convenzione mostra un'azione cliccabile in questa story.
  - [x] Riusare `urlPubblicoImmagineSponsor` (`lib/storage/sponsor.ts`) per l'URL dell'immagine — bucket già pubblico (Story 16.1), nessuna differenza di permessi tra vista autenticata e pubblica.

- [x] Task 3: Stile (AC: #1)
  - [x] Nuove classi in `app/home-pubblica.module.css` (non riusare `sponsor.module.css` — convenzione del progetto: ogni route/pagina ha il proprio CSS module, mai condiviso, vedi Story 16.1 Dev Notes). Stessi token DESIGN.md già in uso nel resto della home pubblica (Story 18.1) — nessun colore nuovo. Può ispirarsi alla struttura di `.schedaVetrina`/`.listaVetrina`/`.anteprimaVetrina` di `sponsor.module.css` come riferimento visivo, senza importarle.
  - [x] Sezione posizionata dopo l'hero esistente (`<main className={styles.hero}>`), prima del footer — layout esatto (griglia vs riga scrollabile, spaziatura) a discrezione dello sviluppo, nessun mockup dedicato per questa story (riusa un pattern visivo già approvato, non introduce nulla di nuovo — vedi Dev Notes).

- [x] Task 4: Test (AC: tutti)
  - [x] Nessun nuovo test per `raggruppaSponsorPerTipo` (già testata, riusata invariata).
  - [x] Nessun test diretto su `page.tsx` (nessun test esistente lo fa per nessuna pagina del progetto, convenzione consolidata).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.2)

- **Dipende da Story 18.1** (done, mergiata su `main`): la home pubblica esiste già come scheletro puro su `app/page.tsx` — questa story aggiunge la prima sezione di contenuto reale, senza toccare header/hero/footer esistenti (Task 1/5 di Story 18.1).
- **Stessi dati di `/app/sponsor`** (AC #1): stesso model `Sponsor` (Epic 16), stessa distinzione Banner/Convenzioni, stesso filtro `attiva: true`.

### Punto aperto — voucher per un Visitatore anonimo (deliberatamente FUORI SCOPE qui)

`epics.md` segnalava come punto da confermare in sviluppo se il voucher (oggi generato su `/app/sponsor/[id]/voucher`, Story 16.2) dovesse restare disponibile anche per un Visitatore senza sessione. **Le 3 AC di questa story non lo richiedono** (solo visibilità dei Banner/Convenzioni, nessuna menzione di generazione voucher) — risolto per omissione: questa story mostra solo le schede Sponsor, senza alcuna azione "Genera voucher". Motivo tecnico che rinforza questa scelta: `risolviNomeVoucher` (`lib/sponsor/risolvi-nome-voucher.ts`), usato dalla pagina voucher esistente, risolve il nome dell'Utente da Allenatore/Atleta/Genitore collegati alla sessione o, come ultima risorsa, dalla sua email — un Visitatore anonimo non ha nessuna di queste fonti (nessuna sessione, nessuna email). Se in futuro si volesse un voucher generabile da un Visitatore, servirebbe una decisione di prodotto nuova (es. un form che chiede Nome/Cognome a mano) — esplicitamente non affrontata da questa story. Se l'utente lo richiede, va aperta una story dedicata (o un'estensione di questa), non improvvisata qui.

### Pattern da riusare (non reinventare)

- **Query e raggruppamento**: `app/app/(sponsor)/sponsor/page.tsx` (righe della query `sponsorAttivi` + chiamata a `raggruppaSponsorPerTipo`) — mirror esatto per la parte "vetrina", senza la parte "gestione" (Admin/Dirigente-only, non pertinente a una pagina pubblica).
- **Card component**: `SponsorVetrinaCard.tsx` come riferimento visivo (immagine con cache-busting, link esterno cliccabile solo per Banner) — copiare la struttura, non importare il componente (ha il pulsante voucher incorporato, vedi Task 2).
- **Storage pubblico**: `urlPubblicoImmagineSponsor` (`lib/storage/sponsor.ts`) — bucket `sponsor-banner` già pubblico, nessuna nuova policy necessaria.
- **Pattern "nessuna sezione se vuota"**: stesso principio già applicato due volte nel progetto per contenuto condizionale in home — Story 16.3 (carosello Banner, `bannerAttivi.length > 0`) e Story 18.1 stessa (nessuna sezione di contenuto nello scheletro).

### Registro visivo — nessun mockup Sally necessario

A differenza di Story 18.1 (scheletro nuovo, prima pagina pubblica del progetto — coordinata con Sally) e Story 16.3 (pattern visivo nuovo, il carosello), questa story **riusa un pattern già approvato** (le schede vetrina di Story 16.2) su una pagina che già usa i token DESIGN.md stabiliti da Story 18.1. Nessuna nuova decisione di design necessaria — se lo sviluppo scopre altrimenti (es. il layout a due colonne non si adatta bene sotto l'hero), fermarsi e chiarire con l'utente prima di improvvisare, non assumere.

### Riferimenti

- [Source: app/app/(sponsor)/sponsor/page.tsx] — query, raggruppamento, pattern "nessuna sezione se vuota".
- [Source: app/app/(sponsor)/sponsor/SponsorVetrinaCard.tsx] — struttura visiva di riferimento per la nuova scheda pubblica (senza il pulsante voucher).
- [Source: lib/sponsor/raggruppa-sponsor-per-tipo.ts] — funzione pura da riusare invariata.
- [Source: lib/storage/sponsor.ts, urlPubblicoImmagineSponsor] — URL pubblico immagine, bucket già pubblico.
- [Source: app/page.tsx, app/home-pubblica.module.css] — home pubblica esistente (Story 18.1) su cui innestare la nuova sezione.
- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.2] — decisioni di analisi, testo originale, punto aperto sul voucher.

### Project Structure Notes

- Nuovo file: `app/SponsorPubblicoCard.tsx`.
- Modificati: `app/page.tsx` (nuova sezione), `app/home-pubblica.module.css` (nuove classi).
- Nessuna migrazione DB, nessuna nuova Server Action, nessun nuovo bucket/policy Storage — solo lettura di dati/storage già esistenti da Epic 16.

## Review Findings

Code review con 3 layer adversariali paralleli (Blind Hunter, Edge Case Hunter, Acceptance Auditor), diff ristretto ai file di questa story (`app/page.tsx`, `app/SponsorPubblicoCard.tsx`, `app/home-pubblica.module.css`).

**Acceptance Auditor**: nessuna violazione degli AC #1/#2/#3 — verificati singolarmente. Un finding fuori AC (vedi patch sotto, testo hero).

- [x] [Review][Patch] La query `prisma.sponsor.findMany` non ha un `select` esplicito — recupera l'intera riga `Sponsor` (ogni colonna presente e futura) in un processo raggiungibile da qualunque visitatore anonimo; il confine "cosa è sicuro esporre" è oggi affidato solo alla disciplina del `.map()` successivo, non imposto dalla query stessa. Se un domani un campo interno venisse aggiunto al model, nulla lo bloccherebbe qui. Trovato dal Blind Hunter. [app/page.tsx:43-44]
- [x] [Review][Patch] `SponsorPubblicoCard.tsx` ridichiara a mano lo stesso tipo già esportato `SponsorVetrina` (`lib/sponsor/raggruppa-sponsor-per-tipo.ts`) invece di importarlo — terza copia indipendente della stessa forma dati (la seconda, in `SponsorVetrinaCard.tsx`, è preesistente e fuori scope qui), mantenuta sincronizzata solo per convenzione. Trovato dal Blind Hunter. [app/SponsorPubblicoCard.tsx]
- [x] [Review][Patch] La nuova `<section>` che racchiude Banner/Convenzioni non ha un nome accessibile proprio (nessun `aria-label`, solo due `<h2>` interni) — non verrà esposta come landmark/regione nominata alla tecnologia assistiva. Trovato dal Blind Hunter. [app/page.tsx:99]
- [x] [Review][Patch] Il testo del paragrafo "coming soon" nell'hero è stato modificato (rimossa la menzione "i nostri sponsor", ora ridondante con la sezione appena aggiunta) senza documentarlo nelle Completion Notes né in un commento nel codice — la modifica è corretta nel merito (l'hero prometteva sponsor "in arrivo" proprio sopra la sezione che li mostra già) ma contraddiceva silenziosamente il vincolo esplicito nelle Dev Notes di questa stessa story ("senza toccare header/hero/footer esistenti"). Trovato dall'Acceptance Auditor (e in modo indipendente, come nota di manutenibilità, dal Blind Hunter). [app/page.tsx:88-91]

- [x] [Review][Defer] La query Sponsor fallisce in modo indistinguibile da "nessuno sponsor attivo" (`.catch(() => [])`) — a differenza delle due letture puramente decorative (logo/nome settore), qui si tratta del contenuto reale della story; un'interruzione transitoria del DB nasconderebbe silenziosamente gli sponsor dal sito pubblico con solo un `console.error` lato server, nessun avviso visibile. Trovato dal Blind Hunter e, indipendentemente, dall'Edge Case Hunter. — deferred, nessuna infrastruttura di alerting esiste in nessun punto del progetto; il comportamento "silenzioso" è anche una conseguenza diretta e voluta dell'AC #2 stesso (nessuna sezione se il conteggio è zero), non distinguibile da un errore senza introdurre monitoraggio dedicato, fuori scope. [app/page.tsx:43-48]
- [x] [Review][Defer] Nessun `take`/limite di paginazione sulla query, nessuna cache (pagina `force-dynamic`) — ora raggiungibile da traffico pubblico anonimo (bot/crawler inclusi), non solo da membri autenticati come `/app/sponsor`. Trovato dal Blind Hunter e, indipendentemente, dall'Edge Case Hunter. — deferred, stesso principio già accettato per lo stesso model in Story 16.3 ("questione di scala, non un bug" — piccola società, poche decine di Sponsor al massimo, NFR5/NFR6); un limite arbitrario sarebbe una decisione di prodotto. [app/page.tsx:43-44]
- [x] [Review][Defer] Nessun fallback `onError` sull'`<img>` se l'immagine di uno Sponsor non esiste nel bucket — terza occorrenza dello stesso gap già deferito due volte (Story 16.1 `SponsorRow`, Story 16.2 `SponsorVetrinaCard`), qui propagato per copia nel nuovo componente pubblico. L'esposizione aumenta (visitatore anonimo di internet invece di solo membri autenticati) ma il gap stesso non è introdotto da questa story. Trovato dall'Edge Case Hunter. — deferred, stesso gap preesistente già accettato ripetutamente nel progetto. [app/SponsorPubblicoCard.tsx]

**Dismessi come rumore (2)**: alt text dell'immagine copiato invariato da `SponsorVetrinaCard.tsx` (Blind Hunter) — resta una descrizione accurata dell'immagine indipendentemente dal pubblico, nessun difetto reale; accoppiamento "fragile" tra il fallback `.catch(() => [])` e il tipo inferito dell'array (Blind Hunter) — speculativo su una futura modifica ipotetica del fallback, TypeScript inferisce già correttamente il tipo oggi tramite Prisma, nessun difetto reale in questo diff.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (claude-opus-5)

### Debug Log References

Nessuno - nessun blocco incontrato, implementazione lineare (riuso diretto di funzione pura e pattern già stabiliti, nessuna decisione lasciata aperta durante lo sviluppo oltre a quelle già risolte in fase di creazione della story).

### Completion Notes List

- `app/page.tsx`: aggiunta la lettura `prisma.sponsor.findMany` alla stessa `Promise.all` già in uso per logo/nome settore (Story 18.1) — tre letture indipendenti, stesso principio, nessuna richiede le altre. Struttura del `<main>` cambiata da `className={styles.hero}` diretto a un `<div className={styles.hero}>` annidato, perché ora `<main>` deve contenere sia l'hero sia la nuova sezione Sponsor (solo l'hero ha lo sfondo a gradiente/testo chiaro).
- Nuovo `app/SponsorPubblicoCard.tsx`: struttura copiata da `SponsorVetrinaCard.tsx` (immagine con cache-busting, link esterno cliccabile solo per i Banner) ma senza il pulsante "Genera voucher" — deliberatamente fuori scope, vedi Dev Notes.
- Nuove classi in `app/home-pubblica.module.css` (`.sezioneSponsor`, `.gruppoSponsor`, `.listaSponsor`, `.schedaSponsor`, `.anteprimaSponsor`, `.linkImmagineSponsor`), ispirate a `sponsor.module.css` ma non condivise (convenzione del progetto). Aggiornato anche il commento introduttivo del file (non più "solo scheletro").
- Nessun nuovo test (nessuna nuova funzione pura introdotta, `raggruppaSponsorPerTipo` riusata invariata e già coperta). 1062/1062 test Vitest passati (invariato), 0 errori tsc/eslint (1 warning preesistente `<img>` su `app/page.tsx`, stesso pattern già accettato altrove), build produzione riuscita.
- Verifica dal vivo (visita reale alla home pubblica con Sponsor attivi in produzione) non eseguibile in questo sandbox — demandata all'utente, stesso limite già accettato per le story precedenti.

### File List

- `app/page.tsx` (modificato: query Sponsor + sezione, ristrutturazione hero in `<div>`)
- `app/SponsorPubblicoCard.tsx` (nuovo)
- `app/home-pubblica.module.css` (modificato: nuove classi sezione Sponsor)
- `_bmad-output/implementation-artifacts/18-2-sponsor-pubblico-home.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-12: File di story creato, stato ready-for-dev.
- 2026-08-12: Implementata - sezione Sponsor (Banner/Convenzioni attivi) aggiunta alla home pubblica, riuso diretto di `raggruppaSponsorPerTipo` e del pattern query di `/app/sponsor`. Nuovo componente `SponsorPubblicoCard.tsx` senza pulsante voucher (deliberatamente fuori scope). 1062/1062 test Vitest passati, 0 errori tsc/eslint, build produzione riuscita. Status: review.
- 2026-08-12: Code review completata (3 layer adversariali paralleli: Blind Hunter, Edge Case Hunter, Acceptance Auditor) - nessuna violazione degli AC #1/#2/#3. 4 patch applicati: `select` esplicito sulla query Sponsor (il confine "cosa è pubblico" ora imposto dalla query, non solo dal `.map()` successivo); `SponsorPubblicoCard.tsx` riusa il tipo esportato `SponsorVetrina` invece di ridichiararlo; `aria-label="Sponsor"` sulla nuova `<section>` (nessun nome accessibile proprio); testo hero modificato ora documentato con un commento (rimossa la menzione "sponsor" dall'elenco "in arrivo", ridondante con la sezione appena aggiunta). 3 defer (query Sponsor indistinguibile da "nessuno sponsor attivo" in caso di errore transitorio - nessuna infrastruttura di alerting nel progetto; nessun `take`/cache sulla query ora esposta a traffico pubblico anonimo - stesso principio già accettato per lo stesso model in Story 16.3; nessun fallback `onError` sull'immagine - terza occorrenza dello stesso gap già deferito in Story 16.1/16.2). 2 dismessi come rumore. 1062/1062 test Vitest passati (invariato), 0 errori tsc/eslint, build produzione riuscita dopo i fix. Status: done.
