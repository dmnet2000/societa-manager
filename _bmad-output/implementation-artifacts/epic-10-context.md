# Epic 10 Context: Gestione Partite e Campionati

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Questa epica introduce la gestione delle partite di campionato per le squadre della società: un Allenatore (o Admin/Dirigente) crea/gestisce i Campionati a cui il proprio Gruppo partecipa, importa il calendario gare da un file Excel nel formato di esportazione federale (FIPAV/Lega Pallavolo), e consulta/corregge le partite in una vista organizzata per settimana. Atlete e Genitori vedono in sola lettura le partite del proprio Gruppo/figlia, con indicazioni stradali verso il luogo di gioco. L'epica è stata aggiunta in corso d'opera (non è coperta dai documenti di pianificazione originali — PRD/architettura del 2026-07-13 non menzionano Campionato/Partita); le decisioni tecniche rilevanti sono state prese direttamente con l'utente e sono riportate nelle note delle singole story in `epics.md`, unica fonte primaria per questa epica oltre alle convenzioni architetturali generali già in vigore nel progetto.

## Stories

- Story 10.1: Creazione di un Campionato per un Gruppo
- Story 10.2: Import Excel delle partite di un Campionato
- Story 10.3: Vista partite settimana per settimana (Allenatore, Dirigente, Admin)
- Story 10.4: Modifica di una singola partita
- Story 10.5: Vista partite per Atleta e Genitore
- Story 10.6: Cancellazione di una Partita o di un Campionato
- Story 10.7: Il Campionato appartiene a un solo Gruppo (rimozione della condivisione)
- Story 10.8: Modifica nome Campionato e link al portale FIPAV
- Story 10.9: Raggruppamento tabellare delle Partite per Gruppo, a scomparsa

## Requirements & Constraints

- Un Campionato è legato a un solo Anno Agonistico (non sopravvive al cambio di stagione) e appartiene a un solo Gruppo (dopo Story 10.7 — modello 1:1, non più molti-a-molti: due squadre della stessa società nello stesso girone federale sono due Campionati distinti, anche con lo stesso nome). Un Gruppo può comunque partecipare a più Campionati contemporaneamente.
- Autorizzazione a due livelli su Campionato/Partita: l'Allenatore opera solo sul/sui propri Gruppi; Admin/Dirigente hanno accesso ampio a tutti i Gruppi (stesso pattern di Story 2.2). Le operazioni tentate da un Allenatore fuori dal proprio Gruppo vanno rifiutate.
- L'import Excel usa il formato reale di esportazione federale (colonne: Campionato, Gara N, Giornata, Data, Ora, SquadraCasa, SquadraOspite, Risultato, Parziali, StatoDescrizione, Impianto, IndirizzoImpianto). `Gara N` è la chiave naturale per un re-import idempotente (aggiorna, non duplica). Colonne mancanti/formato non riconosciuto: import rifiutato integralmente con errore chiaro, nessun import parziale. Un import riuscito mostra un riepilogo (N create/M aggiornate).
- `Impianto`/`IndirizzoImpianto` sono testo libero presenti su ogni riga (anche in casa): nessuna nuova entità "luogo", nessun riuso di `Palestra` per gli avversari.
- La modifica di una partita (Story 10.4) copre solo giorno/ora/impianto/indirizzo — mai i campi identitari (Gara N, Campionato, squadre).
- Il nome del Campionato resta obbligatorio; il link FIPAV è testo libero opzionale (nessuna validazione di dominio specifica, solo formato URL di base) e resta la chiave di controllo di coerenza con la colonna `Campionato` del file importato — invariata da Story 10.8.
- Ogni cancellazione distruttiva (Partita o Campionato con le sue Partite in cascata) richiede conferma esplicita, stesso pattern già in uso nel progetto (`window.confirm` o equivalente).
- Story 10.6 va implementata dopo Story 10.7: solo col modello 1:1 cancellare un Campionato è sempre sicuro (nessun altro Gruppo può esserne proprietario).
- Story 10.9: la sezione/bottoni per Gruppo compaiono solo se le Partite visibili appartengono a più di un Gruppo (mai per un'Atleta/Genitore o un Allenatore con un solo Gruppo — nessun valore aggiunto rispetto a quanto già mostrato).

## Technical Decisions

- **Anno Agonistico (AD-8):** Campionato ha FK diretta verso AnnoAgonistico, stesso principio già usato da Gruppo/Iscrizione; la stagione corrente si risolve sempre tramite l'helper condiviso esistente, mai con calcoli di date ad hoc.
- **Accesso ai dati (AD-9):** Campionato e Partita sono dati **strutturali**, non protetti da RLS (non riguardano dati sanitari/personali) — stesso trattamento di Gruppo/Slot: letture/scritture a runtime via Prisma diretto con connessione privilegiata, mai via client Supabase.
- **Naviga (riuso invariato, Story 9.6):** `lib/link-naviga-palestra.ts` è già generico su `{ indirizzo }`, non specifico di Palestra — va riusato identico per il pulsante "Naviga" su ogni vista partite (Allenatore/Dirigente/Admin, Story 10.3; Atleta/Genitore, Story 10.5; raggruppamento per Gruppo, Story 10.9), mai reimplementato.
- **Pattern update-singola-entità (Story 10.8):** mirror diretto di `aggiornaPalestra` — `requireRuolo`/verifica possesso Gruppo → validazione → `prisma.campionato.update(...)` → errore `INTERNAL` generico → `revalidatePath`.
- **Disclosure "a scomparsa" (Story 10.9):** mirror esatto del componente `TabellaIncontriCategoria.tsx` (Epic 20, Story 20.19, sito pubblico Torneo — `app/torneo/TabellaIncontriCategoria.tsx`): un bottone con `aria-expanded`/`aria-controls` che rivela/nasconde una tabella aggiuntiva sola lettura, stato indipendente per istanza (un componente per Gruppo, nessuno stato condiviso, nessun toggle che sostituisce la vista esistente). Nessuna colonna Azioni anche per chi può modificare altrove.
- **Errori/autorizzazione:** stesso formato generale già in vigore nel progetto — Server Action per ogni mutazione (mai scritture dirette dal client), errori come `{ error: { code, message } }` con `code: 'FORBIDDEN'` riservato ai rifiuti di autorizzazione.

## Cross-Story Dependencies

- Story 10.6 (cancellazione) **richiede** Story 10.7 già completata — il modello a Gruppo unico rende sicura la cancellazione a cascata del Campionato.
- Story 10.9 dipende dalla vista settimanale di Story 10.3 (stessa fonte dati/pagina `/app/partite`) e dal set di dati/autorizzazioni di Story 10.5 (Atleta/Genitore restano senza il nuovo controllo, avendo sempre un solo Gruppo visibile) — è una sezione aggiuntiva, mai un rimpiazzo della vista per settimana.
- Story 10.9 mirror di **Story 20.19 (Epic 20, Torneo Memorial)**: stesso pattern di componente disclosure (`TabellaIncontriCategoria.tsx`) applicato in un contesto diverso (area gestionale `/app/partite` invece che sito pubblico del torneo) — coerenza di interazione tra le due epiche, non un nuovo pattern da inventare.
- Il pulsante "Naviga" (Story 9.6) è un punto di riuso condiviso tra Story 10.3, 10.4, 10.5 e 10.9 — un'eventuale modifica futura a `lib/link-naviga-palestra.ts` impatta tutte queste story contemporaneamente.
- Story 10.5 riusa l'aggancio Genitore↔Atleta già stabilito da Story 1.5 (AD-10) per determinare quali Partite un Genitore può vedere.
