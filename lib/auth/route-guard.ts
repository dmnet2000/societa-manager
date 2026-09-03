import type { Ruolo } from "@prisma/client";

export const LOGIN_PATH = "/accedi";
// Story 9.42: unica fonte di verita' per la home pubblica, riusata sia da
// PUBLIC_ROUTES sotto sia dalla destinazione post-logoff di esci()
// (app/NavBar.actions.ts) - mirror dello stesso trattamento gia' riservato
// a LOGIN_PATH sopra.
export const HOME_PATH = "/";
// Story 18.1 (Epic 18): /non-autorizzato si e' spostata sotto /app insieme
// al resto della dashboard interna (e' raggiunta solo da un Utente gia'
// autenticato con Ruolo sbagliato, concettualmente parte dell'area /app),
// pur non essendo mai stata in PROTECTED_ROUTES (nessun controllo Ruolo su
// di lei - vedi matchProtectedRoute sotto, che su questo path non trova
// corrispondenza e lascia semplicemente passare qualunque Utente
// autenticato).
export const NON_AUTORIZZATO_PATH = "/app/non-autorizzato";

// Route pubbliche: accessibili senza sessione (login, registrazione).
// Story 9.11: /recupera-password e /reimposta-password sono per definizione
// raggiunte da un Utente senza sessione (o con una sessione appena scaduta),
// senza queste il Proxy le rediregerebbe a /accedi prima ancora di mostrare
// il form.
// Story 18.1 (Epic 18): "/" aggiunta per il nuovo sito pubblico - isPublicRoute
// (sotto) fa "pathname === route || pathname.startsWith(`${route}/`)": con
// route = "/" il secondo confronto diventa pathname.startsWith("//"), mai
// vero per un path normale, quindi questa voce rende pubblica SOLO la home
// esatta, non un prefisso che intercetterebbe ogni altra rotta. Le rotte
// pubbliche di contenuto introdotte dalle story successive (18.2-18.5)
// andranno aggiunte qui esplicitamente una per una, non sono coperte
// automaticamente da questa voce.
//
// Review fix (Story 18.7, Blind Hunter + Edge Case Hunter, trovato
// indipendentemente da entrambi): /squadre, /calendario, /staff, /contatti
// aggiunte QUI, non dalle rispettive Story 18.8-18.11 come pianificato in
// analisi - il piano originale assumeva che un Visitatore anonimo che
// clicca una di queste voci nel nuovo menu (app/NavPubblica.tsx) ricevesse
// un 404, ma senza questa voce getRouteDecision (lib/auth/route-decision.ts)
// le tratta come rotte protette e reindirizza a /accedi (isAuthenticated
// e' false per un Visitatore anonimo) - un login-wall silenzioso su un menu
// che promette contenuto pubblico, peggiore del 404 originariamente
// previsto. Nessuna pagina esiste ancora dietro questi path: Next.js
// mostra la propria 404 predefinita (nessun app/not-found.tsx personalizzato
// nel progetto) per una richiesta che supera il Proxy senza trovare una
// rotta - lo stesso 404 gia' atteso dalla story, ora davvero raggiungibile.
export const PUBLIC_ROUTES = [
  HOME_PATH,
  "/accedi",
  "/registrati",
  // Story 11.4: stesso motivo di /recupera-password e /reimposta-password
  // sopra - raggiunta da un Utente senza sessione, il Proxy la
  // rediregerebbe altrimenti a /accedi prima di mostrare il form.
  "/conferma-registrazione",
  "/recupera-password",
  "/reimposta-password",
  "/squadre",
  "/calendario",
  "/staff",
  "/contatti",
  // Story 20.6 (Epic 20, Torneo Memorial): /torneo dimenticata qui al
  // momento dell'introduzione della pagina pubblica - stesso identico bug
  // gia' corretto per /squadre,/calendario,/staff,/contatti in Story 18.7
  // (vedi commento sopra): senza questa voce un Visitatore anonimo che
  // clicca "Torneo" nel menu pubblico (app/NavPubblica.tsx, voce aggiunta
  // dalla migrazione 20260825010000_add_torneo_voce_menu_pubblico) veniva
  // reindirizzato a /accedi invece di vedere la pagina pubblica.
  "/torneo",
];

