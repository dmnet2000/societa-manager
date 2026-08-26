---
title: "Story 9.38: Correzione dell'email di un Utente non ancora confermato, da parte dell'Admin"
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '91baa18ec8f9c22596a30bec3d974a8b508affee'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** un'Atleta/Genitore/Allenatore che sbaglia a digitare l'email in fase di registrazione (`/registrati`) resta bloccato per sempre: l'Utente Supabase Auth viene comunque creato (mai confermato), il link di conferma non può arrivare a un indirizzo sbagliato, e oggi nessuna funzione permette di correggerlo.

**Approach:** deciso in `epics.md` (Story 9.38) e in sessione di party mode: nuova azione Admin-only in `/app/admin` che corregge l'email su Supabase Auth (`updateUserById`, mirror esatto di `reimpostaPasswordFissaUtente`, Story 9.11) e su `Utente.email` (Prisma, mirror 1:1), poi rigenera e reinvia il link di conferma al nuovo indirizzo (stesso meccanismo `generateLink`+`inviaEmail` di `registrati/actions.ts`, Story 11.4).

## Boundaries & Constraints

**Always:** `requireRuolo("ADMIN")` (non Dirigente — mirror esatto `reimpostaPasswordFissaUtente`, azione su credenziali/account). Bersaglio con Ruolo ADMIN → sempre rifiutato, stesso principio anti-presa-di-controllo già stabilito in Story 9.11 (chi controlla l'email controlla anche un futuro "password dimenticata"). `supabaseAuthId` risolto server-side da `utenteId` (mai accettato dal form). Verifica `email_confirmed_at === null` tramite `admin.auth.admin.getUserById` PRIMA di correggere — l'azione si applica solo a un Utente mai confermato (nessun accesso mai riuscito). Log di accountability minima (chi ha eseguito, utenteId, email vecchia→nuova) nei log server, stesso pattern già in uso in `reimpostaPasswordFissaUtente`.

**Ask First:** nessuna — i punti di scope sono già decisi in `epics.md`/sessione di party mode.

**Never:** questa storia non tocca `app/(onboarding-import)/registrati/actions.ts` (nessuna modifica al flusso di registrazione esistente, per azzerare il rischio di regressione — AC #5). Non gestisce un Utente già confermato (feature diversa, fuori scope). Non introduce un percorso self-service (rimandato a una storia futura separata, per la maggiore complessità di autenticazione di chi non ha ancora un account confermato).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin corregge l'email di un Utente mai confermato | nuova email valida, diversa dalla vecchia | email aggiornata su Supabase Auth + Prisma, nuovo link generato e spedito al nuovo indirizzo | N/A |
| Bersaglio ha Ruolo ADMIN | qualunque nuova email | rifiutato, nessuna scrittura | `VALIDATION` (stesso messaggio di stile di `reimpostaPasswordFissaUtente`) |
| Bersaglio già confermato (`email_confirmed_at` non null) | qualunque nuova email | rifiutato, nessuna scrittura | `VALIDATION` |
| Nuova email vuota o formato non valido | stringa vuota/senza `@` | rifiutato, nessuna scrittura | `VALIDATION` |
| Nuova email già in uso da un altro Utente | email esistente altrove | rifiutato dopo il tentativo su Supabase (`updateUserById` fallisce), nessuna scrittura Prisma | `VALIDATION` |
| `updateUserById` riuscito ma invio del nuovo link fallito (SMTP non configurato/irraggiungibile) | — | email già corretta su Supabase+Prisma (non annullata — nessun meccanismo di rollback in questo progetto, stesso principio già accettato altrove), errore esplicito restituito, Admin può reinviare il link ripetendo l'azione con la stessa email | `EMAIL_NON_INVIATA` |

</frozen-after-approval>

## Code Map

- `app/app/(amministrazione)/admin/actions.ts` -- nuova `correggiEmailUtenteAction(_prevState, formData)`: legge `utenteId`/`nuovaEmail` da `FormData`, `requireRuolo("ADMIN")`, risolve `utente` (`include: {ruoli: true}`), blocco su Ruolo ADMIN (mirror righe 269-277 di `reimpostaPasswordFissaUtente`), `admin.auth.admin.getUserById(utente.supabaseAuthId)` per il controllo `email_confirmed_at === null`, poi `admin.auth.admin.updateUserById(utente.supabaseAuthId, {email: nuovaEmail})`, poi `prisma.utente.update({where:{id}, data:{email: nuovaEmail}})`, poi rigenerazione+invio link (vedi sotto). Log accountability mirror riga 299-301. `revalidatePath("/app/admin")`.
- `app/app/(amministrazione)/admin/actions.ts` -- riuso diretto di `admin.auth.admin.generateLink({type:"signup", email: nuovaEmail, password: <valore casuale>})` per ottenere un `hashed_token` fresco, poi costruzione del link (`headers()` → host/proto → `/conferma-registrazione?token_hash=...`) e invio via `inviaEmail` (mirror **non condiviso** — logica duplicata deliberatamente, non estratta da `registrati/actions.ts`, per non toccare un flusso già in produzione e già testato, AC #5) -- import `headers` da `next/headers`, `inviaEmail` da `@/lib/email/invia-email`.
- `app/app/(amministrazione)/admin/page.tsx` -- nuova chiamata `admin.auth.admin.listUsers()` (una sola volta per l'intera lista, non per riga) per determinare `email_confirmed_at` per ciascun `utente.supabaseAuthId`, passato a `UtenteRow` come nuovo campo `emailConfermata: boolean`.
- `app/app/(amministrazione)/admin/UtenteRow.tsx` -- tipo `Utente` esteso con `emailConfermata: boolean`; nuovo `<form action={correggiEmailAction}>` (input `email` + hidden `utenteId`) mostrato SOLO quando `!utente.emailConfermata`, mirror del form Ruoli esistente (`useActionState`, non il pattern bottone+transition di reimposta-password, perché qui serve un input testuale).
- `app/app/(amministrazione)/admin/actions.test.ts` -- nuovi test per `correggiEmailUtenteAction`.

## Tasks & Acceptance

**Execution:**
- [x] `admin/actions.ts` -- `correggiEmailUtenteAction` + validazioni + blocco Admin + `getUserById`/`updateUserById`/Prisma update + rigenerazione/invio link + log + `revalidatePath`
- [x] `admin/page.tsx` -- `listUsers()` una tantum, calcolo `emailConfermata` per Utente
- [x] `admin/UtenteRow.tsx` -- nuovo form "Correggi email" condizionale
- [x] `admin/actions.test.ts` -- test per ogni ramo della I/O Matrix sopra

**Acceptance Criteria:** vedi `epics.md` Story 9.38 (Given/When/Then, verbatim — non duplicati qui).

## Spec Change Log

**Ciclo di review 1 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer) — 2026-08-26.** Nessun finding ha richiesto di riaprire l'Intent (nessun `intent_gap`/`bad_spec`). Patch applicate, tutte dentro i confini gia' fissati dallo spec:
- `revalidatePath("/app/admin")` aggiunta anche nei due rami `EMAIL_NON_INVIATA` (generateLink/inviaEmail falliti) — l'email e' gia' corretta su Supabase+Prisma a quel punto, la pagina deve rifletterlo subito.
- Validazione formato email rafforzata da un semplice "contiene @" a una regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) che scarta indirizzi grossolanamente malformati (`a@`, `@b`, `a@@b`).
- `nuovaEmail` normalizzata `.trim().toLowerCase()` prima di ogni uso (Supabase, Prisma, link, invio) — stesso principio gia' in uso altrove nel progetto (`lib/utenti/email-destinatari-atleta.ts`).
- Errore di `updateUserById` distinto per causa: solo `error.code === "email_exists" | "user_already_exists"` produce il messaggio "già in uso" (`VALIDATION`); qualunque altro fallimento produce un `INTERNAL` generico — mirror del doppio controllo gia' usato in `creaUtente`/`registrati`.
- `UtenteRow.tsx`: aggiunta conferma `window.confirm(...)` sul submit del form "Correggi email" (mirror di `reimpostaPassword()`); aggiunto `role="status"` al messaggio di successo.
- `page.tsx`: aggiunta etichetta "Correggi email" al `<th>` della nuova colonna; aggiunto `console.error` quando `listUsers()` restituisce un errore (altrimenti il fallimento passava silenzioso, con ogni Utente trattato come "già confermato").
- Estratta la funzione pura `calcolaEmailConfermataPerAuthId` in `lib/auth-admin/email-confermata.ts` (prima inline in `page.tsx`, senza alcun test diretto) con 4 nuovi test unitari.
- `lib/guida/contenuti.ts`: aggiunta una riga che cita i due rifiuti più probabili (bersaglio Admin, email già in uso).
- `actions.test.ts`: aggiornato il test "email già in uso" con un `error.code` realistico; aggiunti test per fallimento non-duplicato di `updateUserById` (→ `INTERNAL`), normalizzazione a minuscolo, fallimento di `prisma.utente.update` dopo Supabase già aggiornato, e formati email malformati aggiuntivi.

## Design Notes

**Perché la logica di invio non è estratta in un helper condiviso con `registrati/actions.ts`:** i due file gestiscono errori diversi per la stessa email non recapitata (`registrati` restituisce un messaggio pubblico "riprova o contatta la segreteria"; questa azione restituisce un messaggio Admin-facing diverso) — un'estrazione prematura avrebbe accoppiato due superfici che oggi possono evolvere indipendentemente. Una piccola duplicazione (~15 righe) è preferita al rischio di introdurre una regressione in un flusso pubblico già in produzione e completamente testato, coerente con l'AC #5 esplicito di questa storia.

**Perché il parametro `password` di `generateLink` non è un problema:** verificato via ricerca web (non nel codice — nessun ambiente Supabase disponibile in questa sessione, dev locale rotto) — su un Utente Supabase Auth già esistente ma non confermato, `generateLink({type:"signup"})` non sovrascrive la password reale già impostata al primo tentativo di registrazione (comportamento discusso pubblicamente come sorprendente/quasi un bug da altri sviluppatori Supabase). Il campo resta comunque obbligatorio a livello di tipo TypeScript — si passa un valore casuale (`crypto.randomUUID()`), mai persistito. **Da verificare manualmente dopo il deploy** (nessun ambiente locale disponibile in questa sessione): che la password originale dell'Utente resti davvero invariata dopo questa correzione.

**Perché `listUsers()` una sola volta e non `getUserById` per riga:** evita N chiamate all'Admin API ad ogni caricamento di `/app/admin` (una per Utente elencato) — una lista di un club anche numeroso resta ben dentro un singolo giro di `listUsers()`; nessuna paginazione gestita esplicitamente in questa storia (limite accettato, mirror del principio "nessun limite di scala noto" già applicato altrove nel progetto per pannelli interni a bassa concorrenza/numerosità).

**Perché il controllo `email_confirmed_at` è ripetuto anche server-side nell'azione (non solo nascosto in UI):** `emailConfermata` calcolato in `page.tsx` decide solo se mostrare il form — un Admin potrebbe comunque costruire una richiesta manomessa; l'azione deve rifiutare da sola un bersaglio già confermato, stesso principio "il server non si fida mai del client" già seguito ovunque in questo progetto (es. `supabaseAuthId` mai dal form).

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione

**Manual checks (obbligatorio, da demandare all'utente dopo il deploy — nessun ambiente Supabase disponibile in questa sessione):**
- Un Admin corregge l'email di un Utente mai confermato con un errore di battitura reale: verifica che il nuovo link arrivi al nuovo indirizzo e che aprirlo confermi correttamente l'account.
- Verifica che la password originariamente scelta dall'Utente resti valida dopo la correzione (punto tecnico non verificabile in questa sessione, vedi Design Notes).
- Tentativo di correzione su un Utente già confermato: verifica il rifiuto esplicito.
- Tentativo di correzione su un bersaglio Admin: verifica il rifiuto esplicito.

## Suggested Review Order

**Azione Admin — flusso principale**

- Entry point: nuova Server Action, legge `utenteId`/`nuovaEmail`, `requireRuolo("ADMIN")`.
  [`actions.ts:321`](<../../app/app/(amministrazione)/admin/actions.ts#L321>)

- Blocco anti-presa-di-controllo: rifiuta un bersaglio con Ruolo ADMIN, mirror di `reimpostaPasswordFissaUtente`.
  [`actions.ts:368`](<../../app/app/(amministrazione)/admin/actions.ts#L368>)

- Verifica server-side `email_confirmed_at`: il server non si fida del gate mostrato in UI.
  [`actions.ts:401`](<../../app/app/(amministrazione)/admin/actions.ts#L401>)

- Correzione email su Supabase Auth, con distinzione dell'errore per causa (duplicato vs altro).
  [`actions.ts:411`](<../../app/app/(amministrazione)/admin/actions.ts#L411>)

- Rigenerazione del link di conferma (`generateLink`) e invio (`inviaEmail`) al nuovo indirizzo — logica duplicata deliberatamente, non estratta da `registrati/actions.ts`.
  [`actions.ts:473`](<../../app/app/(amministrazione)/admin/actions.ts#L473>)
  [`actions.ts:509`](<../../app/app/(amministrazione)/admin/actions.ts#L509>)

**Validazione e normalizzazione email**

- Regex di formato più rigorosa di un semplice "contiene @".
  [`actions.ts:341`](<../../app/app/(amministrazione)/admin/actions.ts#L341>)

- Normalizzazione `.trim().toLowerCase()` prima di ogni uso.
  [`actions.ts:334`](<../../app/app/(amministrazione)/admin/actions.ts#L334>)

**Calcolo dello stato di conferma (nuova pagina Admin)**

- Nuova funzione pura estratta, testabile in isolamento — mirror dello stile "estrai la decisione in una funzione pura" già in uso nel progetto.
  [`email-confermata.ts:9`](<../../lib/auth-admin/email-confermata.ts#L9>)

- `listUsers()` una tantum per l'intera pagina (non per riga) + log esplicito se la chiamata fallisce.
  [`page.tsx:31`](<../../app/app/(amministrazione)/admin/page.tsx#L31>)

**UI — form e conferma**

- Conferma esplicita (`window.confirm`) prima del submit, mirror di `reimpostaPassword()` nello stesso componente.
  [`UtenteRow.tsx:69`](<../../app/app/(amministrazione)/admin/UtenteRow.tsx#L69>)

- Form condizionale, mostrato solo per un Utente non ancora confermato.
  [`UtenteRow.tsx:159`](<../../app/app/(amministrazione)/admin/UtenteRow.tsx#L159>)

**Peripherals**

- Copertura test della nuova azione (12 casi, inclusa la matrice I/O dello spec).
  [`actions.test.ts:602`](<../../app/app/(amministrazione)/admin/actions.test.ts#L602>)

- Test della funzione pura estratta.
  [`email-confermata.test.ts`](<../../lib/auth-admin/email-confermata.test.ts>)

- Aggiornamento della guida in-app di `/app/admin`.
  [`contenuti.ts`](<../../lib/guida/contenuti.ts>)
