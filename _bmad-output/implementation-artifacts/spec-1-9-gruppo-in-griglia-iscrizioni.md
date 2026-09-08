---
title: 'Story 1.9: Gruppo assegnato nella griglia Conferma Iscrizioni'
type: 'feature'
created: '2026-09-08'
status: 'draft'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** nella griglia "Conferma Iscrizioni" (Segreteria) non si vede a quale Gruppo un'Atleta è già stata assegnata per la stagione corrente - bisogna aprire `/app/gruppi` (Admin/Dirigente) per saperlo.

**Approach:** aggiungere una colonna "Gruppo" alla griglia esistente, letta da `GruppoAtleta` per l'Anno Agonistico corrente (stesso anno già usato per le Iscrizioni in questa pagina) - vuota/placeholder se l'Atleta non è ancora assegnata a nessun Gruppo.

## Boundaries & Constraints

**Always:** query aggiuntiva `prisma.gruppoAtleta.findMany({ where: { annoAgonisticoId: annoCorrente.id }, select: { atletaId, gruppoId } })` + `prisma.gruppo.findMany` per i nomi (mirror del pattern già in uso in `/app/gruppi/page.tsx` - `GruppoAtleta`/`Gruppo` non sono protetti da RLS, AD-9, Prisma diretto). Un'Atleta può appartenere a più Gruppi nella stessa stagione (AD-8/Story 9.21) - mostrare tutti i nomi assegnati, non solo il primo. Nessuna riga assegnata → cella vuota o trattino, mai "N/D" fuorviante (un'Atleta non ancora assegnata è uno stato normale del flusso, non un errore).

**Ask First:** nessuna prevista.

**Never:** nessuna modifica alla logica di conferma/esclusione iscrizione esistente (`IscrizioneRow.tsx`) - solo lettura aggiuntiva. Nessun link/azione cliccabile sulla nuova colonna (sola visualizzazione, l'assegnazione resta gestita da `/app/gruppi`, Admin/Dirigente).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Atleta assegnata a un Gruppo | 1 riga GruppoAtleta | Cella mostra il nome del Gruppo | N/A |
| Atleta assegnata a più Gruppi | N righe GruppoAtleta | Cella mostra tutti i nomi (separati da virgola) | N/A |
| Atleta non ancora assegnata | 0 righe | Cella vuota/trattino | N/A |
| Nessun Anno Agonistico corrente | `annoCorrente` null | Colonna sempre vuota per tutte le righe (stesso stato di Iscrizione oggi) | N/A |

</frozen-after-approval>

## Code Map

- `app/app/(iscrizioni)/conferma-iscrizioni/page.tsx` -- aggiungere le due query (`gruppoAtleta`/`gruppo` per `annoCorrente.id`, mirror `/app/gruppi/page.tsx` righe ~57-79), costruire una mappa `atletaId -> string[]` (nomi Gruppo), aggiungere `<th>Gruppo</th>` e passare i nomi a `IscrizioneRow`.
- `app/app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx` -- nuova prop `gruppi: string[]`, nuova `<td>{gruppi.join(", ") || "–"}</td>`.
- `lib/guida/contenuti.ts` -- estendere il corpo della guida per `/app/conferma-iscrizioni` (riga ~68-76) menzionando la nuova colonna.

## Tasks & Acceptance

**Execution:**
- [ ] `app/app/(iscrizioni)/conferma-iscrizioni/page.tsx` -- query Gruppo/GruppoAtleta + colonna
- [ ] `app/app/(iscrizioni)/conferma-iscrizioni/IscrizioneRow.tsx` -- nuova cella
- [ ] `lib/guida/contenuti.ts` -- aggiornamento guida

**Acceptance Criteria:**
- Given un'Atleta assegnata a uno o più Gruppi nella stagione corrente, when Segreteria/Admin/Dirigente apre `/app/conferma-iscrizioni`, then vede il/i nome/i del Gruppo nella riga di quell'Atleta
- Given un'Atleta non ancora assegnata a nessun Gruppo, when la pagina si carica, then la cella Gruppo è vuota, nessun errore

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx vitest run` -- expected: tutti verdi

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/app/conferma-iscrizioni` con Atlete sia assegnate che non assegnate a un Gruppo: verificare la colonna.