// Mappa prefisso-rotta -> Ruoli ammessi. Aggiungere qui le rotte introdotte
// dalle prossime storie (Story 1.2+ estendera' con altri prefissi).
// "navLabel" (Story 8.1): stessa fonte di verita' usata sia per
// l'autorizzazione sia per le voci della barra di navigazione
// (lib/auth/voci-navigazione.ts) - evita una lista di voci duplicata e
// mantenuta a mano separatamente da questa.
//
// Story 12.3: questo file (route-guard.ts) resta volutamente privo di
// qualunque dipendenza da Prisma/"server-only" - e' importato anche da
// lib/auth/voci-navigazione.ts, a sua volta importato da app/NavBarClient.tsx
// ("use client"). Un `import "server-only"` (transitivo tramite
// lib/auth/permessi-configurabili.ts -> lib/prisma.ts -> pg) qui romperebbe
// la build del bundle client (verificato dal vivo con `npm run build`:
// "Module not found: Can't resolve 'net'/'tls'" nel bundle browser). Per
// questo la logica che consulta rottaAbilitataPerRuolo (Story 12.2) vive nel
// nuovo file lib/auth/route-decision.ts, non qui - vedi quel file per
// isAutorizzato/getRouteDecision.
export const PROTECTED_ROUTES: {
  prefix: string;
  ruoliAmmessi: Ruolo[];
  navLabel: string;
  // Story 9.24: la rotta resta protetta (getRouteDecision non legge questo
  // campo) ma non compare nell'elenco di navigazione (filtraVociNavigazione,
  // lib/auth/voci-navigazione.ts) - usato per /smtp e /logo, raggiungibili
  // solo passando dalla pagina hub /impostazioni.
  nascostaDallaNav?: boolean;
  // Story 12.3 (Epic 12): se true, questa rotta e' stata migrata al sistema
  // di permessi configurabili (Story 12.1/12.2) - ruoliAmmessi diventa il
  // valore di fallback iniziale del seed (Story 12.1), non piu' consultato
  // direttamente da getRouteDecision (lib/auth/route-decision.ts) ne' da
  // requireRuolo (lib/auth/require-ruolo.ts, Story 12.4), che interrogano
  // invece rottaAbilitataPerRuolo per ciascun Ruolo dell'utente. Prima (e per
  // ora unica) voce migrata: /precaricamento-allenatori, Story 12.4.
  permessiConfigurabili?: boolean;
  // Story 15.1 (Epic 15): se valorizzato, questa rotta compare come voce
  // figlia di un sotto-menu espandibile invece che come voce diretta -
  // "gruppo" e' l'etichetta della voce padre (es. futura "Orari/Palestre"),
  // condivisa da piu' righe di questo array. Infrastruttura pura: nessuna
  // riga qui sotto lo valorizza ancora, la vera applicazione a rotte reali
  // arriva con Story 15.2/15.3/15.4 (stesso principio "fondazione senza
  // consumer reale" gia' seguito in Story 12.1/12.2 per i permessi
  // configurabili). Non consultato da getRouteDecision/requireRuolo -
  // riguarda solo la presentazione in lib/auth/voci-navigazione.ts, mai
  // l'autorizzazione.
  gruppo?: string;
}[] = [
  {
    // Story 15.3 (Epic 15): le quattro rotte raggruppate sotto "Atleti"
    // sono state spostate qui, adiacenti, nell'ordine "Import atlete,
    // Conferma iscrizioni, Conferma certificati, Conferma tesseramenti"
    // (stesso ordine di epics.md) cosi' raggruppaVociNavigazione (che
    // preserva l'ordine di dichiarazione) produce le figlie del gruppo
    // nello stesso ordine - lezione applicata direttamente dalla code
    // review di Story 15.2 (dove l'ordine sbagliato fu scoperto solo in
    // quella review, non anticipato in fase di scrittura).
    prefix: "/app/import-atlete",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Import atlete",
    gruppo: "Atleti",
  },
  {
    // Story 15.3: stesso gruppo di /import-atlete sopra ("Atleti").
    prefix: "/app/conferma-iscrizioni",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    navLabel: "Conferma iscrizioni",
    gruppo: "Atleti",
  },
  {
    // Story 15.3: stesso gruppo di /import-atlete sopra ("Atleti") -
    // spostata qui da una posizione piu' in basso nell'array (era vicina a
    // /notifiche) per stare adiacente alle altre tre rotte dello stesso
    // gruppo.
    prefix: "/app/conferma-certificati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    navLabel: "Conferma certificati",
    gruppo: "Atleti",
  },
  {
    // Story 13.1 (Epic 13): a differenza di /conferma-iscrizioni, Segreteria
    // e' esplicitamente esclusa - solo Admin/Dirigente possono confermare il
    // Tesseramento.
    // Story 15.3: stesso gruppo di /import-atlete sopra ("Atleti").
    prefix: "/app/conferma-tesseramenti",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Conferma tesseramenti",
    gruppo: "Atleti",
  },
  {
    // Story 15.2 (Epic 15): prima applicazione reale del campo "gruppo"
    // introdotto come infrastruttura pura da Story 15.1 - raggruppa con
    // /palestre sotto la voce di menu "Orari/Palestre". Nessun cambio a
    // ruoliAmmessi/navLabel/prefix, l'autorizzazione resta invariata.
    // Review fix: dichiarata PRIMA di /palestre (non dopo) cosi' l'ordine
    // delle figlie nel gruppo (raggruppaVociNavigazione preserva l'ordine
    // di iterazione) corrisponde all'ordine dell'etichetta padre
    // "Orari/Palestre" anche nel caso raro di un Utente con entrambi i
    // Ruoli Segreteria e Admin/Dirigente.
    prefix: "/app/orari",
    ruoliAmmessi: ["SEGRETERIA"],
    navLabel: "Orari",
    gruppo: "Orari/Palestre",
  },
  {
    // Post-15.5 (richiesta esplicita dell'utente, 2026-08-05): /slot
    // (navLabel "Orari" dalla Story 15.5) entra nel sotto-menu
    // "Orari/Palestre" invece di restare una voce diretta singola separata
    // - risolve la sovrapposizione di naming inizialmente accettata "cosi'
    // com'e'" in fase di analisi dell'epic. Dichiarata qui (tra /orari e
    // /palestre) cosi' l'ordine delle figlie nel gruppo corrisponde
    // all'ordine dell'etichetta padre "Orari/Palestre" (voci "Orari" prima,
    // "Palestre" dopo) anche nel caso raro di un Utente con Ruoli sia
    // Segreteria sia Admin/Dirigente - che vedrebbe **due** figlie con lo
    // stesso testo "Orari" (da /orari e da /slot) nello stesso gruppo:
    // scelta consapevole confermata dall'utente, nessun Ruolo reale ha
    // accesso a entrambe le rotte oggi.
    prefix: "/app/slot",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Orari",
    gruppo: "Orari/Palestre",
  },
  {
    // Story 15.2: stesso gruppo di /orari sopra ("Orari/Palestre").
    prefix: "/app/palestre",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Palestre",
    gruppo: "Orari/Palestre",
  },
  { prefix: "/app/gruppi", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Gruppi" },
  {
    prefix: "/app/i-miei-gruppi",
    ruoliAmmessi: ["ALLENATORE"],
    navLabel: "I miei Gruppi",
  },
  { prefix: "/app/mio-orario", ruoliAmmessi: ["ALLENATORE", "ATLETA"], navLabel: "Il mio orario" },
  { prefix: "/app/presenze", ruoliAmmessi: ["ALLENATORE"], navLabel: "Presenze" },
  {
    prefix: "/app/storico-presenze",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    navLabel: "Storico presenze",
  },
  {
    prefix: "/app/certificato-medico",
    ruoliAmmessi: ["GENITORE", "ATLETA"],
    navLabel: "Certificato medico",
  },
  { prefix: "/app/notifiche", ruoliAmmessi: ["ALLENATORE", "DIRIGENTE"], navLabel: "Notifiche" },
  // Fix code review (Story 18.13): era ADMIN-only, ma 3 delle 4 sezioni di
  // questa pagina (Pagina Facebook Story 18.5, Contatti pubblici Story
  // 18.11, Token Facebook Story 18.13) ammettono gia' DIRIGENTE a livello
  // di Server Action (requireRuolo(["ADMIN","DIRIGENTE"])) - con la rotta
  // ADMIN-only un Dirigente veniva reindirizzato prima di raggiungere
  // quelle form, rendendo quel permesso di fatto irraggiungibile (gap
  // presente dalla Story 18.5, mai corretto). Solo "Email Segreteria"
  // resta ADMIN-only alla propria action (salvaEmailSegreteriaAction,
  // invariata) - un Dirigente che la sottomette riceve comunque FORBIDDEN.
  // Story 19.1: SITE_MANAGER aggiunto - settimo Ruolo del sistema, delega la
  // gestione del sito pubblico senza accesso Admin completo. Additivo: ADMIN
  // e DIRIGENTE restano invariati. In questa storia e' stata estesa solo
  // salvaContattiPubbliciAction - le altre action di questo file (vedi
  // impostazioni/actions.ts) restano ["ADMIN","DIRIGENTE"].
  {
    // Story 19.4 (Epic 19): "gruppo" aggiunto - Impostazioni diventa la
    // prima figlia (nell'ordine di dichiarazione dell'array) del nuovo
    // sotto-menu "Gestione sito", insieme a Sponsor e alla nuova
    // /app/foto-squadre (dichiarata piu' sotto, dopo /app/sponsor).
    // Nessuna modifica a ruoliAmmessi/prefix: stessa identica autorizzazione
    // di prima, solo la posizione in nav cambia (AC #4).
    prefix: "/app/impostazioni",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SITE_MANAGER"],
    navLabel: "Impostazioni",
    gruppo: "Gestione sito",
  },
  {
    prefix: "/app/smtp",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Configurazione SMTP",
    nascostaDallaNav: true,
  },
  // Story 19.2: SITE_MANAGER aggiunto - additivo, ADMIN resta invariato.
  // Entrambe le Server Action di questa rotta (caricaLogoAction,
  // salvaNomeSettoreAction) sono state estese in coppia con questa rotta -
  // vedi app/app/(configurazione)/logo/actions.ts.
  {
    prefix: "/app/logo",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    navLabel: "Configurazione logo",
    nascostaDallaNav: true,
  },
  { prefix: "/app/vista-dirigente", ruoliAmmessi: ["DIRIGENTE"], navLabel: "Vista d'insieme" },
  {
    // Story 9.26: specchio di /vista-dirigente ma scoped ai Gruppi propri
    // dell'Allenatore - stessa navLabel (Ruoli mutuamente esclusivi nel
    // caso comune, caso limite ADMIN+ALLENATORE accettato, vedi story file).
    prefix: "/app/vista-allenatore",
    ruoliAmmessi: ["ALLENATORE"],
    navLabel: "Vista d'insieme",
  },
  { prefix: "/app/dati-fisici", ruoliAmmessi: ["ALLENATORE", "ATLETA"], navLabel: "Dati fisici" },
  {
    prefix: "/app/wizard-nuova-stagione",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Wizard nuova stagione",
  },
  {
    prefix: "/app/il-mio-profilo",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    navLabel: "Il mio profilo",
  },
  {
    prefix: "/app/campionati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE"],
    navLabel: "Campionati",
  },
  {
    // Story 10.5: estesa ad ATLETA/GENITORE (sola lettura, gating UI in
    // page.tsx) - stesso pattern gia' usato per /certificato-medico.
    prefix: "/app/partite",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE", "ATLETA", "GENITORE"],
    navLabel: "Partite",
  },
  {
    // Story 16.1 (Epic 16, Sponsor e Convenzioni): introdotta come rotta di
    // *gestione* (Admin/Dirigente creano/modificano/disattivano Sponsor).
    // Story 16.2: stessa rotta riusata per la vetrina *pubblica* (contenuto
    // condizionale per Ruolo in page.tsx, non una rotta distinta - decisione
    // presa in apertura della Story 16.2, stesso principio gia' in uso per
    // /campionati) - prima rotta autenticata del progetto visibile a tutti
    // i Ruoli. Non fa parte di "Accounting" (nessuna decisione di analisi
    // la colloca li').
    // Story 19.3 (Epic 19, Ruolo Site Manager): SITE_MANAGER aggiunto -
    // vede la vetrina come gli altri Ruoli e in piu' il pannello di
    // gestione (terzo gate distinto in page.tsx, non qui).
    prefix: "/app/sponsor",
    ruoliAmmessi: [
      "ALLENATORE",
      "ATLETA",
      "GENITORE",
      "SEGRETERIA",
      "DIRIGENTE",
      "ADMIN",
      "SITE_MANAGER",
    ],
    navLabel: "Sponsor",
    // Story 19.4: seconda figlia del gruppo "Gestione sito" (vedi
    // /app/impostazioni sopra) - stessa autorizzazione invariata, solo la
    // posizione in nav cambia.
    gruppo: "Gestione sito",
  },
  {
    // Story 19.4 (Epic 19, Ruolo Site Manager): nuova pagina SITE_MANAGER-only,
    // vista scoped di /app/gruppi con solo il controllo foto squadra (nessuna
    // creazione Gruppi/assegnazione Allenatori/Atlete) - decisione presa in
    // party mode, /app/gruppi resta invariato e Admin/Dirigente/Allenatore non
    // hanno accesso a questa rotta specifica. Terza (e ultima, per posizione
    // nell'array) figlia del gruppo "Gestione sito" - non nascostaDallaNav,
    // deve comparire in barra per essere raggiungibile da un Site Manager.
    prefix: "/app/foto-squadre",
    ruoliAmmessi: ["SITE_MANAGER"],
    navLabel: "Foto squadre",
    gruppo: "Gestione sito",
  },
  {
    // Story 19.7 (Epic 19, Ruolo Site Manager): gestione delle voci di menu
    // pubblico introdotte dalla Story 19.6 - a differenza delle altre 3
    // rotte del gruppo "Gestione sito" sopra (Impostazioni/Sponsor/Foto
    // squadre, dove Site Manager si aggiunge a un permesso Admin/Dirigente
    // gia' esistente), qui DIRIGENTE resta escluso: l'AC della story limita
    // esplicitamente l'accesso ad ADMIN e SITE_MANAGER, nessun permesso
    // preesistente da affiancare (funzionalita' del tutto nuova). Quarta
    // (e ultima, per posizione nell'array) figlia del gruppo - assunzione
    // non esplicitamente richiesta dall'AC ma coerente con le altre 3 rotte
    // di gestione del sito pubblico dello stesso gruppo (Story 19.4): un
    // Dirigente senza accesso a questa rotta specifica non la vede comunque
    // tra le figlie (il filtro per Ruolo avviene prima del raggruppamento,
    // raggruppaVociNavigazione).
    prefix: "/app/menu-pubblico",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    navLabel: "Menu pubblico",
    gruppo: "Gestione sito",
  },
  {
    // Story 19.15 (Epic 19, Ruolo Site Manager): riordino dei Gruppi (squadre
    // interne) per la pagina pubblica /squadre - stesso perimetro Ruoli di
    // /app/menu-pubblico sopra (ADMIN+SITE_MANAGER, non DIRIGENTE):
    // funzionalita' nuova, nessun permesso preesistente da affiancare
    // (mirror esatto della decisione gia' presa per /app/menu-pubblico).
    // Dichiarata subito dopo /app/menu-pubblico come richiesto dal Code Map
    // della spec.
    prefix: "/app/ordine-squadre",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    navLabel: "Ordine squadre",
    gruppo: "Gestione sito",
  },
  {
    // Story 19.10 (Epic 19, Ruolo Site Manager): editor di creazione/modifica
    // delle Pagine personalizzate introdotte dalla Story 19.9 - stesso
    // perimetro Ruoli di /app/menu-pubblico sopra (ADMIN+SITE_MANAGER, non
    // DIRIGENTE): funzionalita' nuova, nessun permesso preesistente da
    // affiancare (decisione esplicita della spec-19-10). Quinta (e ultima,
    // per posizione nell'array) figlia del gruppo "Gestione sito" - dichiarata
    // subito dopo /app/menu-pubblico come richiesto dal Code Map della spec.
    // Il prefisso copre anche /app/pagine-pubbliche/nuova e
    // /app/pagine-pubbliche/[id] (matchProtectedRoute usa
    // pathname.startsWith(`${prefix}/`)), nessuna voce separata necessaria
    // per le sotto-rotte.
    prefix: "/app/pagine-pubbliche",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    navLabel: "Pagine",
    gruppo: "Gestione sito",
  },
  {
    // Story 19.12 (Epic 19, Ruolo Site Manager): descrizione e ruoli
    // aggiuntivi dello Staff (Allenatore.descrizione/ruoliAggiuntivi),
    // mostrati su /staff (sito pubblico) quando presenti - decisione
    // esplicita 2026-08-20: "affianca", stesso principio di tutta l'Epic 19.
    // A differenza di /app/foto-squadre (SITE_MANAGER-only), qui non c'e' un
    // permesso preesistente di Admin/Dirigente da NON toccare (funzionalita'
    // del tutto nuova), quindi i tre Ruoli entrano subito insieme. Sesta (e
    // ultima, per posizione nell'array) figlia del gruppo "Gestione sito" -
    // dichiarata subito dopo /app/pagine-pubbliche come richiesto dal Code
    // Map della spec.
    prefix: "/app/staff-descrizioni",
    ruoliAmmessi: ["SITE_MANAGER", "ADMIN", "DIRIGENTE"],
    navLabel: "Staff",
    gruppo: "Gestione sito",
  },
  {
    // Story 17.1 (Epic 17, Guida in-app e help contestuale): seconda rotta
    // del progetto visibile a tutti i Ruoli (mirror di /sponsor,
    // Story 16.2) - l'indice mostrato in pagina e' comunque filtrato per
    // Ruolo (lib/guida/contenuti.ts), qui serve solo poter raggiungere la
    // pagina stessa.
    // Story 19.3 (review fix, Blind Hunter): SITE_MANAGER aggiunto - senza
    // questo, dopo 19.1/19.2/19.3 avrebbe accesso a 3 pagine di gestione ma
    // non alla Guida stessa (ne' alla voce di nav, derivata dallo stesso
    // ruoliAmmessi) - solo l'aiuto contestuale "?" su ogni pagina funzionava.
    prefix: "/app/guida",
    ruoliAmmessi: [
      "ALLENATORE",
      "ATLETA",
      "GENITORE",
      "SEGRETERIA",
      "DIRIGENTE",
      "ADMIN",
      "SITE_MANAGER",
    ],
    navLabel: "Guida",
  },
  {
    // Story 20.1 (Epic 20, Torneo Memorial): gestione di Edizione/Categoria
    // del Torneo Memorial - stesso perimetro Ruoli di Epic 10
    // Campionati/Partite (dominio sportivo), decisione di scomposizione
    // epics.md 2026-08-23. Dichiarata qui (dopo /app/guida, prima del
    // gruppo "Accounting") non in fondo all'array: AC #1 di Story 15.4
    // richiede che "Accounting" resti l'ULTIMA voce del menu
    // (raggruppaVociNavigazione posiziona il nodo gruppo all'indice della
    // PRIMA rotta del gruppo incontrata - una voce diretta dopo
    // /permessi-certificati romperebbe quell'invariante). Il prefisso copre
    // anche /app/torneo/[edizioneId] (matchProtectedRoute usa
    // pathname.startsWith(`${prefix}/`)), nessuna voce separata necessaria
    // per la sotto-rotta di dettaglio - mirror /app/pagine-pubbliche sopra.
    prefix: "/app/torneo",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Torneo",
  },
  {
    // Story 15.4 (Epic 15): le tre rotte raggruppate sotto "Accounting"
    // sono state spostate qui, in fondo all'intero array - a differenza di
    // Story 15.2/15.3 (dove bastava rendere le rotte adiacenti tra loro),
    // qui AC #1 richiede esplicitamente che "Accounting" sia l'ULTIMA voce
    // del menu: raggruppaVociNavigazione (Story 15.1) posiziona il nodo
    // gruppo all'indice della PRIMA rotta del gruppo incontrata, quindi la
    // sola adiacenza non basta, serve la posizione finale dell'array.
    // navLabel "Amministrazione" NON rinominato: l'etichetta della voce
    // padre del gruppo viene dal valore di "gruppo" stesso ("Accounting"),
    // non dal navLabel di /admin - che resta l'etichetta della sua figlia.
    prefix: "/app/admin",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Amministrazione",
    gruppo: "Accounting",
  },
  {
    // Story 9.22: solo ADMIN - accesso Dirigente rimosso su richiesta
    // esplicita dell'utente (soluzione temporanea, sostituita da Story 12.4).
    // Story 12.4: prima rotta reale migrata al sistema di permessi
    // configurabili (PoC end-to-end dell'Epic 12) - ruoliAmmessi resta
    // scritto come fallback storico ma non e' piu' consultato da
    // isAutorizzato (lib/auth/route-decision.ts) ne' da requireRuolo quando
    // gli viene passata questa rotta: l'autorizzazione reale (pagina e
    // Server Action) passa ora da rottaAbilitataPerRuolo/permessi_rotte.
    // Nessuna riga esiste ancora per questa rotta nel seed di Story 12.1
    // (era ADMIN-only) - comportamento invariato per costruzione (fail-closed
    // su ogni Ruolo diverso da ADMIN, identico a oggi) finche' un Admin non
    // abilita esplicitamente un altro Ruolo da /permessi-accesso.
    // Story 15.4: stesso gruppo di /admin sopra ("Accounting").
    prefix: "/app/precaricamento-allenatori",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Precaricamento allenatori",
    permessiConfigurabili: true,
    gruppo: "Accounting",
  },
  {
    // Story 9.41: rotta nuova, ADMIN-only hardcoded (niente
    // permessiConfigurabili - vedi Design Notes dello spec: nessun
    // requisito lo chiede, stesso punto di partenza scelto per
    // /precaricamento-allenatori alla sua introduzione, Story 9.22, prima
    // della migrazione della Story 12.4). Stesso gruppo "Accounting".
    prefix: "/app/precaricamento-ruoli",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Precaricamento Segreteria/Dirigente",
    gruppo: "Accounting",
  },
  {
    // Story 12.1: pagina Admin-only di gestione dei permessi configurabili
    // per rotta (Epic 12) - ADMIN sempre escluso dalle righe configurabili
    // stesse (accesso pieno hardcoded), quindi questa rotta e' anch'essa
    // ADMIN-only, stesso trattamento di /permessi-certificati (sotto).
    // Story 15.4: stesso gruppo di /admin sopra ("Accounting").
    prefix: "/app/permessi-accesso",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Permessi di accesso",
    gruppo: "Accounting",
  },
  {
    // Story 15.4 estensione (2026-08-06): spostata qui su richiesta esplicita
    // dell'utente - l'esclusione originale di Story 15.4 ("NON fa parte di
    // Accounting, non menzionata nella richiesta originale nonostante la
    // somiglianza di nome con /permessi-accesso") si e' rivelata un
    // fraintendimento: l'appunto originale dell'utente chiedeva davvero di
    // spostare /permessi-certificati sotto Accounting, solo non era stato
    // colto nell'analisi di apertura dell'Epic 15. Spostata qui (in fondo,
    // insieme alle altre rotte del gruppo) invece che lasciata alla sua
    // posizione originale (prima di /dati-fisici) - raggruppaVociNavigazione
    // (Story 15.1) posiziona il nodo gruppo all'indice della PRIMA rotta del
    // gruppo incontrata nell'array, quindi la posizione conta (stesso motivo
    // gia' documentato sopra per /admin, AC #1 "Accounting" ultima voce).
    prefix: "/app/permessi-certificati",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Permessi certificati",
    gruppo: "Accounting",
  },
];

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; location: string };

