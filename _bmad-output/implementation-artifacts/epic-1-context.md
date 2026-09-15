# Epic 1 Context: Accesso, Popolamento e Iscrizioni

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ogni ruolo (Allenatore, Atleta, Genitore, Segreteria, Dirigente, Admin) può registrarsi e accedere al sistema con permessi scoperti per il proprio ruolo. Admin/Dirigente popolano l'anagrafica (import Excel dal portale federale, precaricamento allenatori, aggancio genitore-atleta via Codice Fiscale) e la Segreteria conferma le Iscrizioni per l'Anno Agonistico corrente — includendo la gestione non negoziabile del passaggio di stagione (merge del certificato per data più recente, riporto automatico delle Under 13 assenti dall'export). Questo epic realizza lo user journey UJ-3 (import stagionale del Dirigente) ed è il fondamento su cui si appoggiano tutti i moduli successivi (autenticazione, anagrafica Atleta/Allenatore, ruoli).

## Stories

- Story 1.1: Registrazione e login per ruolo
- Story 1.2: Gestione utenti e ruoli — Admin
- Story 1.3: Import archivio Atlete da export federale
- Story 1.4: Precaricamento Allenatori
- Story 1.5: Aggancio Genitore-Atleta in registrazione
- Story 1.6: Conferma iscrizione
- Story 1.7: Merge certificato in import
- Story 1.8: Riporto Under 13 nel rollover

## Requirements & Constraints

- Meccanismo di autenticazione assunto come base (email + password) — nessuna preferenza specifica raccolta, dettaglio confermato in architettura.
- Il Codice Fiscale è la chiave di matching univoca per riconoscere Atlete, Allenatori e il legame Genitore-Atleta in import, onboarding e rollover.
- Le date nell'export federale (formato stringa gg/mm/aaaa) vanno normalizzate in ISO 8601 prima della persistenza.
- L'Iscrizione (conferma Segreteria per l'Anno Agonistico corrente) è un concetto amministrativo distinto e non derivabile dallo stato del tesseramento federale, che in questo epic non viene tracciato.
- Le Atlete Under 13 vanno riportate di default nella nuova stagione anche se assenti dall'export (limite noto del portale federale), con possibilità di esclusione manuale da Admin/Dirigente/Segreteria.
- Scala attesa: fino a ~200 Atlete nel settore volley (v1).
- Privacy: gestione "ragionevole" di base per dati sensibili collegati (Codice Fiscale, dati anagrafici); nessun vincolo di residenza/hosting specifico per questo epic.

## Technical Decisions

- Applicazione unica, monolite Next.js: tutta la logica passa da Server Action/Route Handler nello stesso repo (AD-1).
- Confini di modulo per feature (AD-2): Onboarding-Import (`app/(onboarding-import)/`) possiede registrazione, import, precaricamento allenatori e aggancio genitore-atleta; Iscrizioni (`app/(iscrizioni)/`) possiede FR-17. Nessun modulo scrive direttamente su tabelle di un altro modulo.
- Motore di matching Codice Fiscale come servizio unico condiviso (AD-5, `lib/matching-codice-fiscale/`): espone `trovaPerCodiceFiscale` (lookup) e `unisciCertificato` (merge "vince la data più recente"). Import, Onboarding e Rollover lo richiamano tutti — nessuna reimplementazione locale della logica di merge.
- Split di accesso ai dati (AD-9): le tabelle protette da RLS (Atleta, CertificatoMedico, Iscrizione, Notifica, ConfigurazioneSmtp) si leggono/scrivono a runtime solo via client Supabase autenticato (`lib/db-rls/`), mai Prisma diretto, perché altrimenti i claim del JWT non arrivano a PostgREST e le policy RLS non si applicano; Prisma resta comunque il proprietario di schema/migrazioni per tutte le tabelle.
- Proprietari autorizzati dei campi identitari di Atleta (AD-10): la creazione/aggiornamento passa sempre da `creaAtleta`/`aggiornaAtleta` (`lib/db-rls/atleta.ts`); in questo epic l'unico modulo autorizzato a chiamarla è Onboarding-Import (una seconda autorizzazione per Gruppi-Allenatori arriva solo con la Story 9.18, fuori scope qui).
- Ruoli specchiati su Supabase `app_metadata` (AD-11): `UtenteRuolo` via Prisma resta la fonte di verità, ma ogni scrittura di Ruoli va specchiata anche in `app_metadata` con chiamata service-role; middleware e route guard leggono i Ruoli solo da `app_metadata` (JWT), mai con query diretta al DB. Se la scrittura su `app_metadata` fallisce dopo che `UtenteRuolo` è riuscita, l'intera operazione è fallita (retry, non successo parziale).
- Convenzione errori: un rifiuto per autorizzazione restituisce sempre `{ error: { code: 'FORBIDDEN', message } }`, mai `NOT_FOUND`.
- Convenzioni dati: id come UUID; date persistite in ISO 8601.
- La tabella `CertificatoMedico` creata in Story 1.7 è volutamente minima (solo date di validità) — verrà estesa da Epic 4 con upload/notifiche/stato; non anticipare qui quel lavoro.

## UX & Interaction Patterns

- Superfici principali: `/accedi` (login), `/registrati` (registrazione autonoma per ruolo, incluso aggancio genitore-atleta per Codice Fiscale), `/conferma-iscrizioni` (Segreteria), `/import-atlete` (Admin/Dirigente), `/precaricamento-allenatori` (Admin/Dirigente), `/admin` (gestione utenti e ruoli), `/non-autorizzato` (atterraggio per un rifiuto FORBIDDEN).
- La visibilità delle voci di navigazione dipende dal ruolo dell'utente autenticato tramite guardia di ruolo lato server per route-group, mai un menu che nasconde voci solo lato client.
- Tono calmo e diretto, frasi brevi senza punti esclamativi o tono da poster/notifica social; coerente su ogni messaggio di stato/errore introdotto da questo epic.

## Cross-Story Dependencies

- Story 1.3 (import), Story 1.7 (merge certificato) e Story 1.8 (rollover Under 13) condividono lo stesso motore di matching Codice Fiscale (AD-5): implementare/riusare un unico servizio, non logica duplicata per story.
- Story 1.4 (precaricamento allenatore) e Story 1.1 (registrazione) sono collegate: la registrazione con lo stesso Codice Fiscale di un record precaricato deve agganciarsi ad esso invece di creare un duplicato.
- Story 1.6 (Iscrizione) va tenuta distinta dal concetto di Tesseramento federale (non tracciato in questo epic); un epic successivo (13) introduce una conferma di Tesseramento separata — non conflatare i due concetti nelle story di questo epic.
