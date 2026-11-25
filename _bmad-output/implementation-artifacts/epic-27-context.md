# Epic 27 Context: Iscrizione online tramite portale

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettere a Genitori (e Atlete maggiorenni) di iscriversi online alla nuova stagione agonistica tramite il portale: form precompilato con i dati già a sistema, raccolta dei dati e dei consensi mancanti, generazione del modulo di iscrizione in PDF identico al modello cartaceo della società (`docs/ModuloIscrizione.pdf`), firma, ricaricamento del modulo firmato e verifica finale da parte della Segreteria. Include l'apertura della registrazione a Atlete non ancora presenti a DB (Codice Fiscale non trovato), che diventano Atlete "in attesa" fino alla conferma. Elimina la ricopiatura manuale dalla carta e lo scambio fisico dei moduli. Assorbe la parte "modulo prevalorizzato → firma → upload" dell'Epic 24; invio email alla Segreteria, quote e IBAN restano nell'Epic 24.

## Stories

- Story 27.1: Anagrafica completa - cittadinanza e Genitori/Tutori
- Story 27.2: Modulo di iscrizione in PDF precompilato
- Story 27.3: Domanda di iscrizione online per la nuova stagione
- Story 27.4: Caricamento del modulo firmato
- Story 27.5: Verifica della domanda da parte della Segreteria
- Story 27.6: Nuovo Atleta in fase di registrazione

## Requirements & Constraints

