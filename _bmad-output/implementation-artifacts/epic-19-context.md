# Epic 19 Context: Ruolo Site Manager per la gestione del sito pubblico

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Introdurre un nuovo Ruolo, `SITE_MANAGER`, dedicato alla gestione della parte pubblica del sito (Epic 18): sezioni/menu di navigazione, foto, contenuti testuali, pagine personalizzate. Il Ruolo **affianca** i permessi sparsi già esistenti (Admin/Dirigente/Allenatore) senza toglierli — nessuna funzionalità pubblica cambia perimetro per chi la gestisce già oggi. L'epica è stata aggiunta in corso d'opera (2026-08-14) su richiesta esplicita dell'utente ed è rimasta un elenco aperto: story aggiuntive sono state incorporate nel tempo (19.9-19.14) man mano che emergevano gap reali d'uso (pagine dietro URL nuovi, formattazione editor, editor a blocchi). Il valore per l'utente: poter delegare la manutenzione quotidiana del sito vetrina (testi, foto, menu, pagine) a una persona non tecnica, senza concederle accesso amministrativo alla gestione sportiva interna (Gruppi, Allenatori, Atlete).

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
- Story 19.12: Descrizione e ruoli aggiuntivi dello Staff (gestione Site Manager)
- Story 19.13: Giustificazione testo/immagini, pagina centrata e ridimensionamento immagini nell'editor delle Pagine pubbliche
- Story 19.14: Editor a blocchi (drag-and-drop) per le Pagine pubbliche

## Requirements & Constraints

- Progetto personale, sviluppo in solitaria, nessun budget/hosting dedicato: ogni libreria/servizio adottato deve essere gratuito e self-hosted (niente piani a pagamento) — motivazione esplicita della scelta di Tiptap (MIT) per l'editor.
- Nessun requisito formale di uptime/SLA; scala target ridotta (~200 Atlete, un solo settore) — non serve infrastruttura enterprise per queste funzionalità.
- Ogni rotta protetta segue lo stesso pattern esistente: route-guard centralizzato + `requireRuolo(...)` nelle Server Action, redirect per chi non ha il Ruolo richiesto — nessuna eccezione per le nuove pagine di quest'epica.
- Principio "insieme chiuso, non arbitrario" applicato ripetutamente: allineamenti testo/immagine, tipi di blocco, numero di colonne, pattern URL video riconosciuti — mai un valore libero non validato dove un enum chiuso basta.
- Fail-closed esplicito e loggato preferito a un fallback silenzioso in ogni punto critico (menu vuoto, URL video non riconosciuto, slug riservato): evitare doppie fonti di verità che possono andare silenziosamente fuori sincrono.

## Technical Decisions

- **Ruolo nuovo `SITE_MANAGER`**: nome deliberatamente in inglese (rottura della convenzione italiana degli altri 6 Ruoli), cumulabile con qualsiasi altro Ruolo sullo stesso Utente (stesso principio già in uso). Tocca `prisma/schema.prisma` (`enum Ruolo`), `lib/ruoli.ts` (`RUOLI_VALIDI`), `lib/auth/route-guard.ts`, e ogni Server Action che oggi filtra per Ruolo sulle funzionalità in scope.
- **I Ruoli sono fonte di verità in `UtenteRuolo` via Prisma ma letti a runtime solo da `app_metadata` di Supabase Auth** (mai da query diretta al DB nel middleware/route-guard): ogni scrittura di Ruolo deve specchiare anche `app_metadata` via chiamata service-role; se lo specchiamento fallisce dopo che la scrittura Prisma è riuscita, l'intera operazione va trattata come fallita (retry), non come successo parziale. Rilevante per Story 19.1 quando si estende l'assegnazione Ruoli.
- **Pattern "affianca, non sostituisce"**: ogni story di estensione permessi (19.1, 19.2, 19.3, 19.5, 19.11, 19.12) aggiunge `SITE_MANAGER` a un `requireRuolo` esistente accanto ad Admin/Dirigente/Allenatore, senza rimuovere nulla — nessuna regressione sui Ruoli che già gestiscono quella funzionalità.
- **Pattern "vista scoped" invece di aprire pagine amministrative intere**: dove la funzionalità pubblica-rilevante vive dentro una pagina più ampia con funzioni sportive interne (`/app/gruppi` per foto squadra, gestione Allenatori per descrizione/ruoli aggiuntivi), si crea una nuova rotta dedicata che espone solo il controllo pertinente, mai l'intera pagina — stesso vincolo ripetuto in 19.4 e 19.12.
- **Credenziali API escluse per principio**: il Token Facebook (credenziale, non contenuto) resta riservato ad Admin/Dirigente anche quando l'URL della Pagina Facebook associata diventa gestibile da Site Manager (19.5) — quando cambia solo l'URL, l'UI deve avvisare esplicitamente che il Token potrebbe non corrispondere più, perché Site Manager non può risolvere da solo il disallineamento.
- **Nuove tabelle strutturali** (`VoceMenuPubblico`, Pagine personalizzate): come ogni altra tabella del progetto, richiedono RLS abilitata + REVOKE espliciti anche se non protette da policy per-utente — non basta l'assunzione "nessun GRANT". Seguono il pattern Prisma-owns-schema già in uso per le tabelle non protette da RLS runtime (stesso gruppo di Palestra/Campo/Slot/Gruppo/Allenatore/Utente).
- **Sanitizzazione HTML in profondità** (Story 19.9+): qualunque contenuto prodotto dall'editor rich-text e reso con `dangerouslySetInnerHTML` va sanitizzato sia al salvataggio sia ad ogni render (due passaggi indipendenti, mai fidarsi di uno solo) tramite `lib/sanitizza-html.ts` (basato su `sanitize-html`). Ogni nuova capacità dell'editor (allineamento, dimensione immagine, iframe video, pulsante) richiede un'estensione esplicita e minimale dell'allowlist (`allowedStyles`/`allowedIframeHostnames`), mai un attributo libero.
- **Slug/URL riservati**: un elenco di prefissi di rotta riservati, derivato da `PUBLIC_ROUTES`/`PROTECTED_ROUTES` esistenti come unica fonte di verità, blocca la creazione di una voce di menu o Pagina il cui URL collida con una rotta reale (app, API, autenticazione, le 5 pagine pubbliche storiche) — stesso controllo riusato per il blocco Pulsante/CTA in 19.14.
- **Embed video mai libero**: un blocco Video accetta solo un URL YouTube/Vimeo, un parser server-side ne estrae l'id e ricostruisce lui stesso l'URL iframe (dominio privacy-enhanced `youtube-nocookie.com` o `player.vimeo.com`, con `sandbox` forzato) — l'input utente non finisce mai direttamente in `src`.
- **Storage immagini**: nuovo bucket pubblico per-entità, mirror del pattern già in uso per i banner Sponsor, con riuso diretto della validazione MIME/dimensione esistente (`lib/storage/validazione-immagine.ts`, PNG/JPEG, 2MB) — nessuna nuova regola di validazione da inventare.
- **Editor Tiptap** (MIT, self-hosted): scelto per coerenza con il vincolo di nessun budget/piano a pagamento. L'estensione drag-handle per il riordino a blocchi (19.14) porta dipendenze transitive di editing collaborativo (`yjs` e affini) mai altrimenti usate dal progetto — accettato esplicitamente, ma richiede una verifica concreta della dimensione del bundle di produzione prima/dopo l'installazione, non solo fiducia nella documentazione.
- **Accessibilità da tastiera obbligatoria anche per interazioni drag-and-drop** (emerso in revisione della 19.14): qualunque riordino trascinabile deve avere un percorso equivalente da tastiera, richiamando la stessa funzione pura di riordino usata dal drag — nessun Utente escluso per non avere mouse/touch.

