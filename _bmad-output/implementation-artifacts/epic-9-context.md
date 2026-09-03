# Epic 9 Context: Miglioramenti Post-Rilascio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 9 raccoglie i miglioramenti richiesti dall'utente dopo il rilascio in produzione, aggiunti una storia alla volta man mano che emergono dall'uso reale (mai pianificati tutti in anticipo). L'elenco resta volutamente aperto — non esiste uno stato "epic completa". Copre tre tipi di lavoro ricorrenti: rifiniture di navigazione/UX (barra laterale, menu profilo, riquadri form, redirect di logoff), operazioni CRUD mancanti su entità che avevano solo la creazione (modifica/cancellazione di Slot, Allenatori, assegnazioni Gruppo↔Atleta/Allenatore), e piccole estensioni al modello dati emerse da casi reali del volley giovanile (Cognome Allenatore, numero maglia, Atleta multi-Gruppo). Molte storie sono correzioni dirette di regressioni UX introdotte da storie precedenti dello stesso epic (es. 9.7/9.10 correggono effetti collaterali di 9.2), o adattamenti resi necessari da epic successive (es. 9.42 adegua il logoff alla home pubblica introdotta da Story 18.1).

## Stories

- Story 9.1: Pulsante di logoff
- Story 9.2: Navigazione responsive — hamburger su mobile, barra laterale su desktop
- Story 9.3: Riquadro a larghezza massima per le pagine-form
- Story 9.4: Menu profilo con logoff e modifica password
- Story 9.5: Campo Cognome per Allenatore (precaricamento)
- Story 9.6: Geolocalizzazione Palestre (link Maps + mappa incorporata)
- Story 9.7: Barra laterale ancora visibile dopo il logoff (fix)
- Story 9.9: Gestione Allenatori precaricati (vista, modifica, cancellazione)
- Story 9.10: Voce di navigazione attiva non aggiornata durante la navigazione (fix)
- Story 9.13: Modifica e cancellazione di uno Slot già inserito
- Story 9.14: Rimozione di un'Atleta da un Gruppo
- Story 9.15: Assegnazione Atlete al proprio Gruppo da parte dell'Allenatore
- Story 9.16: Parametri standard per i dati fisici delle Atlete
- Story 9.17: Vista griglia mensile delle presenze per Gruppo (Allenatore)
- Story 9.18: Creazione di una nuova Atleta da parte dell'Allenatore
- Story 9.19: Badge "certificato in scadenza" nell'elenco Atlete/Vista Dirigente
- Story 9.20: Data del nuovo certificato già in fase di caricamento
- Story 9.21: Un'Atleta in più Gruppi contemporaneamente
- Story 9.22: Rimozione dell'accesso Dirigente al precaricamento Allenatori
- Story 9.23: Colore semantico sui certificati confermati (verde/giallo/rosso)
- Story 9.24: Menu principale "Impostazioni" (raggruppa SMTP e Logo)
- Story 9.25: Ordinamento per stato nella sezione "Confermati"
- Story 9.26: Vista d'insieme per l'Allenatore sui propri Gruppi
- Story 9.27: Modifica delle date di un Certificato già confermato
- Story 9.28: Aggiunta di una nuova Atleta anche da Admin/Dirigente in /gruppi
- Story 9.29: Menu laterale fisso durante lo scroll (fix)
- Story 9.30: Interfaccia più compatta per /precaricamento-allenatori
- Story 9.31: Email Segreteria configurabile
- Story 9.32: Rimuovere un Allenatore da un Gruppo
- Story 9.33: Atlete su riga separata in /gruppi (elenco orizzontale)
- Story 9.34: Data di scadenza del certificato nell'elenco Atlete e nei drill-down
- Story 9.35: Numero di maglia per Atleta, per stagione
- Story 9.36: Sanificazione in maiuscolo di Cognome/Nome nella creazione di una nuova Atleta
- Story 9.37: Modifica di nome e categoria di un Gruppo esistente
- Story 9.38: Correzione dell'email di un Utente non confermato, da parte dell'Admin
- Story 9.39: Normalizzazione in maiuscolo delle Atlete già esistenti in anagrafica
- Story 9.40: Vista più compatta e ordinabile per l'elenco Utenti in /app/admin
- Story 9.41: Precaricamento email per Segreteria e Dirigente (blocco registrazione)
- Story 9.42: Dopo il logoff, atterrare sulla home pubblica invece che su /accedi

