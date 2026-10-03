---
title: 'Story 18.36: classifiche in stile "Match Week" su /classifiche'
type: 'feature'
created: '2026-10-01'
status: 'done'
baseline_commit: '60cb7e38b7f5bc80f8987a2b11ca2b43edeedb38'
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/classifiche` mostra ancora una card bianca con una tabella di 13 colonne, mentre partite e risultati del sito usano ormai lo stile "Match Week" (Story 18.35, grafica `ux-designs/stile.jpg`): le classifiche stonano.

**Approach:** *Rinegoziato dall'utente il 2026-10-02 dopo l'anteprima (le righe Match Week separate e grandi erano "troppo grosse").* Resta una tabella compatta con le stesse 13 colonne, senza dividere le righe, con tocchi grafici Match Week: tabella trasparente direttamente sullo sfondo blu (testo bianco, righe separate da fili sottili), titolo Campionato — Gruppo su una fascia obliqua del colore del Campionato, posizione in un quadratino rosso, riga della nostra squadra evidenziata, colonna Punti in risalto.

## Boundaries & Constraints

**Always:** decisioni utente 2026-09-30/10-02 — fascia del titolo = `Campionato.colore` normalizzato (default `#2e6f99`), testo scuro/chiaro via `testoScuroSuSfondo`; quadratino posizione sempre rosso `#C8102E` a dimensione di tabella; tutte le 13 colonne, valore null → "—"; Punti in grassetto e leggermente più grandi; riga della nostra squadra con sfondo tenue e nome in grassetto, annunciata anche agli screen reader. Nostra squadra = l'unico nome presente in TUTTE le gare di `lettura.risultati` (il link FIPAV contiene l'id del club — epics.md Story 10.11); confronto trim + case-insensitive + spazi collassati; se non univoco o assente dalla classifica, nessuna riga distinta; al massimo una riga distinta. Tabella semantica (`<table>`, `<caption>`, `<th scope>`, `<abbr title>`). "Niente nero", `forced-colors` leggibile. A 375px la pagina non scorre in orizzontale: se le colonne non ci stanno scorre solo il contenitore della tabella.

**Ask First:** cambiare fetch/parser FIPAV, cache, ordine delle righe o il messaggio "Nessuna classifica disponibile"; toccare home, `/calendario` o `/torneo`.

**Never:** righe separate/inclinate a tutta altezza o numeri a contorno nella tabella; nuovi campi DB o configurazioni per la nostra squadra; immagini o loghi; nuove librerie o font web.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Riga tipica | pos "1", punti "24", PG "9"… | "1" nel quadratino rosso, punti "24" in risalto, 13 celle | — |
| Valori assenti | `punti` null, `quozienteSet` null, posizione "  " | celle "—", quadratino "—" | nessun crash |
| Nostra squadra | risultati: tutte le gare coinvolgono "VOLLEY X" | riga "Volley X" evidenziata + testo nascosto "la nostra squadra" | — |
| Ambiguo | una sola gara nei risultati (2 nomi comuni) | nessuna riga evidenziata | — |
| Nessun risultato | `risultati` vuoto | nessuna riga evidenziata | — |
| Colore chiaro | `#ffff66` | fascia titolo con testo blu-carbone | — |

</frozen-after-approval>

## Code Map

