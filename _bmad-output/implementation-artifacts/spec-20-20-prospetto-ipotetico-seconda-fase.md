---
title: 'Story 20.20: Prospetto ipotetico degli accoppiamenti di seconda fase'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '07a8baf11d50d64b45886723c120d35ab8ffb9e9'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** finché il calendario di girone non è completo, la pagina "Tabellone" di una Categoria (Epic 20, Story 20.4) mostra solo un riepilogo di completezza e il bottone "Genera tabellone" - nessun modo di vedere in anticipo come si incroceranno le posizioni di girone nella seconda fase.

**Approach:** aggiungere, nello stesso ramo "tabellone non ancora generato", un prospetto ipotetico di sola lettura con placeholder testuali (es. "1° Girone A") al posto dei nomi reali - nessuna `PartitaTorneo` creata. Il formato mostrato dipende dal numero di Squadre iscritte per Girone: 4 e 4 → schema esistente (1°-4° e 5°-8°, mirror di `generaTabelloneAction`); 3 e 3 → nuovo schema (1°-4° identico, ma 5°-6° è una finalina diretta tra le terze, non un tabellone completo).

## Boundaries & Constraints

**Always:**
- Puramente informativo: nessuna `PartitaTorneo` creata/modificata, nessuna chiamata a `generaTabelloneAction`.
- Mostrato solo nella pagina admin `tabellone/page.tsx`, nel ramo `!tabelloneGenerato`; mai sulla pagina pubblica `/torneo`.
- Formato dedotto SOLO dal conteggio Squadre per Girone (già caricato dalla pagina, nessuna query nuova): entrambi i Gironi con esattamente 4 Squadre → formato "8" (stesso schema di incrocio di `generaTabelloneAction`: SF1 1°A-2°B, SF2 1°B-2°A per il tabellone 1°-4°; SF1 3°A-4°B, SF2 3°B-4°A per il 5°-8°); entrambi con esattamente 3 Squadre → formato "6" (stesso tabellone 1°-4°; 5°-6° è un unico accoppiamento diretto 3°A vs 3°B, nessuna semifinale). Qualunque altra combinazione (Gironi sbilanciati, altri conteggi, iscrizioni incomplete) → nessun prospetto mostrato.
- Logica isolata in una funzione pura e testata, nessun I/O proprio - riceve solo i due conteggi.
- Placeholder in italiano che riusano `GIRONI_TORNEO` (`lib/girone-torneo.ts`) per le posizioni ("1° Girone A" ecc.) e `TABELLONI_TORNEO` (`lib/tabelloni-torneo.ts`) per le etichette delle finali già esistenti (formato 8 e la parte 1°-4° del formato 6); la finalina diretta del formato 6 usa una nuova etichetta locale ("Finalina 5°/6° posto"), non un `TabelloneTorneo` DB-backed.
- Guida in-app (`/app/torneo`, `lib/guida/contenuti.ts`) aggiornata per menzionare il nuovo prospetto ipotetico.

**Ask First:** nessuna - i limiti sopra sono già decisi qui, stesso principio già seguito da Story 20.4 per il minimo di 4 Squadre/girone.

**Never:** nessuna modifica a `generaTabelloneAction`, allo schema Prisma o alla generazione reale del tabellone per il formato a 6 Squadre (story futura). Nessuna persistenza del prospetto (ricalcolato a ogni render). Nessuna modifica alla pagina pubblica `/torneo`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Entrambi i Gironi con 4 Squadre | numeroGironeA=4, numeroGironeB=4 | 2 sezioni: tabellone 1°-4° e 5°-8°, ciascuna con 2 semifinali + 2 finali ipotetiche | N/A |
| Entrambi i Gironi con 3 Squadre | numeroGironeA=3, numeroGironeB=3 | 2 sezioni: tabellone 1°-4° (identico al formato 8) + finalina diretta 5°-6° (1 solo accoppiamento, nessuna semifinale) | N/A |
| Conteggi diversi o non riconosciuti | es. A=4/B=3, A=2/B=2, A=5/B=5 | nessun prospetto mostrato | N/A |
| Tabellone già generato per la Categoria | almeno una `PartitaTorneo` con `fase !== GIRONE` | prospetto ipotetico non mostrato (ramo sostituito dalla vista reale esistente) | N/A |

</frozen-after-approval>

## Code Map

