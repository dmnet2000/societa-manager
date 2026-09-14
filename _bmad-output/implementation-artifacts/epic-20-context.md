# Epic 20 Context: Torneo Memorial

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Dare alla società la gestione end-to-end del torneo annuale "Memorial": creazione dell'edizione e delle categorie, iscrizione delle squadre (anche esterne, non collegate ai Gruppi interni) nei due gironi all'italiana, inserimento risultati con calcolo automatico di punti/classifica, generazione automatica del tabellone di semifinale/finale per il posizionamento 1°-8°, pianificazione di slot orari/palestre/campi per gli incontri, e una sezione pubblica sul sito che mostra volantino, classifiche, tabellone e risultati senza che il pubblico debba chiedere informazioni. Nota: nessun documento di pianificazione (PRD, architettura, brief, UX designs) datato prima del 2026-08-19 menziona il Torneo — l'epica è stata aggiunta dopo la loro stesura; il contesto sotto deriva dall'epica stessa e dai pattern architetturali/di design trasversali già stabiliti per il resto del progetto, che l'epica esplicitamente riusa.

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
- Story 20.16: Punti realizzati nei set e nuovo criterio di spareggio (quoziente set/punti)
- Story 20.17: Sfondo grigio chiaro su `/torneo` e ordinamento delle griglie incontri per Slot
- Story 20.18: Campi delle Palestre nella generazione in blocco degli Slot di girone
- Story 20.19: Vista tabellare di tutti gli incontri di una Categoria su `/torneo`

## Requirements & Constraints

