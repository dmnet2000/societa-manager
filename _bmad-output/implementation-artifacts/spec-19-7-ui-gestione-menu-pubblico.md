---
title: 'Story 19.7: UI di gestione del menu pubblico'
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '333ab4a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La tabella e le funzioni di lettura/scrittura di `VoceMenuPubblico` esistono (Story 19.6), ma nessuna UI le usa - un Site Manager/Admin non ha modo di aggiungere, modificare, riordinare o nascondere una voce.

**Approach:** Nuova pagina `/app/menu-pubblico` (route-guard: `["ADMIN","SITE_MANAGER"]`, non Dirigente - l'AC della story limita esplicitamente a questi due, funzionalità nuova senza permesso preesistente da affiancare). Server Action per creare/modificare/nascondere-mostrare/riordinare, mirror strutturale di `sponsor/actions.ts`. Riordino tramite due bottoni Su/Giù (nessuna libreria drag-and-drop nel progetto) invece di un meccanismo più complesso.

## Boundaries & Constraints

**Always:** ogni operazione scrive sulla tabella di 19.6 tramite le funzioni di `lib/menu-pubblico.ts` (nessuna query Prisma diretta nella Server Action). La pagina resta scollegata da `app/NavPubblica.tsx` (arriva con la 19.8) - avviso esplicito in pagina per non far credere a un Site Manager che le modifiche siano già live sul sito pubblico.

**Ask First:** l'AC non specifica se la nuova rotta entra nel gruppo di nav "Gestione sito" (Impostazioni/Sponsor/Foto squadre, Story 19.4) - **assunzione**: sì, stessa collocazione delle altre 3 rotte di gestione del sito pubblico, coerenza con la convenzione già stabilita nell'epica. Verificato che il filtro per Ruolo avviene prima del raggruppamento (`raggruppaVociNavigazione`) - un Dirigente senza accesso a questa rotta non la vede comunque tra le figlie del gruppo, nessuna fuga di una voce inaccessibile.

**Never:** nessuna funzione di cancellazione (non richiesta dagli AC, `lib/menu-pubblico.ts` di 19.6 non ne espone una). Nessun controllo di Ruolo duplicato in `page.tsx` (route-guard è già il cancello, stesso pattern di `foto-squadre/page.tsx`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin/Site Manager apre `/app/menu-pubblico` | route-guard controlla `ruoliAmmessi` | pagina raggiungibile, elenco voci + form nuova voce | N/A |
| Utente senza quei Ruoli (es. Dirigente) | route-guard | bloccato | redirect `/app/non-autorizzato` |
| Crea/aggiorna una voce con URL `/squadre` (rotta interna) | validazione | accettato | N/A |
| Crea/aggiorna una voce con URL `https://...` (link esterno) | validazione | accettato | N/A |
| Crea/aggiorna una voce con URL `javascript:...`/vuoto/senza `/` iniziale e senza http(s) | validazione | rifiutato | `VALIDATION` |
| Sposta "su" la prima voce / "giù" l'ultima | `spostaVoceMenuPubblicoAction` | no-op, nessuna scrittura | `{success:true}`, non un errore |
| Nascondi/Mostra una voce | `impostaVisibileVoceMenuPubblicoAction` | `visibile` aggiornato, riga non cancellata | N/A |

</frozen-after-approval>

## Code Map

- `lib/auth/route-guard.ts` -- nuova entry `{ prefix: "/app/menu-pubblico", ruoliAmmessi: ["ADMIN","SITE_MANAGER"], navLabel: "Menu pubblico", gruppo: "Gestione sito" }`, dichiarata subito dopo `/app/foto-squadre` (quarta figlia del gruppo, per ordine di dichiarazione)
- **Nuovo file** `app/app/(configurazione)/menu-pubblico/actions.ts` -- `creaVoceMenuPubblicoAction`/`aggiornaVoceMenuPubblicoAction`/`impostaVisibileVoceMenuPubblicoAction`/`spostaVoceMenuPubblicoAction`, tutte `requireRuolo(["ADMIN","SITE_MANAGER"])`, chiamano `lib/menu-pubblico.ts` (19.6). Validazione url: `"/"`-prefissato (rotta interna) OPPURE http/https (mirror `linkEsternoValido` di `sponsor/actions.ts`) - mai `javascript:`/`data:`
- **Nuovo file** `app/app/(configurazione)/menu-pubblico/page.tsx` -- `elencaVociMenuPubblico()` + form nuova voce + una `VoceMenuPubblicoRow` per voce, avviso esplicito "non ancora collegato al sito pubblico"
- **Nuovo file** `app/app/(configurazione)/menu-pubblico/NuovaVoceMenuPubblicoForm.tsx` -- mirror di `NuovoSponsorForm.tsx`
- **Nuovo file** `app/app/(configurazione)/menu-pubblico/VoceMenuPubblicoRow.tsx` -- mirror di `SponsorRow.tsx`, in più i due bottoni Su/Giù (disabilitati su `primo`/`ultimo`, calcolati dal genitore server)
- **Nuovo file** `app/app/(configurazione)/menu-pubblico/menu-pubblico.module.css` -- mirror di `sponsor.module.css`
- **Nuovo file** `app/app/(configurazione)/menu-pubblico/actions.test.ts` -- copertura completa delle 4 action
- `lib/guida/contenuti.ts` -- nuova entry `/app/menu-pubblico`, `ruoliAmmessi: ["ADMIN","SITE_MANAGER"]`
- `lib/auth/voci-navigazione.test.ts` -- aggiornati i test che assumevano 3 figlie del gruppo "Gestione sito" (ora 4 per Site Manager, 3 per Admin - Foto squadre resta SITE_MANAGER-only)

## Tasks & Acceptance

**Execution:**
- [x] `route-guard.ts` -- nuova entry `/app/menu-pubblico`
- [x] `menu-pubblico/actions.ts` -- le 4 Server Action + validazione
- [x] `menu-pubblico/page.tsx` -- elenco + form nuova voce + avviso di disconnessione dal sito pubblico
- [x] `NuovaVoceMenuPubblicoForm.tsx` + `VoceMenuPubblicoRow.tsx` + CSS module
- [x] `menu-pubblico/actions.test.ts` -- copertura completa
- [x] `contenuti.ts` -- nuova entry, mirror `ruoliAmmessi`
- [x] `voci-navigazione.test.ts` -- aggiornati i test del gruppo "Gestione sito" (Site Manager: 4 figlie; Admin: 3, non Foto squadre)

**Acceptance Criteria:**
- Given la tabella e le funzioni di 19.6, when un Site Manager o Admin apre `/app/menu-pubblico`, then può creare, modificare, riordinare (Su/Giù) e nascondere/mostrare una voce - ogni operazione scrive sulla tabella
- Given un Utente senza quei Ruoli, when tenta di raggiungere `/app/menu-pubblico`, then resta bloccato (redirect, stesso pattern di ogni altra rotta protetta)
- Given la nuova voce di navigazione, when un Utente senza accesso guarda la barra, then non la vede (né come voce diretta né come figlia del gruppo "Gestione sito")

## Spec Change Log

- 2026-08-19 (code review Epic 19, post-hoc): `impostaVisibileVoceMenuPubblicoAction` non impediva di nascondere l'ultima voce visibile rimasta - dopo la Story 19.8, questo avrebbe fatto fallire il rendering dell'intero sito pubblico (nessuna voce visibile = errore bloccante per design). Fix: guard che rifiuta con `VALIDATION` un tentativo di nascondere l'unica voce visibile rimasta.
- 2026-08-19 (code review Epic 19, post-hoc): `urlVoceMenuValido` accettava un URL protocol-relative (`//host-esterno`) come "rotta interna" solo perché inizia con `/` - il browser lo risolve come navigazione assoluta esterna. Fix: rifiutato esplicitamente (`!valore.startsWith("//")`).
- 2026-08-19 (code review Epic 19, post-hoc): il banner di `page.tsx` e la voce guida dicevano ancora "non collegato al sito pubblico" dopo che la Story 19.8 aveva effettivamente collegato `NavPubblica.tsx` - testo diventato falso/fuorviante, aggiornato per riflettere lo stato reale (modifiche live) e il nuovo vincolo "almeno una voce visibile".

## Verification

**Commands:**
- `npx vitest run` (dalla root del repo) -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: `/app/menu-pubblico` compare come rotta `ƒ` (dynamic), nessuna regressione sulle altre rotte (gli errori WASM di Prisma nel log sono attesi/non bloccanti su questa macchina, vedi memoria di progetto)

**Manual checks (if no CLI):**
- Dopo il deploy: un Site Manager apre `/app/menu-pubblico`, crea una voce, la riordina con Su/Giù, la nasconde e la rimostra - nessun effetto visibile sul menu del sito pubblico reale (atteso, arriva con la 19.8)

## Suggested Review Order

**Le Server Action (il cancello reale, coperte da test)**

- Validazione URL (interno `/` oppure http/https) - il punto più a rischio per XSS (`javascript:`/`data:`).
  [`menu-pubblico/actions.ts`](../../app/app/(configurazione)/menu-pubblico/actions.ts)

- `spostaVoceMenuPubblicoAction`: legge l'elenco fresco da DB invece di fidarsi di un indice client-side, no-op sicuro sui margini.
  [`menu-pubblico/actions.ts`](../../app/app/(configurazione)/menu-pubblico/actions.ts)

**Il raggruppamento in nav (assunzione, non esplicita nell'AC)**

- `gruppo: "Gestione sito"` aggiunto senza conferma esplicita dell'utente - verificare che sia la collocazione desiderata.
  [`route-guard.ts`](../../lib/auth/route-guard.ts)

**La UI (nessun test diretto possibile, come ogni altra pagina del progetto)**

- Riordino Su/Giù: verificare a occhio che i bottoni si disabilitino correttamente sul primo/ultimo elemento.
  [`VoceMenuPubblicoRow.tsx`](../../app/app/(configurazione)/menu-pubblico/VoceMenuPubblicoRow.tsx)

**Test e guida (periferici)**

- 4 test di `voci-navigazione.test.ts` aggiornati per il nuovo conteggio di figlie del gruppo.
  [`voci-navigazione.test.ts`](../../lib/auth/voci-navigazione.test.ts)
