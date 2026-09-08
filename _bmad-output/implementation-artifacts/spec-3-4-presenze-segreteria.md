---
title: 'Story 3.4: Griglia mensile presenze per Segreteria'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'bda61d78db5f7d2e9d2740eadefad49ef9be2766'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** dalla Segreteria non è possibile vedere le presenze delle Atlete - `/app/presenze` (registrazione) è riservata all'Allenatore e `/app/storico-presenze` (consultazione) è riservata ad Allenatore/Atleta. Richiesta esplicita dell'utente: la Segreteria deve poterle vedere, filtrabili per mese e per Gruppo.

**Approach:** estendere `/app/storico-presenze` (non creare una nuova rotta) con una terza sezione, visibile alla Segreteria, che riusa la stessa "Griglia mensile presenze" già esistente lato Allenatore (Story 9.17: select Gruppo + Mese, un'Atleta per riga, una colonna per giorno) - con un'unica differenza: l'elenco Gruppi disponibili nel `<select>` è TUTTO l'elenco Gruppi della stagione corrente (stesso pattern già usato per Segreteria in `/app/orari` e `/app/gruppi`), non solo i Gruppi propri come per l'Allenatore (che non si applica alla Segreteria, non allenatrice di alcun Gruppo). La logica di caricamento della griglia (roster + presenze del mese) viene estratta in una funzione locale condivisa tra la sezione Allenatore e la nuova sezione Segreteria, per non duplicarla.

**Nota RLS:** nessuna migrazione necessaria - la tabella `presenze` ha già una policy SELECT per ADMIN/DIRIGENTE/SEGRETERIA (`admin_dirigente_segreteria_select`, migrazione `20260717190000_add_presenza`), mai usata finora perché nessuna pagina la interrogava per questi Ruoli.

## Boundaries & Constraints

**Always:** riusare `leggiPresenzeGriglia` (`lib/db-rls/presenza.ts`) e `giorniDelMese`/`meseCorrente` (`lib/mese-calendario.ts`) tale e quali, nessuna modifica. Riusare lo stesso markup tabella (Atleta per riga, colonna per giorno, celle ✓/✗) della sezione Allenatore, tramite un componente/funzione locale condivisa - non due copie del JSX. Stesso principio "mai una riga sparita in silenzio" già in uso nel resto del progetto: un Gruppo senza Atlete assegnate mostra un messaggio esplicito, non una sezione vuota senza spiegazione. Validazione `mese`/`gruppoId` via query string identica a quella già in uso per l'Allenatore (stesso regex `FORMATO_MESE`, stesso controllo di appartenenza del Gruppo all'elenco disponibile prima di interrogare la griglia).

**Ask First:** nessuna prevista.

