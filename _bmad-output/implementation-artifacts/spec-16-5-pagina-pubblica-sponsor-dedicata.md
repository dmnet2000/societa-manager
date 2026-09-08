---
title: 'Story 16.5: Pagina pubblica dedicata per gli Sponsor'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '891ccec745126633a79e6b6ebe9895f557407da2'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** dopo l'introduzione del banner sponsor rotante fisso (Story 16.4, visibile ora su ogni pagina pubblica), la sezione statica "I nostri sponsor"/"Convenzioni" sulla home pubblica (Story 18.2) è ridondante con quella striscia e appesantisce la home.

**Approach:** rimuovere la sezione Sponsor dalla home pubblica e spostarla, invariata nel contenuto (stessi due gruppi Banner/Convenzioni, stesse card), su una nuova pagina pubblica dedicata `/sponsor` - stesso pattern strutturale delle pagine pubbliche sorelle (`/squadre`, `/calendario`, `/staff`).

## Boundaries & Constraints

**Always:** riusare `raggruppaSponsorPerTipo`/`SponsorPubblicoCard`/`urlPubblicoImmagineSponsor` tali e quali (nessuna nuova logica di raggruppamento o card) - solo relocati dove serve. Stessa query Sponsor già in uso sulla home (`where: { attiva: true }`, stesso `select` esplicito) spostata sulla nuova pagina. Mostrare un messaggio esplicito ("Nessuno sponsor al momento.", stessa etichetta già usata in `/app/sponsor`, Story 16.2 AC #4) quando zero Sponsor sono attivi, mai una pagina vuota senza spiegazione. `SponsorPubblicoCard.tsx` e le classi CSS relative (`.sezioneSponsor`/`.titoloSponsor`/`.gruppoSponsor`/`.listaSponsor`/`.schedaSponsor`/`.anteprimaSponsor`/`.linkImmagineSponsor`, oggi in `app/home-pubblica.module.css`) si spostano nella cartella/modulo della nuova pagina - un CSS module per pagina, stessa convenzione già stabilita nel progetto (nessun import cross-page di un modulo CSS). Header/Footer pubblici montati come su ogni altra pagina pubblica (mirror esatto di `/squadre`/`/calendario`).

**Ask First:** nessuna prevista.

**Never:** nessuna voce di navigazione aggiunta in codice - il menu pubblico è già gestito da Admin/Site Manager tramite `/app/menu-pubblico` (tabella `VoceMenuPubblico`), un'eventuale voce verso `/sponsor` è una scelta editoriale loro, fuori scope tecnico di questa story. Nessuna modifica al banner sponsor rotante fisso (Story 16.4, resta su ogni pagina inclusa questa nuova). Nessuna modifica alla vetrina autenticata `/app/sponsor` (Story 16.2, voucher incluso) né al carosello interno (Story 16.3). Nessuna funzionalità di generazione voucher sulla nuova pagina pubblica (stessa esclusione già decisa in Story 18.2 per `SponsorPubblicoCard.tsx`: nessuna fonte di Nome/Cognome per un Visitatore anonimo).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Almeno un Banner e/o una Convenzione attivi | Sponsor attivi presenti | Pagina `/sponsor` mostra i gruppi pertinenti (stesse card di oggi) | N/A |
| Zero Sponsor attivi | nessuna riga | Messaggio esplicito "Nessuno sponsor al momento.", nessuna area vuota | N/A |
| Home pubblica dopo la rimozione | qualunque stato Sponsor | Nessuna sezione Sponsor sulla home, resto della pagina invariato | N/A |

</frozen-after-approval>

## Code Map

- `app/page.tsx` -- rimuovere: import `raggruppaSponsorPerTipo`/`SponsorPubblicoCard`, la query `prisma.sponsor.findMany` (righe ~127-150) e le variabili derivate (`banner`/`convenzioni`/`mostraSponsor`, righe ~230-240), l'intera sezione `{mostraSponsor && (...)}` (righe ~329-364). Nessun'altra modifica alla home.
- `app/home-pubblica.module.css` -- rimuovere le classi ora inutilizzate: `.titoloSponsor`, `.sezioneSponsor`, `.gruppoSponsor`/`.gruppoSponsor + .gruppoSponsor`, `.listaSponsor`, `.schedaSponsor`, `.anteprimaSponsor`, `.linkImmagineSponsor`/`:focus-visible` (righe ~403-462) - verificare con una ricerca nel file che nessun'altra sezione della home le riusi prima di cancellarle.
- `app/sponsor/page.tsx` (nuovo) -- mirror strutturale di `app/squadre/page.tsx`/`app/calendario/page.tsx` (Header/Footer pubblici, `<h1 className={styles.titolo}>Sponsor</h1>`, `export const dynamic = "force-dynamic"` stesso motivo già documentato in `app/page.tsx` per gli Sponsor). Query e raggruppamento spostati tali e quali da `app/page.tsx`. Messaggio esplicito quando entrambi i gruppi sono vuoti.
- `app/sponsor/sponsor-pubblico.module.css` (nuovo) -- le classi rimosse da `home-pubblica.module.css` sopra, invariate, più `.titolo`/`.main` mirror degli stessi stili già presenti in `torneo-pubblico.module.css`/`squadre.module.css` per le pagine sorelle.
- `app/sponsor/SponsorPubblicoCard.tsx` (spostato da `app/SponsorPubblicoCard.tsx`) -- stesso componente, import dello style aggiornato al nuovo modulo di questa pagina.
- `lib/sponsor/raggruppa-sponsor-per-tipo.ts`, `lib/storage/sponsor.ts` -- nessuna modifica, riusati tali e quali dalla nuova pagina.

## Tasks & Acceptance

**Execution:**
- [x] `app/page.tsx` -- rimuovere sezione Sponsor e relative letture/import
- [x] `app/sponsor/page.tsx` + `sponsor-pubblico.module.css` -- nuova pagina pubblica dedicata
- [x] `app/sponsor/SponsorPubblicoCard.tsx` -- spostato da `app/`, import CSS aggiornato
- [x] `app/home-pubblica.module.css` -- rimozione classi ora inutilizzate
- [x] `lib/auth/route-guard.ts` (non previsto nel Code Map iniziale, necessario) -- `/sponsor` aggiunta a `PUBLIC_ROUTES`

**Acceptance Criteria:**
- Given uno o più Sponsor attivi, when un Visitatore apre `/`, then non vede più alcuna sezione Sponsor sulla home
- Given uno o più Sponsor attivi, when un Visitatore apre `/sponsor`, then vede gli stessi contenuti (Banner/Convenzioni, immagine, nome, descrizione, link) prima mostrati in home
- Given zero Sponsor attivi, when un Visitatore apre `/sponsor`, then vede un messaggio esplicito invece di una pagina vuota
- Given il banner sponsor rotante fisso (Story 16.4), when un Visitatore naviga su `/sponsor`, then il banner resta visibile in fondo come su ogni altra pagina pubblica (nessuna regressione)

## Design Notes

Nessuna voce di navigazione hardcoded aggiunta: il menu pubblico di questo progetto è dati (`VoceMenuPubblico`, gestito da `/app/menu-pubblico`), non codice - collegare `/sponsor` al menu è una scelta editoriale dell'Admin/Site Manager da fare dopo il deploy, non parte di questa story.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npx vitest run` -- expected: tutti verdi

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/` e verificare l'assenza della sezione Sponsor.
- Aprire `/sponsor` e verificare la presenza dei contenuti Banner/Convenzioni identici a quelli rimossi dalla home, più il banner fisso in fondo (Story 16.4).
- Disattivare tutti gli Sponsor e verificare il messaggio esplicito su `/sponsor`.

## Suggested Review Order

**Il cuore della story: spostamento della sezione**

- Nuova pagina pubblica, mirror strutturale di `/squadre`/`/calendario`.
  [`app/sponsor/page.tsx:20`](../../app/sponsor/page.tsx#L20)

- Rimozione dalla home: query, raggruppamento e sezione Sponsor tolti, sostituiti da un conteggio dedicato per il solo scopo di posizionare il `CookieBanner`.
  [`app/page.tsx:105`](../../app/page.tsx#L105)

**Adattamento non previsto nel Code Map ma necessario**

- `/sponsor` aggiunta a `PUBLIC_ROUTES` - senza questa riga un Visitatore anonimo veniva rediretto al login, stesso bug già risolto per le altre pagine pubbliche sorelle (Story 18.7/20.6).
  [`lib/auth/route-guard.ts:66`](../../lib/auth/route-guard.ts#L66)
