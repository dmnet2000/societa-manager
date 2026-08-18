---
baseline_commit: b3767ee2d0f003d521627d4601e5faa29b275c79
---

# Story 11.5: Errore in console dal widget Facebook nella sezione "Ultimi post" (Chrome desktop)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Causa verificata prima di scrivere questa storia — già risolta strutturalmente da Story 18.13

`epics.md` prevedeva esplicitamente questo esito come uno dei due possibili (vedi AC sotto): la causa sospettata era interna all'iframe del Page Plugin di Facebook (`lib/embed-facebook.ts` al momento della segnalazione, 2026-08-14), con **Story 18.13** — già in backlog allora — indicata come "percorso di risoluzione naturale" perché sostituisce l'intero widget.

**Verificato in questa sessione (2026-08-17)** che Story 18.13 (Carosello automatico dei post Facebook in home) è nel frattempo stata implementata e completata (`sprint-status.yaml`: `done`, code review inclusa):

- `lib/embed-facebook.ts` (il file che ospitava l'iframe del Page Plugin, citato in `epics.md` come sorgente sospetta dell'errore) **non esiste più** nel repository — verificato con una ricerca diretta, nessun risultato.
- `app/page.tsx` monta oggi `HeroPostFacebook` (`app/HeroPostFacebook.tsx`), che renderizza i post recuperati server-side dalle API Graph di Facebook (`lib/facebook-graph.ts`) come normali elementi `<img>`/testo nella pagina — **nessun iframe, nessun dominio `facebook.com` caricato lato client**, nessun codice front-end interno di Facebook (`ErrorUtils`, `hrp`, `ExceptionDialog`, `guardList`, i pattern citati nell'errore originale) più eseguito nel browser del Visitatore.
- Una ricerca su tutto `app/` per `<iframe`/`plugins/post`/`www.facebook.com/plugins` non trova alcuna occorrenza residua legata a Facebook.

La classe di errore segnalata (codice interno del widget Facebook che gira dentro un iframe di terze parti) è quindi **strutturalmente impossibile** oggi: non esiste più alcun iframe Facebook nel sito in cui quel codice potrebbe eseguire. Questo corrisponde esattamente al primo ramo dell'AC originale di `epics.md` ("causa confermata come interna al widget Facebook... chiusa come 'nessun difetto di codice applicativo', con riferimento esplicito alla Story 18.13").

## Story

As a Visitatore che apre la home pubblica con Google Chrome da browser locale,
I want che la sezione "Ultimi post" non generi errori visibili in console,
so that l'esperienza resti percepita come affidabile anche osservando gli strumenti sviluppatore.

## Acceptance Criteria

1. **Given** un Visitatore apre la home pubblica da Chrome desktop con la sezione "Ultimi post" configurata e visibile **When** la pagina si carica **Then** nessun iframe/widget di terze parti Facebook viene caricato — verificato per lettura di codice (`app/page.tsx`/`HeroPostFacebook.tsx` non montano più alcun iframe, `lib/embed-facebook.ts` non esiste più), non necessitando più di riproduzione dal vivo per essere confermato
2. **And** la causa è confermata come interna al widget Facebook ormai rimosso (non un problema introdotto dal codice applicativo di questo progetto) — questa storia si chiude quindi come "nessun difetto di codice applicativo", con riferimento esplicito a Story 18.13 come risoluzione (AC originale di `epics.md`, primo ramo)
3. **And** nessuna modifica di codice necessaria: Story 18.13 ha già eliminato la causa nella sua interezza, non solo attenuato il sintomo

## Tasks / Subtasks

- [x] Task 1: Verificare che la causa sospettata (iframe Page Plugin Facebook) sia stata effettivamente rimossa da Story 18.13 (AC: #1, #2, #3)
  - [x] Confermato che `lib/embed-facebook.ts` non esiste più nel repository
  - [x] Confermato che `app/page.tsx` monta `HeroPostFacebook` (rendering server-side via Graph API, nessun iframe) al posto del vecchio widget
  - [x] Confermato via ricerca su `app/` che nessuna occorrenza di iframe/Page Plugin Facebook residua
- [x] Task 2: Chiudere la storia (AC: #2)
  - [x] Nessuna modifica di codice — la causa è già stata eliminata da Story 18.13, non da questa storia
  - [x] Nessun nuovo test necessario — nessun comportamento nuovo da verificare, solo l'assenza confermata di un componente già rimosso

## Dev Notes

### Perché questa storia non richiede `dev-story`

A differenza delle altre story dell'Epic 11 (11.1-11.4), qui non c'è alcuna correzione da implementare: la causa sospettata in `epics.md` è stata verificata come reale, ed è già stata eliminata per intero da un'altra storia (18.13) completata nel frattempo. L'AC originale di `epics.md` prevedeva esplicitamente questo esito ("questa storia viene chiusa come 'nessun difetto di codice applicativo'"). Creata e chiusa nella stessa sessione, stesso principio già applicato a Story 11.2 (causa "deploy/migrazione", non un difetto di codice residuo dopo la correzione).

### Perché non è stata tentata una riproduzione dal vivo

`epics.md` segnalava esplicitamente "nessuna riproduzione possibile in sandbox: la sezione richiede una Pagina Facebook reale configurata" — questo limite resta vero, ma è diventato irrilevante: con l'iframe ormai assente dal codice, non c'è più alcun meccanismo per cui l'errore originale (codice interno del widget Facebook) potrebbe ancora verificarsi, indipendentemente dalla configurazione. Se il Visitatore continuasse a vedere un errore simile in console dopo questa chiusura, sarebbe un fenomeno nuovo e diverso, non lo stesso segnalato qui — da aprire come storia separata se mai osservato.

### Cosa NON cambia in questa storia

Nessuna modifica a `app/page.tsx`, `app/HeroPostFacebook.tsx`, `lib/facebook-graph.ts` (il carosello Facebook di Story 18.13, invariato). Nessun file toccato da questa storia.

### Project Structure Notes

- Nessun file nuovo, nessun file modificato.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11, Story 11.5] — testo originale, AC che anticipava esattamente questo esito.
- [Source: _bmad-output/implementation-artifacts/18-13-carosello-facebook.md] — storia che ha eliminato l'iframe/Page Plugin, sostituendolo con `HeroPostFacebook`/`lib/facebook-graph.ts`.
- [Source: app/page.tsx, app/HeroPostFacebook.tsx] — verificato che nessun iframe viene montato oggi.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (create-story workflow)

### Debug Log References

### Completion Notes List

- File di story creato e chiuso nella stessa sessione (create-story workflow) — causa sospettata in `epics.md` (iframe Page Plugin Facebook, `lib/embed-facebook.ts`) verificata come rimossa per intero da Story 18.13 (`lib/embed-facebook.ts` non esiste più, `app/page.tsx` monta `HeroPostFacebook` via Graph API server-side, nessun iframe residuo trovato in `app/`). Nessuna modifica di codice necessaria — chiusa direttamente come "nessun difetto di codice applicativo", primo ramo dell'AC originale. Status: backlog → done, nessun passaggio da `dev-story`.

### File List

Nessuno.

## Change Log

- 2026-08-17: Story creata e chiusa nella stessa sessione (create-story workflow) — causa confermata come già risolta da Story 18.13 (rimozione completa dell'iframe Facebook). Nessuna implementazione necessaria. Status: backlog → done.
