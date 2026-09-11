---
title: 'Story 19.16: Visibilità pubblica dei Gruppi su /squadre'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '2ac24b5697568344232bd9288b90c993aa4b6982'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la pagina pubblica `/squadre` mostra automaticamente TUTTI i Gruppi della stagione corrente, senza alcun controllo - richiesta esplicita dell'utente: dal profilo Admin poter abilitare/disabilitare la visualizzazione sul sito esterno per ciascun Gruppo (es. un Gruppo giovanile non ancora pronto per essere mostrato pubblicamente).

**Approach:** nuovo campo booleano `visibilePubblico` su `Gruppo` (default `true` - confermato con l'utente: nessun Gruppo esistente sparisce dal sito al primo deploy, l'Admin nasconde selettivamente solo ciò che vuole). Il controllo (interruttore Visibile/Nascosto per Gruppo) vive in `/app/ordine-squadre` - pagina già esistente e dedicata esattamente a questo scopo ("controllo di cosa/come compare su /squadre", Story 19.15), che nel proprio codice anticipava già questa estensione (`GruppoOrdineRow.tsx`: "nessun altro campo modificabile qui... questa storia non tocca altro che l'ordine"). Nessuna nuova pagina, stesso perimetro di Ruoli già in uso li' (ADMIN, SITE_MANAGER - DIRIGENTE resta escluso, mirror esatto di Story 19.15).

## Boundaries & Constraints

**Always:** default `true` per ogni Gruppo esistente e per ogni nuovo Gruppo creato (nessuna regressione visibile sul sito pubblico al deploy di questa story). `/app/squadre/page.tsx` filtra i Gruppi mostrati con `visibilePubblico: true` in aggiunta al filtro `annoAgonisticoId` già esistente - un Gruppo nascosto non compare in nessun blocco categoria, come se non esistesse per un Visitatore. Stesso perimetro di Ruoli di `/app/ordine-squadre` (ADMIN, SITE_MANAGER) per il nuovo controllo - nessuna estensione a DIRIGENTE.

