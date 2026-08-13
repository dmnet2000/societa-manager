# Review di accessibilità — spine "Poster Sportivo" (DESIGN.md / EXPERIENCE.md)

Revisore ad-hoc, Finalize Reviewer Gate. Ogni coppia di colori citata sotto è stata ricalcolata da zero con la formula WCAG (luminanza relativa gamma-corretta, soglia 0.04045, `(L1+0.05)/(L2+0.05)`), non solo riletta. Dove il documento dichiara già un rapporto, il ricalcolo lo conferma salvo dove indicato esplicitamente.

---

## 1. [CRITICO] Divisore "vs" magenta su fascia azzurra — contrasto ~1.57:1, ben sotto anche la soglia ridotta 3:1

**Posizione:** `DESIGN.md` → Colori (bullet `{colors.magenta}`, "Nota di correzione rispetto al mockup") e → Componenti → `next-match-strip` (`vs-color: '{colors.magenta}'`).

Il documento introduce esplicitamente questa scelta come una *correzione* rispetto al mockup: il mockup usa `{colors.navy}` (`#312682`) per il "vs" inline nella fascia "prossima partita" (azzurro `#00A3E0`), mentre il `match-card` (sfondo nero) usa magenta. Il documento dichiara di "risolvere l'incoerenza" standardizzando il divisore "vs" a `{colors.magenta}` **ovunque**, fascia azzurra inclusa.

Ricalcolo: testo `#E6007C` su sfondo `#00A3E0` = **1.57:1**. Ben sotto la soglia AA per testo normale (4.5:1) e sotto anche la soglia ridotta per testo grande (3:1) — magenta e azzurro sono due tinte sature con luminanza percepita simile (L≈0.183 vs L≈0.316 su scala 0-1), una classica trappola di contrasto tra colori saturi di tonalità diversa ma chiarezza comparabile. Per confronto, la scelta originale del mockup (navy `#312682` su azzurro) dà **4.23:1** — quasi 3 volte meglio, e la "correzione" documentata nel testo peggiora concretamente l'accessibilità del componente più visibile della home (la fascia "prossima partita" compare sopra la piega su mobile).

**Scenario di fallimento concreto:** un genitore con un lieve deficit di visione dei colori (o semplicemente uno schermo con retroilluminazione debole/riflessi solari, scenario realistico per "controllo del calendario da fuori casa" citato nel Flow 1 di EXPERIENCE.md) non distingue la parola "vs" dallo sfondo azzurro pieno della fascia.

