---
title: 'Story 2.12: Vista Gruppi Segreteria - sezioni divise per Gruppo'
type: 'feature'
created: '2026-09-09'
status: 'draft'
review_loop_iteration: 0
context: []
baseline_commit: '8f93123cb9b5d85376734147d2ac8a1aed3fc065'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** nel ramo di sola lettura Segreteria di `/app/gruppi` (Story 2.10/2.11), tutti i Gruppi condividono un'unica tabella (Nome/Categoria ripetuti su ogni riga Atleta, un sottile bordo interno a separare le righe dello stesso Gruppo) - richiesta esplicita dell'utente: una divisione reale tra i vari Gruppi, non tutto in un'unica tabella.

**Approach:** stessa ristrutturazione già applicata a `/app/orari` per la stessa identica richiesta (Story 2.9, "vorrei avere gli orari divisi per i singoli gruppi") - una sezione per Gruppo, ciascuna con il proprio `<h3>` (nome + categoria) e la propria tabella (ora con la sola colonna "Atleta", Nome/Categoria del Gruppo non più ripetuti per riga - vivono nell'intestazione di sezione). Il raggruppamento viene estratto in una funzione pura testata (`lib/raggruppa-atlete-per-gruppo.ts`), stesso principio già consolidato nel progetto per ogni logica "raggruppa per display" (5 precedenti: `raggruppaPartitePerGruppo`, `raggruppaGruppiPerCategoria`, `raggruppaPerSettimana`, `raggruppaSponsorPerTipo`, `raggruppaSlotPerGruppo`).

## Boundaries & Constraints

**Always:** un Gruppo senza Atlete assegnate mostra comunque la propria sezione con un messaggio esplicito ("Nessuna Atleta assegnata a questo Gruppo.", stesso principio "mai una riga/sezione sparita in silenzio" già in uso in questo file e in `/app/orari`) - mai una sezione sparita in silenzio. Sezioni ordinate per nome Gruppo (stesso `orderBy: { nome: "asc" }` già in uso). Il ramo di gestione Admin/Dirigente (`!soloVisualizzazione`, unica tabella con `GruppoRow`) resta interamente invariato - questa story tocca SOLO il ramo di sola lettura Segreteria.

**Ask First:** nessuna prevista.

**Never:** nessuna modifica al ramo di gestione Admin/Dirigente, a `GruppoRow.tsx`/`NuovoGruppoForm.tsx`, né alla logica di autorizzazione (`soloVisualizzazione`) già stabilita in Story 2.10 - questa story riguarda solo il markup del ramo di sola lettura.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Più Gruppi con Atlete assegnate | N Gruppi, ciascuno con Atlete | Una sezione per Gruppo, ciascuna con il proprio `<h3>` e la propria tabella "Atleta" | N/A |
| Un Gruppo senza Atlete assegnate | 0 Atlete per quel Gruppo | Sezione presente con messaggio esplicito, non sparisce (invariato da Story 2.11) | N/A |
| Nessun Gruppo nella stagione corrente | 0 Gruppi | Messaggio esplicito "Nessun Gruppo trovato per la stagione corrente." (invariato da Story 2.10) | N/A |
| Due Atlete con lo stesso nome nello stesso Gruppo | nomi identici | Ordine deterministico (secondo criterio `atleta.id`, invariato da Story 2.11) | N/A |

</frozen-after-approval>

## Code Map

- `lib/raggruppa-atlete-per-gruppo.ts` (nuovo) -- funzione pura `raggruppaAtletePerGruppo<G extends {id:string}, A extends {id:string; nome:string}>(gruppi: G[], gruppoAtleteRows: {gruppoId:string; atletaId:string}[], atletaPerId: Map<string, A>): {gruppo: G; atlete: A[]}[]` - mirror strutturale di `raggruppaSlotPerGruppo` (stesso principio, adattato: qui l'associazione Atleta passa per un `Map` invece che per un campo `gruppo` già presente sull'entità, perché `GruppoAtleta` è una riga di giunzione separata).
- `lib/raggruppa-atlete-per-gruppo.test.ts` (nuovo) -- test analoghi a `raggruppa-slot-per-gruppo.test.ts` (gruppi vuoto, Gruppo senza Atlete, partizione multi-Gruppo, ordine preservato, determinismo su nomi duplicati).
- `app/app/(gruppi-allenatori)/gruppi/page.tsx` -- ramo `soloVisualizzazione` (righe ~174-266): sostituire l'unica `<table>` con `raggruppaAtletePerGruppo(...)` + `.map()` che renderizza una `<div className={styles.gruppoSezione}>` per elemento, con `<h3>` (nome + categoria) e una tabella a singola colonna "Atleta" (o il messaggio vuoto "Nessuna Atleta assegnata a questo Gruppo." se `atlete.length === 0`).
- `app/app/(gruppi-allenatori)/gruppi/gruppi.module.css` -- nuove classi `.gruppoSezione`/`.gruppoTitolo`/`.gruppoCategoria` (mirror di `.gruppoSezione`/`.gruppoTitolo` già esistenti in `orari.module.css` per lo stesso pattern - qui in un modulo CSS diverso, convenzione "un CSS module per pagina" del progetto). `.rigaInterna` (Story 2.11) va rimossa: verificato che è referenziata SOLO da `page.tsx:248`, esclusivamente nel ramo Segreteria che questa story ristruttura (il ramo di gestione Admin/Dirigente usa un pattern di soppressione bordo diverso, `.rigaAtlete`/`.rigaAllenatori`/`.rigaFotoSquadra`/`.rigaModificaGruppo`, non toccato) - con una tabella per Gruppo (una sola colonna "Atleta") non serve più sopprimere alcun bordo tra righe dello stesso Gruppo.

## Tasks & Acceptance

**Execution:**
- [ ] `lib/raggruppa-atlete-per-gruppo.ts` + test -- funzione pura estratta e testata
- [ ] `app/app/(gruppi-allenatori)/gruppi/page.tsx` -- ramo Segreteria ristrutturato in sezioni per Gruppo
- [ ] `app/app/(gruppi-allenatori)/gruppi/gruppi.module.css` -- nuove classi, pulizia di `.rigaInterna` se diventata dead code

**Acceptance Criteria:**
- Given più Gruppi con Atlete nella stagione corrente, when Segreteria apre `/app/gruppi`, then vede una sezione distinta per Gruppo (intestazione + tabella propria), non un'unica tabella con Nome/Categoria ripetuti
- Given un Gruppo senza Atlete assegnate, when la pagina si carica, then la sua sezione compare comunque con un messaggio esplicito
- Given il ramo di gestione Admin/Dirigente, when quell'Utente apre `/app/gruppi`, then la vista resta identica a prima (nessuna regressione)

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx vitest run` -- expected: tutti verdi

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/app/gruppi` con un Utente Segreteria e più Gruppi: verificare sezioni distinte, ciascuna con la propria intestazione e tabella.
- Aprire la stessa rotta con un Utente Admin/Dirigente: verificare che il ramo di gestione sia invariato.