**Ask First:** nessuna prevista (scope e default già confermati con l'utente).

**Never:** nessuna modifica a `/app/gruppi` (creazione/gestione Gruppi, Admin/Dirigente) - il nuovo campo si controlla SOLO da `/app/ordine-squadre`, mirror della stessa separazione già esistente per l'ordine (Story 19.15: "questa vista non permette di creare squadre né di assegnare Allenatori/Atlete - per quello serve /app/gruppi"). Nessuna modifica a `/app/calendario` (Partita/Gruppo, dominio Epic 10 distinto) né a qualunque altra pagina pubblica - solo `/squadre` mostra i Gruppi come entità di prima classe con card individuali, questo è l'unico punto da filtrare.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gruppo esistente, migrazione appena applicata | nessuna azione dell'Admin | `visibilePubblico = true` (default), Gruppo compare su `/squadre` come oggi | N/A |
| Admin disabilita un Gruppo da `/app/ordine-squadre` | click sull'interruttore | Il Gruppo sparisce da `/squadre` alla richiesta successiva (`revalidatePath`), resta comunque gestibile normalmente da `/app/gruppi` | N/A |
| Tutti i Gruppi di una stagione nascosti | 0 Gruppi con `visibilePubblico: true` | `/squadre` mostra il messaggio esplicito già esistente "Nessuna squadra disponibile per la stagione corrente." (stesso ramo AC #4 di Story 18.8, nessuna distinzione necessaria tra "0 Gruppi creati" e "0 Gruppi visibili") | N/A |
| Un Gruppo nascosto ha comunque Slot/Partite associate (Epic 10) | Gruppo con `visibilePubblico: false` | Nessun impatto su `/calendario` o altre pagine - il filtro si applica solo alla query di `/squadre` | N/A |
| Riordino (Story 19.15) di un Gruppo nascosto | interruttore + frecce Su/Giù coesistono nella stessa card | Un Gruppo nascosto mantiene comunque il proprio `ordine` (riprende la posizione se poi riabilitato) - nessuna interazione tra le due funzionalità | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- model `Gruppo`: nuovo campo `visibilePubblico Boolean @default(true)`.
- `prisma/migrations/` -- nuova migrazione `ALTER TABLE "gruppi" ADD COLUMN "visibilePubblico" BOOLEAN NOT NULL DEFAULT true`.
- `lib/ordine-squadre.ts` -- nuova funzione `impostaVisibilitaGruppo(id: string, visibilePubblico: boolean): Promise<void>` (mirror minimale di `riordinaGruppi`, un solo `prisma.gruppo.update`). `elencaGruppiOrdinati` non richiede modifiche (nessun `select`, il nuovo campo arriva già incluso).
- `lib/ordine-squadre.test.ts` -- nuovo test per `impostaVisibilitaGruppo`.
- `app/app/(configurazione)/ordine-squadre/actions.ts` -- nuova `impostaVisibilitaGruppoAction` (mirror di `spostaGruppoAction`: stesso `requireRuolo(RUOLI_ORDINE_SQUADRE)`, stessa doppia `revalidatePath("/app/ordine-squadre")`/`revalidatePath("/squadre")`).
- `app/app/(configurazione)/ordine-squadre/actions.test.ts` -- nuovi test mirror.
- `app/app/(configurazione)/ordine-squadre/GruppoOrdineRow.tsx` -- nuovo interruttore "Visibile pubblicamente" (checkbox o bottone toggle, coerente con lo stile bottoni Su/Giù già presenti), riceve `visibilePubblico` come nuovo campo del prop `gruppo`.
- `app/app/(configurazione)/ordine-squadre/page.tsx` -- passare `visibilePubblico` a `GruppoOrdineRow` (già disponibile da `elencaGruppiOrdinati`, nessuna nuova query).
- `app/squadre/page.tsx` -- query Gruppo (riga ~63): aggiungere `visibilePubblico: true` al `where` esistente.
- `lib/guida/contenuti.ts` -- entry `/app/ordine-squadre` (riga ~162-174): nuova riga di corpo per il controllo di visibilità.

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma` + migrazione -- nuovo campo `visibilePubblico`
- [ ] `lib/ordine-squadre.ts` + test -- `impostaVisibilitaGruppo`
- [ ] `app/app/(configurazione)/ordine-squadre/actions.ts` + test -- `impostaVisibilitaGruppoAction`
- [ ] `app/app/(configurazione)/ordine-squadre/GruppoOrdineRow.tsx` + `page.tsx` -- interruttore visibilità
- [ ] `app/squadre/page.tsx` -- filtro `visibilePubblico: true`
- [ ] `lib/guida/contenuti.ts` -- aggiornamento guida

**Acceptance Criteria:**
- Given un Admin/Site Manager su `/app/ordine-squadre`, when disabilita la visibilità pubblica di un Gruppo, then quel Gruppo non compare più su `/squadre`
- Given un Gruppo appena reso nuovamente visibile, when si ricarica `/squadre`, then il Gruppo ricompare nella propria posizione di `ordine` (invariata durante la disabilitazione)
- Given tutti i Gruppi esistenti prima di questa story, when la migrazione viene applicata, then restano tutti visibili su `/squadre` senza alcuna azione manuale

## Verification

**Commands:**
- `npx prisma validate` -- pulito
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2080/2080 verdi (135 file di test)
- `npm run build` -- riuscito (exit 0, tutte le rotte generate)

**Review a 3 livelli:** implementata come mirror esatto del meccanismo già esistente per `VoceMenuPubblico.visibile` (Story 19.6/19.7) - tutti e tre i reviewer hanno confrontato il nuovo codice con quel gemello. Blind Hunter ha trovato solo divergenze di dettaglio non dichiarate esplicitamente nel commento "mirror esatto" (aria-label aggiunto solo qui, posizione del badge nel markup, naming `visibilePubblico` vs `visibile`) e un comportamento ereditato identico dal gemello (nessuna validazione esplicita dell'id prima dell'update - fallisce comunque in modo sicuro via `catch` generico, mai una scrittura su record sbagliato). Edge Case Hunter ha confermato gli stessi rischi teorici (id vuoto/inesistente, race tra i due `useActionState` indipendenti sulla stessa card) come già presenti e accettati nel gemello, nessuna regressione introdotta. Verification Gap Reviewer non ha trovato gap: test verificati riga per riga, nessun'altra pagina pubblica (`/calendario`, `/staff`) avrebbe dovuto rispettare il filtro - scope esplicitamente dichiarato nella spec e confermato coerente. Nessuna correzione applicata: ogni finding o mirror-fedele del meccanismo esistente (fuori scope estendere una correzione al gemello in questa story) o rischio teorico irrilevante per un pannello Admin interno.

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Applicare la migrazione, verificare che `/squadre` resti invariata (tutti i Gruppi ancora visibili).
- Da `/app/ordine-squadre`, disabilitare un Gruppo: verificare che sparisca da `/squadre` e resti comunque gestibile da `/app/gruppi`.
- Riabilitarlo: verificare che ricompaia nella stessa posizione di prima.
