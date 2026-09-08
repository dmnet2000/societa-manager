---
title: 'Story 7.3: Icona scheda browser - mostrare il logo reale'
type: 'bugfix'
created: '2026-09-08'
status: 'draft'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'icona della scheda del browser (favicon) non mostra il logo della società - l'utente vede un triangolo nero al suo posto.

**Approach:** il meccanismo esiste già ed è dinamico (`app/layout.tsx`, `generateMetadata`): se un logo è stato caricato da Admin/Dirigente via `/app/logo`, la favicon usa direttamente quel file; altrimenti ricade su un placeholder statico quadrato a tinta unita (`public/icons/icon-192.png`, verificato: un quadrato blu navy, non un triangolo) - quindi il triangolo visto dall'utente non corrisponde a nessuno dei due asset già noti in questo repository, e va prima diagnosticato dal vivo (nessun ambiente locale funzionante su questa macchina per riprodurlo) prima di poter scegliere il fix giusto tra le ipotesi sotto.

## Boundaries & Constraints

**Always:** primo passo è la diagnosi dal vivo (Task 1 sotto), non un fix alla cieca. Qualunque fix scelto deve continuare a rispettare il meccanismo dinamico esistente (logo Admin ha sempre priorità sul placeholder, cache-busting via `?v=` invariato) - nessuna regressione alla Story 18.21.

**Ask First:** quale ipotesi risulta corretta dopo la diagnosi (nessun logo mai caricato vs. logo caricato ma reso male in piccolo vs. problema di cache del browser vs. altro) determina il fix reale - va confermata con l'utente prima di procedere, non assunta.

**Never:** nessuna modifica al placeholder statico `public/icons/icon-192.png`/`icon-512.png` (icone del manifest PWA, deliberatamente un quadrato a tinta unita, decisione già presa con l'utente in Story 14.1/18.21) a meno che la diagnosi non indichi chiaramente che è la causa del problema riportato.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nessun logo mai caricato via /app/logo | `leggiInfoLogo` → `esiste: false` | Favicon = placeholder quadrato navy (comportamento attuale, non un triangolo secondo il codice) | N/A |
| Logo caricato ma di forma/formato che rende male in piccolo | `esiste: true`, file non ottimizzato per 16-32px | Favicon = il file caricato così com'è, potenzialmente irriconoscibile in piccolo | N/A |
| Favicon in cache dal browser dopo una sostituzione | cache-buster `?v=` già presente | Dovrebbe aggiornarsi da solo (meccanismo Story 18.21 già in atto) | N/A |

</frozen-after-approval>

## Code Map

- `app/layout.tsx` -- `generateMetadata` (righe ~58-70): meccanismo attuale, punto di partenza per qualunque fix.
- `app/app/(configurazione)/logo/page.tsx` + `LogoForm.tsx` -- gestione upload logo Admin, da verificare dal vivo se un logo è effettivamente presente oggi.
- `lib/storage/logo.ts` -- `leggiInfoLogo`/`urlPubblicoLogo`/`caricaLogo`, nessun vincolo di dimensione/formato imposto all'upload (solo MIME/magic-byte, Story 8.7) - un logo largo/rettangolare o con un elemento grafico centrale piccolo potrebbe risultare illeggibile ridotto a icona 16-32px.
- `public/icons/icon-192.png`/`icon-512.png` -- placeholder statico attuale (verificato: quadrato blu navy #312682, non un triangolo) usato quando nessun logo è caricato, e sempre per l'icona PWA/apple-touch-icon.

## Tasks & Acceptance

**Execution:**
- [ ] Diagnosi dal vivo (non in questa story, in una successiva quando si sviluppa): verificare se un logo è già caricato via `/app/logo`; se sì, ispezionare il file per capire perché appare come un triangolo nero in piccolo; se no, il fix potrebbe essere semplicemente caricarne uno appropriato (nessuna modifica di codice).
- [ ] Solo se la diagnosi indica una causa di codice (es. serve un asset favicon dedicato, ritagliato/ottimizzato per 16-32px, distinto dal logo esteso usato in header/nav): implementare quel fix specifico.

**Acceptance Criteria:**
- Given un logo società correttamente caricato, when un Visitatore/Utente guarda la scheda del browser, then vede un'icona riconoscibile come il logo della società, non un triangolo nero

## Verification

**Manual checks (dev locale rotto su questa macchina - la diagnosi stessa richiede un deploy o un accesso diretto al sito live):**
- Aprire `/app/logo` e verificare se un logo risulta già caricato.
- Ispezionare l'immagine servita come favicon (DevTools → Network → richiesta dell'icona) per capire cosa mostra realmente.
