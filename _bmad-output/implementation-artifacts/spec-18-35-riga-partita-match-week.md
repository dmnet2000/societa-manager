---
title: 'Story 18.35: riga partita in stile "Match Week" per /calendario e home pubblica'
type: 'feature'
created: '2026-09-30'
status: 'done'
baseline_commit: '7df7e5d949ff12cf77b52529b671891aa816434b'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'utente vuole le partite del sito pubblico "sulla falsa riga" della grafica social `_bmad-output/planning-artifacts/ux-designs/stile.jpg` (Match Week): oggi sono card con testo piccolo e data/ora in riga, senza la gerarchia forte della grafica.

**Approach:** un solo componente server "riga partita" riusato in `/calendario` (vista Elenco), home "Partite della settimana" e home "Risultati della settimana scorsa": riga inclinata con blocco data rosso a sinistra (giorno abbreviato, numero grande, mese), al centro etichetta Campionato, squadre maiuscole su due righe con "vs", palestra in piccolo spaziato con Naviga; a destra, dopo un separatore verticale, l'orario grande a contorno (nei Risultati: il risultato).

## Boundaries & Constraints

**Always:** decisioni utente 2026-09-30 — sfondo della riga = `Campionato.colore` (default `#2e6f99`), testo scuro/chiaro via `testoScuroSuSfondo`; blocco data sempre rosso; nessuna riga evidenziata in rosso. Date in UTC con nomi italiani letterali (niente `toLocaleDateString`, niente fuso locale). Stessi dati e stesse query di oggi. Risultati: a destra `risultato`, altrimenti `statoDescrizione`, altrimenti "Risultato non disponibile" (in piccolo, non a contorno). Naviga solo con indirizzo, nuova scheda `noopener noreferrer`, target ≥44px, focus visibile. Niente nero; nuovo rosso `#C8102E` (bianco sopra ≥4.5:1) documentato in DESIGN.md. Nessuno scroll orizzontale a 375px.

**Ask First:** cambiare dati mostrati, query, ordinamento o raggruppamento per settimana; toccare vista Mese/popup o `/classifiche`.

**Never:** immagini/texture di sfondo della grafica (rete, pallone, grana) dentro la riga; logo nella riga; nuove librerie o font web. *Rinegoziato dall'utente il 2026-10-01: rete, pallone e luci della grafica ammessi nello sfondo delle fasce che contengono le righe (variante C, solo CSS + SVG inline, `app/SfondoMatchWeek.tsx`), mai dentro la riga.*

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Data | "2026-09-30" | blocco "MER" / "30" / "SET" | — |
| Data invalida | stringa non parsabile | blocco data vuoto, riga comunque mostrata | nessun crash |
| Partita futura | ora "20:30" | "20:30" a contorno a destra | — |
| Risultato presente | `risultato` "3-1" | "3-1" a contorno a destra | — |
| Risultato assente | `risultato` null, `statoDescrizione` "Rinviata" | "Rinviata" in piccolo a destra | fallback "Risultato non disponibile" se entrambi null |
| Colore chiaro | `#ffff66` | testi e contorno scuri | — |
| Senza palestra/indirizzo | `impianto`/`indirizzoImpianto` null | riga palestra omessa, niente Naviga | — |

</frozen-after-approval>

## Code Map

- `app/calendario/page.tsx:112-160` -- card attuale nell'Elenco (`.matchCard`, `.categoria`, `.squadre`, `.meta`, link Naviga), da sostituire con il componente; titoli di settimana invariati.
- `app/page.tsx:380-411` -- "Risultati della settimana scorsa" (`RisultatoSettimanaScorsa`: `campionatoNome`/`campionatoColore`, niente impianto) e `:439-482` "Partite della settimana" (`schedaPartita`, `luogoPartita`, Naviga).
- `app/home-pubblica.module.css:411-660` -- stili card/risultati della home da ripulire quando non più usati; `app/calendario/calendario.module.css:60-257` idem (lasciare gli stili della vista Mese).
- `lib/sincronizza-gare-fipav/vista-home-live.ts:25` -- tipo `RisultatoSettimanaScorsa`.
- `lib/griglia-mensile.ts` -- `NOMI_MESI` letterali, stesso approccio per le abbreviazioni.
- `lib/raggruppa-per-settimana.ts` -- `parseDataUtc`.
- `lib/colore-testo-leggibile.ts` -- `testoScuroSuSfondo`.
- `lib/link-naviga-palestra.ts` -- `costruisciLinkNaviga`.
- `_bmad-output/planning-artifacts/ux-designs/ux-societa-manager-2026-08-13/DESIGN.md` -- registro "Poster Sportivo" (sezione Colori, componente `match-card`).