- Gestione riservata ad Admin/Dirigente (`requireRuolo(["ADMIN","DIRIGENTE"])`), stesso perimetro già in uso per il dominio sportivo (Campionati/Partite); un utente senza quei ruoli viene reindirizzato, stesso pattern di ogni altra rotta protetta.
- Ogni nuova tabella strutturale del torneo va in `ENABLE RLS` con `REVOKE` espliciti, anche se non è prevista alcuna policy applicativa per essa — non basta assumere l'assenza di GRANT (convenzione fissata dopo che 17 tabelle risultarono esposte pubblicamente per omissione).
- Eliminazioni con dipendenze sono fail-closed (stesso principio già in uso altrove): un'Edizione non si elimina con Categorie/Squadre iscritte, una Categoria non si elimina con Squadre, una Squadra non si elimina con incontri registrati — salvo la via di sblocco esplicita introdotta da Story 20.8 (cancellazione di tutte le partite di una Categoria).
- Upload immagine (volantino) segue lo stesso pattern di validazione già in uso per la foto hero: PNG/JPEG, 2MB, tramite `lib/storage/validazione-immagine.ts`; un file non conforme è rifiutato con lo stesso messaggio già usato altrove.
- La sezione pubblica non deve mai mostrare tabelle/errori fuorvianti quando mancano ancora dati (es. Categoria senza risultati, Categoria senza incontri generati) — mostrare lo stato reale (squadre iscritte senza classifica, nessun pulsante se non c'è nulla da elencare) invece di un vuoto ambiguo.

## Technical Decisions

- Data access: le nuove tabelle del torneo sono "non protette da RLS applicativa" nel senso di AD-9 (accesso via Prisma con connessione privilegiata), ma restano comunque `ENABLE RLS` + `REVOKE` per la convenzione di sicurezza del progetto (vedi Requirements).
- Naming: modelli Prisma in italiano, PascalCase singolare (`EdizioneTorneo`, `CategoriaTorneo`, `SquadraTorneo`, `PartitaTorneo`, `SlotTorneo`); Id come UUID; date in formato ISO/lessicograficamente ordinabile; Server Action con verbo esplicito (es. `generaCalendarioGironiAction`, `generaTabelloneAction`); errori come `{ error: { code, message } }`.
- Modello: `SquadraTorneo` è un'entità leggera indipendente da `Gruppo`/`Atleta`/`Allenatore` (il torneo ospita anche club esterni) — nessun riuso diretto del modello Campionato/Partita di Epic 10, solo un riferimento di pattern per struttura risultato/parziali.
- Regolamento: girone all'italiana, incontri al meglio dei 3 set, punti incontro 3 (vittoria 2-0) / 2 (vittoria 2-1) / 1 (sconfitta 1-2) / 0 (sconfitta 2-0). Classifica di girone: punti desc, poi (dopo Story 20.16) quoziente set desc, poi quoziente punti desc, poi alfabetico — sostituisce il criterio "set vinti assoluti" di Story 20.3.
- Tabellone: incrocio standard 1°girone A-2°girone B / 1°girone B-2°girone A per il posizionamento 1°-4°, stesso schema con 3°/4° per il posizionamento 5°-8°; finali generate automaticamente come side-effect quando le semifinali sono risolte.
- `SlotTorneo` è scoped per Edizione (non per Categoria), riusa `Palestra`/`Campo` (Epic 2) via FK dirette e l'enum `FaseTorneo`/union discriminata già in uso su `PartitaTorneo` (fase GIRONE ⟺ tabellone NULL); `PartitaTorneo.slotTorneoId` è nullable, l'assegnazione è sempre best-effort (mai bloccante) e sempre modificabile a mano.
- Numerazione gare (`PartitaTorneo.numero`) è per Edizione (sequenza unica cross-categoria), mai editabile a mano, protetta da vincolo unico DB contro race di generazione concorrente.
- Riuso diretto: link "Naviga" verso la palestra (`lib/link-naviga-palestra.ts`), stesso meccanismo di `/calendario`.

## UX & Interaction Patterns

- Registro visivo "Poster Sportivo" (DESIGN.md/EXPERIENCE.md, 2026-08-13): nessun webfont, solo stack di sistema (`Arial Black`/`Arial Narrow`/`Impact`/`Arial`), tagli diagonali, blocchi colore pieni; da riusare tale e quale, nessuno stile ad hoc per il torneo.
- Le pagine pubbliche del sito non hanno oggi un contenitore centrato a livello pagina (solo blocchi isolati); `/torneo` introduce la prima eccezione (Story 20.14, scope limitato alla sola pagina, non un retrofit delle altre).
- Sezioni pubbliche mostrate direttamente sullo sfondo pagina, senza riquadro bianco/ombra per sotto-sezione (mirror di `.sezioneSettimana` in `/calendario`) — lo sfondo di `/torneo` è grigio chiaro `#F2F5F7` (stesso valore di `/squadre`), diverso dal bianco di `/calendario`/`/staff`/`/contatti`.
- Griglie di incontri (grafiche) restano sempre visibili; viste tabellari sono aggiuntive, dietro un pulsante esplicito che le rivela per singola Categoria (stato indipendente per Categoria), mai un toggle che nasconde la griglia grafica.

## Cross-Story Dependencies

- Catena dati: 20.1 (Edizione/Categoria) → 20.2 (Squadre/gironi) → 20.3 (calendario/risultati/classifica girone) → 20.4 (tabellone/classifica finale). 20.5 (volantino) e 20.7 (nome edizione) estendono `EdizioneTorneo` indipendentemente. 20.6 (vetrina pubblica) consuma tutte le 20.1-20.5.
- 20.8 (cancellazione partite) sblocca la catena di eliminazione altrimenti bloccata da 20.2/20.3/20.4 non appena esiste un calendario.
- 20.9 (Slot) introduce `SlotTorneo` e il campo `PartitaTorneo.slotTorneoId`, riusato da 20.12 (generazione in blocco), 20.17 (ordinamento incontri per Slot) e 20.18 (Campi negli Slot di girone, estende 20.12).
- 20.11 (numero progressivo) è prerequisito informativo di 20.19 (vista tabellare, ordina per `numero`).
- 20.10 → 20.14 → 20.17 sono modifiche CSS/layout sequenziali sulla stessa pagina pubblica (`app/torneo/torneo-pubblico.module.css`/`page.tsx`), ciascuna verificata dal vivo dopo il deploy della precedente — non toccano mai le pagine admin.
- 20.16 (quoziente set/punti) sostituisce il criterio di spareggio stabilito in 20.3 e deve riflettersi identicamente sia in `/torneo` pubblico sia nella pagina admin risultati.
- 20.13 (nome Settimane) è indipendente ma mirror diretto del pattern di 20.7 sullo stesso modello `EdizioneTorneo`.
- 20.15/20.19 sono viste di sola lettura sulla pagina pubblica, esplicitamente fuori scope per le pagine admin equivalenti.
