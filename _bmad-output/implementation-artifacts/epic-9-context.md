# Epic 9 Context: Miglioramenti Post-Rilascio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Raccogliere i miglioramenti emersi dalla verifica dal vivo in produzione dopo il rilascio iniziale, invece che pianificarli tutti in anticipo: navigazione (logoff, menu profilo, barra laterale/drawer responsive, voce attiva), gestione più completa di entità già esistenti (Allenatori, Atlete, Gruppi, Slot, Certificati), piccoli miglioramenti UX (larghezza massima pagine-form, colori semantici, ordinamento, badge scadenza), coerenza dei dati anagrafici e correzioni di autorizzazione/account puntuali. A differenza degli altri epic, l'elenco delle storie resta aperto: si aggiungono una alla volta man mano che emergono dall'uso reale, non tutte definite in anticipo.

## Stories

- Story 9.1: Pulsante di logoff in barra di navigazione
- Story 9.2: Navigazione responsive — hamburger su mobile, barra laterale verticale su desktop
- Story 9.3: Riquadro con larghezza massima per le pagine-form
- Story 9.4: Menu profilo con logoff e modifica password (sostituisce/estende 9.1)
- Story 9.5: Campo Cognome per Allenatore (precaricamento)
- Story 9.6: Geolocalizzazione Palestre (link Naviga + coordinate da link Google Maps + mappa incorporata in `/palestre`)
- Story 9.7: Barra laterale/drawer ancora visibile dopo il logoff (bug fix)
- Story 9.9: Gestione Allenatori precaricati (vista, modifica, cancellazione condizionata)
- Story 9.10: La voce di navigazione attiva non si aggiorna durante la navigazione (bug fix)
- Story 9.13: Modifica e cancellazione di uno Slot già inserito
- Story 9.14: Rimozione di un'Atleta da un Gruppo
- Story 9.15: Assegnazione Atlete al proprio Gruppo da parte dell'Allenatore
- Story 9.16: Parametri standard per i dati fisici delle Atlete
- Story 9.17: Vista griglia mensile delle presenze per Gruppo (lato Allenatore)
- Story 9.18: Creazione di una nuova Atleta da parte dell'Allenatore
- Story 9.19: Badge "certificato in scadenza" nell'elenco Atlete di Gruppo e in Vista Dirigente
- Story 9.20: Data del nuovo certificato già in fase di caricamento
- Story 9.21: Un'Atleta in più Gruppi contemporaneamente
- Story 9.22: Rimozione dell'accesso Dirigente al precaricamento Allenatori
- Story 9.23: Colore semantico sui certificati confermati (verde/giallo/rosso)
- Story 9.24: Menu principale "Impostazioni" (raggruppa SMTP e Logo)
- Story 9.25: Ordinamento per stato nella sezione "Confermati"
- Story 9.26: Vista d'insieme per l'Allenatore sui propri Gruppi (`/vista-allenatore`)
- Story 9.27: Modifica delle date di un Certificato già confermato
- Story 9.28: Aggiunta di un nuovo Atleta anche da parte di Admin/Dirigente in `/gruppi`
- Story 9.29: Menu laterale fisso durante lo scroll della pagina (bug fix)
- Story 9.30: Interfaccia più compatta per `/precaricamento-allenatori`
- Story 9.31: Email Segreteria configurabile
- Story 9.32: Rimuovere un Allenatore da un Gruppo
- Story 9.33: Atlete su riga separata in `/gruppi` (elenco orizzontale)
- Story 9.34: Data di scadenza del certificato nell'elenco Atlete e nei drill-down
- Story 9.35: Numero di maglia per Atleta, per stagione
- Story 9.36: Sanificazione in maiuscolo di Cognome/Nome nella creazione di una nuova Atleta
- Story 9.37: Modifica di nome e categoria di un Gruppo esistente
- Story 9.38: Correzione dell'email di un Utente non ancora confermato, da parte dell'Admin