- **Dati mancanti da introdurre:** `cittadinanza` su Atleta; entità Genitore/Tutore (max 2 per Atleta minorenne) con cognome e nome, codice fiscale (stessa validazione dell'Atleta), luogo/data di nascita, residenza, email, telefono, flag "intestatario ricevuta" (al massimo uno per Atleta). Il secondo genitore spesso non ha account: l'entità **non è** `Utente`, ma è collegabile opzionalmente a un `Utente`.
- **Dati per stagione (legati alla domanda, non all'Atleta):** data domanda, consenso trattamento dati (obbligatorio, bloccante), autorizzazione immagini (Autorizza / Non autorizza), accettazione Patto Educativo di Corresponsabilità, dichiarazione certificato medico, PDF firmato, stato della domanda.
- **Maggiorenne:** firma da sé; la sezione Genitori/Tutori non compare né nel form né nel PDF.
- **Modulo generato:** stesso layout del modello (intestazione/logo, "Domanda di iscrizione", Consenso dati, Autorizzazione immagine, Patto educativo, Certificato medico); **rimossi** la sezione SARS-CoV-2 e il "Cod: 15966"; restano vuoti solo data e firma; riporta le scelte fatte online.
- **Il PDF firmato è la prova:** i dati online sono "dichiarati", il documento valido è il PDF caricato.
- **Upload modulo firmato:** PDF o immagine, formato e dimensione controllati lato server con messaggio chiaro; sostituibile finché la Segreteria non conferma; visibile solo al Genitore/Atleta collegata e a Segreteria/Admin; notifica alla Segreteria a nuovo caricamento.
- **Apertura iscrizioni online:** serve un meccanismo di apertura/chiusura per una stagione, anche per un Anno Agonistico non ancora creato (oggi nasce al primo salvataggio). A iscrizioni chiuse la domanda non è disponibile.
- **Autorizzazione:** un Genitore opera solo sulle Atlete collegate, con controllo lato server (non solo UI). Rifiuti come `{ error: { code: 'FORBIDDEN', message } }`, mai `NOT_FOUND`.
- **Segreteria:** distingue le domande online in attesa (con/senza modulo), vede dati dichiarati, consensi e modulo; può confermare o rimandare indietro con nota (il Genitore corregge e ricarica).
- **Nuovo Atleta in registrazione:** CF non trovato non blocca più: si apre la domanda, si crea un'Atleta "in attesa" collegata all'account, l'utente entra nel portale con iscrizione "in attesa". CF trovato continua ad agganciare l'Atleta esistente. Serve un limite lato server alla creazione di Atlete in attesa (da definire in create-story).
- **Fuori scope:** effetto del "Non autorizza" immagini su foto squadre/sito pubblico/fotogallery (solo raccolto, salvato e mostrato); gestione quote (l'intestatario ricevuta è solo una scelta tra i genitori indicati).
- **Ogni story:** test Vitest su validazione/Server Action/permessi e aggiornamento della guida in-app (`lib/guida/contenuti.ts`) per le pagine toccate.

## Technical Decisions

- **Atleta "in attesa" sulla tabella `Atleta`** (non tabella di appoggio): visibile solo in `/app/conferma-iscrizioni` e nelle pagine del Genitore/Atleta collegata. Filtro nel punto unico di lettura `lib/db-rls/atleta.ts` (stesso pattern di `rimossaIl`), coperto da un test che fallisce se un qualunque elenco (gruppi, presenze, tesseramenti, sito pubblico) la restituisce. Alla conferma della Segreteria diventa Atleta a tutti gli effetti.
- **Campi identitari di Atleta** si scrivono solo tramite `creaAtleta`/`aggiornaAtleta` in `lib/db-rls/atleta.ts`; oggi solo Onboarding-Import e Gruppi-Allenatori sono autorizzati a richiamarle — le Story 27.3/27.6 che scrivono l'anagrafica dalla domanda allargano questo perimetro, da esplicitare in create-story.
- **Matching per Codice Fiscale** solo tramite il servizio condiviso `lib/matching-codice-fiscale/` (`trovaPerCodiceFiscale`), nessuna reimplementazione nel flusso di registrazione.
- **Modello della domanda:** nuova entità (es. `DomandaIscrizione`: Atleta, Anno Agonistico, consensi, data, stato, `filePath`) oppure campi su `Iscrizione` — scelta in create-story. L'Iscrizione "in attesa" deve restare distinguibile da quella confermata (`Iscrizione` è una riga per Atleta+stagione con `attiva` e `confermataIl`). Riferimento di pattern per lo stato: `StatoCertificato` `IN_ATTESA`/`CONFERMATO`.
- **Genitore/Tutore:** nuovo model (es. `TutoreAtleta`: `atletaId`, `posizione` 1|2, anagrafica, `intestatarioRicevuta`, `utenteId` opzionale). Il collegamento Utente↔Atleta resta `GenitoreAtleta` (usato anche dall'Atleta che si registra per sé).
- **PDF generato nel browser** (es. `pdf-lib` lato client), nessuna libreria PDF nel bundle del Worker Cloudflare; funzione di composizione separata e testabile. Fattibilità da validare subito nella 27.2.
- **Storage del modulo firmato:** bucket Supabase Storage privato come i certificati medici, `filePath` sul record, accesso solo con URL firmati a breve scadenza generati lato server dopo verifica dei permessi. Mirror del flusso di caricamento certificati (incl. notifica).
- **RLS:** ogni nuova tabella in `ENABLE ROW LEVEL SECURITY` + `REVOKE` esplicito ad `anon`/`authenticated` nella migrazione (mai solo un commento). Le tabelle sensibili protette da RLS si leggono/scrivono a runtime col client Supabase autenticato (`lib/db-rls/`); Prisma per schema/migrazioni. Ogni cambio di schema via migrazione Prisma.
- **Mutazioni** solo via Server Action; ruoli letti da `app_metadata` nel route guard.
- **Anno Agonistico:** stagione corrente/prossima risolta dall'helper condiviso `lib/anno-agonistico/`, mai calcoli di date locali.

## UX & Interaction Patterns

- Uso prevalente da telefono per Genitori/Atlete: touch target minimo 44×44px, layout responsive unico, WCAG AA come soglia guida.
- Errori di validazione sempre come testo associato al campo; al submit fallito focus sul primo campo in errore o riepilogo `aria-live` — vale in particolare per l'upload del modulo.
- Lo stato "in attesa" si comunica con tono neutro/informativo, mai con colore da solo (etichetta testuale esplicita); non forzare varianti warning/danger.
- Conferme in pagina, non `window.confirm`.
- In `/app/conferma-iscrizioni` (`IscrizioniElenco.tsx`) va mantenuto l'ordinamento esistente (Story 9.46).
- Il Genitore vede l'invito a compilare la domanda dalla pagina della propria Atleta quando le iscrizioni online sono aperte.

## Cross-Story Dependencies

- Ordine obbligato: 27.1 → 27.2 → 27.3 → 27.4 → 27.5 → 27.6.
- 27.2 usa l'anagrafica completa della 27.1; 27.3 rende scaricabile il PDF della 27.2 a domanda inviata; 27.4 si appoggia alla domanda della 27.3; 27.5 verifica domanda (27.3) e modulo (27.4).
- 27.6 va per ultima: un'Atleta in attesa senza la verifica della Segreteria (27.5) sarebbe un vicolo cieco in produzione. Modifica `/registrati` (`app/(onboarding-import)/registrati/actions.ts`), che oggi blocca con "Nessuna Atleta trovata…".
- 27.1 estende la scheda Atleta esistente (`ModificaDatiAtletaForm.tsx`).
- Epic 24 resta aperto per invio email alla Segreteria, quote e IBAN; una story futura gestirà l'effetto del consenso immagini.
- Il filtro "Atleta in attesa" tocca indirettamente tutti i consumatori di `lib/db-rls/atleta.ts` (gruppi, presenze, tesseramenti via `lib/tesseramento.ts`, sito pubblico).
