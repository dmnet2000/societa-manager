---
title: 'Story 16.4: Banner sponsor rotante fisso su tutto il sito pubblico'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'b657eb4d67516078b34029679ec953099747919a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** il carosello rotante degli Sponsor Banner (Story 16.3) esiste solo nell'area autenticata (home interna, Ruoli Atleta/Genitore). Sul sito pubblico gli Sponsor Banner compaiono solo come griglia statica in fondo alla home (Story 18.2), non visibili altrove e senza rotazione automatica.

**Approach:** un nuovo banner rotante, in una striscia fissa ("come un piè di pagina") sempre visibile in basso su ogni pagina pubblica, che ruota solo gli Sponsor `BANNER` attivi partendo da una posizione iniziale casuale ad ogni caricamento. Montato una sola volta dentro `FooterPubblico.tsx` (già presente su tutte le pagine pubbliche) - nessuna delle altre pagine pubbliche viene toccata.

## Boundaries & Constraints

**Always:** mostra SOLO Sponsor `tipo: "BANNER"` e `attiva: true` (stessa regola di Story 16.3) - mai le Convenzioni. Indice iniziale scelto casualmente ad ogni caricamento pagina (`Math.floor(Math.random() * lunghezza)`) - a differenza del carosello interno (Story 16.3), che parte sempre da 0, mai riaperto qui. Avanzamento automatico ogni 5s con controllo di pausa/ripresa (WCAG 2.2.2, stesso obbligo già rispettato dal carosello interno) - mai un carosello automatico senza un modo di fermarlo. Riusa `avanti`/`indietro`/`indiceEntroLimiti` (`lib/carosello-indice.ts`, già condivisa da `SponsorCarosello`/`PostFacebookCarosello`) - nessuna terza implementazione dell'aritmetica. Nessun banner (nessuna riserva di spazio) se zero Sponsor Banner attivi. Quando il banner è presente, riserva lo spazio verticale corrispondente sotto il contenuto del footer (mirror della tecnica già in uso per `.footerConCookieBanner`) e sposta in alto il `CookieBanner` sulla home (unico punto dove coesistono) così i due elementi fissi non si sovrappongono mai. Nuovo custom property in `app/globals.css` (`--altezza-banner-sponsor-pubblico`) come unica fonte di verità dell'altezza, usata sia dal banner sia dalla riserva di spazio sia dall'offset del `CookieBanner`.

**Ask First:** nessuna prevista - decisioni già prese con l'utente in questa conversazione (posizione: tutte le pagine pubbliche; contenuto: solo Banner, mai Convenzioni; sempre visibile, non richiudibile).

**Never:** nessun pulsante di chiusura/dismiss - resta sempre visibile su ogni pagina pubblica per richiesta esplicita e ripetuta dell'utente (diversamente dal precedente `CookieBanner`, dove un elemento fisso permanente fu giudicato "troppo invasivo" e rimosso in Story 18.17 - qui la direzione dell'utente è opposta ed esplicita, non una svista di design). Nessuna modifica al carosello interno esistente (`app/app/SponsorCarosello.tsx`, area autenticata) né alla griglia statica esistente sulla home pubblica (Story 18.2) - il nuovo banner si aggiunge, non sostituisce nulla. Nessuna nuova migrazione Prisma (model `Sponsor` già completo dalla Story 16.1). Nessuna modifica alle altre 6 pagine pubbliche (calendario, contatti, squadre, staff, torneo, `[...slug]`) - ricevono il banner automaticamente montando `FooterPubblico` già esistente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nessuno Sponsor Banner attivo | 0 righe | Nessun banner fisso, nessuna riserva di spazio nel footer | N/A |
| Un solo Sponsor Banner attivo | 1 riga | Banner fisso mostrato senza frecce/indicatori/avanzamento automatico (mirror `banner.length > 1` del carosello interno) | N/A |
| Più Sponsor Banner attivi | N>1 righe | Banner fisso con indice iniziale casuale, avanzamento ogni 5s, frecce/indicatori/pausa disponibili | N/A |
| Home page al primo accesso (consenso cookie non ancora dato) + banner sponsor attivo | `CookieBanner` visibile insieme al banner sponsor | I due elementi fissi non si sovrappongono (CookieBanner spostato sopra) | N/A |
| Uno Sponsor viene disattivato mentre una pagina pubblica è già aperta | nessun aggiornamento realtime (ogni pagina è server-rendered per richiesta) | Sparisce dal banner al successivo caricamento pagina - nessun comportamento realtime richiesto | N/A |