- `app/classifiche/page.tsx:79-157` -- card + `<table>` da sostituire; titolo pagina, messaggio vuoto, `classeFasciaMatchWeek`/`DecorazioniMatchWeek` invariati.
- `lib/sincronizza-gare-fipav/vista-home-live.ts:83-114` -- `ClassificaVista` / `classifichePerCampionatoDaLetture` (unico consumer: `/classifiche`): aggiungere `nostraSquadra: string | null` calcolata da `lettura.risultati` (`squadraCasa`/`squadraOspite`); test esistenti in `vista-home-live.test.ts:207`.
- `lib/sincronizza-gare-fipav/parser.ts:236` -- `RigaClassificaFipav` (sola lettura, campi tutti `string | null` tranne posizione/squadra).
- `app/RigaPartita.tsx`, `app/riga-partita.module.css` -- riferimento visivo da replicare: `.cornice` (filo bianco), `.riga` grid + `clip-path`, `.testoScuro`, `.data`/`::before` blocco rosso con filo, `.contorno` + fallback, breakpoint 900px. Non modificarli: nuovo componente fratello.
- `lib/props-riga-partita.ts` -- `normalizzaColoreCampionato`, `testoOppureNull` (riusare).
- `lib/colore-testo-leggibile.ts` -- `testoScuroSuSfondo`.
- `app/home-pubblica.module.css:495-566` -- `.listaClassifiche`, `.schedaClassifica`, `.titoloClassifica`, `.tabellaClassifica*`: unico consumer `/classifiche`, rimuovere a lavoro finito (e il commento cross-file in `app/classifiche/classifiche.module.css:1-8`).
- `app/sfondo-match-week.module.css:15` -- commento che cita `.schedaClassifica`, da aggiornare.
- `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-08-13/DESIGN.md` -- sezioni "Riga partita Match Week" / "Fascia Match Week" (card classifica bianca → superata).
- `lib/guida/contenuti.ts:~393` -- paragrafo Campionato che descrive `/classifiche`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/sincronizza-gare-fipav/vista-home-live.ts` + test -- `nostraSquadraDaRisultati`, `eNostraSquadra`, `ClassificaVista.nostraSquadra` (invariato dalla prima iterazione, KEEP).
- [x] `app/RigaClassifica.tsx`, `app/riga-classifica.module.css`, `app/RigaClassifica.test.tsx` -- eliminare (righe Match Week separate superate).
- [x] `app/classifiche/ClassificaMatchWeek.tsx` + `classifiche.module.css` -- `<section aria-labelledby>` con `<h2>` dentro una fascia obliqua del colore del Campionato (variante testo scuro), poi un contenitore a scorrimento orizzontale con `<table>` trasparente: `<caption>` nascosta, `<thead>` con le 13 intestazioni (`<abbr title>` come prima della story), posizione in quadratino rosso, Punti in risalto, riga nostra (solo la prima che corrisponde) con sfondo tenue + nome in grassetto + testo nascosto ", la nostra squadra".
- [x] `app/classifiche/ClassificaMatchWeek.test.tsx` -- matrice I/O lato componente: riga tipica, valori assenti/posizione vuota, nostra squadra (una sola), nessuna evidenziata, colore chiaro sulla fascia, `aria-labelledby`.
- [x] `DESIGN.md`, `lib/guida/contenuti.ts`, commenti CSS -- sostituire "Riga classifica Match Week" con "Tabella classifica Match Week".

**Acceptance Criteria:**
- Given `/classifiche` con almeno un Campionato letto, when la apro, then vedo per ogni Campionato una tabella compatta di 13 colonne sullo sfondo blu, con titolo in fascia obliqua colorata, posizioni in quadratini rossi, punti in risalto e la nostra squadra evidenziata.
- Given 375px di larghezza, when guardo la pagina, then la pagina non scorre in orizzontale (scorre solo la tabella).

## Spec Change Log

- 2026-10-02 — **Rinegoziazione utente dopo l'anteprima** (non un finding di review): "non mi piace troppo grosso come dimensione, terrei tabella come ora solo con un po' di grafica aggiuntiva senza dividere le righe". Scelte via domanda: tabella trasparente sul blu; titolo in fascia inclinata, posizione in quadratino rosso, nostra squadra evidenziata, punti in risalto. Emendati Intent/Boundaries/Matrice (blocco frozen, su richiesta umana), Tasks, Design Notes. Stato evitato: righe Match Week separate e grandi (`app/RigaClassifica.tsx` + `riga-classifica.module.css`, rimossi). KEEP: `nostraSquadraDaRisultati`/`eNostraSquadra` e i loro test, una sola riga distinta, fallback "—" per posizione/valori vuoti, `ClassificaMatchWeek` come componente presentazionale testato, rimozione del CSS della vecchia card bianca, voce legenda sigle in deferred-work.

## Design Notes

Fascia titolo: `clip-path: polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%)`, `display: inline-block`, padding verticale contenuto, stessa famiglia display del sito. Tabella: `border-collapse: collapse`, celle `padding: 8px 12px`, `white-space: nowrap` sui numeri, fili `rgba(255,255,255,0.15)`, intestazioni in `--color-text-secondary` (#C3D6F5 sulla fascia). Quadratino posizione: ~28×28px, bianco su #C8102E (5.88:1). Nostra squadra: `rgba(255,255,255,0.14)` sulla riga. In `forced-colors` il quadratino ha bordo di sistema.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: nessun errore
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti verdi

**Manual checks (dev locale rotto):**
- anteprima statica generata dai componenti reali; `/classifiche` a 375px e desktop al deploy.

## Suggested Review Order

**Riconoscimento della nostra squadra**

- Punto d'ingresso: unico nome presente in tutte le gare dei risultati FIPAV, altrimenti null.
  [`vista-home-live.ts:103`](../../lib/sincronizza-gare-fipav/vista-home-live.ts#L103)

- Confronto con la classifica: trim, spazi collassati, minuscolo.
  [`vista-home-live.ts:133`](../../lib/sincronizza-gare-fipav/vista-home-live.ts#L133)

**Tabella classifica Match Week**

- Fascia titolo colorata, una sola riga nostra, tabella semantica con 13 colonne.
  [`ClassificaMatchWeek.tsx:32`](../../app/classifiche/ClassificaMatchWeek.tsx#L32)

- Fascia obliqua, tabella trasparente, quadratino rosso, punti, nostra squadra, forced-colors.
  [`classifiche.module.css:42`](../../app/classifiche/classifiche.module.css#L42)

- Integrazione nella pagina, titolo e messaggio vuoto invariati.
  [`page.tsx:72`](../../app/classifiche/page.tsx#L72)

**Documentazione e test**

- DESIGN.md: "Tabella classifica Match Week".
  [`DESIGN.md:414`](../planning-artifacts/ux-designs/ux-societa-manager-2026-08-13/DESIGN.md#L414)

- Guida in-app per l'Admin.
  [`contenuti.ts:393`](../../lib/guida/contenuti.ts#L393)

- Test di funzioni e componente (matrice I/O).
  [`vista-home-live.test.ts:1`](../../lib/sincronizza-gare-fipav/vista-home-live.test.ts#L1)
  [`ClassificaMatchWeek.test.tsx:47`](../../app/classifiche/ClassificaMatchWeek.test.tsx#L47)
