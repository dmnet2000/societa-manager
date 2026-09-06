# Epic 20 Context: Torneo Memorial

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dare alla società uno strumento completo per gestire il Torneo Memorial annuale: creare edizioni e categorie, iscrivere squadre (anche esterne) nei gironi, registrare risultati con calcolo automatico di punti e classifiche, generare il tabellone di semifinale/finale, programmare gli incontri su palestre/orari, e pubblicare tutto (classifiche, tabellone, volantino) in una sezione pubblica del sito coerente con il resto del sito. L'epica non è presente nei documenti di pianificazione originali (PRD/architettura/UX risalgono al 2026-07-13, l'epica è stata aggiunta il 2026-08-19 su richiesta esplicita dell'utente): i vincoli sotto derivano dal testo dell'epica stessa e dai pattern architetturali/di design generali del progetto applicati per analogia.

## Stories

- Story 20.1: Edizione del torneo e Categorie
- Story 20.2: Squadre partecipanti e gironi
- Story 20.3: Risultati di girone e classifica automatica
- Story 20.4: Tabellone semifinali/finali e classifica finale
- Story 20.5: Immagine di sfondo del torneo (volantino)
- Story 20.6: Sezione pubblica del Torneo Memorial
- Story 20.7: Nome dell'Edizione del Torneo
- Story 20.8: Cancellazione delle partite di una Categoria
- Story 20.9: Slot orari e Palestre per le partite del Torneo
- Story 20.10: Allineamento layout pubblico Torneo alle altre pagine pubbliche
- Story 20.11: Numero progressivo delle gare del Torneo
- Story 20.12: Creazione Slot di girone su tutte le Palestre in un solo passaggio
- Story 20.13: Nome personalizzato delle Settimane del Torneo
- Story 20.14: Contenuti centrati nella pagina pubblica del Torneo
- Story 20.15: Vista tabellare delle squadre iscritte per Girone
- Story 20.16: Punti realizzati nei set e quoziente set/punti come spareggio
- Story 20.17: Sfondo grigio chiaro su `/torneo` e ordinamento griglie per Slot
- Story 20.18: Campi delle Palestre nella generazione in blocco degli Slot
- Story 20.19: Vista tabellare di tutti gli incontri di una Categoria

## Requirements & Constraints

- Un'edizione annuale copre in genere 2 weekend ("settimane") con 2 categorie a weekend, fino a 8 squadre per categoria, divise in 2 gironi all'italiana (tutti contro tutti nel proprio girone).
- Ogni incontro è al meglio dei 3 set; punteggio incontro: 3 punti (2-0), 2 punti (2-1), 1 punto (1-2), 0 punti (0-2). Un punteggio incoerente con "al meglio dei 3" è rifiutato con errore esplicito.
- Classifica di girone: ordinata per punti totali; a parità, quoziente set (set vinti/persi) e poi quoziente punti realizzati/subiti nei set decidono lo spareggio, poi alfabetico come fallback finale (il criterio "set vinti assoluti" iniziale è stato sostituito dai quozienti). Denominatore zero nei quozienti va gestito esplicitamente (es. come valore massimo), mai come errore di divisione.
- Tabellone eliminazione diretta: 1°-4° posto da 1°/2° di ciascun girone (incrocio 1°A-2°B, 1°B-2°A), 5°-8° posto da 3°/4° di ciascun girone, stesso schema di incrocio; generabile solo a classifiche di girone complete.
- Le squadre del torneo (anche club esterni) sono un'entità propria, indipendente da Gruppo/Atleta/Allenatore della società.
- Gestione riservata a ADMIN/DIRIGENTE (stesso perimetro di Epic 10 Campionati/Partite); nessun nuovo Ruolo introdotto per l'epica.
- Ogni entità cancellabile deve rifiutare l'eliminazione in presenza di dipendenze (edizione con categorie/squadre iscritte, categoria con squadre, squadra con incontri) finché non esiste un percorso di pulizia esplicito (Story 20.8 lo introduce per le partite).
- Volantino: immagine PNG/JPEG, max 2MB, stessa validazione già in uso nel progetto per l'immagine hero pubblica.
- Numero di gara: intero progressivo per edizione (non per categoria), mai editabile a mano, calcolato server-side, protetto da vincolo unico DB contro collisioni concorrenti.