## UX & Interaction Patterns

- Base cromatica del sito pubblico: bianco + azzurro (coerente col portale interno), con il blu-carbone usato assertivamente in blocchi di contenuto pieni. Il componente `button-primary` (blocco pieno azzurro, testo blu-carbone, nessun border-radius, testo maiuscolo via CSS, hover: sfondo bianco + sollevamento 2px/200ms) è definito nel design system ma non ancora implementato in CSS: la Story 19.14 (blocco Pulsante/CTA) è il primo punto che lo implementa realmente.
- Le Pagine pubbliche (contenuto editoriale libero) sono il primo punto del sito con un contenitore a colonna centrata (`max-width` + `margin:auto` su titolo e contenuto) — le altre pagine pubbliche restano strutturate a sezioni/griglie a piena larghezza, pattern non da replicare altrove.
- Ampiezza "dépliant digitale" per le Pagine personalizzate: poche pagine statiche, nessuno stato bozza/pubblicato — una pagina è visibile appena salvata.
- Inserimento blocco nell'editor a blocchi: bottone "+" in fondo all'ultimo blocco con menu a comparsa dei tipi disponibili, non una toolbar libera — stesso principio "niente libreria esterna dove basta un dropdown" già seguito per il riordino del menu pubblico.
- Colonne (blocco a 2 colonne fisse, non configurabile): su schermi stretti si impilano verticalmente, stesso cedimento responsive mobile-first già in uso in tutte le pagine pubbliche.

## Cross-Story Dependencies

- 19.6 (modello dati menu) è prerequisito di 19.7 (UI gestione menu) e 19.8 (rendering dinamico) — sequenza dati → UI → attivazione, nessuna UI collegata finché 19.6 non esiste.
- 19.9 (modello dati e rendering Pagine) è prerequisito diretto di 19.10 (editor) — stesso pattern dati/UI di 19.6-19.7.
- 19.9 introduce il controllo anti-collisione sugli slug riservati; la Story 19.7 (form voci di menu) deve essere estesa con lo stesso controllo, perché oggi un Site Manager può digitare un URL riservato senza avviso.
- 19.13 e 19.14 estendono entrambe l'editor/rendering introdotti da 19.9/19.10: 19.13 aggiunge allineamento/dimensione, 19.14 aggiunge blocchi riordinabili — entrambe devono preservare la resa di contenuto già salvato dalle story precedenti (nessuna migrazione dello storage, sempre `contenutoHtml` sanitizzato).
- 19.14 riusa esplicitamente meccanismi già costruiti altrove nell'epica: la validazione URL riservati (19.9) per il blocco Pulsante, e il principio di embed server-parsed già stabilito per Facebook (Epic 18) per il blocco Video.
- 19.1 sblocca l'accesso a `/app/impostazioni` per `SITE_MANAGER`, da cui dipendono poi 19.2 (logo/nome Settore), 19.5 (URL Pagina Facebook) e 19.11 (foto hero) — tutte estendono `requireRuolo` su Server Action già raggiungibili da quella pagina.
- 19.4 e 19.12 condividono lo stesso vincolo architetturale (vista scoped, mai l'intera pagina amministrativa sportiva) e lo stesso Ruolo di riferimento per la struttura della nuova rotta.
