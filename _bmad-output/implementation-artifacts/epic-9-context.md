# Epic 9 Context: Miglioramenti Post-Rilascio

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 9 raccoglie i miglioramenti richiesti dall'utente dopo il rilascio in produzione, aggiunti una storia alla volta man mano che emergono dall'uso reale (mai pianificati tutti in anticipo). L'elenco resta volutamente aperto — non esiste uno stato "epic completa". Copre tre tipi di lavoro ricorrenti: rifiniture di navigazione/UX (barra laterale, menu profilo, riquadri form), operazioni CRUD mancanti su entità che avevano solo la creazione (modifica/cancellazione di Slot, Allenatori, assegnazioni Gruppo↔Atleta/Allenatore), e piccole estensioni al modello dati emerse da casi reali del volley giovanile (Cognome Allenatore, numero maglia, Atleta multi-Gruppo). Molte storie sono correzioni dirette di regressioni UX introdotte da storie precedenti dello stesso epic (es. 9.7/9.10 correggono effetti collaterali di 9.2).

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

## Requirements & Constraints

- **Nessuna regressione, sempre.** Quasi ogni storia dell'epic vincola esplicitamente comportamento e suite Vitest esistenti a restare invariati sui casi non impattati — le modifiche sono additive/di presentazione, non riscritture.
- **Niente cancellazione fisica di un'entità di dominio senza rete di sicurezza.** Il pattern consolidato del progetto per "rimuovere" qualcosa è un flag booleano (`attivo`) con disattiva/riattiva. Un hard-delete vero è permesso solo per tabelle di giunzione pure senza righe dipendenti (es. `GruppoAtleta`, `GruppoAllenatore`) oppure quando l'entità non ha alcun aggancio/dipendenza (es. Allenatore non collegato a un account e non assegnato a un Gruppo) — altrimenti l'operazione va bloccata con un messaggio esplicativo, mai una cancellazione silenziosa che rompe una FK o uno storico (Presenze, aggancio account).
- **Autorizzazione a due livelli (difesa in profondità).** Ogni azione sensibile va bloccata sia a livello di route-guard sia dentro la Server Action stessa, non solo in UI. Un Allenatore agisce solo sul/i proprio/i Gruppo/i (verificato via `GruppoAllenatore`); un Admin non può eseguire operazioni ad alto rischio (reset password, correzione email) su un altro Admin, per evitare presa di controllo di un account pari grado.
- **Nessun servizio esterno a pagamento** (vincolo NFR ereditato) — es. mappa Palestre via iframe Google Maps `output=embed` (gratuito, nessuna API key) invece della JS API con account di fatturazione.

## Technical Decisions