## Requirements & Constraints

- **Nessuna regressione.** Quasi ogni storia vincola esplicitamente comportamento e suite Vitest esistenti a restare invariati sui casi non impattati — modifiche additive/di presentazione, non riscritture.
- **Niente cancellazione fisica di un'entità di dominio senza rete di sicurezza.** Il pattern per "rimuovere" è un flag `attivo` con disattiva/riattiva. Hard-delete vero solo per tabelle di giunzione pure senza righe dipendenti (`GruppoAtleta`, `GruppoAllenatore`) o quando l'entità non ha alcun aggancio/dipendenza — altrimenti l'operazione va bloccata con messaggio esplicativo, mai una perdita silenziosa (FK, storico Presenze, aggancio account).
- **Autorizzazione a due livelli (difesa in profondità).** Ogni azione sensibile bloccata sia a livello di route-guard sia dentro la Server Action, non solo in UI. Un Allenatore agisce solo sul/i proprio/i Gruppo/i (via `GruppoAllenatore`); un Admin non può eseguire operazioni ad alto rischio (reset password, correzione email) su un altro Admin.
- **Nessun servizio esterno a pagamento** (NFR ereditato) — es. mappa Palestre via iframe Google Maps `output=embed` invece della JS API a pagamento.
- **Controllo preventivo, non a posteriori, per un Ruolo "blindato" in registrazione**: se il dato di contatto (CF per Allenatore, email per Segreteria/Dirigente) non è precaricato da un Admin, l'intera registrazione è rifiutata prima di creare qualunque account — mai un account "a metà". Se la richiesta include anche Ruoli non bloccati, si accetta o rifiuta insieme.
- **Fail-closed anche sui redirect di logoff**: sia nel percorso di successo sia in quello di errore di `signOut()`, l'Utente atterra sempre sulla stessa destinazione pubblica prevista (mai una pagina protetta, mai un'incoerenza tra i due percorsi).

## Technical Decisions