**Never:** nessuna modifica a `/app/presenze` (registrazione, resta Allenatore-only) né alla sezione "Il mio storico"/Allenatore già esistenti in `/app/storico-presenze`. Nessun accesso in scrittura per la Segreteria (nessun form di registrazione/modifica presenze) - sola consultazione, stesso principio già seguito per Segreteria su `/app/gruppi` (Story 2.10) e `/app/orari` (Story 2.9). Nessuna estensione a Ruoli non richiesti (ADMIN/DIRIGENTE restano senza accesso a questa rotta, coerente con l'ambito esplicito della richiesta - possono essere aggiunti in una story successiva se richiesto).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Segreteria apre `/app/storico-presenze` senza filtri | nessun `gruppoId`/`mese` in query string | Vede il `<select>` Gruppo (tutti i Gruppi della stagione corrente) e il campo Mese (default mese corrente), nessuna griglia caricata | N/A |
| Segreteria seleziona un Gruppo e un Mese validi | Gruppo esistente nella stagione corrente | Griglia mensile: un'Atleta per riga, una colonna per giorno del mese, ✓/✗ per presenza registrata | N/A |
| Segreteria seleziona un Gruppo senza Atlete assegnate | Gruppo valido, roster vuoto | Messaggio esplicito "Nessuna Atleta assegnata a questo Gruppo." | N/A |
| `gruppoId` manomesso (non esistente/non della stagione corrente) | valore arbitrario in query string | Messaggio di errore esplicito, nessuna query alla griglia | N/A |
| `mese` assente o malformato | `?mese=abc` o assente | Ricade sul mese corrente (stesso comportamento già esistente per l'Allenatore) | N/A |
| Utente Segreteria senza alcun Gruppo nella stagione corrente | 0 Gruppi | `<select>` vuoto (solo "Seleziona..."), nessuna sezione Allenatore/Atleta mostrata se l'utente non ha anche quei Ruoli | N/A |
| Utente con SOLO Ruolo Segreteria (nessun profilo Allenatore/Atleta collegato) | `allenatore` null, `atletaIds` vuoto | Non deve comparire il messaggio "account non collegato a un profilo Allenatore o Atleta" - la sezione Segreteria è comunque mostrata | Va corretta la guardia esistente che oggi mostra quel messaggio quando entrambi mancano |
| Utente con doppio Ruolo (es. Allenatore + Segreteria, caso raro) | entrambe le condizioni vere | Entrambe le sezioni (Allenatore: propri Gruppi; Segreteria: tutti i Gruppi) sono mostrate, stesso principio additivo già in uso tra sezione Atleta e sezione Allenatore | N/A |

</frozen-after-approval>

## Code Map

- `app/app/(presenze)/storico-presenze/page.tsx` -- aggiungere `ruoli.includes("SEGRETERIA")` alla guardia iniziale (riga ~174, `if (!allenatore && atletaIds.length === 0)`); estrarre la logica di caricamento griglia (righe ~238-273: `slotRows`/`gruppoAtleteRows`/`atlete`/`roster`/`presenze`/`presenzaPerCella`) in una funzione locale `async function caricaGrigliaGruppo(supabase, gruppoId, giorni, annoCorrente)`; estrarre il markup tabella (righe ~280-325) in una funzione locale `function TabellaGriglia({ roster, giorni, presenzaPerCella })`; aggiungere `sezioneSegreteria` che riusa entrambe con `prisma.gruppo.findMany({ where: { annoAgonisticoId: annoCorrente.id }, orderBy: { nome: "asc" } })` al posto di `gruppiPropri`.
- `lib/auth/route-guard.ts` -- `/app/storico-presenze` `ruoliAmmessi` esteso a `["ALLENATORE", "ATLETA", "SEGRETERIA"]` (riga ~225).
- `lib/guida/contenuti.ts` -- entry `/app/storico-presenze` (riga ~245): `ruoliAmmessi` esteso, nuova riga di corpo per la Segreteria.
- `lib/auth/route-decision.test.ts` -- nuovo test "allows Segreteria on /storico-presenze", riga ~425 in poi (mirror dei test Allenatore/Atleta esistenti).
- `lib/auth/voci-navigazione.test.ts` -- test esatto della Segreteria (riga ~427-449) aggiornato per includere la nuova voce diretta "Storico presenze" tra "Gruppi" e il gruppo "Gestione sito" (stesso ordine di dichiarazione in `PROTECTED_ROUTES`).

## Tasks & Acceptance

**Execution:**
- [ ] `app/app/(presenze)/storico-presenze/page.tsx` -- estrarre logica griglia + markup tabella, aggiungere sezione Segreteria e correggere la guardia iniziale
- [ ] `lib/auth/route-guard.ts` -- estendere `ruoliAmmessi`
- [ ] `lib/guida/contenuti.ts` -- aggiornare guida
- [ ] `lib/auth/route-decision.test.ts` -- nuovo test Segreteria
- [ ] `lib/auth/voci-navigazione.test.ts` -- aggiornare l'array atteso per Segreteria

**Acceptance Criteria:**
- Given un Utente con Ruolo Segreteria, when apre `/app/storico-presenze`, then non viene reindirizzato e vede una sezione con selezione Gruppo (tutti i Gruppi della stagione corrente) e Mese
- Given un Gruppo e un Mese validi selezionati, when la griglia si carica, then mostra le stesse informazioni (Atleta per riga, giorno per colonna, ✓/✗) già viste dall'Allenatore per i propri Gruppi
- Given un Utente con solo Ruolo Segreteria (nessun profilo Allenatore/Atleta), when apre la pagina, then non vede il messaggio "account non collegato"

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori (21 warning preesistenti `no-img-element`, invariati)
- `npx vitest run` -- 2052/2052 verdi (134 file di test)

**Review a 3 livelli:** Blind Hunter ed Edge Case Hunter hanno trovato indipendentemente lo stesso problema reale - le sezioni Allenatore e Segreteria condividevano gli stessi searchParam `gruppoId`/`mese`, con la conseguenza che un Utente col doppio Ruolo Allenatore+Segreteria (caso raro) avrebbe visto un form sovrascrivere silenziosamente il Gruppo/Mese mostrato dall'altra sezione. Corretto con searchParam distinti per la sezione Segreteria (`gruppoIdSegreteria`/`meseSegreteria`). Blind Hunter ha inoltre trovato due `<h2>` identici tra le due sezioni (ambiguo per screen reader nello stesso scenario doppio-Ruolo) - corretto differenziando il titolo della sezione Segreteria. Altri finding (validazione ridondante in `caricaGrigliaGruppo`, doppia query nel caso doppio-Ruolo con stesso Gruppo, mancanza di `<caption>` sulla tabella, ADMIN/DIRIGENTE esclusi dalla rotta, assenza di test di rendering - convenzione già accettata nel progetto) loggati in `deferred-work.md` o respinti come preesistenti/fuori scope/coerenti con pattern già accettati. Verification Gap Reviewer non ha trovato gap reali (i suoi due finding erano entrambi "nessun test di rendering pagina" - stessa convenzione già accettata, nessuna azione).

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/app/storico-presenze` con un Utente Segreteria: verificare l'elenco completo dei Gruppi nel `<select>` (non solo quelli di un Allenatore), il caricamento della griglia mensile e il messaggio per un Gruppo senza Atlete.
- Aprire la stessa rotta con un Utente Allenatore: verificare che la sua sezione esistente sia invariata (stesso comportamento pre-story).
- (Caso raro) Utente con doppio Ruolo Allenatore+Segreteria: verificare che selezionare un Gruppo in una sezione non alteri la selezione dell'altra.

## Suggested Review Order

- Il cuore della story: funzioni condivise estratte e nuova sezione Segreteria.
  [`page.tsx:119`](../../app/app/(presenze)/storico-presenze/page.tsx#L119) (`caricaGrigliaGruppo`), [`page.tsx:171`](../../app/app/(presenze)/storico-presenze/page.tsx#L171) (`TabellaGriglia`), [`page.tsx:453`](../../app/app/(presenze)/storico-presenze/page.tsx#L453) (`sezioneSegreteria`)

- Guardia iniziale corretta per non bloccare un Segreteria senza profilo Allenatore/Atleta.
  [`page.tsx:305`](../../app/app/(presenze)/storico-presenze/page.tsx#L305)

- Review fix (Blind Hunter + Edge Case Hunter, trovato indipendentemente da entrambi): searchParam distinti tra le due sezioni per evitare che un Utente con doppio Ruolo veda un form sovrascrivere l'altro.
  [`page.tsx:254`](../../app/app/(presenze)/storico-presenze/page.tsx#L254)

- Review fix (Blind Hunter): titolo `<h2>` differenziato tra le due sezioni.
  [`page.tsx:497`](../../app/app/(presenze)/storico-presenze/page.tsx#L497)

- `lib/auth/route-guard.ts`/`lib/guida/contenuti.ts`/test associati: estensione di `ruoliAmmessi` a SEGRETERIA.
