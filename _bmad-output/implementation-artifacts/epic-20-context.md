# Epic 20 Context: Torneo Memorial

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Digitalizzare la gestione del torneo annuale "Memorial" organizzato dalla società: un'edizione articolata in 2 weekend ("week") con tipicamente 2 categorie a weekend, fino a 8 squadre per categoria (anche esterne alla società). Copre l'intero ciclo di vita - creazione edizione/categorie, iscrizione squadre nei due gironi, generazione calendario e inserimento risultati, calcolo automatico di classifiche e tabellone eliminatorio, programmazione di orari/palestre/campi, e una vetrina pubblica con volantino - così che Admin/Dirigente non debbano più calcolare punteggi/accoppiamenti a mano né i visitatori chiedere informazioni. Nota: questa epica non ha documenti PRD/architettura/UX dedicati (aggiunta il 2026-08-19, dopo la chiusura dei planning artifact standard) - i vincoli sotto sono distillati dal testo delle story stesse e dai pattern di progetto generali applicabili.

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
- Story 20.16: Punti realizzati nei set e nuovo criterio di spareggio in classifica
- Story 20.17: Sfondo grigio chiaro su `/torneo` e ordinamento griglie per Slot
- Story 20.18: Campi delle Palestre nella generazione in blocco degli Slot di girone
- Story 20.19: Vista tabellare di tutti gli incontri di una Categoria su `/torneo`

## Requirements & Constraints

- Formula: 2 gironi all'italiana per categoria (tutti contro tutti nel proprio girone), poi tabellone a eliminazione per il posizionamento 1°-4° (incrocio 1°A-2°B, 1°B-2°A) e 5°-8° (3°A-4°B, 3°B-4°A); ogni incontro al meglio dei 3 set.
- Punteggio incontro: 3 punti per vittoria 2-0, 2 per vittoria 2-1, 1 per sconfitta 1-2, 0 per sconfitta 0-2. Un punteggio non coerente con "al meglio dei 3" è rifiutato.
- Ordinamento classifica di girone (Story 20.16 sostituisce il criterio di spareggio di 20.3): punti totali desc -> quoziente set (setVinti/setPersi) desc -> quoziente punti (puntiFatti/puntiSubiti) desc -> alfabetico. Denominatore zero trattato come quoziente massimo, mai errore. Modificare un risultato ricalcola subito la classifica (nessuno stato "congelato").
- Il tabellone si genera solo a classifica di entrambi i gironi completa; altrimenti rifiuto esplicito.
- Numerazione progressiva delle partite ("Gara N"): un'unica sequenza per Edizione (non per Categoria), calcolata sempre automaticamente (mai editabile), protetta da vincolo unico DB con messaggio di retry distinto dagli errori "già generato"; è il criterio di ordinamento anche per la vista tabellare completa di una Categoria (Story 20.19).
- Eliminazioni con dipendenze restano fail-closed (Edizione con Categorie/squadre iscritte, Categoria con Squadre, Squadra con partite) - Story 20.8 introduce l'unica via di sblocco: cancellazione in blocco di tutte le partite di una Categoria, riportandola allo stato iniziale.
- SquadraTorneo è un'entità indipendente (nome, categoria, girone A/B, referente/contatto) - nessun collegamento a Gruppo/Atleta/Allenatore: il torneo ospita anche club esterni.
- Volantino: stessa validazione MIME/dimensione (PNG/JPEG, 2MB) già in uso per la foto hero, bucket Storage pubblico dedicato per edizione.
- SlotTorneo è scoped per Edizione (non per Categoria - più categorie condividono le stesse fasce orarie), FK verso Palestra/Campo esistenti (Epic 2, nessuna nuova anagrafica); girone = assegnazione manuale, semifinali/finali = assegnazione automatica best-effort al momento della generazione, sempre modificabile a mano dopo; nessuna unicità DB su uno Slot occupato, solo un avviso applicativo prima di sovrascrivere; l'assenza di Slot non blocca mai la generazione di calendario/tabellone.

## Technical Decisions