- **Split dati AD-9 (invariato):** le tabelle protette da RLS (CertificatoMedico, Atleta, Presenza, Iscrizione, Notifica, ConfigurazioneSmtp) si leggono/scrivono via client Supabase autenticato; tutte le altre (Palestra, Campo, Slot, Gruppo, Allenatore, Utente, UtenteRuolo) via Prisma diretto con connessione privilegiata — nessuna policy RLS da toccare per queste ultime.
- **AD-10 (proprietari di Atleta) esteso:** oltre a onboarding-import, `creaEAssegnaAtleta` (condivisa da `/i-miei-gruppi` e `/gruppi`) è ora un secondo punto autorizzato a creare campi identitari Atleta.
- **Pattern "riga tabellare compatta con toggle sola-lettura/modifica"**, stabilito da `PartitaRow.tsx` e riusato/esteso via `SlotRow.tsx`, `AllenatoreRow.tsx`, `CategoriaTorneoRow.tsx`, `GruppoRow.tsx`: elenco reso come righe compatte in sola lettura; un'icona matita (componente condiviso `IconaModifica`, `app/icone-azione-riga.tsx`) porta in modifica inline **solo** quella riga; icona cestino con `window.confirm` per la cancellazione. Vincoli non negoziabili ereditati dalla code review di Story 15.5: area di tocco ≥44×44px anche quando l'icona visiva è più piccola, `aria-label`/`title` su ogni pulsante-icona. È il pattern di riferimento anche per richieste future analoghe ("vista più compatta"), da preferire a un vero popup/modale (mai usato nel progetto).
- **Pattern drill-down/toggle on-demand**: badge o riepilogo cliccabile (`<button aria-expanded>`/`aria-controls`) che rivela un dettaglio (nomi, data di scadenza) solo al click, per non appesantire la vista di default — riusato più volte sui certificati (Vista Dirigente/Allenatore, badge scadenza).
- **Ordinamento client-side minimale**: `useState` booleano + `useMemo` con una funzione di ordinamento pura, un solo criterio attivabile/disattivabile via bottone `aria-pressed` — non un ordinamento generico multi-colonna/direzione.
- **Colori di stato**: `{colors.success}`/`{colors.warning}`/`{colors.danger}` (con relativi `-bg`) desaturati, mai allarmistici. Regola di default: mai `danger` a livello di singola riga/atleta (solo `warning`, anche per "scaduto"); eccezioni vanno esplicitamente motivate e documentate in `DESIGN.md` (es. sezione "Confermati" di `/conferma-certificati`, contesto di gestione attiva).
- **Riquadro a larghezza massima** (`.pagina`/`.riquadro`, mirror di `/accedi`, `max-width` ~480px form / ~1000px pagina) per pagine il cui contenuto principale è un form autonomo — non per pagine tabella/lista, anche se contengono form secondari inline.
- **Formattazione data unica**: `toLocaleDateString("it-IT", { timeZone: "UTC" })`.
- **Sanificazione maiuscolo**: già applicata al Codice Fiscale ovunque; estesa a Cognome/Nome di `Atleta` in creazione (9.36) e via backfill sui dati esistenti (9.39, migrazione solo-dati `UPDATE ... SET nome = UPPER(nome)`, idempotente). `Allenatore.nome` resta esplicitamente **non** sanificato — asimmetria nota e accettata, non un'omissione.

## UX & Interaction Patterns

- Navigazione: barra laterale verticale sticky sempre visibile su desktop, drawer/hamburger su mobile — inversione deliberata di una precedente decisione "solo barra orizzontale" di `EXPERIENCE.md` (documento aggiornato di conseguenza). Nessuno stack di più livelli di menu aperti insieme.
- Menu profilo unico (logoff + modifica password) invece di azioni isolate in barra.
- Pagine di impostazioni correlate (SMTP, Logo, Email Segreteria) raggruppate dietro una pagina-hub `/impostazioni` invece di sottomenu annidati — la navigazione resta una lista piatta.
- Le liste/elenchi lunghi tendono verso righe compatte con azioni dietro icone (vedi pattern sopra) man mano che emergono richieste di "vista più compatta" (Allenatori, Gruppi, Utenti admin).

## Cross-Story Dependencies

- 9.7 e 9.10 sono fix diretti di regressioni introdotte da 9.2 (cache di navigazione lato client dopo redirect/cambio pagina).
- 9.4 (menu profilo) va sviluppata dopo 9.2 (barra laterale), per non ricostruire il posizionamento due volte.
- 9.9 → 9.22 (restringe l'accesso a solo ADMIN) → 9.30 (restyle a riga compatta) insistono sulla stessa pagina `/precaricamento-allenatori`.
- 9.14, 9.15, 9.18, 9.21, 9.28, 9.32, 9.33, 9.35, 9.36 condividono gli stessi componenti (`GruppoRow.tsx`, `AtletaTabellaRiga.tsx`, Server Action `creaEAssegnaAtleta`/`assegnaAtleta`) usati sia da `/gruppi` (Admin/Dirigente) sia da `/i-miei-gruppi` (Allenatore) — una modifica va quasi sempre propagata a entrambe le pagine consumer.
- 9.19 → 9.23 → 9.25 → 9.27 → 9.34 formano una catena sullo stesso sottosistema certificati (`categorizzaStatoCertificato`, `GruppoCard.tsx`, `ListaConfermati.tsx`, `/conferma-certificati`).
- 9.30 stabilisce il pattern "riga compatta + icona matita" poi richiamato esplicitamente come mirror da 9.37 (Gruppo) e 9.40 (elenco Utenti admin).
- 9.38 e 9.39 nascono entrambe da follow-up diretti rispettivamente su una segnalazione utente e su 9.36.