*(Numerazione non contigua: 9.8, 9.11, 9.12 appartengono a questo epic ma non hanno una sezione propria in `epics.md` — riferimenti incrociati li citano nel contesto di altre storie, es. refresh JWT, foto profilo Allenatore e il blocco su bersaglio Admin riusato da 9.38.)*

## Requirements & Constraints

- Principio guida trasversale del prodotto: "niente rumore" — gli alert restano informativi, mai bloccanti (FR-15); nessuna nuova notifica di routine.
- Nessuna entità di dominio viene mai cancellata fisicamente per default: il pattern consolidato è un flag `attivo`/disattiva-riattiva. Un vero hard-delete (Allenatore, Slot) è ammesso solo quando non esistono dipendenze collegate (nessun aggancio account, nessuna assegnazione, nessuna Presenza/storico), altrimenti l'operazione è bloccata con messaggio esplicativo — mai una perdita silenziosa di storico o aggancio.
- Le tabelle di giunzione pure (`GruppoAtleta`, `GruppoAllenatore`, `UtenteRuolo`) restano invece cancellabili liberamente (`deleteMany` idempotente): non introducono il problema di hard-delete di un'entità di dominio.
- Autorizzazione a due livelli già stabilita e da rispettare in ogni nuova storia che tocca Gruppi: Admin/Dirigente hanno accesso ampio a tutti i Gruppi; un Allenatore agisce solo sul/i proprio/i Gruppo/i (verificato tramite `GruppoAllenatore`), sia in lettura sia in scrittura, con rifiuto esplicito (mai un semplice occultamento UI) per un Gruppo non suo.
- Scala: ~200 Atlete, liste sempre corte — nessuna paginazione necessaria per nessuna nuova vista/tabella.
- Un'Atleta può appartenere a più Gruppi nella stessa stagione (Story 9.21): niente deduplica a livello di club nei conteggi per Gruppo, nessun controllo di sovrapposizione oraria tra Slot di Gruppi diversi.
- Ogni nuova storia che introduce un nuovo campo su una tabella non protetta da RLS (Palestra, Allenatore, GruppoAtleta, ecc.) passa da migrazione Prisma; le tabelle già coinvolte hanno righe reali in produzione — nuovi campi vanno resi nullable/opzionali quando non è possibile un default sicuro.
- Vincolo NFR6 (nessun servizio esterno a pagamento): la geolocalizzazione Palestre (Story 9.6) evita esplicitamente Google Maps JavaScript API a pagamento — usa parsing di un link di condivisione incollato dall'Admin/Dirigente e un iframe `output=embed` gratuito, nessuna chiave API.
- Ogni story che tocca una funzionalità già documentata nella guida in-app (Epic 17) deve aggiornarne anche il contenuto.
- I dati anagrafici di identità (Cognome/Nome) inseriti da UI vengono normalizzati in maiuscolo prima della persistenza, stessa convenzione già in uso per il Codice Fiscale — vale per la creazione Atleta da Gruppi-Allenatori (Story 9.36), non per l'import federale (pipeline di normalizzazione indipendente, riceve dati già in maiuscolo).
- Le azioni Admin che toccano un canale di autenticazione/identità sensibile (reset password, Story 9.11; correzione email pre-conferma, Story 9.38) sono sempre bloccate quando il bersaglio ha il Ruolo Admin — chi controlla email/password di un account ne controlla anche il recupero, rischio di presa di controllo di un altro account Admin.

## Technical Decisions

