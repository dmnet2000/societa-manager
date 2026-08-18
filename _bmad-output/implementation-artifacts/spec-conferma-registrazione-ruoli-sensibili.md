---
title: 'Gate di conferma Admin per l''auto-registrazione di Ruoli sensibili'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '1f19db8e6c843da673203f45fa7134fc261388e1'
---

<!-- Target: 900–1300 tokens. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/registrati` (rotta pubblica) valida i Ruoli selezionati solo contro `RUOLI_VALIDI`, senza alcuna verifica — chiunque può auto-registrarsi come `DIRIGENTE`, `SEGRETERIA`, `ADMIN` o `SITE_MANAGER` (Ruoli senza aggancio a un record preesistente via Codice Fiscale, a differenza di Allenatore/Atleta/Genitore).

**Approach:** Il meccanismo `Utente.attivo` esiste già (default `true`, controllato fail-closed al login, toggle Attiva/Disattiva già in `/app/admin`). Per questi 4 Ruoli, `registrati()` crea l'Utente con `attivo:false` invece del default — resta bloccato al login finché un Admin non lo riattiva con il toggle esistente. Eccezione: se non esiste alcun Admin **attivo** nel sistema (bootstrap), l'Admin appena registrato parte `attivo:true` — altrimenti nessuno potrebbe mai confermare nessuno (incluso il caso di un unico Admin esistente ma disattivato, che non potrebbe comunque confermare nulla). Ogni volta che il gate scatta, invia una email agli Admin attivi (`elencaEmailPerRuolo("ADMIN")` + `inviaEmail`, entrambi già esistenti).

## Boundaries & Constraints

**Always:** il gate scatta se **almeno uno** dei Ruoli selezionati è tra `DIRIGENTE`/`SEGRETERIA`/`ADMIN`/`SITE_MANAGER` (es. `ALLENATORE`+`DIRIGENTE` insieme → comunque `attivo:false`). Logica solo nel ramo di prima creazione (`!utenteEsistente`) — il reinvio non la riesegue. Notifica email non bloccante (fail-soft, stesso pattern della mail di conferma già in `registrati()`).

**Ask First:** nessuna — tutte le decisioni sono state prese con l'utente (riuso del toggle esistente, notifica a tutti gli Admin attivi, stesso indicatore binario `attivo` senza distinguere "mai confermato" da "disattivato in seguito").

**Never:** non toccare la logica di aggancio Codice Fiscale (Allenatore/Genitore/Atleta) né l'invio della mail di conferma esistente (Story 11.4). Non introdurre un nuovo campo/enum per distinguere le due cause di `attivo:false` (deciso: stesso indicatore). Non costruire una nuova pagina/rotta admin (deciso: riuso del toggle `impostaAttivoUtente`/`UtenteRow.tsx` già esistente). Non modificare il messaggio `ACCOUNT_DISATTIVATO` in `accedi/actions.ts` (deciso: stesso messaggio per entrambe le cause).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solo Ruoli con aggancio CF | `ruoli=[ALLENATORE]` | `attivo:true`, comportamento invariato | N/A |
| Ruolo sensibile, Admin attivi già esistenti | `ruoli=[DIRIGENTE]` | Utente creato `attivo:false`, email inviata agli Admin attivi | N/A |
| `ADMIN`, con almeno un Admin attivo esistente | `ruoli=[ADMIN]` | `attivo:false` — nessuna eccezione, stesso gate | N/A |
| `ADMIN`, zero Admin attivi nel sistema (bootstrap) | `ruoli=[ADMIN]` | `attivo:true` immediato, nessuna email (nessun Admin attivo a cui notificare) | N/A |
| Ruoli misti, uno sensibile | `ruoli=[ALLENATORE,DIRIGENTE]` | `attivo:false` (basta un Ruolo sensibile presente) | N/A |
| Invio email di notifica fallisce | `inviaEmail` lancia | registrazione completata comunque, nessun rollback | logged, non bloccante |

</frozen-after-approval>

## Code Map

- `app/(onboarding-import)/registrati/actions.ts` -- funzione `registrati()`, ramo `if (!utenteEsistente) { ... }`: la create Prisma dell'Utente (oggi senza `attivo`, si affida al default `true`) è il punto da estendere; `ruoli: Ruolo[]` (deduplicato) è già disponibile prima della create
- `prisma/schema.prisma` -- `Utente.attivo Boolean @default(true)`, nessuna modifica di schema necessaria
- `app/app/(amministrazione)/admin/actions.ts:21-28` -- `contaAltriAdminAttivi`, pattern di riferimento per il conteggio Admin via `UtenteRuolo` (qui serve il conteggio degli Admin **attivi**, non "tutti meno uno escluso")
- `lib/utenti/email-per-ruolo.ts` -- `elencaEmailPerRuolo(ruolo: Ruolo): Promise<string[]>`, già esistente e già usato dal cron Story 4.6 — `elencaEmailPerRuolo("ADMIN")` è esattamente l'elenco email da notificare, nessuna modifica
- `lib/email/invia-email.ts` -- `inviaEmail({ destinatario: string | string[], oggetto, testo })`, accetta l'array direttamente, nessuna modifica
- `app/(onboarding-import)/registrati/actions.test.ts` -- mock esistenti di `@/lib/prisma` (`utente.create`/`findUnique`) da estendere con `utente.count`; mock di `elencaEmailPerRuolo`/`inviaEmail` da aggiungere

## Tasks & Acceptance

**Execution:**
- [x] `registrati/actions.ts` -- prima della create, calcolare `numeroAdminAttivi = await prisma.utente.count({ where: { attivo: true, ruoli: { some: { ruolo: "ADMIN" } } } })` -- serve sia per il gate sia per l'eccezione bootstrap
- [x] `registrati/actions.ts` -- calcolare `ruoloSensibile = ruoli.some((r) => ["DIRIGENTE","SEGRETERIA","ADMIN","SITE_MANAGER"].includes(r))` e `bootstrap = ruoli.includes("ADMIN") && numeroAdminAttivi === 0` -- `attivo: !ruoloSensibile || bootstrap` nella create
- [x] `registrati/actions.ts` -- dopo la create, se `ruoloSensibile && !bootstrap`: `elencaEmailPerRuolo("ADMIN")` + `inviaEmail(...)` in un try/catch dedicato (fail-soft, stesso pattern della mail di conferma esistente) -- nessun blocco della registrazione se l'invio fallisce
- [x] `registrati/actions.test.ts` -- nuovi test per ognuna delle 6 righe della I/O Matrix -- copertura esplicita del gate e del bootstrap (+ 1 test aggiuntivo sul percorso di reinvio, non richiesto esplicitamente ma coerente con i Boundaries)

**Acceptance Criteria:**
- Given un Utente con `attivo:false` da questo gate, when tenta il login, then riceve lo stesso `ACCOUNT_DISATTIVATO` già esistente (nessuna modifica a `accedi/actions.ts`)
- Given un Admin autenticato su `/app/admin`, when un nuovo Utente `attivo:false` compare nell'elenco, then può riattivarlo con il toggle "Riattiva" già esistente, senza alcuna nuova UI
- Given il ramo di reinvio (`utenteEsistente` già presente), when un Utente reinvia la conferma email, then il gate/notifica non vengono rieseguiti (nessuna doppia email)

## Spec Change Log

## Design Notes

Il conteggio bootstrap usa Admin **attivi**, non "tutti gli Admin mai creati": se l'unico Admin esistente fosse stato disattivato, nessuno potrebbe comunque confermare un nuovo Admin — usare il conteggio totale lascerebbe il sistema bloccato in quel caso limite. Questa lettura è l'unica coerente con lo scopo dichiarato dall'utente ("altrimenti nessun Admin esisterebbe mai per confermare nulla").

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito

**Manual checks (if no CLI):**
- Dopo il deploy: registrare un Utente con solo `SEGRETERIA`, confermare che risulti "Disattivato" in `/app/admin` e che un Admin riceva l'email di notifica

## Suggested Review Order

**Il gate**

- Ruoli con aggancio CF elencati esplicitamente (derivazione fail-safe, review fix) — tutto il resto è sensibile per default.
  [`actions.ts:25`](../../app/(onboarding-import)/registrati/actions.ts#L25)

- Conteggio Admin *attivi* (non "tutti gli Admin mai creati") — condiziona sia il gate sia l'eccezione bootstrap.
  [`actions.ts:299`](../../app/(onboarding-import)/registrati/actions.ts#L299)

- Eccezione bootstrap scoped a solo `ADMIN` — limite noto e accettato, documentato inline.
  [`actions.ts:315`](../../app/(onboarding-import)/registrati/actions.ts#L315)

- `attivo` esplicito nella create, dove prima si affidava al default dello schema.
  [`actions.ts:323`](../../app/(onboarding-import)/registrati/actions.ts#L323)

**La notifica**

- Spostata subito dopo la create (review fix, Blind Hunter) — un fallimento successivo non la inghiotte più in silenzio.
  [`actions.ts:336`](../../app/(onboarding-import)/registrati/actions.ts#L336)

- Etichette italiane invece dei valori grezzi dell'enum (review fix).
  [`actions.ts:342`](../../app/(onboarding-import)/registrati/actions.ts#L342)

**Test (periferici)**

- Copertura di ogni riga della I/O Matrix, incluso bootstrap, ruoli misti e fail-soft sull'invio.
  [`actions.test.ts:1051`](../../app/(onboarding-import)/registrati/actions.test.ts#L1051)

- Limite noto documentato come test, non lasciato non verificato.
  [`actions.test.ts:1222`](../../app/(onboarding-import)/registrati/actions.test.ts#L1222)
