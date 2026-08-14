# Configurare il carosello Facebook

Guida per un Admin o Dirigente: come ottenere il **Token di accesso** della Pagina Facebook della società e configurarlo su `/app/impostazioni`, così che la home pubblica del sito (`/`) mostri gli ultimi post reali della Pagina in un carosello automatico (sezione "Ultimi post" — Story 18.13, sostituisce il vecchio widget incorporato di Facebook).

Stato aggiornato al 2026-08-14.

## Cosa serve prima di iniziare

- Essere **amministratore della Pagina Facebook** della società (o farsi dare accesso da chi lo è — serve un ruolo di amministrazione sulla Pagina per generare il token, non basta esserne "follower").
- L'**URL della Pagina Facebook** già impostato su `/app/impostazioni` (campo "Pagina Facebook", introdotto dalla Story 18.5) — es. `https://www.facebook.com/miasocieta`. Il carosello lo riusa per capire quale Pagina interrogare: **non serve inserirlo una seconda volta**.
- Un browser e l'account Facebook personale con cui si amministra la Pagina.

## Nessun costo

Le API Graph di Facebook sono **gratuite** per questo uso. Il tempo richiesto è quello di configurazione iniziale (10-15 minuti) più la rigenerazione periodica del token (vedi [Scadenza e rinnovo del token](#scadenza)).

## Passo 1 — Creare un account Facebook Developer

1. Vai su https://developers.facebook.com/ e accedi con lo stesso account Facebook con cui amministri la Pagina della società.
2. Se è la prima volta, ti verrà chiesto di registrarti come sviluppatore (accetta i termini, verifica l'account se richiesto — di solito via SMS).

## Passo 2 — Creare una App

1. Nel pannello **Meta for Developers**, clicca **Le mie app** → **Crea app**.
2. Scegli il tipo di app **"Business"** (o "Nessuno" nelle versioni più recenti del pannello che non chiedono un caso d'uso specifico — l'obiettivo è solo generare un token, non serve un caso d'uso avanzato).
3. Dai un nome all'app (es. "Sito Mogliano Volley" o simile — è un nome interno, visibile solo a chi amministra l'app, non appare sul sito).
4. Completa la creazione. Non è necessario aggiungere alcun "prodotto" specifico (Facebook Login, ecc.) per questo utilizzo — basta l'app di base.

**Nota importante sulla revisione dell'app ("App Review")**: Meta richiede una revisione formale per usare certi permessi su Pagine che l'app **non amministra**. Se la persona che crea l'app è la stessa che amministra la Pagina (il caso più comune per una piccola società), l'app può restare in modalità **Development** e funzionare comunque, senza dover passare la revisione — è il percorso di questa guida. Se in futuro Meta dovesse richiedere comunque la revisione, il pannello lo segnala esplicitamente al momento di generare il token.

## Passo 3 — Generare un token con i permessi corretti (Graph API Explorer)

1. Vai su https://developers.facebook.com/tools/explorer/.
2. In alto a destra, seleziona la App creata al Passo 2 (menu a tendina "Meta App").
3. Nel menu **"User or Page"**, lascia **"User Token"** per ora (lo scambieremo con un token di Pagina al Passo 5).
4. Clicca **"Add a Permission"** (o l'icona con il "+" accanto a Permissions) e aggiungi:
   - `pages_show_list`
   - `pages_read_engagement`
5. Clicca **"Generate Access Token"**. Facebook aprirà una finestra di autorizzazione: conferma con l'account che amministra la Pagina, concedendo i permessi richiesti.
6. Copia il token generato (è una stringa lunga che inizia tipicamente con `EAA...`) — è uno **User Access Token di breve durata** (~1-2 ore), serve solo per i prossimi passi, non va inserito nell'app.

## Passo 4 — Trasformarlo in un token di lunga durata (long-lived)

Uno User Access Token appena generato dura poche ore. Va scambiato con uno **long-lived** (~60 giorni) prima di ricavarne il Page Access Token, altrimenti anche quest'ultimo scadrebbe troppo in fretta.

1. Vai su https://developers.facebook.com/tools/debug/accesstoken/, incolla il token del Passo 3 e clicca **Debug** — verifica che i permessi `pages_show_list`/`pages_read_engagement` compaiano nella sezione "Scopes".
2. Per lo scambio vero e proprio, serve **App ID** e **App Secret** della App creata al Passo 2 (si trovano in **Impostazioni** → **Di base** nel pannello della App — l'App Secret è nascosto dietro un pulsante "Mostra", potrebbe richiedere la password del tuo account).
3. Apri questo URL nel browser (sostituendo i tre valori tra `{ }`, senza le parentesi graffe):

   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={TOKEN_DEL_PASSO_3}
   ```

4. La risposta è un JSON con un campo `access_token` — è il tuo **User Access Token long-lived** (~60 giorni). Copialo.

## Passo 5 — Ricavare il Page Access Token

Il token che serve all'app **non** è quello dell'utente, ma quello specifico della Pagina — di norma **non scade** finché il token utente long-lived che lo ha generato resta valido (va comunque rigenerato se quello scade, vedi sotto).

1. Apri (sostituendo `{TOKEN_LONG_LIVED}` con il token del Passo 4):

   ```
   https://graph.facebook.com/v21.0/me/accounts?access_token={TOKEN_LONG_LIVED}
   ```

2. La risposta elenca tutte le Pagine che amministri, ciascuna con il proprio `id`, `name` e — questo è il valore che serve — `access_token`. Individua la Pagina della società per `name` e copia il suo `access_token`.

Questo è il **Token di accesso** da incollare nell'app al Passo 6.

## Passo 6 — Inserire il token nell'app

1. Accedi all'app come Admin o Dirigente.
2. Vai su **Impostazioni** (`/app/impostazioni`).
3. Scorri fino alla sezione **"Token Facebook"**.
4. Incolla il token del Passo 5 nel campo "Token di accesso" e clicca **Salva**.

Il token **non viene mai mostrato in chiaro** dopo il salvataggio, nemmeno alla stessa pagina di configurazione: comparirà solo l'indicazione "Token configurato". Per sostituirlo (es. dopo il rinnovo periodico) basta incollarne uno nuovo e salvare di nuovo — lasciare il campo vuoto e salvare **non cancella** il token esistente, lo lascia invariato.

## Verificare che funzioni

Visita la home pubblica del sito (`/`, senza essere loggato) e scorri fino alla sezione **"Ultimi post"**, in fondo alla pagina. Se la Pagina Facebook ha pubblicato di recente post con del testo, dovresti vedere un carosello che li mostra uno alla volta, con avanzamento automatico ogni 10 secondi, frecce di navigazione e un pulsante di pausa.

**Se la sezione non compare**, può essere per uno di questi motivi (tutti fail-soft: il sito non si rompe mai, la sezione semplicemente non appare):

| Causa | Come verificarlo |
|---|---|
| Nessun consenso cookie ancora dato | La sezione compare solo dopo aver accettato i cookie non essenziali nel banner in basso (prova in una finestra anonima/incognito e accetta) |
| Token non configurato o non più valido | Torna su `/app/impostazioni`: se il token manca o l'ultima lettura è fallita, compare un avviso esplicito sopra il campo, spesso con il messaggio di errore restituito da Facebook |
| URL della Pagina Facebook non configurato o in un formato non riconosciuto | Verifica il campo "Pagina Facebook" sempre su `/app/impostazioni` — deve essere un URL con lo username della Pagina (es. `facebook.com/miasocieta`) o nel formato `facebook.com/profile.php?id=...`; altri formati (es. `facebook.com/pages/Nome/12345`) non sono riconosciuti |
| Gli ultimi post della Pagina non hanno testo (solo foto/video senza didascalia) | Il carosello mostra solo post con del testo scritto — un post di sola immagine senza didascalia viene scartato. Aggiungi una didascalia ai prossimi post, o attendi che ne arrivi uno con testo |

<a id="scadenza"></a>
## Scadenza e rinnovo del token

Il Page Access Token generato con questo procedimento resta valido finché resta valido lo User Access Token long-lived che lo ha originato — in pratica, **fino a circa 60 giorni** dall'ultima volta che qualcuno con accesso alla Pagina si è autenticato nel flusso sopra. Non c'è un rinnovo automatico: va rigenerato manualmente ripetendo i Passi 3-6.

**Come accorgersene**: quando il token smette di funzionare, la sezione "Ultimi post" sparisce dalla home pubblica **e** compare un avviso su `/app/impostazioni` ("Ultima lettura dei post Facebook fallita...", con il messaggio di errore di Facebook tra parentesi) — non serve aspettare che un Visitatore lo segnali.

## Chi può configurarlo

Sia l'**Admin** sia il **Dirigente** possono vedere ed editare la sezione "Token Facebook" su `/app/impostazioni` (a differenza, per esempio, della password del server email, riservata al solo Admin) — coerente con il resto dei contenuti pubblici del sito (Sponsor, Contatti, Pagina Facebook), tutti gestibili da entrambi i Ruoli.

## Note di sicurezza

- Il token è un **segreto**: chiunque lo possieda può leggere (non pubblicare) i post della Pagina per conto vostro tramite le API. Non condividerlo via email/chat non protette — incollalo solo nel campo dedicato su `/app/impostazioni`.
- Il token non è mai visibile nel codice della pagina inviato al browser, nemmeno a un Visitatore che ispezioni il codice sorgente del sito: viene letto solo lato server, al momento di interrogare Facebook per gli ultimi post.
- Se sospetti che il token sia stato compromesso, puoi revocarlo dal pannello Meta for Developers (Impostazioni app → Avanzate, o rigenerando l'App Secret) e ripetere la procedura da capo con un nuovo token.