- **Split dati AD-9 (invariato):** tabelle protette da RLS (CertificatoMedico, Atleta, Presenza, Iscrizione, Notifica, ConfigurazioneSmtp) via client Supabase autenticato; le altre (Palestra, Campo, Slot, Gruppo, Allenatore, Utente, UtenteRuolo) via Prisma diretto con connessione privilegiata.
- **AD-10 (proprietari di Atleta) esteso:** oltre a onboarding-import, `creaEAssegnaAtleta` (condivisa `/i-miei-gruppi` + `/gruppi`) è un secondo punto autorizzato a creare campi identitari Atleta.
- **Pattern "riga compatta con toggle sola-lettura/modifica"** (`PartitaRow.tsx` → `SlotRow.tsx`, `AllenatoreRow.tsx`, `CategoriaTorneoRow.tsx`, `GruppoRow.tsx`): righe compatte in sola lettura; icona matita condivisa (`IconaModifica`, `app/icone-azione-riga.tsx`) porta in modifica inline solo quella riga; icona cestino + `window.confirm` per cancellare. Vincoli non negoziabili: area di tocco ≥44×44px, `aria-label`/`title` su ogni pulsante-icona. Pattern di riferimento anche per richieste future di "vista più compatta", preferito a un popup/modale (mai usato nel progetto).
- **Drill-down on-demand**: badge/riepilogo cliccabile (`aria-expanded`/`aria-controls`) che rivela un dettaglio solo al click, riusato più volte sui certificati.
- **Ordinamento client-side minimale**: `useState` booleano + `useMemo` con funzione pura, un solo criterio attivabile via bottone `aria-pressed` — non ordinamento generico multi-colonna.
- **Colori di stato**: `{colors.success}`/`{colors.warning}`/`{colors.danger}` desaturati. Default: mai `danger` a livello di singola riga/atleta (solo `warning`, anche per "scaduto"); eccezioni vanno motivate e documentate in `DESIGN.md`.
- **Riquadro a larghezza massima** (`.pagina`/`.riquadro`, mirror `/accedi`) per pagine il cui contenuto principale è un form autonomo — mai per pagine tabella/lista.
- **Formattazione data unica**: `toLocaleDateString("it-IT", { timeZone: "UTC" })`.
- **Sanificazione maiuscolo**: già sul Codice Fiscale ovunque; estesa a Cognome/Nome `Atleta` in creazione (9.36) e via backfill (9.39, `UPDATE ... SET nome = UPPER(nome)`, idempotente). `Allenatore.nome` resta esplicitamente non sanificato.
- **Pattern "voce precaricata → aggancio automatico → claim non riutilizzabile"**: stabilito per `Allenatore.codiceFiscale` (maiuscolo), generalizzato in 9.41 a un modello distinto per email Segreteria/Dirigente (trim+minuscolo). Voce agganciata: non più modificabile/cancellabile, mostrata come "Registrata" vs "Precaricata"; duplicati sulla stessa chiave sempre controllati.
- **Destinazione post-logoff è la home pubblica (`"/"`), non `/accedi`** (9.42): la distinzione tra area pubblica (sito vetrina, Epic 18) e area riservata (`/app`) rende `"/"` la destinazione coerente per chi esce dalla sessione, già raggiungibile senza autenticazione e già collegata da un link "Accedi" per chi vuole rientrare subito. Il resto del comportamento di logoff (invalidazione cookie, `revalidatePath("/app", "layout")`, fail-closed, blocco del Proxy su pagine protette dopo l'uscita) resta quello stabilito da 9.1/9.7, solo la costante di destinazione cambia.

## UX & Interaction Patterns

- Navigazione: barra laterale sticky su desktop, drawer/hamburger su mobile — inverte deliberatamente la precedente scelta "solo barra orizzontale" di `EXPERIENCE.md` (aggiornato di conseguenza). Nessuno stack di più livelli di menu aperti insieme.
- Menu profilo unico (logoff + modifica password) invece di azioni isolate in barra.
- Pagine di impostazioni correlate raggruppate dietro una pagina-hub (`/impostazioni`) invece di sottomenu annidati — la navigazione resta una lista piatta.
- Le liste lunghe tendono verso righe compatte con azioni dietro icone man mano che emergono richieste di "vista più compatta".
- Dopo il logoff, l'Utente rientra nell'esperienza da Visitatore del sito pubblico (home vetrina con link "Accedi"), non in un form di login isolato — coerenza con la separazione area pubblica/area riservata introdotta da Epic 18.

## Cross-Story Dependencies

- 9.7 e 9.10 sono fix di regressioni introdotte da 9.2 (cache di navigazione lato client dopo redirect/cambio pagina).
- 9.4 va sviluppata dopo 9.2, per non ricostruire il posizionamento due volte.
- 9.9 → 9.22 (accesso solo ADMIN) → 9.30 (riga compatta) insistono sulla stessa pagina `/precaricamento-allenatori`.
- 9.14, 9.15, 9.18, 9.21, 9.28, 9.32, 9.33, 9.35, 9.36 condividono gli stessi componenti (`GruppoRow.tsx`, `AtletaTabellaRiga.tsx`, `creaEAssegnaAtleta`/`assegnaAtleta`) usati sia da `/gruppi` sia da `/i-miei-gruppi` — una modifica va quasi sempre propagata a entrambe le pagine.
- 9.19 → 9.23 → 9.25 → 9.27 → 9.34 formano una catena sullo stesso sottosistema certificati.
- 9.30 stabilisce "riga compatta + icona matita", richiamato come mirror da 9.37 e 9.40.
- 9.38 e 9.39 nascono da follow-up diretti (una segnalazione utente, e 9.36).
- 9.41 fa da mirror strutturale di 9.9 su un modello/chiave diversi (email, non CF) e sostituisce, solo per Segreteria/Dirigente, il gate "Ruoli sensibili" a posteriori ancora usato per Admin/Site Manager.
- 9.42 cambia la destinazione della `redirect()` di `esci()` già introdotta da 9.1 (`/accedi` → `"/"`), sfruttando la home pubblica resa disponibile da Story 18.1 (Epic 18) — nessun impatto sul fix di 9.7 (la barra di navigazione dell'area riservata deve restare invisibile qualunque sia la destinazione pubblica di atterraggio).