- Architettura invariata rispetto al resto del progetto: monolite Next.js App Router, moduli verticali a strati (UI → Server Action → servizio di dominio → Prisma/Data Access → Postgres); nessun servizio backend separato.
- AD-9 resta vincolante: le tabelle protette da RLS (CertificatoMedico, Atleta, Presenza, Iscrizione, Notifica, ConfigurazioneSmtp) si leggono/scrivono a runtime solo via client Supabase autenticato (`lib/db-rls/`); Prisma diretto resta riservato alle tabelle non-RLS (Palestra, Campo, Slot, Gruppo, Allenatore, Utente, UtenteRuolo, GruppoAtleta, GruppoAllenatore).
- AD-10 (proprietari autorizzati dei campi identitari di Atleta) è stato esteso dalla Story 9.18: oltre a Onboarding-Import, anche Gruppi-Allenatori può creare una nuova Atleta (`creaEAssegnaAtleta`, che richiama la stessa `creaAtleta()` condivisa, mai duplicata) — sia dal lato Allenatore (`/i-miei-gruppi`) sia da Admin/Dirigente (`/gruppi`, Story 9.28).
- AD-11 (ruoli specchiati su `app_metadata`): ogni nuova restrizione di ruolo (es. Story 9.22, 9.26) applica sia route-guard sia controllo esplicito lato Server Action ("difesa in profondità"), mai solo uno dei due; i rifiuti di autorizzazione restituiscono sempre `{ error: { code: 'FORBIDDEN', message } }`, mai `NOT_FOUND`.
- Convenzione errori invariata su tutto l'epic: `{ error: { code, message } }` per ogni Server Action, `VALIDATION` per input non validi, `FORBIDDEN` per autorizzazione.
- Il Codice Fiscale resta la chiave di matching/deduplica per Atlete e Allenatori (unique su `codiceFiscale`); il `sesso` di una nuova Atleta creata da UI (Story 9.18/9.28) va derivato deterministicamente dal Codice Fiscale (nuova funzione di decodifica in `lib/matching-codice-fiscale/`, oggi esiste solo la validazione di formato).
- `calcolaGiorniAScadenza`/`categorizzaStatoCertificato` (soglia 30 giorni) sono la logica unica e già riusata per ogni calcolo di scadenza certificato in questo epic (badge in scadenza, colori semantici, ordinamento, drill-down) — nessun nuovo calcolo di scadenza da scrivere ex novo.
- Il modello `Notifica` è a scopo singolo di base (evento "certificato caricato"); introdurre un evento diverso (es. "nuova Atleta creata", Story 9.18) richiede un campo `tipo` (enum, default retrocompatibile) e testo differenziato in `/notifiche`, non un modello parallelo.
- Pattern "riga tabellare compatta con toggle sola-lettura/modifica" (introdotto da `PartitaRow.tsx`/Epic 10, poi `SlotRow.tsx`) è il riferimento di riuso per ogni nuova gestione inline di elenco (es. Story 9.9, 9.30, 9.32/9.33) — icone azione condivise (modifica/cancellazione), non duplicate ad ogni nuovo consumer.
- Numero di maglia (Story 9.35) appartiene al legame stagionale `GruppoAtleta` (campo `numero Int?`, nessun vincolo di unicità), non all'anagrafica Atleta — stesso principio già seguito per altri campi "leggeri, non strutturali" del progetto (es. `ordine` su `VoceMenuPubblico`).
- `aggiornaGruppo` (Story 9.37) è mirror diretto del pattern update-singola-entità già stabilito da `aggiornaPalestra`/`aggiornaCampionato`: `requireRuolo(["ADMIN","DIRIGENTE"])` → validazione campi obbligatori (nessun controllo duplicato nome+categoria, comportamento invariato di `creaGruppo`) → `prisma.gruppo.update` → `revalidatePath`.
- Correzione email pre-conferma (Story 9.38) è un'operazione Admin a due passaggi obbligati e sequenziali, mai uno solo: aggiornamento email su Supabase Auth (`admin.auth.admin.updateUserById`) + rigenerazione/invio esplicito del link di conferma via SMTP applicativo (Supabase non invia mai l'email nativa in questo progetto) — stesso file/famiglia di chiamata Admin API di `reimpostaPasswordFissaUtente` (Story 9.11); ambito limitato a Utenti mai confermati (nessuna sessione mai stabilita) — cambio email di un account già attivo e percorso self-service restano esplicitamente fuori scope.

## UX & Interaction Patterns