// Story 12.3: esportata (era privata) - lib/auth/route-decision.ts la
// riusa per non duplicare la logica di route pubbliche.
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Story 4.6: le rotte "/api/cron/*" sono Route Handler invocati da uno
// scheduler esterno (Cloudflare Cron Trigger), non pagine - un redirect
// verso /accedi non ha senso per un chiamante non-browser (es.
// app/api/cron/promemoria-certificati, che non ha mai una sessione Supabase
// Auth) e romperebbe l'endpoint (risposta 307 invece di JSON, scoperto in
// verifica dal vivo di questa storia). Ogni Route Handler sotto "/api/cron/"
// applica la propria autorizzazione internamente (qui: il segreto
// CRON_SECRET) - il Proxy non deve applicarvi la logica di sessione/Ruolo
// pensata per le pagine.
// Review fix: limitato a "/api/cron/" (non l'intero "/api/") - un'esenzione
// piu' ampia farebbe passare senza sessione anche un futuro Route Handler
// pensato per essere autenticato via Supabase Auth (es. una API JSON per il
// frontend), che dimenticasse di reimplementare da solo il controllo di
// Ruolo. Solo le rotte Cron, machine-to-machine per natura, hanno bisogno di
// questa esenzione.
// Story 12.3: esportata (era privata), stesso motivo di isPublicRoute sopra.
export function isRouteHandlerCron(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}