## Tasks & Acceptance

**Execution:**
- [x] `lib/data-riga-partita.ts` + test -- `partiDataRigaPartita(data)` → `{ giorno: "MER", numero: "30", mese: "SET" } | null`, UTC, nomi letterali.
- [x] `app/RigaPartita.tsx` + `app/riga-partita.module.css` -- componente server presentazionale (props: data, campionatoNome, colore, squadraCasa, squadraOspite, impianto?, indirizzoImpianto?, destra: `{ tipo: "ora", valore }` | `{ tipo: "risultato", risultato, stato }`), layout della grafica, variante testo scuro, responsive sotto 900px.
- [x] `app/RigaPartita.test.tsx` -- render con `react-dom/server` (`renderToStaticMarkup`): matrice lato componente.
- [x] `app/calendario/page.tsx`, `app/page.tsx` -- usare `RigaPartita` nelle tre sezioni; rimuovere CSS morto dai due module.
- [x] `DESIGN.md` -- documentare il componente "riga partita Match Week" e il rosso `#C8102E` (contrasto verificato), come evoluzione di `match-card`.

**Acceptance Criteria:**
- Given `/calendario` (Elenco), la home Partite e la home Risultati, when le apro, then ogni partita è una riga Match Week con blocco data rosso, squadre con "vs" e orario (o risultato) grande a destra.
- Given una larghezza di 375px, when guardo una riga con nomi squadra lunghi, then niente viene tagliato né causa scroll orizzontale.

## Design Notes

Inclinazione: `clip-path: polygon(0 8px, 100% 0, 100% calc(100% - 8px), 0 100%)` sulla riga (bordi superiore/inferiore leggermente obliqui, testo dritto), non `transform: skew` (deformerebbe il testo). Contorno: `color: transparent; -webkit-text-stroke: 2px currentColor-equivalente` con fallback a testo pieno dove non supportato (`@supports not (-webkit-text-stroke: 1px)`). Tipografia: la stessa famiglia condensata peso 900 già in uso (`"Arial Black", "Arial Narrow", Impact`). Sotto 900px: blocco data più stretto, orario più piccolo ma sempre a destra.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: nessun errore
- `npm run lint` -- expected: 0 errori
- `npm test` -- expected: tutti verdi

**Manual checks (dev locale rotto, verificare al deploy):**
- `/calendario` e home a 375px e desktop: righe inclinate leggibili, colori Campionato chiari e scuri, Naviga cliccabile.

## Suggested Review Order

**Componente riga partita**

- Punto d'ingresso: struttura della riga (blocco data, corpo, colonna destra).
  [`RigaPartita.tsx:20`](../../app/RigaPartita.tsx#L20)

- Colonna destra: orario/risultato a contorno, fallback testuali.
  [`RigaPartita.tsx:98`](../../app/RigaPartita.tsx#L98)

- Inclinazione, blocco data rosso con filo bianco, mobile.
  [`riga-partita.module.css:28`](../../app/riga-partita.module.css#L28)
  [`riga-partita.module.css:60`](../../app/riga-partita.module.css#L60)
  [`riga-partita.module.css:278`](../../app/riga-partita.module.css#L278)

**Dati e mappature**

- Mappature pagina→props testate, colore normalizzato.
  [`props-riga-partita.ts:69`](../../lib/props-riga-partita.ts#L69)
  [`props-riga-partita.ts:84`](../../lib/props-riga-partita.ts#L84)
  [`props-riga-partita.ts:39`](../../lib/props-riga-partita.ts#L39)

- Blocco data e data estesa per screen reader, in UTC.
  [`data-riga-partita.ts:37`](../../lib/data-riga-partita.ts#L37)
  [`data-riga-partita.ts:61`](../../lib/data-riga-partita.ts#L61)

**Integrazione nelle pagine**

- Home: Risultati e Partite della settimana.
  [`page.tsx:377`](../../app/page.tsx#L377)
  [`page.tsx:410`](../../app/page.tsx#L410)

- Calendario, vista Elenco.
  [`page.tsx:124`](../../app/calendario/page.tsx#L124)

**Documentazione e test**

- DESIGN.md: nuovo componente e rosso Match Week.
  [`DESIGN.md:412`](../planning-artifacts/ux-designs/ux-societa-manager-2026-08-13/DESIGN.md#L412)

- Test di componente e helper.
  [`RigaPartita.test.tsx:1`](../../app/RigaPartita.test.tsx#L1)
  [`props-riga-partita.test.ts:1`](../../lib/props-riga-partita.test.ts#L1)