</frozen-after-approval>

## Code Map

- `app/FooterPubblico.tsx` -- aggiungere query `prisma.sponsor.findMany({ where: { tipo: "BANNER", attiva: true }, orderBy: { createdAt: "desc" } })` (mirror esatto di `app/app/page.tsx` righe ~24-29); passare l'elenco (stesso shape id/nome/linkEsterno/immagineUrl con cache-busting `updatedAt`, mirror righe ~44-52) al nuovo `BannerSponsorPubblico`; applicare una classe di riserva spazio quando `banner.length > 0` (mirror del pattern già in uso per `conSpazioCookieBanner`, ma deciso internamente, nessun nuovo prop).
- `app/FooterPubblico.module.css` -- nuova classe (es. `.footerConBannerSponsor`) con `padding-bottom` basato su `var(--altezza-banner-sponsor-pubblico)`, combinabile con `.footerConCookieBanner` esistente (entrambe possono applicarsi insieme sulla home).
- `app/BannerSponsorPubblico.tsx` (nuovo, client component) -- mirror strutturale di `app/app/SponsorCarosello.tsx` (stesso `useState`/`useEffect` per avanzamento automatico/pausa, stesse frecce/indicatori, stesso riuso di `lib/carosello-indice.ts`) con due differenze: indice iniziale casuale invece di 0, e markup/stile per una striscia fissa a piena larghezza invece di una card inline.
- `app/BannerSponsorPubblico.module.css` (nuovo) -- registro "Poster Sportivo" (mirror palette/tipografia di `torneo-pubblico.module.css`/`FooterPubblico.module.css`), `position: fixed`, altezza `var(--altezza-banner-sponsor-pubblico)`.
- `app/globals.css` -- nuovo custom property `--altezza-banner-sponsor-pubblico` (valore scelto in implementazione, striscia sottile).
- `app/CookieBanner.tsx` + `app/CookieBanner.module.css` -- nuovo prop opzionale (es. `sopraBannerSponsor: boolean`) che applica una classe con `bottom: calc(var(--altezza-banner-sponsor-pubblico) + var(--space-4))` invece di `bottom: var(--space-4)`.
- `app/page.tsx` -- passare il nuovo prop a `<CookieBanner>` riusando il valore `banner.length > 0` già calcolato dalla query Sponsor esistente su questa pagina (Story 18.2) - nessuna nuova query qui.
- `lib/carosello-indice.ts` -- nessuna modifica, riusato tale e quale.

## Tasks & Acceptance