// /api/health (2026-07-25): endpoint di diagnostica (DB/Supabase Auth
// raggiungibili) usato per verificare la produzione senza passare dal
// login - deve restare raggiungibile anche quando l'autenticazione stessa
// e' rotta, altrimenti non serve al suo scopo. Nessun dato sensibile
// esposto (solo stato/latenza, vedi app/api/health/route.ts), stesso
// principio di isRouteHandlerCron sopra.
// Story 12.3: esportata (era privata), stesso motivo di isPublicRoute sopra.
export function isRouteHandlerHealth(pathname: string): boolean {
  return pathname === "/api/health";
}

// Story 12.3: esportata (era privata), stesso motivo di isPublicRoute sopra.
export function matchProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  );
}

// Story 19.9 (Epic 19, Ruolo Site Manager): unica fonte di verita' per "cosa
// e' una rotta riservata del sito" - usata sia dalla validazione delle voci
// di menu pubblico (Story 19.7, app/app/(configurazione)/menu-pubblico/
// actions.ts) sia dalla futura creazione/modifica di una PaginaPubblica
// (Story 19.10). Mai una seconda lista mantenuta a mano: riusa PUBLIC_ROUTES
// (via isPublicRoute, gia' esportata sopra) per le 5 pagine pubbliche
// esistenti e le rotte di autenticazione, e aggiunge solo i due prefissi
// interni che PUBLIC_ROUTES non copre (per costruzione: sono l'opposto,
// PROTECTED_ROUTES vive sotto "/app", "/api" non e' nemmeno una pagina).
// Nessuna dipendenza da Prisma/"server-only" qui (questo file resta
// importabile anche da un bundle client, Story 12.3) - restano invariate le
// stesse garanzie gia' documentate in testa al file.
// Code review (Edge Case Hunter): confronto case-insensitive - un valore
// come "/App" o "/Squadre" non veniva riconosciuto come riservato dai
// confronti esatti sotto (stringhe letterali minuscole), permettendo di
// creare una voce di menu/PaginaPubblica il cui slug "sembra" quello di una
// rotta reale solo a meno delle maiuscole. isPublicRoute() stessa NON viene
// toccata (resta case-sensitive per ogni altro chiamante, incluso il
// routing live del Proxy su un pathname di richiesta reale) - solo il
// confronto qui dentro, dedicato alla validazione "questo slug/url e'
// riservato?", lavora su una copia minuscola.
export function rottaRiservata(pathname: string): boolean {
  const valore = pathname.toLowerCase();
  if (valore === "/app" || valore.startsWith("/app/")) return true;
  // Code review (Edge Case Hunter): "/api" esatto (senza slash finale) non
  // veniva riconosciuto - solo "/api/*" lo era - stesso trattamento
  // esatto+prefisso gia' applicato ad "/app" sopra, per coerenza.
  if (valore === "/api" || valore.startsWith("/api/")) return true;
  return isPublicRoute(valore);
}
