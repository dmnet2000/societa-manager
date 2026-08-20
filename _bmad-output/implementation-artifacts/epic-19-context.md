# Epic 19 Context: Ruolo Site Manager per la gestione del sito pubblico

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Introdurre un settimo Ruolo, `SITE_MANAGER`, che permetta di delegare la gestione del sito pubblico (contatti, logo/nome Settore, Sponsor, foto squadra, URL Pagina Facebook, e un nuovo menu di navigazione pubblico configurabile) senza concedere accesso Admin completo né toccare l'amministrazione sportiva interna (Gruppi, Allenatori, Atlete). L'epica è stata aggiunta in corso d'opera (2026-08-14) e non è coperta dai documenti di pianificazione originali (PRD, architettura, UX del 2026-07-13/07-22): le decisioni sotto derivano dall'analisi di apertura e dalla party mode del 2026-08-18, non da artefatti precedenti.

## Stories

- Story 19.1: Ruolo Site Manager e accesso ai contatti pubblici
- Story 19.2: Accesso Site Manager a logo e nome Settore
- Story 19.3: Accesso Site Manager a Sponsor
- Story 19.4: Accesso Site Manager alla foto squadra (vista dedicata)
- Story 19.5: Accesso Site Manager all'URL della Pagina Facebook
- Story 19.6: Modello dati per le voci di menu pubblico
- Story 19.7: UI di gestione del menu pubblico
- Story 19.8: Menu pubblico dinamico
- Story 19.9: Modello dati e rendering pubblico delle Pagine personalizzate
- Story 19.10: Editor di creazione e modifica delle Pagine personalizzate
- Story 19.11: Accesso Site Manager alla foto sfondo hero

## Requirements & Constraints

- Il nuovo Ruolo si chiama `SITE_MANAGER` (inglese, deliberatamente fuori dalla convenzione italiana degli altri 6 Ruoli) ed è cumulabile con qualsiasi altro Ruolo sullo stesso Utente, stesso principio già in uso.
- L'accesso di `SITE_MANAGER` è **additivo**: nessun permesso viene tolto ad Admin/Dirigente/Allenatore sulle funzionalità che oggi già gestiscono (contatti pubblici, logo/nome Settore, Sponsor, foto squadra, URL Facebook).
- Il Token Facebook (credenziale API) resta **esplicitamente escluso** dall'accesso di `SITE_MANAGER` in questa epica — resta Admin/Dirigente.
- La gestione del menu pubblico richiede ampiezza piena: un vero modello dati per le voci di menu + una UI di gestione dedicata, non la semplice apertura di pagine esistenti al nuovo Ruolo — riconosciuta come la parte di maggior impatto architetturale dell'epica.
- Site Manager ottiene per la foto squadra una vista **scoped** dedicata (solo upload foto per Gruppo), non l'intera pagina `/app/gruppi`: "gestione del sito pubblico" non implica amministrazione sportiva interna (creazione Gruppi, assegnazione Allenatori/Atlete).
- Se la tabella delle voci menu risulta vuota (es. errore di migrazione), il rendering pubblico deve fallire in modo esplicito e loggato — mai un fallback silenzioso sulle 5 voci hard-coded attuali (Home, Squadre, Calendario, Staff, Contatti), per evitare due fonti di verità del menu da tenere sincronizzate.
- Quando l'URL della Pagina Facebook cambia, l'interfaccia deve avvisare esplicitamente che il Token potrebbe non corrispondere più più (Site Manager non ha accesso al Token e non può risolvere da solo).

## Technical Decisions

- Aggiungere un Ruolo tocca più punti coordinati: enum `Ruolo` in Prisma, `RUOLI_VALIDI` in `lib/ruoli.ts`, `PROTECTED_ROUTES`/`requireRuolo` in `lib/auth/route-guard.ts`, e ogni Server Action che oggi limita esplicitamente a un sottoinsieme di Ruoli le funzionalità che `SITE_MANAGER` deve poter usare. I Ruoli vivono in `UtenteRuolo` via Prisma (fonte di verità) ma vengono letti a runtime solo da `app_metadata` Supabase (mai query diretta), specchiati lì ad ogni scrittura tramite chiamata service-role — la scrittura su `UtenteRuolo` e quella su `app_metadata` sono trattate come un'unica unità logica (fallimento parziale = fallimento complessivo, richiede retry).
- Ogni cambio di schema passa da migrazione Prisma; nessuna modifica diretta alle tabelle da dashboard Supabase.
- Per la nuova tabella delle voci di menu pubblico (19.6): va protetta con RLS abilitata e REVOKE espliciti come ogni altra tabella strutturale del progetto — convenzione del progetto, non derogabile anche per tabelle che altrove sarebbero gestite solo via connessione Prisma privilegiata.
- Convenzione errori: i rifiuti di autorizzazione restituiscono sempre `{ error: { code: 'FORBIDDEN', message } }`, mai `NOT_FOUND` per un dato esistente ma non accessibile.
- Naming: modelli Prisma in italiano PascalCase singolare (es. `VoceMenuPubblico`); route e file kebab-case; Server Action con verbo esplicito.

## UX & Interaction Patterns

- Il menu pubblico (`app/NavPubblica.tsx`) usa oggi un elenco di navigazione orizzontale con wrap su mobile (pattern già shippato in Story 18.7) — la Story 19.8 deve preservare questo rendering, non reintrodurre hamburger/drawer.
- Nessun webfont: solo stack di sistema; le voci di navigazione usano la famiglia condensata (Arial Narrow/Arial/Helvetica Neue) in maiuscolo reso solo via CSS `text-transform`, mai testo già maiuscolo salvato a sorgente/DB (rilevante ora che le etichette diventano dati configurabili).
- Ogni nuovo elemento cliccabile (voci menu, controlli della UI di gestione) richiede area di hit reale ≥44×44px, indipendente dalla resa visiva.

## Cross-Story Dependencies

- 19.6 (modello dati) è propedeutica a 19.7 (UI di gestione, scrive sulla tabella) e a 19.8 (rendering dinamico, legge tramite le funzioni introdotte in 19.7): ordine di sviluppo vincolato 19.6 → 19.7 → 19.8.
- 19.1 introduce il Ruolo `SITE_MANAGER` stesso: le Story 19.2–19.5 e 19.7 estendono route-guard/Server Action con questo Ruolo e presuppongono che 19.1 l'abbia già reso assegnabile.
- 19.4 riusa `caricaFotoSquadraAction` (`lib/storage/foto-squadra.ts`, introdotta con la foto squadra per Gruppo dell'Epic 18) estendendone il `requireRuolo` con `SITE_MANAGER`, senza toccare `/app/gruppi` né l'accesso Allenatore a `/app/i-miei-gruppi`.
- 19.5 estende `salvaUrlPaginaFacebookAction` (già `requireRuolo(["ADMIN","DIRIGENTE"])`) lasciando invariata `salvaTokenFacebookAction`, entrambe raggiungibili da `/app/impostazioni` insieme ai contatti pubblici di 19.1.
- 19.3 estende sia il controllo di visibilità della rotta `/app/sponsor` sia le 3 Server Action di gestione Sponsor.
- 19.11 estende `caricaFotoHeroAction` (`lib/storage/foto-hero.ts`, foto di sfondo dell'hero introdotta dalla Story 18.14), stesso pattern di 19.5: `/app/impostazioni` già aperta a `SITE_MANAGER` dalla 19.1, nessuna modifica a route-guard necessaria.
