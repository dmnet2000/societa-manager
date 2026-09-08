---
title: 'Story 2.9: Vista Orari divisa per Gruppo'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'f0e578111ef467a702f6571ebc67de70c3740baa'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/app/orari` (Segreteria) mostra tutti gli Slot in un'unica tabella piatta filtrabile per Palestra/Gruppo - con più Gruppi attivi diventa "incasinata" (richiesta esplicita dell'utente), serve applicare un filtro per leggerla in modo utile.

**Approach:** raggruppare automaticamente la stessa vista per Gruppo - una sezione per Gruppo, ciascuna con la propria tabella Slot (`SlotTable`, riusata invariata) - il filtro Palestra esistente resta (restringe gli Slot mostrati dentro ciascuna sezione), il filtro Gruppo esistente resta per saltare direttamente a un solo Gruppo.

## Boundaries & Constraints

**Always:** riusare `SlotTable` tale e quale (nessuna modifica al componente) - la colonna "Gruppo" della tabella diventa ridondante col titolo di sezione, ma resta (nessuna variante del componente solo per questo, stessa tabella condivisa da `slot/`/`mio-orario/`). Una sezione per Gruppo, ordinate per nome Gruppo (stesso `orderBy: { nome: "asc" }` già in uso). Un Gruppo senza Slot (nel filtro corrente) mostra comunque la propria sezione con un messaggio esplicito ("Nessuno Slot trovato.", riuso di `messaggioVuoto` già supportato da `SlotTable`) - mai una sezione sparita in silenzio, l'Utente deve poter vedere quali Gruppi non hanno ancora orari assegnati. I filtri Palestra/Gruppo esistenti (query string, `<form method="get">`) restano invariati nel comportamento.

**Ask First:** nessuna prevista.

**Never:** nessuna modifica a `/app/slot` (Admin/Dirigente) né a `/app/mio-orario` (Allenatore/Atleta) - entrambe riusano `SlotTable` ma restano fuori scope, nessuna richiesta di raggrupparle. Nessuna modifica al modello dati o alle Server Action esistenti - solo la vista di `/app/orari`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Più Gruppi con Slot assegnati | N Gruppi, ciascuno con Slot | Una sezione per Gruppo, ciascuna con la propria tabella | N/A |
| Un Gruppo senza Slot (nessun filtro Palestra attivo) | 0 Slot per quel Gruppo | Sezione presente con messaggio esplicito, non sparisce | N/A |
| Filtro Palestra attivo | solo Slot di quella Palestra | Ogni sezione Gruppo mostra solo i propri Slot in quella Palestra (eventualmente vuota, stesso messaggio) | N/A |
| Filtro Gruppo attivo | un solo Gruppo | Una sola sezione mostrata | N/A |
| Nessun Anno Agonistico corrente | `gruppi`/`slot` vuoti | Nessuna sezione, stesso comportamento attuale (pagina sostanzialmente vuota) | N/A |

</frozen-after-approval>

## Code Map

- `app/app/(orari-palestre)/orari/page.tsx` -- sostituire l'unica `<SlotTable slot={slot} .../>` (riga ~102) con un `gruppi.map((gruppo) => ...)` che filtra `slot` per `gruppo.id` e renderizza una `<section>` con `<h3>{gruppo.nome}</h3>` + `<SlotTable slot={slotDelGruppo} messaggioVuoto="Nessuno Slot trovato." />` per ciascuno; il filtro Gruppo esistente (`gruppoId` da `searchParams`) già restringe `gruppi`/`slot` a monte quando impostato (nessuna modifica alla query esistente).
- `app/app/(orari-palestre)/orari/orari.module.css` -- eventuale classe per l'intestazione di sezione per Gruppo (mirror di uno stile `<h3>` già in uso altrove nel progetto, es. `titoloGirone`/pattern equivalente).
- `app/app/(orari-palestre)/SlotTable.tsx` -- nessuna modifica, riusato tale e quale.

## Tasks & Acceptance

**Execution:**
- [x] `app/app/(orari-palestre)/orari/page.tsx` -- raggruppare la vista Slot per Gruppo
- [x] `lib/raggruppa-slot-per-gruppo.ts` + test (non previsto nel Code Map iniziale, necessario) -- raggruppamento estratto come funzione pura testata, stesso principio di ogni altro raggruppamento del progetto
- [x] `lib/guida/contenuti.ts` (non previsto nel Code Map iniziale, necessario) -- aggiornamento guida per la nuova struttura

**Acceptance Criteria:**
- Given più Gruppi con Slot nella stagione corrente, when Segreteria apre `/app/orari` senza filtri, then vede una sezione per Gruppo con i propri Slot, senza doverli filtrare manualmente
- Given il filtro Palestra impostato, when la pagina si ricarica, then ogni sezione Gruppo mostra solo gli Slot di quella Palestra
- Given un Gruppo senza alcuno Slot nel filtro corrente, when la pagina si carica, then la sua sezione compare comunque con un messaggio esplicito

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx vitest run` -- expected: tutti verdi

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/app/orari` con più Gruppi e Slot su Palestre diverse: verificare le sezioni e i filtri.
- Aprire `/app/orari` con un `gruppoId` nella query string che non corrisponde più a nessun Gruppo esistente: verificare il messaggio esplicito invece di una sezione vuota.

## Suggested Review Order

**Il cuore della story: raggruppamento per Gruppo**

- Funzione pura estratta e testata (review fix, Verification Gap Reviewer - ogni altro raggruppamento del progetto segue questo stesso principio, nessuna pagina viene mai testata direttamente).
  [`lib/raggruppa-slot-per-gruppo.ts:24`](../../lib/raggruppa-slot-per-gruppo.ts#L24)

- Uso nella pagina, incluso il fix per l'elenco Gruppi vuoto (trovato indipendentemente da Edge Case Hunter e Verification Gap Reviewer: prima di questo fix la sezione restava completamente vuota, senza messaggio, se zero Gruppi esistevano o se il filtro `gruppoId` non corrispondeva più a nessun Gruppo).
  [`page.tsx:101`](../../app/app/(orari-palestre)/orari/page.tsx#L101)