**Fix suggerito:** annullare la standardizzazione a magenta per questo specifico componente — ripristinare `{colors.navy}` (o `{colors.nero}`, che darebbe 6.73:1 come il resto del testo della fascia) per il divisore "vs" *solo* nella fascia azzurra, mantenendo magenta nel `match-card` (sfondo nero, dove il contrasto è comunque marginale — vedi finding #3). L'incoerenza mockup-vs-mockup che il documento voleva risolvere può restare risolta con un colore diverso da magenta.

---

## 2. [CRITICO] Testo copyright footer (`{colors.testo-scuro-muto}` su `{colors.nero}`) — contrasto ~4.08:1, sotto soglia AA, mai calcolato nel documento

**Posizione:** `DESIGN.md` → Componenti → `footer` (`copyright-color: '{colors.testo-scuro-muto}'`, tipografia `{typography.meta}`, 13px/400) e → Colori (bullet dei "quattro toni di testo chiaro... su sfondo nero").

Il paragrafo Colori elenca quattro toni usati su `{colors.nero}` (lead, muto, footer, copyright/scuro-muto) ma calcola esplicitamente **solo due**: "lead 14.26:1, muto 9.44:1 — entrambi ampiamente sopra soglia AA". Footer (`#B8C0CC`) e copyright/scuro-muto (`#6B7480`) restano senza un numero proprio, implicitamente lasciati intendere come parte dello stesso "ampiamente sopra soglia" (EXPERIENCE.md ripete "9.44:1-19.32:1 a seconda del tono" come se fosse un range che copre tutti e quattro).

Ricalcolo indipendente: `#B8C0CC` su `#0B0E14` = 10.53:1 (ok, dentro il range dichiarato). Ma `#6B7480` su `#0B0E14` = **4.08:1** — **fuori dal range dichiarato e sotto la soglia AA 4.5:1** per testo normale (13px, peso 400, non testo grande). Questo è il testo di copyright reale del footer, presente su ogni pagina del sito.

**Scenario di fallimento concreto:** un utente con ipovisione lieve che scorre fino in fondo a `/contatti` o `/calendario` non riesce a leggere la riga "© 2026 Mogliano Volley..." con contrasto sufficiente — proprio il tipo di coppia che l'esercizio di verifica dichiarato nel documento ("coppie di contrasto calcolate, non solo dichiarate", EXPERIENCE.md → Soglia di Accessibilità) avrebbe dovuto individuare.

**Fix suggerito:** sostituire `{colors.testo-scuro-muto}` con un tono più chiaro per il copyright (es. riusare `{colors.testo-chiaro-footer}` a un'opacità ridotta, o introdurre un nuovo token intermedio verificato ≥4.5:1), oppure — se si vuole mantenere la gerarchia visiva "il copyright è il testo meno importante" — accettare esplicitamente che 13px passi il test come testo su sfondo scuro solo se il peso/dimensione cambiano, e ricalcolare.

---

## 3. [ALTO] Divisore "vs" magenta su match-card (sfondo nero) — ~4.28:1, fallisce AA se il testo non è "grande"

**Posizione:** `DESIGN.md` → Componenti → `match-card` (`vs-color: '{colors.magenta}'`).

Ricalcolo: `#E6007C` su `#0B0E14` = **4.28:1**. Sotto la soglia AA 4.5:1 per testo normale. Il mockup di riferimento rende questo elemento a 16px/900 (`.match-teams .vs{font-size:16px}`), esplicitamente **più piccolo** del testo circostante (`.match-teams{font-size:22px}`) — 16px in grassetto non raggiunge la soglia dei 18.66px (14pt) richiesta per l'eccezione "testo grande" (soglia 3:1), quindi si applica la soglia piena 4.5:1, che fallisce.

`DESIGN.md` non specifica una dimensione propria per il "vs" nel `match-card` — eredita implicitamente `{typography.display-card}` (22px) tramite `teams-typography`, che *se* interpretato come dimensione uniforme (incluso il "vs") supererebbe la soglia "grande" e farebbe passare il rapporto a 3:1. Ma questa non è una decisione esplicita, è un'ambiguità che determina da sola se il componente passa o fallisce AA.

**Fix suggerito:** o fissare esplicitamente la dimensione del "vs" a ≥18.66px con peso 900 (dichiarandolo large-text, soglia 3:1, ok), oppure cambiare colore (vedi anche finding #1, se si cambia lì probabilmente conviene cambiare qui in modo coerente).

---

## 4. [ALTO] Badge eyebrow hero (bianco su magenta) — ~4.51:1, pass al millimetro, mai calcolato

**Posizione:** `DESIGN.md` → Componenti → `hero` (`eyebrow-background: '{colors.magenta}'`, `eyebrow-color: '{colors.bianco}'`, tipografia 12px/900).

Ricalcolo: `#FFFFFF` su `#E6007C` = **4.51:1**. Supera la soglia 4.5:1 per un margine di circa lo 0.2%, il tipo di margine che varia con l'anti-aliasing del renderer, un filtro schermo "modalità notte" del sistema operativo, o una minima variazione cromatica in produzione (es. se il colore finale differisse anche solo leggermente per correzione gamma del monitor). Questa coppia non compare da nessuna parte nel paragrafo Colori di `DESIGN.md`, a differenza di quasi ogni altra coppia strutturale del sistema (che sono tutte esplicitamente verificate con un numero).

**Scenario di fallimento concreto:** il badge "Stagione 2026/27" è il primo elemento di testo che un visitatore legge nell'hero (sopra il titolo). Un pass "sulla carta" con zero margine reale non dà garanzie pratiche.

**Fix suggerito:** o documentare esplicitamente questo numero (è comunque un pass, quindi minimo sforzo) e considerare di scurire leggermente il magenta o allargare il badge/aumentare il peso visivo per un margine di sicurezza più comodo, dato quanto è vicino alla soglia.

---

## 5. [ALTO] Azione secondaria del banner cookie ("Rifiuta") — nessun colore assegnato, quindi nessun contrasto verificabile

**Posizione:** `DESIGN.md` → Componenti → `cookie-banner` (`cta-secondary-typography: '{typography.button-label-secondary}'`).

Il componente `cookie-banner` specifica tipografia, sfondo, bordo, ombra — ma per l'azione "Rifiuta" (che EXPERIENCE.md insiste debba avere "lo stesso peso di interazione" di "Accetta", proprio per evitare un dark pattern) **non esiste alcun token di colore assegnato**, né nel blocco componente né altrove nel documento. Non è un caso di "ratio calcolato male": è un caso di "coppia testo/sfondo che non esiste ancora come decisione di design", quindi letteralmente non verificabile.

**Scenario di fallimento concreto:** in sviluppo, qualcuno sceglie un colore ad hoc per "Rifiuta" (magari lo stesso `{colors.grigio}` usato altrove per testo secondario su sfondo bianco, che darebbe comunque un contrasto ok — ma è una scelta implicita non tracciata, non una decisione del sistema di design), e nulla nel documento la contraddice o la conferma.

**Fix suggerito:** assegnare un token di colore esplicito a `cta-secondary` (es. `{colors.grigio}` su `{colors.bianco}`, che darebbe ~5.46:1, verificato) e aggiungerlo al blocco componente.

---

## 6. [ALTO] Target di tocco 44×44px — icone social del footer (38px) e link "Accedi" assenti dall'elenco esplicito dei componenti da verificare

**Posizione:** `EXPERIENCE.md` → Primitive di Interazione ("Target di tocco minimo 44×44px... Stesso vincolo va rispettato per pulsanti primari, box countdown se mai cliccabili, e le azioni del banner cookie") e `DESIGN.md` → Componenti → `footer` (`social-icon-shape: '{rounded.full}'`, nessuna dimensione dichiarata) e → `header-nav` (`accedi-link` con `padding: 8px 14px` su testo 12px, nessuna altezza minima dichiarata).

L'elenco di EXPERIENCE.md che enumera i componenti nuovi da verificare per il target 44px cita esplicitamente tre casi (pulsante primario, box countdown, azioni cookie) ma **non le icone social del footer**, che sono elementi cliccabili reali (link ai profili social). Nel mockup di riferimento sono dichiarate a `.social-dot{width:38px;height:38px}` — 6px sotto la soglia su entrambi gli assi, circa il 74% dell'area minima richiesta — e `DESIGN.md` non sovrascrive questa dimensione (specifica solo la forma, non la misura). Stesso discorso per "Accedi": `padding:8px 14px` su testo 12px produce un'altezza renderizzata plausibilmente sui 28-30px, ben sotto 44px, e non è menzionato nell'elenco.

**Scenario di fallimento concreto:** un visitatore su mobile prova a toccare l'icona Instagram nel footer o il link "Accedi" nell'header e sbaglia bersaglio per via dell'area di tocco ridotta — esattamente il tipo di regressione che la nota di memoria del progetto sul target 44px (lezione già imparata una volta sulla nav) avrebbe dovuto prevenire per componenti nuovi.

**Fix suggerito:** aggiungere esplicitamente icone social e "Accedi" all'elenco dei componenti soggetti al vincolo 44px in EXPERIENCE.md, e specificare in `DESIGN.md` un'area di tocco (anche mantenendo l'icona visiva a 38px mentre l'area cliccabile reale — padding/hit-area — arriva a 44px).

---

## 7. [MEDIO] Nessuna considerazione `prefers-reduced-motion` per le micro-animazioni

**Posizione:** `EXPERIENCE.md` → Primitive di Interazione ("Micro-animazioni di stato... sottolineatura nav che si espande, pulsante che si solleva 2px, team-card che si solleva 6px, icona social che cambia colore") e `DESIGN.md` → Componenti (transizioni dichiarate per `header-nav`, `button-primary`, `team-card`, `footer`).

Nessuno dei due documenti menziona `prefers-reduced-motion` in nessun punto — né come implementato, né come nota aperta. Le animazioni sono tutte descritte esplicitamente come "mai decorative, sempre di stato", il che le rende meno critiche di un carosello o un parallax, ma restano comunque trasformazioni (`translateY`) e transizioni di larghezza che un utente con disturbi vestibolari e `prefers-reduced-motion: reduce` attivo a livello di sistema continuerebbe a ricevere su ogni hover, in ogni pagina del sito.

**Fix suggerito:** aggiungere una nota (anche minima, coerente col resto del documento che usa `[ASSUMPTION]`/`[NOTA UX APERTA]`) che imposta `@media (prefers-reduced-motion: reduce)` per ridurre le transizioni a variazioni istantanee o quasi, mantenendo il segnale di stato (es. il cambio di colore/sottolineatura) ma senza il movimento.

---

## 8. [MEDIO] Focus-visible non assegnato esplicitamente a icone social del footer e ad azione "Rifiuta" del cookie banner

**Posizione:** `DESIGN.md` → Componenti → `footer` (nessun `focus-outline` nel blocco) e → `cookie-banner` (nessun `focus-outline` nel blocco).

Il documento fa un buon lavoro nel definire `focus-outline` **contestuale alla superficie** per header-nav, next-match-strip e button-primary — arrivando persino a scoprire e documentare una trappola di contrasto reale (vedi sotto, finding #12, sul valore ~2.87:1). Ma lo stesso livello di rigore non è applicato a tutti gli elementi interattivi elencati nel checklist del task: le icone social nel footer e l'azione "Rifiuta" nel cookie banner non hanno un `focus-outline` proprio dichiarato nel blocco del componente. Il principio generale ("contorno di focus visibile su ogni elemento interattivo") è enunciato nella tabella "Cose da fare e da evitare", ma non è tracciato elemento per elemento come per gli altri componenti — è plausibile che in sviluppo si applichi correttamente per analogia, ma non è verificato contro la superficie specifica (nero per il footer, bianco per il cookie banner) come richiesto per essere sicuri che il ring non cada nella stessa trappola di contrasto già trovata altrove nel documento.

**Fix suggerito:** aggiungere `focus-outline` esplicito a entrambi i blocchi componente, verificato contro la rispettiva superficie (es. `{colors.focus-ring-chiaro}` su nero per le icone social, `{colors.focus-ring}` su bianco per "Rifiuta").

---

## 9. [MEDIO] Didascalia placeholder-foto — contrasto mai calcolato (verificato ora dal reviewer: passa, ma il documento non lo dimostra)

**Posizione:** `DESIGN.md` → Componenti → `placeholder-foto` (`caption-color: 'rgba(255,255,255,0.5-0.55)'` su trama diagonale `{colors.nero}`/`{colors.placeholder-hatch-alt}`).

Questa è esattamente la coppia che il task ha chiesto di scrutinare con più attenzione (testo a opacità ridotta su sfondo scuro), ed è anche l'unica coppia del sistema il cui colore non è un hex fisso ma un valore RGBA con opacità variabile su due sfondi diversi — eppure non ha alcun numero associato in nessuno dei due documenti, a differenza di quasi ogni altra coppia strutturale.

Verifica indipendente del reviewer (bianco 50% su `#0B0E14` = ~5.34:1; bianco 50% su `#1C2433` = ~6.15:1; al 55% i valori salgono) conferma che **la coppia passa AA** in entrambi i casi, con margine ragionevole. Quindi non è un difetto di design, ma un buco di documentazione in un punto che il registro del documento (che verifica quasi tutto il resto con numeri precisi) avrebbe dovuto coprire. C'è anche una cautela in più da annotare: la trama è una striscia diagonale ripetuta, non un colore solido — il campionamento puntuale qui sopra assume che il testo cada "in media" sopra la trama, ma i bordi dei singoli glifi potrebbero effettivamente attraversare una transizione di banda in punti specifici, cosa che una media a due colori non cattura del tutto (rischio minore, dato che entrambe le bande passano comunque con margine).

**Fix suggerito:** aggiungere il numero calcolato al paragrafo Colori o al blocco componente, per chiudere esplicitamente il cerchio di verifica che il resto del documento segue rigorosamente.

---

## 10. [BASSO/MEDIO] Team-card: hover-lift senza stato di interattività/focus definito

**Posizione:** `DESIGN.md` → Componenti → `team-card` (`hover-transform: 'translateY(-6px), transition 250ms ease'`).

Il documento non chiarisce se la `team-card` è essa stessa un elemento cliccabile (link verso una pagina di dettaglio squadra) o un contenitore puramente informativo. Nessuna story dell'Epic 18 elencata in `EXPERIENCE.md` menziona una pagina di dettaglio per singolo Gruppo — l'elenco Squadre (`/squadre`) sembra essere l'unico livello. Se la card **non** è cliccabile, il sollevamento all'hover è un segnale di affordance fuorviante (suggerisce interattività che non esiste) e comunque non richiede `focus-outline`; se **è** cliccabile (es. link implicito all'intera card), manca completamente la specifica di focus-visible per questo componente, a differenza di quasi ogni altro elemento interattivo del sistema.

**Fix suggerito:** chiarire esplicitamente se `team-card` è interattiva; se sì, aggiungere `focus-outline` verificato contro sfondo bianco; se no, valutare se il sollevamento hover è comunque opportuno o se andrebbe rimosso/ridotto per non implicare un'azione inesistente.

---

## 11. [BASSO] Nota su `countdown-label` (9px) già presente ma incompleta

**Posizione:** `DESIGN.md` → Tipografia (`[NOTA UX APERTA]` su `{typography.countdown-label}`).

Il documento affronta già questo punto di sua iniziativa, correttamente: nota che 9px è piccolo, verifica che il contrasto colore passa (6.73:1, corretto), e raccomanda (non impone) di portarlo a 10-11px in sviluppo. È un trattamento ragionevole, ma la nota non menziona un secondo fattore che si somma al problema dimensione: il valore `letterSpacing: 1px` applicato a testo **minuscolo** (non maiuscolo — nel mockup "giorni"/"ore"/"min" sono in minuscolo, non passati per `text-transform: uppercase` come il resto del sistema). Una spaziatura positiva delle lettere aiuta la leggibilità del testo tutto maiuscolo ma può interferire con il riconoscimento della forma delle parole in minuscolo a dimensioni molto piccole — un fattore aggiuntivo, non solo dimensione e contrasto colore, che la nota aperta non cattura.

**Fix suggerito:** rendere la raccomandazione di 10-11px un requisito fermo anziché opzionale, e/o valutare se `letter-spacing:1px` è davvero necessario a questa dimensione per un'etichetta minuscola di 3-4 caratteri.

---

## 12. [BASSO] Claim impreciso: "azzurro stesso o bianco... entrambi scendono a ~2.87:1"

**Posizione:** `DESIGN.md` → Colori (bullet sui token `focus-ring`).

Il testo scarta correttamente `{colors.bianco}` come anello di focus sopra la fascia azzurra (bianco su azzurro = 2.87:1 confermato dal ricalcolo, sotto soglia 3:1) — ottimo lavoro di verifica. Ma la stessa frase raggruppa `{colors.azzurro}` "stesso" sotto lo stesso numero ("entrambi scendono a ~2.87:1"), il che non è matematicamente coerente: un anello dello stesso colore dello sfondo su cui appare avrebbe contrasto 1:1 (invisibile), non 2.87:1. Non è un errore che cambia una decisione (la conclusione — non usare né azzurro né bianco come ring qui — resta corretta), ma la frase così com'è non regge a una verifica numerica e potrebbe confondere chi la legge per ricostruire il calcolo.

**Fix suggerito:** riformulare separando i due casi, o chiarire a cosa si riferisce esattamente il confronto con "azzurro stesso" (es. contrasto contro un elemento figlio nero all'interno della fascia, se è quello il caso reale).

---

## 13. [BASSO] Rischio embed di terze parti — nominato ma senza mitigazione concreta

**Posizione:** `EXPERIENCE.md` → Soglia di Accessibilità ("un widget di terze parti caricato senza controllo può introdurre trappole di focus da tastiera non gestite da questo sistema di design").

Punto positivo: il documento nomina esplicitamente il rischio di trappole di focus da tastiera per l'embed social, e lo lega correttamente al gate del consenso cookie (Story 18.6 AC #5). Ma il gate del consenso risolve solo *quando* il widget si carica, non *cosa succede* una volta che l'utente ha acconsentito e il widget è effettivamente sulla pagina — non c'è menzione di un titolo/etichetta accessibile per l'iframe, né di un meccanismo di via di fuga da tastiera nel caso il provider embeddato intrappoli comunque il focus.

**Fix suggerito:** aggiungere almeno un requisito minimo (es. iframe con `title` descrittivo, verifica che il provider scelto supporti `Escape`/tab-out) accanto alla nota di rischio già presente, così il rischio è non solo nominato ma anche mitigato.

---

## Riepilogo

| Severità | Conteggio |
|---|---|
| Critico | 2 |
| Alto | 4 |
| Medio | 3 |
| Basso | 4 |
| **Totale** | **13** |