**Execution:**
- [x] `app/BannerSponsorPubblico.tsx` + `.module.css` -- nuovo componente banner fisso rotante, indice iniziale casuale + test delle sue eventuali funzioni pure estratte (nessuna funzione pura nuova estratta: l'indice iniziale casuale è un one-liner `Math.floor(Math.random() * lunghezza)` dentro il lazy initializer di `useState`, `avanti`/`indietro`/`indiceEntroLimiti` restano riusate tali e quali da `lib/carosello-indice.ts`, già coperte dai test esistenti)
- [x] `app/globals.css` -- nuovo custom property altezza banner (`--altezza-banner-sponsor-pubblico: 60px`)
- [x] `app/FooterPubblico.tsx` + `.module.css` -- query Sponsor Banner attivi, montaggio del banner, riserva di spazio
- [x] `app/CookieBanner.tsx` + `.module.css` -- offset verso l'alto quando il banner sponsor è presente
- [x] `app/page.tsx` -- passare il nuovo prop a `CookieBanner` riusando il conteggio Sponsor già disponibile

**Acceptance Criteria:**
- Given almeno uno Sponsor Banner attivo, when un Visitatore apre una qualunque pagina pubblica, then vede la striscia fissa in basso con quello Sponsor
- Given più Sponsor Banner attivi, when la pagina resta aperta, then il banner avanza automaticamente ogni 5s partendo da uno Sponsor scelto casualmente, con possibilità di mettere in pausa/riprendere e navigare manualmente
- Given zero Sponsor Banner attivi, when un Visitatore apre una pagina pubblica, then non vede alcun banner né alcuno spazio riservato vuoto
- Given un primo accesso con consenso cookie non ancora espresso sulla home, when sia il banner sponsor sia il `CookieBanner` sono visibili, then non si sovrappongono

## Design Notes

**Perché in `FooterPubblico.tsx` e non in ciascuna pagina:** `FooterPubblico` è l'unico componente già montato identico su tutte e 7 le pagine pubbliche (nessun layout condiviso esiste per il sito pubblico, per scelta esistente del progetto) - estenderlo internamente evita di toccare le altre 6 pagine.

**Perché una query separata da quella già esistente in `app/page.tsx`:** quella pagina legge già tutti gli Sponsor attivi (Banner + Convenzioni) per la propria griglia statica (Story 18.2); `FooterPubblico` legge autonomamente solo i Banner per il proprio banner fisso, stesso principio "self-contained, risolve le proprie letture" già documentato nel file. Una piccola duplicazione di query solo sulla home, accettata per coerenza con questo principio esistente piuttosto che introdurre un nuovo meccanismo di cache condivisa per un solo caso d'uso.

**Perché fisso qui e non nell'area autenticata:** la versione sticky del carosello interno fu valutata e scartata in Story 16.3 ("costo permanente di spazio verticale mai più liberato"). Qui il contesto è diverso (richiesta esplicita dell'utente per il sito pubblico, dove la visibilità continua per gli sponsor è il punto) - non riapre quella decisione, la home interna resta invariata.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx vitest run` -- expected: tutti verdi

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire ciascuna delle 7 pagine pubbliche con almeno uno Sponsor Banner attivo: banner fisso visibile su tutte, contenuto invariato negli altri elementi di pagina (nessuna sovrapposizione con testo/footer).
- Aprire la home in una sessione senza consenso cookie salvato: verificare che i due banner fissi non si sovrappongano.
- Disattivare tutti gli Sponsor Banner: verificare che il banner sparisca e lo spazio riservato torni normale.

## Suggested Review Order

**Il cuore della story: banner fisso rotante**

- Componente nuovo, mirror strutturale del carosello interno con indice iniziale casuale.
  [`BannerSponsorPubblico.tsx:25`](../../app/BannerSponsorPubblico.tsx#L25)

- Review fix: la randomizzazione dell'indice avviene in un `useEffect` post-mount (mai nel lazy initializer di `useState`, che girerebbe anche lato server) - senza questo fix, un hydration mismatch avrebbe fatto lampeggiare lo sponsor sbagliato al primo caricamento (trovato indipendentemente da Blind Hunter ed Edge Case Hunter).
  [`BannerSponsorPubblico.tsx:38`](../../app/BannerSponsorPubblico.tsx#L38)

**Montaggio condiviso e non-sovrapposizione col CookieBanner**

- `FooterPubblico.tsx` monta il banner come pari grado del `<footer>` (mai annidato), riserva lo spazio verticale quando presente.
  [`FooterPubblico.tsx:120`](../../app/FooterPubblico.tsx#L120)

- Selettori composti per la combinazione CookieBanner+banner sponsor (solo sulla home).
  [`FooterPubblico.module.css:56`](../../app/FooterPubblico.module.css#L56)

- Offset verso l'alto del `CookieBanner` quando il banner sponsor è presente.
  [`CookieBanner.module.css:40`](../../app/CookieBanner.module.css#L40)