- Registro visivo invariato: bianco+azzurro prevalenti, navy/magenta solo come accenti riservati; niente sfondo pieno navy/magenta su aree di contenuto ampie; nessun font custom, solo peso tipografico per la gerarchia; angoli stretti (`{rounded.sm}` 6px su badge/righe/pulsanti, `{rounded.md}` 8px su contenitori/card); nessuna pillola.
- Navigazione (Story 9.2, poi corretta da 9.7/9.10/9.29): drawer con hamburger su mobile, barra laterale verticale sempre visibile su desktop (sfondo `{colors.navy}`), voci lette dalla stessa fonte `lib/auth/voci-navigazione.ts` in base al ruolo — mai una lista duplicata. Un solo livello di overlay aperto per volta (nessuno stack modale). La sidebar desktop deve restare sticky/bloccata durante lo scroll (con scroll interno se il contenuto eccede il viewport), sparire immediatamente e senza flash dopo il logoff, ed evidenziare sempre la voce corrispondente alla pagina effettivamente visitata (anche con avanti/indietro del browser).
- Menu profilo (Story 9.4): trigger = email utente in fondo alla nav-bar, dropdown `role="menu"` (non un vero modale, nessun `role="dialog"`), sfondo `{colors.surface}`, `{rounded.sm}`, ombra leggera `0 1px 3px rgba(16,24,32,0.08)` — stesso valore riusato per ogni superficie transitoria del progetto (incluso `riquadro-form`). Si chiude al click fuori, con Esc, o selezionando una voce.
- Riquadro pagina-form (Story 9.3): `<main>` centra un riquadro `max-width: 480px` (bordo `{colors.border}`, `{rounded.md}`, stessa ombra leggera) per le pagine il cui contenuto principale è un form autonomo; non si applica alle pagine tabellari/elenco (che restano a piena larghezza) né a `/accedi` (pattern locale a 360px). Trasversalmente ogni `<main>` ha comunque `max-width: 1000px` e ogni input di testo `max-width: 400px` (regole globali, non pagina per pagina).
- Badge di stato: variante **warning** (mai danger) per "Certificato scaduto"/"in scadenza" a livello di singola atleta ovunque nel prodotto, **eccetto** due eccezioni esplicite e circoscritte già decise con l'utente: `/conferma-certificati` sezione "Confermati" (Story 9.23, badge verde/giallo/rosso incluso danger per scaduto) e i badge Iscrizione/Tesseramento di `/gruppi` (Story 9.33). Non estendere ulteriormente il danger a livello di singola riga senza una nuova decisione esplicita.
- Ogni stato semantico resta leggibile anche senza colore (testo esplicito nel badge, mai un pallino/bordo colorato da solo); target di tocco minimo 44×44px su ogni elemento interattivo (checkbox, righe, pulsanti-icona modifica/cancellazione); focus da tastiera sempre visibile (`{colors.focus-ring}` su sfondi chiari, `{colors.focus-ring-on-navy}` sulla nav-bar).
- Prima interazione di ordinamento client-side del progetto (Story 9.25): un'etichetta "Stato" cliccabile applica un solo criterio di priorità (Scaduto → In scadenza → In regola, poi alfabetico) — non un sort generico multi-colonna; richiede estrarre la sezione interessata in un Client Component dedicato per lo stato locale.
- Drill-down a click/toggle (`aria-expanded`/`aria-controls`) è il pattern di riferimento per rivelare dettagli on-demand senza affollare la riga principale (stat-tile Vista Dirigente/Vista Allenatore, badge scadenza cliccabile in Story 9.34).

## Cross-Story Dependencies

