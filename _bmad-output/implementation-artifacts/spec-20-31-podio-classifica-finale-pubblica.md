---
title: 'Story 20.31: Classifica finale in stile podio sulla vista pubblica del Torneo'
type: 'feature'
created: '2026-09-13'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'd9ea1ddf2ee5fafdb3998f1938b6f65a771c2608'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** su `/torneo`, la "Classifica finale" di ciascuna Categoria (Story 20.4) e' oggi una tabella HTML semplice a due colonne (Posizione/Squadra) - richiesta esplicita dell'utente: renderla piu' accattivante, non una lista piatta, coerente col registro "Poster Sportivo" gia' usato per il resto della pagina (match-card, colori, tagli diagonali).

**Approach:** le prime 3 posizioni diventano un **podio** (3 card affiancate, ordine visivo 2°-1°-3°, la card del 1° posto piu' grande/in rilievo, medaglia oro/argento/bronzo) - decisione dell'utente durante il checkpoint di questa story. Le posizioni dalla 4ª in poi restano una lista semplice sotto il podio (nessun cambiamento per quelle righe, il podio e' la sola novita' visiva).

## Boundaries & Constraints

**Always:**
- **Ambito: solo la vista pubblica `/torneo`** (`app/torneo/page.tsx`, `torneo-pubblico.module.css`) - la tabella classifica finale dell'area amministrativa (`tabellone/page.tsx`, `torneo.module.css`, registro interno diverso) resta invariata, stesso principio di separazione dei due registri gia' stabilito in Story 20.6/20.10 (mai mescolare lo stile pubblico "Poster Sportivo" con quello amministrativo).
- **Podio = esattamente le posizioni 1, 2, 3** di `classificaFinale` (mai una soglia diversa, indipendente dal formato 6 o 8 squadre - Story 20.26). Le posizioni successive (4ª in poi, 3 o 5 righe a seconda del formato) restano una lista/tabella semplice, invariata nella struttura di oggi.
- **Ordine visivo del podio**: 2° a sinistra, 1° al centro (card piu' grande/in rilievo), 3° a destra - mirror del podio reale, deciso con l'utente durante il checkpoint.
- **Un'icona/etichetta medaglia distinta per le prime 3 posizioni** (oro/argento/bronzo), oltre al numero di posizione e al nome Squadra - nessuna nuova informazione sui dati (nessun punteggio/nessuna nuova query), solo presentazione.
- Su schermi stretti (sotto i 900px, stesso breakpoint gia' in uso per `.matchGrid` in questo modulo) il podio impila le 3 card su una sola colonna, ordine 1°-2°-3° (ordine di lettura naturale quando non c'e' piu' spazio per l'effetto podio affiancato).
- **Contrasto testo verificato AA** su qualunque nuovo colore introdotto per le card podio (oro/argento/bronzo), stessa disciplina gia' applicata in Story 18.16/20.16 per ogni nuovo colore di questo registro - valori hex esatti e contrasti calcolati sono una decisione implementativa, non bloccante per questa spec.
- Nessuna Categoria senza classifica finale completa mostra il podio - resta il messaggio esplicito gia' esistente ("La classifica finale sarà consultabile...", invariato).

**Ask First:** nessuna - lo stile (podio per 1°-3°, lista per il resto) e' stato scelto esplicitamente dall'utente tra 3 alternative proposte durante il checkpoint di questa story.

**Never:** nessuna modifica al calcolo della classifica finale (`calcolaClassificaFinale`, Story 20.4/20.26, invariato - solo presentazione). Nessuna modifica alla tabella classifica finale dell'area amministrativa. Nessun nuovo dato mostrato oltre a posizione/nome Squadra gia' disponibili oggi (niente punti/statistiche aggiuntive, fuori scope).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Classifica finale completa, formato 8 (4+4) | 8 posizioni | Podio per 1°-3°, lista per 4°-8° (5 righe) | N/A |
| Classifica finale completa, formato 6 (3+3) | 6 posizioni | Podio per 1°-3°, lista per 4°-6° (3 righe) | N/A |
| Classifica finale non ancora completa | `classificaFinale === null` | Messaggio esplicito esistente, invariato - nessun podio parziale mai mostrato | N/A |
| Schermo stretto (<900px) | qualunque classifica completa | Podio impilato su una colonna, ordine 1°-2°-3° | N/A |
| Vista amministrativa (`tabellone/page.tsx`) | qualunque stato | Tabella invariata, nessun podio | N/A |

</frozen-after-approval>

## Code Map

- `app/torneo/torneo-pubblico.module.css` -- nuove classi `.podio` (contenitore grid a 3 colonne, mirror di `.matchGrid` per il breakpoint 900px ma con ordine visivo 2°-1°-3° via `order`), `.cardPodio`/`.cardPodioPrimo` (card con taglio diagonale mirror di `.matchCard`, quella del 1° posto piu' grande/con margine negativo per "salire" visivamente), `.medaglia` (icona/etichetta oro/argento/bronzo) - nuovi hex letterali commentati, stessa convenzione del resto del modulo.
- `app/torneo/page.tsx` -- righe 638-661 (sezione "Classifica finale" pubblica): `classificaFinale.slice(0, 3)` renderizzato come podio (nuovo markup), `classificaFinale.slice(3)` renderizzato con la tabella esistente invariata (stessa struttura Posizione/Squadra di oggi, solo a partire dalla 4ª posizione).
- Nessuna modifica a `tabellone/page.tsx` (area amministrativa, fuori scope).

## Tasks & Acceptance

**Execution:**
- [ ] `torneo-pubblico.module.css` -- nuove classi podio (contenitore + card + medaglia), contrasto AA verificato sui nuovi colori
- [ ] `app/torneo/page.tsx` -- split `classificaFinale` in podio (1-3) + lista (4+), nuovo markup per il podio

**Acceptance Criteria:**
- Given una Categoria con classifica finale completa, when la pagina `/torneo` viene renderizzata, then le prime 3 posizioni compaiono come podio (2°-1°-3°, il 1° in rilievo) e le posizioni successive restano in lista semplice
- Given uno schermo stretto, when la stessa pagina viene renderizzata, then il podio si impila su una colonna in ordine 1°-2°-3°
- Given l'area amministrativa (`tabellone/page.tsx`), when un Admin la consulta, then la tabella classifica finale resta invariata (nessun podio)
- Given una Categoria con classifica finale non ancora completa, then il messaggio esplicito esistente resta invariato, nessun podio parziale

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti verdi (nessuna nuova logica di calcolo, solo markup/CSS - nessun nuovo test di logica pura atteso)
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Verificare dal vivo l'aspetto del podio su una Categoria con classifica finale gia' completa, sia formato 6 che formato 8 se disponibili.
- Verificare il collasso a una colonna sotto i 900px (resize/mobile).
- Verificare il contrasto testo/sfondo dei nuovi colori oro/argento/bronzo.