- **Nuovo file** `lib/prospetto-ipotetico-torneo.ts` -- `calcolaProspettoIpoteticoTorneo(numeroGironeA: number, numeroGironeB: number): SezioneProspettoIpotetico[] | null` (pura); usa `GIRONI_TORNEO`/`ETICHETTA_GIRONE` (`lib/girone-torneo.ts`) per i placeholder di posizione e `TABELLONI_TORNEO` (`lib/tabelloni-torneo.ts`) per le etichette di finale riusabili
- **Nuovo file** `lib/prospetto-ipotetico-torneo.test.ts` -- i 4 scenari della matrice sopra, più verifica testuale degli accoppiamenti esatti per un caso formato 8 e uno formato 6
- `app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx` -- nel ramo `!tabelloneGenerato` (righe 128-144), deriva `numeroGironeA`/`numeroGironeB` da `squadre` (già caricata in cima al componente), chiama `calcolaProspettoIpoteticoTorneo` e, se non `null`, renderizza una nuova `<section className={styles.sezione}>` con le sezioni/accoppiamenti ipotetici, sotto `<GeneraTabelloneForm />`
- `lib/guida/contenuti.ts` -- rotta `/app/torneo` (riga ~451-467): una frase in più nel `corpo` che descrive il prospetto ipotetico, con commento sorgente "Story 20.20" nello stesso stile delle Story precedenti

## Tasks & Acceptance

**Execution:**
- [x] `lib/prospetto-ipotetico-torneo.ts` -- nuova funzione pura + tipi `SezioneProspettoIpotetico`/`AccoppiamentoIpotetico`
- [x] `lib/prospetto-ipotetico-torneo.test.ts` -- copertura della matrice I/O
- [x] `tabellone/page.tsx` -- sezione prospetto ipotetico nel ramo `!tabelloneGenerato`
- [x] `lib/guida/contenuti.ts` -- aggiornamento `corpo` rotta `/app/torneo`

**Acceptance Criteria:**
- Given una Categoria con tabellone già generato, when la pagina Tabellone viene renderizzata, then il prospetto ipotetico non compare (resta la vista reale esistente)
- Given un formato riconosciuto (8 o 6 Squadre), when il prospetto ipotetico è mostrato, then ogni accoppiamento usa solo placeholder testuali di posizione/Girone, mai un nome di Squadra reale
- Given la pagina `/app/torneo` della guida in-app, when un Admin/Dirigente la consulta, then trova menzionato il nuovo prospetto ipotetico

## Design Notes

Il tabellone 1°-4° dipende solo da 1°/2° classificato di ciascun Girone - posizioni che esistono in entrambi i formati (3 o 4 Squadre/Girone) - per questo la sua struttura ipotetica è condivisa identicamente tra i due formati. Il livello inferiore diverge perché con 3 Squadre/Girone non esiste un 4° classificato: 5°-8° (formato 8) richiede semifinali vere tra 3°/4°; 5°-6° (formato 6) è già una finale diretta tra le sole due terze classificate.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi, incluso il nuovo file di test
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (obbligatorio, dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Categoria con 4+4 Squadre iscritte, girone non concluso: verificare le 2 sezioni ipotetiche (1°-4° e 5°-8°) con gli accoppiamenti corretti.
- Categoria con 3+3 Squadre iscritte: verificare 1°-4° identico + finalina diretta 5°-6° (nessuna semifinale mostrata per quella).
- Categoria con conteggi diversi/non riconosciuti: verificare che non compaia alcun prospetto.
- Categoria con tabellone reale già generato: verificare che il prospetto ipotetico non compaia più.

## Suggested Review Order

**Logica pura del prospetto ipotetico**

- Entry point: dispatch di formato (4+4 → 2 sezioni; 3+3 → 2 sezioni diverse; altro → `null`).
  [`prospetto-ipotetico-torneo.ts:126`](../../lib/prospetto-ipotetico-torneo.ts#L126)

- Helper condiviso tra tabellone 1°-4° e 5°-8° (accorpato in review per eliminare la quasi-duplicazione iniziale), cerca `TABELLONI_TORNEO` per `.value`, mai per indice.
  [`prospetto-ipotetico-torneo.ts:58`](../../lib/prospetto-ipotetico-torneo.ts#L58)

- Finalina diretta 5°-6° del formato a 6 Squadre - nessuna semifinale, unico accoppiamento tra le due terze classificate.
  [`prospetto-ipotetico-torneo.ts:112`](../../lib/prospetto-ipotetico-torneo.ts#L112)

**Integrazione nella pagina Tabellone**

- Conteggio Squadre per Girone derivato da `statoGironi` (già calcolato, ordine `GIRONI_TORNEO` garantito) - nessuna nuova query, nessuna stringa letterale.
  [`page.tsx:108`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx#L108)

- Sezione JSX del prospetto ipotetico, sempre presente nel ramo `!tabelloneGenerato` - messaggio esplicito quando il formato non è riconosciuto, invece di sparire in silenzio.
  [`page.tsx:170`](../../app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx#L170)

**Guida in-app**

- Nuova frase nel `corpo` della rotta `/app/torneo` che descrive il prospetto ipotetico e i due formati.
  [`contenuti.ts:466`](../../lib/guida/contenuti.ts#L466)

**Peripherals**

- Test della funzione pura: i 4 scenari della matrice I/O più il confronto testuale esatto per formato 8 e formato 6.
  [`prospetto-ipotetico-torneo.test.ts:9`](../../lib/prospetto-ipotetico-torneo.test.ts#L9)