- Story 9.4 sostituisce/assorbe il pulsante isolato di Story 9.1 (stessa Server Action `esci()`, riusata invariata) — 9.2 va completata prima di 9.4 per non ricostruire il posizionamento del punto di accesso due volte.
- Story 9.7, 9.10 e 9.29 sono tutte correzioni sulla stessa area introdotta da Story 9.2 (persistenza/aggiornamento della barra laterale/drawer) — stessa causa radice sospettata (cache di navigazione client-side del layout radice), da confermare per ciascuna in sviluppo, non presumere identica soluzione senza verifica.
- Story 9.9 introduce l'elenco/modifica/cancellazione Allenatori che Story 9.22 poi restringe a solo ADMIN (era ADMIN/DIRIGENTE) e Story 9.30 restila come riga compatta.
- Story 9.14 (rimozione Atleta da Gruppo) e Story 9.32 (rimozione Allenatore da Gruppo) sono mirror dello stesso pattern sulla stessa pagina `/gruppi` — 9.32 riusa esplicitamente il pattern di 9.14.
- Story 9.15 (Allenatore assegna Atlete al proprio Gruppo) è prerequisito concettuale di Story 9.18 (creazione nuova Atleta da parte dell'Allenatore), che a sua volta è riusata 1:1 da Story 9.28 (stesso form/Server Action `creaEAssegnaAtleta`, esposto anche lato Admin/Dirigente in `/gruppi`).
- Story 9.19 (badge in scadenza) precede e viene estesa da Story 9.23 (colori semantici in `/conferma-certificati`), Story 9.25 (ordinamento per stato) e Story 9.34 (data di scadenza al click sul badge) — tutte riusano `categorizzaStatoCertificato`/`calcolaGiorniAScadenza` senza nuovo calcolo.
- Story 9.20 (data certificato in fase di upload) precede Story 9.27 (modifica date di un certificato già confermato, riservata a soli Admin/Dirigente) — entrambe toccano lo stesso flusso di conferma (`confermaCertificato`) senza regressioni reciproche.
- Story 9.21 (Atleta in più Gruppi) è un'investigazione di impatto già completata: la maggior parte dei moduli elencati (`/presenze`, `/storico-presenze`, `/dati-fisici`, `/vista-dirigente`, `/vista-allenatore`, `/gruppi`) non richiede modifiche perché già scoped per `gruppoId`; il vero cambiamento è rimuovere il vincolo di unicità DB e rendere `assegnaAtleta` sempre additiva (mai più "sposta").
- Story 9.24 (hub `/impostazioni`) è prerequisito di posizionamento per Story 9.31 (campo "Email Segreteria", esposto in `/impostazioni`, non in `/smtp`).
- Story 9.26 (Vista d'insieme Allenatore) riusa direttamente `GruppoCard`/`categorizzaStatoCertificato` di `/vista-dirigente` (Epic 5) — stesso pattern di cross-import già stabilito da `/conferma-certificati`.
- Story 9.33 (Atlete su riga separata in `/gruppi`) è mirror diretto di una modifica già applicata informalmente per gli Allenatori nella stessa pagina — nessuna nuova Server Action, solo riposizionamento/restyling.
- Story 9.34 tocca gli stessi componenti condivisi di 9.19/9.26 (`AtletaTabellaRiga.tsx`, `GruppoCard.tsx`) e Story 9.35 (numero di maglia) riusa lo stesso componente condiviso `AtletaTabellaRiga.tsx` per l'editing inline, seguendo lo stesso principio "stesso componente, stessa capacità" già stabilito da 9.34.
- Story 9.6 (Geolocalizzazione Palestre) ha un collegamento dichiarato con l'Epic "Gestione Partite e Campionati" (Epic 10), che necessita geolocalizzazione anche per le trasferte non censite come Palestre proprie.
- Story 9.36 tocca la stessa Server Action condivisa di 9.18/9.28 (`creaEAssegnaAtleta`), aggiungendo normalizzazione maiuscola a monte della concatenazione Cognome+Nome — non tocca l'import federale (Story 1.3/1.7), percorso indipendente.
- Story 9.37 opera sulla stessa pagina/tabella di 9.32/9.33 (`/gruppi`, `GruppoRow.tsx`), aggiungendo modifica di nome/categoria senza impatto su Allenatori/Atlete/Slot/Campionati già assegnati.
- Story 9.38 riusa lo stesso file e la stessa famiglia di chiamata Admin API di Story 9.11 (blocco su bersaglio Admin incluso) e tocca lo stesso flusso di registrazione/invio link di Story 1.1/11.4, senza introdurre il percorso self-service esplicitamente rimandato a una storia futura.
