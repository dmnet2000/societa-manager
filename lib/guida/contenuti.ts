import type { Ruolo } from "@prisma/client";

export type ContenutoGuida = {
  rotta: string;
  titolo: string;
  ruoliAmmessi: Ruolo[];
  corpo: string[];
};

// Story 17.1 (Epic 17, Guida in-app e help contestuale): contenuto scritto
// in codice (no Markdown/CMS, decisione di analisi - nessuna nuova
// dipendenza, coerente con NFR6). "rotta" usa lo stesso valore di "prefix"
// in PROTECTED_ROUTES (lib/auth/route-guard.ts) - chiave di collegamento
// tra una pagina reale e il suo contenuto guida, non una mappa duplicata.
// "ruoliAmmessi" mirror di PROTECTED_ROUTES per la stessa rotta - se la
// rotta cambia i Ruoli ammessi, va aggiornato anche qui (nessuna singola
// fonte di verita' automatica, verificato non esserci un modo semplice di
// derivarlo senza importare route-guard.ts e complicare l'accoppiamento).
//
// Pilota su due rotte reali per validare entrambi gli scoping:
// - "/app/sponsor": tutti i Ruoli (Story 16.2; Story 19.3 aggiunge SITE_MANAGER, settimo Ruolo).
// - "/app/palestre": solo ADMIN/DIRIGENTE (Story 2.1).
export const CONTENUTI_GUIDA: ContenutoGuida[] = [
  {
    rotta: "/app/sponsor",
    titolo: "Sponsor",
    // Story 19.3 (Epic 19, Ruolo Site Manager): SITE_MANAGER aggiunto -
    // mirror di ruoliAmmessi per /app/sponsor in route-guard.ts.
    ruoliAmmessi: [
      "ALLENATORE",
      "ATLETA",
      "GENITORE",
      "SEGRETERIA",
      "DIRIGENTE",
      "ADMIN",
      "SITE_MANAGER",
    ],
    corpo: [
      "In questa sezione trovi i Banner pubblicitari e le Convenzioni attive della società, con immagine e descrizione.",
      "Per le Convenzioni puoi generare un voucher con il tuo Nome e Cognome, che certifica che fai parte della società e hai diritto alla scontistica indicata - il voucher viene mostrato a schermo, non salvato.",
      "Se sei Admin, Dirigente o Site manager, in fondo alla pagina trovi anche il pannello di gestione per creare, modificare, attivare o disattivare gli Sponsor.",
    ],
  },
  {
    rotta: "/app/palestre",
    titolo: "Palestre",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Qui gestisci l'elenco delle Palestre della società e i Campi al loro interno.",
      "Puoi creare una nuova Palestra (nome, indirizzo, posizione da un link Google Maps) e aggiungere Campi a una Palestra esistente.",
      "Palestre e Campi creati qui sono poi selezionabili quando si crea uno Slot (orario) in /app/orari.",
    ],
  },
  // Story 17.2: estensione a tutte le rotte rimanenti, gruppo per gruppo
  // seguendo lo stesso ordine di lib/auth/route-guard.ts (Atleti).
  {
    rotta: "/app/import-atlete",
    titolo: "Import atlete",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Da qui importi l'archivio delle Atlete a partire da un file Excel esportato dal portale federale.",
      "L'import crea le Atlete non ancora presenti, aggiorna quelle già esistenti e riporta automaticamente le Under 13 alla stagione corrente.",
      "Al termine vedi un riepilogo con quante righe sono state create, aggiornate o scartate (con il motivo dello scarto per ciascuna).",
    ],
  },
  {
    rotta: "/app/conferma-iscrizioni",
    titolo: "Conferma iscrizioni",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    corpo: [
      "Qui vedi lo stato di iscrizione di ogni Atleta per la stagione corrente.",
      "Solo la Segreteria può confermare o escludere un'iscrizione - Admin e Dirigente vedono l'elenco in sola lettura.",
      "Un'Atleta senza iscrizione confermata non compare come iscritta nelle altre sezioni dell'app (es. Conferma tesseramenti).",
    ],
  },
  {
    rotta: "/app/conferma-certificati",
    titolo: "Conferma certificati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    corpo: [
      "Qui confermi i Certificati Medici caricati dalle famiglie o dalle Atlete, inserendo le date di validità.",
      "La sezione \"Da confermare\" mostra chi ha un Certificato in attesa (o nessun Certificato caricato); \"Confermati\" mostra chi è già a posto, con lo stato di scadenza in evidenza.",
      "Admin e Dirigente possono anche modificare un Certificato già confermato, se serve correggere una data.",
    ],
  },
  {
    rotta: "/app/conferma-tesseramenti",
    titolo: "Conferma tesseramenti",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Qui confermi il Tesseramento federale delle Atlete per la stagione corrente - solo Admin e Dirigente, la Segreteria non ha accesso a questa pagina.",
      "Seleziona una o più Atlete con la casella e conferma in blocco con un solo click, invece di una conferma alla volta.",
      "Il Tesseramento è indipendente dall'Iscrizione: puoi confermare il Tesseramento anche di un'Atleta non ancora iscritta.",
    ],
  },
  // Orari/Palestre.
  {
    rotta: "/app/orari",
    titolo: "Orari (vista per Palestra/Gruppo)",
    ruoliAmmessi: ["SEGRETERIA"],
    corpo: [
      "Qui vedi tutti gli Slot (giorno, orario, campo, gruppo) della stagione corrente, filtrabili per Palestra o per Gruppo.",
      "Questa vista è pensata per la Segreteria: sola lettura, nessuna creazione o modifica di Slot da qui.",
    ],
  },
  {
    rotta: "/app/slot",
    titolo: "Orari (gestione Slot)",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Qui crei e modifichi gli Slot settimanali: giorno, orario, Campo e Gruppo a cui è assegnato.",
      "Uno Slot creato qui resta fisso per l'intera stagione (Anno Agonistico) - per cambiarlo in corso di stagione, modificalo direttamente dalla riga corrispondente.",
      "Gli Slot creati qui sono quelli che compaiono poi in \"Il mio orario\" per Allenatori e Atlete, e nella vista Segreteria (/app/orari).",
    ],
  },
  // Gruppi/Allenatori.
  {
    rotta: "/app/gruppi",
    titolo: "Gruppi",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Qui crei i Gruppi della stagione e assegni le Atlete a ciascuno di essi.",
      "Puoi correggere nome e categoria di un Gruppo già creato con \"Modifica\", accanto alla categoria di ogni riga - non serve cancellare e ricreare il Gruppo per sistemare un errore di inserimento.",
      "Ogni riga mostra anche gli Allenatori assegnati e lo stato di Iscrizione/Tesseramento/Certificato Medico delle Atlete del Gruppo, con un badge se un Certificato è in scadenza.",
      "Per ogni Atleta puoi impostare un Numero di maglia (facoltativo, specifico di questa stagione) - due Atlete dello stesso Gruppo possono avere lo stesso Numero, nessun controllo lo impedisce.",
      "I Gruppi creati qui sono poi selezionabili quando si crea uno Slot (orario) in /app/slot.",
    ],
  },
  {
    // Story 19.4 (review fix, inline - sub-agent di review non disponibili
    // per limite di spesa mensile): mancava, unica pagina toccata dall'Epic
    // 19 senza voce guida - contenutoPerRotta torna null in modo sicuro
    // (nessun placeholder rotto), ma resta un gap di completezza contro la
    // convenzione del progetto.
    rotta: "/app/foto-squadre",
    titolo: "Foto squadre",
    ruoliAmmessi: ["SITE_MANAGER"],
    corpo: [
      "Qui carichi o sostituisci la foto di squadra di ogni Gruppo della stagione corrente, mostrata sul sito pubblico.",
      "Questa vista mostra solo il controllo foto - per creare Gruppi o assegnare Allenatori/Atlete serve il Ruolo Admin o Dirigente su /app/gruppi.",
    ],
  },
  {
    // Story 19.7 (Epic 19, Ruolo Site Manager): a differenza delle altre
    // rotte di "Gestione sito" sopra, qui DIRIGENTE non e' ammesso - mirror
    // di ruoliAmmessi per /app/menu-pubblico in route-guard.ts.
    rotta: "/app/menu-pubblico",
    titolo: "Menu pubblico",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    corpo: [
      "Qui gestisci le voci del menu di navigazione del sito pubblico: etichetta, URL (una pagina del sito come \"/squadre\", oppure un link esterno completo di http:// o https://), ordine e visibilità.",
      "Puoi aggiungere una nuova voce, modificarne una esistente, spostarla su o giù nell'ordine, oppure nasconderla senza cancellarla.",
      "Le modifiche sono visibili sul menu del sito pubblico non appena le salvi - deve restare sempre almeno una voce visibile, un tentativo di nascondere l'ultima rimasta viene rifiutato.",
    ],
  },
  {
    // Story 19.15 (Epic 19, Ruolo Site Manager): riordino dei Gruppi (squadre
    // interne) per la pagina pubblica /squadre - stesso perimetro Ruoli di
    // /app/menu-pubblico sopra, DIRIGENTE non ammesso - mirror di
    // ruoliAmmessi per /app/ordine-squadre in route-guard.ts.
    rotta: "/app/ordine-squadre",
    titolo: "Ordine squadre",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    corpo: [
      "Qui scegli l'ordine con cui le squadre della stagione corrente compaiono sulla pagina pubblica \"/squadre\".",
      "Ogni squadra ha due bottoni Su/Giù: spostala per cambiarne la posizione, il salvataggio è immediato.",
      "Questa vista non permette di creare squadre né di assegnare Allenatori/Atlete - per quello serve il Ruolo Admin o Dirigente su /app/gruppi.",
    ],
  },
  {
    // Story 19.10 (Epic 19, Ruolo Site Manager): editor di creazione/modifica
    // delle Pagine introdotte dalla Story 19.9 - mirror di ruoliAmmessi per
    // /app/pagine-pubbliche in route-guard.ts. Story 19.14: editor a blocchi
    // riordinabili (drag-and-drop + scorciatoia da tastiera) e 3 nuovi tipi
    // di blocco (Video, Pulsante, Colonne) - aggiornato qui in parallelo
    // all'implementazione, per convenzione del progetto (ogni story che
    // tocca una funzionalità già documentata aggiorna anche la guida).
    rotta: "/app/pagine-pubbliche",
    titolo: "Pagine pubbliche",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    corpo: [
      "Qui crei e modifichi le Pagine di contenuto del sito pubblico: titolo, URL (deve iniziare con \"/\" e non può coincidere con una rotta riservata del sito) e testo formattato con l'editor.",
      "L'editor permette titoli, grassetto/corsivo, elenchi e link, oltre a caricare immagini direttamente nel testo (PNG o JPG, max 2MB) - niente tabelle o codice HTML incollato.",
      "Puoi comporre la pagina come una sequenza di blocchi: oltre a testo e immagine, puoi aggiungere un blocco Video (incollando il link di un video YouTube o Vimeo, non un codice di incorporamento), un blocco Pulsante (testo + link, per un invito all'azione) e un blocco Colonne (due colonne affiancate, ciascuna con solo testo o immagine). Usa il pulsante \"+\" in fondo all'ultimo blocco per aggiungerne uno nuovo.",
      "Puoi riordinare i blocchi trascinandoli dalla maniglia a sinistra, oppure selezionando un blocco e usando Alt+Maiusc+Freccia su/giù, se non usi il mouse o il touch. Il riordino vale solo tra i blocchi principali della pagina: il testo o l'immagine dentro una singola colonna del blocco Colonne non si può riordinare rispetto all'altro contenuto della stessa colonna.",
      "Puoi allineare (sinistra/centro/destra/giustifica) i paragrafi e i titoli, e allineare o ridimensionare le immagini trascinando una delle maniglie che compaiono quando le selezioni. Titolo e testo della Pagina pubblica appaiono sempre centrati nella pagina; su schermi stretti le due colonne del blocco Colonne si dispongono una sotto l'altra.",
      "Una Pagina salvata è subito visibile pubblicamente all'URL scelto: non esiste uno stato \"bozza\". Eliminarla fa tornare l'URL a mostrare una pagina non trovata, ma non rimuove dal sito le immagini già caricate al suo interno.",
      "Per collegare una Pagina al menu del sito, aggiungi una voce corrispondente in /app/menu-pubblico.",
    ],
  },
  {
    // Story 19.12 (Epic 19, Ruolo Site Manager): descrizione e ruoli
    // aggiuntivi dello Staff - a differenza delle altre 4 rotte di "Gestione
    // sito" sopra, qui DIRIGENTE e' ammesso fin da subito insieme ad ADMIN e
    // SITE_MANAGER (decisione esplicita 2026-08-20, nessun permesso
    // preesistente da NON toccare) - mirror di ruoliAmmessi per
    // /app/staff-descrizioni in route-guard.ts.
    rotta: "/app/staff-descrizioni",
    titolo: "Staff",
    ruoliAmmessi: ["SITE_MANAGER", "ADMIN", "DIRIGENTE"],
    corpo: [
      "Qui imposti la descrizione personale e i ruoli aggiuntivi (es. \"Team Manager\", \"Preparatore Atletico\") di ogni Allenatore assegnato a un Gruppo nella stagione corrente, mostrati sulla pagina pubblica \"/staff\".",
      "I ruoli aggiuntivi sono etichette libere (max 40 caratteri ciascuna): aggiungine quante ne servono con \"Aggiungi\", oppure rimuovine una alla volta prima di salvare. Un solo salvataggio aggiorna insieme descrizione e intero elenco di ruoli.",
      "Questa vista mostra solo questi due campi - per creare Allenatori o assegnarli a un Gruppo serve il Ruolo Admin o Dirigente su /app/gruppi.",
    ],
  },
  {
    rotta: "/app/i-miei-gruppi",
    titolo: "I miei Gruppi",
    ruoliAmmessi: ["ALLENATORE"],
    corpo: [
      "Qui vedi solo i Gruppi che ti sono stati assegnati come Allenatore, con il Roster di Atlete di ciascuno.",
      "Puoi aggiungere o rimuovere un'Atleta dal Gruppo direttamente da qui: l'assegnazione è sempre additiva, non toglie l'Atleta da altri Gruppi.",
      "Puoi impostare un Numero di maglia (facoltativo, specifico di questa stagione) per ogni Atleta del tuo Gruppo.",
      "Se non gestisci ancora nessun Gruppo, contatta la segreteria per farti assegnare.",
    ],
  },
  {
    rotta: "/app/mio-orario",
    titolo: "Il mio orario",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    corpo: [
      "Qui vedi il tuo orario personale: solo gli Slot dei Gruppi a cui sei collegato come Allenatore o come Atleta, raggruppati per giorno della settimana.",
      "Ogni riga mostra Palestra, Campo e orario, con un link diretto per aprire la posizione su Google Maps.",
      "Se il tuo account non è ancora collegato a nessun profilo, contatta la segreteria.",
    ],
  },
  {
    rotta: "/app/presenze",
    titolo: "Registrazione presenze",
    ruoliAmmessi: ["ALLENATORE"],
    corpo: [
      "Da qui registri le presenze delle Atlete a uno Slot in una data specifica - seleziona Slot e data, poi il Roster del Gruppo.",
      "Un'Atleta con Certificato Medico scaduto è segnalata in evidenza: puoi comunque registrarne la presenza, ma la scadenza resta visibile.",
      "Le presenze registrate qui alimentano lo Storico presenze, sia per te che per le famiglie/Atlete.",
    ],
  },
  {
    rotta: "/app/storico-presenze",
    titolo: "Storico presenze",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    corpo: [
      "Come Atleta vedi qui il tuo storico personale di presenze, con statistiche di trend.",
      "Come Allenatore vedi invece una griglia mensile per Gruppo, un'Atleta per riga e una colonna per ogni giorno del mese selezionato.",
      "Le presenze mostrate riflettono lo Slot attuale (giorno/ora/Gruppo) al momento della visualizzazione, non uno snapshot storico immutabile.",
    ],
  },
  // Certificati/Notifiche/Configurazione.
  {
    rotta: "/app/certificato-medico",
    titolo: "Certificato medico",
    ruoliAmmessi: ["GENITORE", "ATLETA"],
    corpo: [
      "Da qui carichi il Certificato Medico agonistico dell'Atleta collegata al tuo account (figlia, se sei Genitore, o te stessa).",
      "Se sei Genitore con più figlie, seleziona prima l'Atleta con il menu in alto.",
      "Lo stato mostrato (in regola, in scadenza, scaduto, in attesa di conferma) si aggiorna solo dopo che la Segreteria ha confermato il Certificato caricato.",
    ],
  },
  {
    rotta: "/app/notifiche",
    titolo: "Notifiche",
    ruoliAmmessi: ["ALLENATORE", "DIRIGENTE"],
    corpo: [
      "Qui trovi l'elenco delle notifiche: nuove Atlete inserite e nuovi Certificati Medici caricati dalle famiglie.",
      "L'elenco è di sola lettura, in ordine cronologico - non c'è un'azione da compiere da questa pagina.",
    ],
  },
  {
    rotta: "/app/impostazioni",
    titolo: "Impostazioni",
    // Fix code review (Story 18.13): rotta allargata a ADMIN+DIRIGENTE in
    // route-guard.ts - mirror qui obbligatorio, il test di coerenza
    // CONTENUTI_GUIDA/PROTECTED_ROUTES lo verifica.
    // Story 19.1: SITE_MANAGER aggiunto allo stesso modo - mirror di
    // route-guard.ts, stesso motivo.
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SITE_MANAGER"],
    corpo: [
      "Questa è la pagina hub della configurazione: da qui raggiungi Configurazione SMTP e Configurazione logo.",
      "Qui imposti anche l'indirizzo email della Segreteria: senza questo indirizzo, le notifiche di nuovo Certificato Medico caricato non vengono inviate.",
      "Qui imposti anche l'URL della Pagina Facebook della società (mostra gli ultimi post sulla home pubblica, editabile anche da Site Manager) e i contatti pubblici - indirizzo, telefono ed email mostrati sulla pagina pubblica \"Contatti\": ogni campo è indipendente, un campo lasciato vuoto smette semplicemente di comparire sulla pagina pubblica. Dopo aver salvato un nuovo URL, un avviso ricorda che il Token Facebook potrebbe non corrispondere più alla nuova Pagina.",
      "Qui imposti anche il Token Facebook: serve al carosello \"Ultimi post\" della home pubblica per leggere i post reali della Pagina. Lascialo vuoto per non modificare il token già salvato. Un avviso ti segnala se manca o se l'ultima lettura dei post è fallita (es. token scaduto, da rigenerare periodicamente). A differenza dell'URL della Pagina sopra, il Token resta riservato ad Admin e Dirigente - se sei Site Manager e l'avviso ti segnala un possibile disallineamento, contatta uno di loro.",
      "Qui carichi anche la foto di sfondo dell'hero della home pubblica (PNG o JPG, max 2MB, editabile anche da Site Manager): viene mostrata solo quando non ci sono post Facebook da mostrare - se sono presenti, il carosello dei post ha sempre la priorità. Senza nessuna delle due, resta visibile il placeholder grafico.",
      "Qui carichi anche il logo della Polisportiva (PNG o JPG, max 2MB) e l'URL del suo sito: il logo compare sia nell'header sia nel footer di ogni pagina pubblica. Se anche l'URL è impostato, il logo è cliccabile e apre il sito in una nuova scheda; senza URL il logo compare comunque, ma non è cliccabile.",
    ],
  },
  {
    rotta: "/app/smtp",
    titolo: "Configurazione SMTP",
    ruoliAmmessi: ["ADMIN"],
    corpo: [
      "Qui configuri il server SMTP usato dall'app per inviare email (es. le notifiche alla Segreteria).",
      "Dopo aver salvato una configurazione, puoi inviare un'email di prova per verificare che i parametri siano corretti prima di affidarti all'invio automatico.",
    ],
  },
  {
    rotta: "/app/logo",
    titolo: "Configurazione logo",
    ruoliAmmessi: ["ADMIN", "SITE_MANAGER"],
    corpo: [
      "Qui carichi il logo della società, mostrato nell'intestazione dell'app, e imposti il nome del settore sportivo (es. \"Volley\", \"Basket\") mostrato accanto ad esso.",
      "Un nuovo logo caricato sostituisce quello attuale per tutti gli utenti - non è possibile avere più logo attivi contemporaneamente.",
      "Il logo caricato qui diventa anche l'icona (favicon) mostrata nella scheda del browser, e il nome del settore diventa il titolo della scheda: se non carichi un logo, la scheda mostra un'icona generica al suo posto.",
      "Il nome del settore diventa anche il nome dell'app mostrato sotto l'icona quando qualcuno installa l'app sulla schermata Home del telefono (PWA) - se supera 12 caratteri viene abbreviato in quel punto.",
    ],
  },
  // Amministrazione/Profilo.
  {
    rotta: "/app/vista-dirigente",
    titolo: "Vista d'insieme (Dirigente)",
    ruoliAmmessi: ["DIRIGENTE"],
    corpo: [
      "Qui hai una panoramica di tutti i Gruppi della stagione: orari, numero di Atlete e stato dei Certificati Medici (in regola, in scadenza, scaduto, senza Certificato).",
      "Se il tuo accesso ai Certificati è stato limitato ad alcuni Gruppi (permessi configurati da un Admin), i Gruppi esclusi mostrano solo gli orari, senza dati sui Certificati.",
    ],
  },
  {
    rotta: "/app/vista-allenatore",
    titolo: "Vista d'insieme (Allenatore)",
    ruoliAmmessi: ["ALLENATORE"],
    corpo: [
      "Come la Vista d'insieme del Dirigente, ma scoped ai soli Gruppi che alleni: orari, numero di Atlete e stato dei Certificati Medici.",
      "Se non gestisci ancora nessun Gruppo, contatta la segreteria per farti assegnare.",
    ],
  },
  {
    rotta: "/app/dati-fisici",
    titolo: "Dati fisici",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    corpo: [
      "Qui registri e consulti le misurazioni fisiche (peso, altezza, test atletici) di un'Atleta, con un grafico dell'andamento nel tempo.",
      "Come Atleta vedi solo le tue misurazioni; come Allenatore selezioni prima l'Atleta tra quelle dei tuoi Gruppi.",
      "Per i parametri con più tentativi nello stesso giorno (es. test di elevazione), il grafico mostra solo il valore migliore per data.",
    ],
  },
  {
    rotta: "/app/wizard-nuova-stagione",
    titolo: "Wizard nuova stagione",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Questo wizard copia i Gruppi (con i relativi Allenatori assegnati) dalla stagione precedente a quella corrente, per non doverli ricreare da zero a ogni cambio stagione.",
      "Funziona solo per il primo utilizzo di una nuova stagione: se la stagione corrente ha già dei Gruppi, il wizard si ferma - usa la pagina Gruppi per correggere o aggiungere.",
      "Slot, Iscrizioni, Tesseramenti e Certificati non vengono copiati: solo i Gruppi e l'assegnazione degli Allenatori.",
    ],
  },
  {
    rotta: "/app/il-mio-profilo",
    titolo: "Il mio profilo",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    corpo: [
      "Qui carichi la tua foto profilo, visibile nelle sezioni dell'app che mostrano il tuo Gruppo o la tua identità (es. le card dei Gruppi).",
      "Se hai sia un profilo Allenatore che uno Atleta collegati allo stesso account, gestisci qui entrambe le foto separatamente.",
    ],
  },
  // Partite/Campionati/Amministrazione.
  {
    rotta: "/app/campionati",
    titolo: "Campionati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE"],
    corpo: [
      "Qui colleghi ogni Gruppo ai Campionati a cui partecipa, con un link al calendario FIPAV per l'import automatico delle partite.",
      "Un Allenatore vede e gestisce solo i Campionati dei propri Gruppi; Admin e Dirigente vedono tutti i Gruppi della stagione.",
      "Le partite importate da qui compaiono poi nella pagina Partite.",
    ],
  },
  {
    rotta: "/app/partite",
    titolo: "Partite",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE", "ATLETA", "GENITORE"],
    corpo: [
      "Qui vedi il calendario delle partite, raggruppate per settimana, con giorno, ora, luogo e link per navigare all'impianto.",
      "Admin, Dirigente e Allenatore possono modificare i dati di una partita; Atleta e Genitore vedono l'elenco in sola lettura, scoped alle proprie Atlete/Gruppi.",
      "Un Genitore con più figlie deve selezionare l'Atleta per vedere le sue partite, come nelle altre pagine con più profili collegati.",
    ],
  },
  {
    rotta: "/app/admin",
    titolo: "Amministrazione",
    ruoliAmmessi: ["ADMIN"],
    corpo: [
      "Qui gestisci gli account utente della società: crei nuovi utenti, assegni o togli Ruoli, attivi o disattivi un account.",
      "Un utente disattivato non può più accedere all'app, ma i suoi dati storici (es. presenze registrate) restano invariati.",
      "Se un Utente ha sbagliato a digitare l'email in fase di registrazione e non ha mai confermato l'account, compare qui il campo \"Correggi email\": corregge l'indirizzo e reinvia subito un nuovo link di conferma. Disponibile solo finché l'Utente non ha mai confermato l'account.",
      "\"Correggi email\" rifiuta sempre un bersaglio con Ruolo Admin (usa un altro account per correggere quello), e rifiuta anche se il nuovo indirizzo è già in uso da un altro Utente.",
      "Dalla Story 9.41, chi si auto-registra con Ruolo Segreteria e/o Dirigente non finisce più qui in attesa di attivazione: la registrazione viene rifiutata subito se l'email non è stata precaricata prima da /app/precaricamento-ruoli. Solo Admin e Site Manager restano soggetti all'attivazione manuale da questa pagina.",
    ],
  },
  {
    rotta: "/app/precaricamento-ruoli",
    titolo: "Precaricamento Segreteria/Dirigente",
    ruoliAmmessi: ["ADMIN"],
    corpo: [
      "Qui precarichi un'email con Ruolo Segreteria e/o Dirigente prima che la persona si registri: solo un'email precaricata per un Ruolo può completare la registrazione con quel Ruolo.",
      "A differenza degli altri Ruoli, Segreteria e Dirigente non passano dal gate di conferma Admin: appena la registrazione supera il controllo di precaricamento, l'account parte già attivo, senza bisogno di attivarlo da /app/admin.",
      "Una voce (email) con almeno un Ruolo già agganciato a un account registrato non è più modificabile né cancellabile: per correggere un'email sbagliata, cancellala (se non ancora agganciata) e ricreala.",
    ],
  },
  {
    rotta: "/app/precaricamento-allenatori",
    titolo: "Precaricamento Allenatori",
    ruoliAmmessi: ["ADMIN"],
    corpo: [
      "Qui precarichi l'anagrafica degli Allenatori (nome, cognome, codice fiscale) prima che si registrino, così puoi già assegnarli a un Gruppo.",
      "Quando un Allenatore precaricato completa la registrazione con lo stesso codice fiscale, il suo account si collega automaticamente al profilo già creato qui.",
    ],
  },
  {
    rotta: "/app/permessi-accesso",
    titolo: "Permessi di accesso",
    ruoliAmmessi: ["ADMIN"],
    corpo: [
      "Qui decidi quali Ruoli possono accedere a ciascuna pagina configurabile dell'app, oltre ai permessi di base già previsti.",
      "Le pagine riservate ad ADMIN (come questa stessa) non compaiono in questa matrice: non sono configurabili, per evitare di aprire per errore un accesso amministrativo ad altri Ruoli.",
    ],
  },
  {
    rotta: "/app/permessi-certificati",
    titolo: "Permessi certificati",
    ruoliAmmessi: ["ADMIN"],
    corpo: [
      "Qui limiti quali Gruppi un Dirigente può vedere nella sezione Certificati Medici della Vista d'insieme.",
      "Se non selezioni nessun Gruppo, non si applica nessuna restrizione: ogni Dirigente vede i Certificati di tutti i Gruppi, come impostazione di default.",
    ],
  },
  {
    // Story 20.1 (Epic 20, Torneo Memorial): Edizione (anno) e Categorie
    // (nome, settimana, numero massimo squadre). Story 20.2: apri una
    // Categoria per iscrivere le sue Squadre e ripartirle sui due gironi.
    // Story 20.3: dentro una Categoria, "Risultati e classifica" genera il
    // calendario di girone e permette di inserire i punteggi. Story 20.4:
    // dalla stessa Categoria, "Tabellone semifinali/finali" genera le
    // semifinali di posizionamento (1°-4° e 5°-8°) dalla classifica di
    // girone completa; le finali si generano da sole non appena entrambe le
    // semifinali dello stesso tabellone hanno un risultato, e la classifica
    // finale 1°-8° appare una volta completi tutti gli incontri. Story 20.5:
    // dentro un'Edizione, "Volantino" carica l'immagine/manifesto (PNG/JPEG,
    // max 2MB). Story 20.6: tutto quanto sopra (volantino, squadre,
    // classifica di girone, incontri, tabellone) dell'Edizione più recente è
    // visibile in sola lettura sulla pagina pubblica /torneo. Story 20.9:
    // dentro un'Edizione, "Slot orari/Palestre" pianifica dove/quando si
    // gioca ogni incontro (data, ora, Palestra) - assegnati a mano per il
    // girone, in automatico (se ce n'è uno libero) per semifinali/finali
    // appena vengono generate; lo Slot assegnato compare anche sulla pagina
    // pubblica con il link "Naviga". Story 20.11: ogni incontro generato
    // (girone, semifinale, finale) riceve anche un numero di gara
    // progressivo ("Gara N"), calcolato automaticamente, un'unica sequenza
    // che attraversa l'intera Edizione senza mai ripartire tra fasi diverse.
    // Story 20.13: dentro un'Edizione, "Nomi delle Settimane" imposta un
    // nome personalizzato al posto dell'etichetta generica "Settimana 1"/
    // "Settimana 2", ovunque venga mostrata (admin e pagina pubblica).
    rotta: "/app/torneo",
    titolo: "Torneo",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Qui gestisci le Edizioni del Torneo (nome e anno, entrambi obbligatori - due Edizioni possono condividere lo stesso nome, l'anno resta l'unico identificativo univoco) e, dentro ciascuna, le sue Categorie (nome, settimana 1 o 2, numero massimo di squadre da 2 a 8).",
      "Apri un'Edizione dall'elenco per vedere/gestire le sue Categorie. Un'Edizione non è eliminabile finché ha Categorie collegate: elimina prima quelle.",
      "Dentro un'Edizione, in \"Volantino\" carichi l'immagine di sfondo/manifesto del Torneo (PNG o JPEG, fino a 2MB): caricarne una nuova sostituisce sempre quella precedente. Il volantino, le squadre iscritte, la classifica di girone, gli incontri e il tabellone dell'edizione più recente sono visibili a tutti sulla pagina pubblica /torneo, senza bisogno di accedere.",
      "Dentro un'Edizione, in \"Nomi delle Settimane\" puoi dare un nome proprio (es. \"Under 14/16\", fino a 100 caratteri) a Settimana 1 e/o Settimana 2: dove impostato, quel nome sostituisce l'etichetta generica ovunque la Settimana è mostrata (elenco Categorie, dettaglio Categoria, pagina pubblica /torneo). Un campo lasciato vuoto non blocca nulla: resta l'etichetta generica \"Settimana 1\"/\"Settimana 2\".",
      "Apri una Categoria dall'elenco per iscrivere le squadre partecipanti (nome, referente e contatto opzionali) e ripartirle sui due gironi A e B, fino al numero massimo impostato per quella Categoria. Anche una Categoria con squadre iscritte non è eliminabile: elimina prima quelle.",
      "Dentro una Categoria, apri \"Risultati e classifica\" per generare il calendario degli incontri di girone (tutti contro tutti dentro ciascun girone, generabile una sola volta e solo con almeno 2 squadre per girone) e inserire il punteggio set per set di ogni incontro (al meglio dei 3 set). Il sistema calcola da solo l'esito e i punti dell'incontro, e la classifica di ciascun girone si aggiorna subito ogni volta che modifichi un risultato. La classifica mostra anche il totale dei punti realizzati/subiti nei set (\"Punti fatti\"/\"Punti subiti\", distinti dalla colonna \"Punti\" del punteggio 3/2/1/0) ed è ordinata per punti-classifica, poi per quoziente set (set vinti/set persi), poi per quoziente punti (punti fatti/punti subiti) a ulteriore parità, infine per nome.",
      "Da \"Tabellone semifinali/finali\" genera il tabellone di posizionamento (una sola volta, quando entrambi i gironi hanno almeno 4 squadre e una classifica completa): crea le semifinali 1°A-2°B/1°B-2°A per il tabellone 1°-4° e 3°A-4°B/3°B-4°A per il 5°-8°. Non serve generare le finali a mano: appena hai inserito il risultato di entrambe le semifinali di uno stesso tabellone, il sistema crea da solo la finale vincenti e quella perdenti. La classifica finale 1°-8° compare in fondo alla pagina non appena tutti gli incontri del tabellone hanno un risultato.",
      "Se hai generato un calendario/tabellone per errore (es. una Categoria di prova), su \"Risultati e classifica\" trovi \"Cancella tutte le partite\": rimuove in un colpo solo tutte le partite di quella Categoria - insieme a ogni risultato e classifica già calcolati, non solo il calendario. Le Squadre non vengono toccate; una volta cancellate le partite puoi rigenerare il calendario da capo oppure, se non ti serve più, cancellare le Squadre e infine la Categoria stessa.",
      "Dentro un'Edizione, in \"Slot orari/Palestre\" crei gli orari di gioco disponibili (etichetta libera, data, ora, Palestra, e la fase a cui sono riservati - girone, semifinale, finale vincenti o finale perdenti, con il tabellone 1°-4° o 5°-8° per queste ultime tre). Per la fase a gironi non scegli una singola Palestra: vedi invece una checklist con una riga per ciascun Campo di ciascuna Palestra già censita nel gestionale (o una riga \"sola Palestra\" per quelle senza Campi), tutte preselezionate - deseleziona quelle che non ti servono prima di creare gli Slot, utile quando più gare si giocano in contemporanea su Campi diversi della stessa Palestra o su Palestre diverse. Per semifinali e finali scegli invece la Palestra specifica, come sempre (senza Campo). Ovunque uno Slot ha un Campo assegnato, il suo nome compare accanto al nome della Palestra. Uno Slot già assegnato a un incontro non è cancellabile: rimuovi prima l'assegnazione.",
      "Sulla pagina \"Risultati e classifica\" (girone) e \"Tabellone semifinali/finali\", ogni incontro ha un menu per assegnargli uno degli Slot compatibili con la sua fase, oppure per togliere l'assegnazione esistente. Se scegli uno Slot già assegnato a un altro incontro, l'app te lo segnala e ti chiede conferma prima di sovrascriverlo - non c'è alcun blocco, solo un avviso.",
      "Quando generi il tabellone semifinali/finali o quando si generano da sole le finali, il sistema assegna in automatico uno Slot libero della fase giusta a ogni nuovo incontro, se ce n'è uno disponibile: nessun errore né blocco se non ce ne sono, l'incontro resta semplicemente senza Slot finché non ne assegni uno a mano.",
      "Ogni incontro generato (di girone, semifinale o finale) mostra anche il proprio numero di gara (\"Gara N\"): una sequenza unica che attraversa l'intera Edizione, non ricomincia mai per Categoria né per fase, ed è sempre calcolata automaticamente - non è mai un campo che puoi modificare a mano.",
    ],
  },
];

// AC #1: indice /guida filtrato per Ruolo - un Utente vede solo le voci
// per cui ha almeno uno dei ruoliAmmessi (stesso principio "basta averne
// uno tra quelli richiesti" di requireRuolo/filtraVociNavigazione).
export function contenutiPerRuoli(ruoli: Ruolo[]): ContenutoGuida[] {
  return CONTENUTI_GUIDA.filter((c) => c.ruoliAmmessi.some((r) => ruoli.includes(r)));
}

// AC #3/#4: usata dall'aiuto contestuale in una pagina specifica - null se
// la rotta non ha un contenuto guida, o se l'Utente non ha un Ruolo
// ammesso per quella voce (stesso Utente non dovrebbe vedere un'icona "?"
// per una pagina che non può comunque raggiungere).
export function contenutoPerRotta(rotta: string, ruoli: Ruolo[]): ContenutoGuida | null {
  const contenuto = CONTENUTI_GUIDA.find((c) => c.rotta === rotta);
  if (!contenuto) return null;
  if (!contenuto.ruoliAmmessi.some((r) => ruoli.includes(r))) return null;
  return contenuto;
}