## Technical Decisions

- Nuove tabelle strutturali (EdizioneTorneo, CategoriaTorneo, SquadraTorneo, PartitaTorneo, SlotTorneo): come ogni tabella strutturale del progetto vanno messe in ENABLE RLS con REVOKE espliciti, anche quando l'accesso applicativo passa comunque da un ruolo privilegiato.
- Riuso diretto (nessuna nuova anagrafica) delle entità Palestra e Campo già esistenti per l'assegnazione delle partite a orari/luoghi; SlotTorneo è scoped per Edizione (non per Categoria), perché più categorie giocano in parallelo nello stesso weekend.
- Unione discriminata fase/tabellone: `fase = GIRONE ⟺ tabellone IS NULL` è imposta sia su PartitaTorneo sia su SlotTorneo, con lo stesso vincolo a livello DB.
- Assegnazione Slot: manuale per il girone; automatica best-effort (primo slot libero della fase/tabellone corretti) al momento della generazione per semifinali/finali; sempre modificabile a mano dopo; nessun blocco se mancano slot (il torneo funziona comunque).
- Riuso di pattern esistenti: validazione/storage immagine già in uso per la foto hero pubblica (bucket pubblico dedicato per il volantino); calcolo/link "Naviga" verso una palestra già in uso su `/calendario`.
- Generazione in blocco degli slot di girone: una riga selezionabile per ciascun Campo di ciascuna Palestra (preselezionate di default), letta sempre server-side; una Palestra senza Campi resta una riga singola.

## UX & Interaction Patterns

- La sezione pubblica `/torneo` segue il sistema di design "Poster Sportivo" già in uso nel resto del sito pubblico (nessuno stile ad hoc): sfondo grigio chiaro coerente con la pagina Squadre (non bianco), nessun riquadro bianco/ombra per sezione (contenuto direttamente su sfondo pagina, mirror della pagina Calendario), contenuto centrato con larghezza massima su schermi ampi senza regressioni mobile.
- Finché una categoria non ha risultati, si mostrano le squadre iscritte senza classifica (mai una tabella vuota fuorviante); le squadre iscritte per girone si presentano in un'unica tabella con una colonna per girone.
- Gli incontri nelle griglie (girone e semifinali) sono ordinati per data/ora dello slot assegnato; un incontro senza slot va sempre in fondo.
- Una vista tabellare completa di tutti gli incontri di una categoria (gironi + semifinali + finali) è disponibile dietro un pulsante di attivazione per categoria, sempre in aggiunta alla vista a card esistente, mai in sostituzione.
- La pagina di gestione interna (area riservata) e la pagina pubblica restano moduli CSS/percorso separati: una modifica visiva a una non deve mai propagarsi involontariamente all'altra.

## Cross-Story Dependencies

- Catena dati di base: 20.2 richiede 20.1 (categoria); 20.3 richiede 20.2 (squadre/gironi); 20.4 richiede 20.3 (classifiche di girone complete); 20.6 (vetrina pubblica) richiede tutte le 20.1-20.5.
- 20.7 (nome edizione) e 20.13 (nome settimane) estendono il modello di Edizione usato ovunque da 20.1/20.6.
- 20.8 dipende dalle regole di cancellazione introdotte in 20.1/20.2 e sblocca la catena Squadra→Categoria→Edizione.
- 20.9 introduce lo Slot e si aggancia alla generazione automatica di semifinali/finali di 20.4; 20.11 (numerazione), 20.12 e 20.18 (generazione in blocco per Campo) estendono ulteriormente 20.9.
- 20.10, 20.14 e 20.17 sono iterazioni successive sullo stesso file di stile della pagina pubblica: ciascuna deve preservare le decisioni delle precedenti (rimozione riquadro bianco, poi centratura, poi sfondo grigio + ordinamento per slot).
- 20.15 e 20.19 aggiungono viste sulla stessa pagina pubblica senza toccare le viste/i dati esistenti.
- 20.16 sovrascrive esplicitamente il criterio di spareggio stabilito in 20.3 e deve riflettersi identicamente sia sulla vista pubblica sia su quella admin dei risultati.