- Nuovo modulo verticale (coerente col resto del progetto): UI -> Server Action -> servizio di dominio (`lib/torneo.ts` e affini) -> Prisma -> Postgres.
- Ogni nuova tabella strutturale (EdizioneTorneo, CategoriaTorneo, SquadraTorneo, PartitaTorneo, SlotTorneo) va comunque messa in RLS ENABLE + REVOKE espliciti, anche se non scoped per ruolo/utente - convenzione di progetto trasversale, non solo per le tabelle con policy per-utente.
- Gestione riservata ad Admin/Dirigente via `requireRuolo(["ADMIN","DIRIGENTE"])`, stesso perimetro di Epic 10 (Campionati/Partite).
- Riuso diretto di pattern/moduli esistenti, mai reimplementati: `lib/storage/validazione-immagine.ts` (upload immagini), `lib/link-naviga-palestra.ts`/`costruisciLinkNaviga` (link "Naviga" verso una Palestra), il modello `Palestra`/`Campo` di Epic 2 (nessuna nuova anagrafica gestione impianti).
- Concetti di dominio (partite, risultati, classifiche) somigliano a Epic 10 (Campionati/Partite) ma senza riuso diretto del modello: presupposti diversi (squadra esterna vs Gruppo interno, nessun concetto di girone/categoria-torneo/edizione in Epic 10) - trattarlo come riferimento di pattern, non base di riuso.
- Generazioni "in blocco" (Slot su tutte le Palestre/Campi) leggono sempre le anagrafiche server-side, mai fidandosi di una lista inviata dal client.
- `PartitaTorneo` guadagna solo campi nullable additivi nel tempo (`slotTorneoId`, `numero`) - mai un backfill retroattivo obbligatorio salvo quando esplicitamente richiesto (es. `EdizioneTorneo.nome`, Story 20.7, backfill "Torneo Memorial").
- Le viste tabellari aggiuntive (squadre per girone, 20.15; tutti gli incontri di una Categoria, 20.19) sono pura ri-presentazione di dati già calcolati/esposti altrove nella stessa pagina - non introducono nuove query né nuovi campi di dominio.

## UX & Interaction Patterns

- La sezione pubblica del torneo segue il registro "Poster Sportivo" già in uso nel resto del sito pubblico: nessun font caricato (solo stack di sistema), nessuno stile ad hoc.
- Le pagine pubbliche del sito non condividono tutte lo stesso sfondo: il bianco è la superficie prevalente, ma `/squadre` (e ora `/torneo`, Story 20.17) usa `#F2F5F7` come sfondo sezione - una scelta pagina per pagina, non un token globale uniforme.
- Nessuna sezione pubblica ha un riquadro bianco con ombra propria per blocco di contenuto (rimosso da `/torneo` in Story 20.10) - il contenuto siede direttamente sullo sfondo pagina, solo intestazione e spaziatura verticale a separare le sezioni.
- Mobile-first vincolante, soglia WCAG AA, target di tocco minimo 44x44px; nessun contenuto essenziale dietro hover-only; solo tap/click e scroll, nessun gesto nascosto.
- Stati vuoti/incompleti richiedono un messaggio esplicito, mai una tabella vuota o un errore fuorviante (es. categoria senza risultati ancora registrati, girone senza squadre iscritte).
- Un controllo che rivela contenuto supplementare (es. la vista tabellare completa di 20.19) affianca sempre la vista grafica esistente, senza mai nasconderla - nascosto/mostrato di default per singola istanza (per Categoria), stato indipendente tra istanze diverse sulla stessa pagina.

## Cross-Story Dependencies

- Catena dati core: 20.1 (Edizione/Categoria) -> 20.2 (Squadre/gironi) -> 20.3 (calendario girone/classifica) -> 20.4 (tabellone/classifica finale); 20.5 e 20.6 consumano i dati di tutte e quattro.
- 20.8 dipende da 20.3/20.4 (deve esistere una partita da cancellare) e sblocca la catena di cancellazione Squadra/Categoria bloccata da quelle story.
- 20.9 si aggancia come side-effect alla generazione di 20.3/20.4 (`generaCalendarioGironiAction`/`generaTabelloneAction`) per l'assegnazione automatica degli Slot; 20.12 estende il form di creazione Slot di 20.9 limitatamente alla fase GIRONE; 20.18 estende ulteriormente 20.12 aggiungendo la scelta dei Campi (Epic 2), senza toccare il flusso semifinali/finali di 20.9.
- 20.11 (numerazione) si innesta sugli stessi punti di generazione di 20.3/20.4, in modo puramente additivo; 20.19 dipende da 20.11, riusando `numero` come criterio di ordinamento della propria vista tabellare.
- 20.13 rispecchia il pattern di 20.7 (campo nome opzionale su Edizione) applicato al concetto di Settimana.
- 20.10, 20.14, 20.17 e 20.19 modificano (o aggiungono a) la stessa coppia di file pubblici (`app/torneo/torneo-pubblico.module.css`, `app/torneo/page.tsx`); 20.14 riapre parzialmente una decisione di scope presa in 20.10 (max-width centrato, inizialmente escluso poi richiesto). Tutte lasciano esplicitamente invariata la pagina admin (`app/app/(torneo)/torneo/...`).
- 20.15, 20.16 e 20.19 toccano la stessa pagina pubblica in parallelo a 20.17, ma su viste diverse (elenco squadre iscritte / colonne classifica / tabella completa incontri vs sfondo e ordinamento griglie) - nessuna sovrapposizione diretta di codice ma stessa superficie di file; 20.19 riusa gli stessi dati già esposti dalle card di Girone/Tabellone senza introdurre alcun dato nuovo.
