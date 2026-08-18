---
title: 'Story 19.4: Accesso Site Manager alla foto squadra (vista dedicata)'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'c8bca72b78aa7172cd46c89c068b295392ef3c15'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Site Manager deve poter gestire la foto squadra di ogni Gruppo, ma `/app/gruppi` (Admin/Dirigente) espone anche creazione Gruppi e assegnazione Allenatori/Atlete — fuori scope per un Ruolo pensato per il sito pubblico (decisione presa in party mode).

**Approach:** Nuova pagina scoped `/app/foto-squadre` (`SITE_MANAGER`-only), che elenca tutti i Gruppi della stagione corrente con solo il controllo foto — riusando `FotoSquadraForm.tsx` (già condiviso tra `GruppoRow.tsx` e `MioGruppoCard.tsx`) invece di costruire un nuovo form. `caricaFotoSquadraAction` estesa con `SITE_MANAGER` su **due** controlli distinti: `requireRuolo` e `risolviPossessoGruppo` (il gate di ownership interno, altrimenti un Site Manager senza riga `Allenatore` cadrebbe nel ramo Allenatore e otterrebbe FORBIDDEN). **Scope aggiunto su richiesta esplicita dell'utente**: raggruppare `/app/impostazioni`, `/app/sponsor` e la nuova `/app/foto-squadre` sotto una voce di menu "Gestione sito" (stesso meccanismo `gruppo` già in uso per "Atleti"/"Orari-Palestre"/"Accounting", Story 15.1-15.4) — deciso esplicitamente per **tutti** i Ruoli che accedono a quelle rotte, non solo Site Manager: Admin/Dirigente vedranno Impostazioni e Sponsor spostarsi da voci dirette a figlie del nuovo gruppo.

## Boundaries & Constraints

**Always:** `/app/gruppi` resta invariato (nessun accesso Site Manager, nessuna modifica per Admin/Dirigente). La nuova pagina mostra **solo** il controllo foto, nessun'altra azione. Site Manager vede **tutti** i Gruppi della stagione corrente (come Admin), non solo i propri (a differenza di Allenatore).

**Ask First:** nessuna — scope già deciso in party mode (Epic 19 context).

**Never:** non toccare `GruppoRow.tsx`/`MioGruppoCard.tsx`/`i-miei-gruppi` (altri consumer di `FotoSquadraForm`, invariati). Non aggiungere creazione Gruppi, assegnazione Allenatori/Atlete alla nuova pagina. Non introdurre un meccanismo di raggruppamento condizionale per Ruolo (il campo `gruppo` resta una proprietà fissa della rotta, non una vista diversa per Ruolo diverso — deciso esplicitamente con l'utente).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solo `SITE_MANAGER` apre `/app/foto-squadre` | route-guard controlla `ruoliAmmessi` | pagina raggiungibile, elenco di tutti i Gruppi con solo il controllo foto | N/A |
| Solo `SITE_MANAGER` carica una foto per un Gruppo qualunque | `requireRuolo` + `risolviPossessoGruppo` entrambi estesi | upload riuscito, nessun controllo di appartenenza (come Admin) | N/A |
| Utente senza `SITE_MANAGER` apre `/app/foto-squadre` | route-guard controlla `ruoliAmmessi` | bloccato — nemmeno Admin/Dirigente/Allenatore hanno accesso a questa rotta specifica (usano `/app/gruppi`/`/app/i-miei-gruppi`) | redirect `/app/non-autorizzato` |
| `/app/gruppi` con Admin/Dirigente | invariato | comportamento identico a oggi | N/A |
| Admin/Dirigente aprono la nav | `gruppo:"Gestione sito"` aggiunto a Impostazioni/Sponsor/Foto squadre | le 3 voci compaiono come figlie del gruppo "Gestione sito", non più come voci dirette | N/A |
| Site Manager apre la nav | stesso gruppo | vede "Gestione sito" con le 3 figlie, coerente con Admin/Dirigente | N/A |

</frozen-after-approval>

## Code Map

- `lib/auth/route-guard.ts` -- nuova entry: `{ prefix: "/app/foto-squadre", ruoliAmmessi: ["SITE_MANAGER"], navLabel: "Foto squadre", gruppo: "Gestione sito" }` -- **non** `nascostaDallaNav`
- `lib/auth/route-guard.ts` -- entry esistenti `/app/impostazioni` e `/app/sponsor`, aggiungere `gruppo: "Gestione sito"` a entrambe -- il gruppo compare all'indice della prima rotta del gruppo incontrata nell'array (`raggruppaVociNavigazione`, Story 15.1): posizionare le 3 entry in ordine Impostazioni → Sponsor → Foto squadre nell'array (o accettare l'ordine di dichiarazione risultante) per un ordine di visualizzazione coerente
- `lib/auth/voci-navigazione.test.ts` -- diversi test esistenti asseriscono `/app/impostazioni`/`/app/sponsor` come voci **dirette** (`hrefVoci`, righe 59-68, 239, 381, 450-454) -- da aggiornare per usare `trovaGruppo("Gestione sito")` invece di `hrefVoci`, stesso pattern già in uso per i gruppi "Atleti"/"Orari/Palestre"/"Accounting"
- `app/app/(gruppi-allenatori)/gruppi/actions.ts:622` -- `requireRuolo(["ADMIN","DIRIGENTE","ALLENATORE"])` di `caricaFotoSquadraAction`, aggiungere `"SITE_MANAGER"`
- `app/app/(gruppi-allenatori)/gruppi/actions.ts:60` (dentro `risolviPossessoGruppo`) -- `if (ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE"))`, aggiungere `|| ruoli.includes("SITE_MANAGER")` -- **secondo gate distinto**: senza questo, un Site Manager (nessuna riga `Allenatore` propria) cadrebbe nel ramo di ownership e otterrebbe sempre FORBIDDEN
- `app/app/(gruppi-allenatori)/gruppi/actions.ts:676-677` -- le due `revalidatePath("/app/gruppi")`/`revalidatePath("/app/i-miei-gruppi")` dopo l'upload, aggiungere una terza `revalidatePath("/app/foto-squadre")`
- `app/app/(gruppi-allenatori)/gruppi/FotoSquadraForm.tsx` -- **riusare direttamente**, nessuna modifica: già condiviso tra `GruppoRow.tsx` (Admin/Dirigente) e `MioGruppoCard.tsx` (Allenatore), props `{ gruppoId, gruppoNome, fotoEsiste, fotoUrl, fotoAggiornataIl }`
- `lib/storage/foto-squadra.ts` -- `elencaGruppiConFoto(supabase)` (una sola chiamata per l'intera lista, non una per Gruppo) + `urlPubblicoFotoSquadra(supabase, gruppoId)`, nessuna modifica, solo riuso
- **Nuovo file** `app/app/(gruppi-allenatori)/foto-squadre/page.tsx` -- mirror snello di `gruppi/page.tsx`: `Promise.all([trovaAnnoAgonisticoCorrente(), createClient()])`, poi `prisma.gruppo.findMany({ where: { annoAgonisticoId: annoCorrente.id }, orderBy: { nome: "asc" } })` (**senza** `include: { allenatori }`, non serve), poi `elencaGruppiConFoto(supabase)`, poi per ogni Gruppo un `<FotoSquadraForm>` -- nessun'altra query (niente atlete/certificati/iscrizioni/tesseramenti, a differenza di `i-miei-gruppi/page.tsx`)
- `app/app/(gruppi-allenatori)/gruppi/actions.test.ts:1197+` -- `describe("caricaFotoSquadraAction", ...)`, aggiornare il test FORBIDDEN (riga 1198) alla lista Ruoli estesa, aggiungere test di successo per `SITE_MANAGER` (nessuna riga `Allenatore`, deve comunque riuscire) + assert sulla terza `revalidatePath`

## Tasks & Acceptance

**Execution:**
- [x] `route-guard.ts` -- nuova entry `/app/foto-squadre`, `SITE_MANAGER`-only, `gruppo: "Gestione sito"`
- [x] `route-guard.ts` -- aggiungere `gruppo: "Gestione sito"` a `/app/impostazioni` e `/app/sponsor` (esistenti)
- [x] `gruppi/actions.ts` -- estendere `requireRuolo` di `caricaFotoSquadraAction`
- [x] `gruppi/actions.ts` -- estendere `risolviPossessoGruppo` con il bypass `SITE_MANAGER` (secondo gate)
- [x] `gruppi/actions.ts` -- aggiungere `revalidatePath("/app/foto-squadre")`
- [x] `app/app/(gruppi-allenatori)/foto-squadre/page.tsx` -- nuova pagina, fetch snello + `<FotoSquadraForm>` per Gruppo, nessun'altra azione
- [x] `gruppi/actions.test.ts` -- aggiornare test FORBIDDEN + nuovo test di successo per `SITE_MANAGER` (senza riga Allenatore) + assert sulla nuova `revalidatePath`
- [x] `voci-navigazione.test.ts` -- aggiornare i test che asseriscono Impostazioni/Sponsor come voci dirette, usare `trovaGruppo("Gestione sito")`; nuovo test che verifica le 3 figlie (Impostazioni/Sponsor/Foto squadre) per Site Manager e per Admin

**Acceptance Criteria:**
- Given un Utente con solo `SITE_MANAGER` e nessuna riga `Allenatore` propria, when carica una foto per un Gruppo che non gli appartiene, then l'upload riesce (nessun controllo di ownership, come Admin) — non `FORBIDDEN`
- Given la nuova pagina, when un Site Manager la apre, then non vede alcun link/pulsante per creare un Gruppo o assegnare Allenatori/Atlete
- Given un Allenatore, when tenta di aprire `/app/foto-squadre`, then resta bloccato — continua a usare `/app/i-miei-gruppi` per la propria foto squadra
- Given un Admin, when apre la nav, then Impostazioni e Sponsor non compaiono più come voci dirette ma come figlie di "Gestione sito" — nessuna regressione di accesso, solo di posizione

## Spec Change Log

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito

**Manual checks (if no CLI):**
- Dopo il deploy: un Utente con solo `SITE_MANAGER` vede `/app/foto-squadre` in nav, apre la pagina, vede tutti i Gruppi della stagione corrente e riesce a caricare/sostituire una foto per uno qualunque

## Suggested Review Order

**Il secondo gate (il più a rischio)**

- `risolviPossessoGruppo` — senza questo, `requireRuolo` da solo non basta: un Site Manager cadrebbe comunque nel ramo di ownership.
  [`gruppi/actions.ts:67`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L67)

- `requireRuolo` esteso, primo gate.
  [`gruppi/actions.ts:633`](../../app/app/(gruppi-allenatori)/gruppi/actions.ts#L633)

**La nuova pagina (nessun test diretto possibile — nessuna pagina del progetto ne ha mai avuto uno)**

- Vista scoped, riusa `FotoSquadraForm` senza altre azioni — verificare a occhio che non ci sia nulla oltre al controllo foto.
  [`foto-squadre/page.tsx`](../../app/app/(gruppi-allenatori)/foto-squadre/page.tsx)

**Il raggruppamento "Gestione sito" (cambia la nav anche per Admin/Dirigente)**

- Nuova entry, ultima figlia per ordine di dichiarazione.
  [`route-guard.ts:313`](../../lib/auth/route-guard.ts#L313)

- Le due entry esistenti che diventano le prime due figlie dello stesso gruppo.
  [`route-guard.ts:224`](../../lib/auth/route-guard.ts#L224)

**Review fix (revisione inline — sub-agent non disponibili per limite di spesa)**

- Voce guida mancante per la nuova pagina, unica dell'Epic 19 senza — aggiunta.
  [`contenuti.ts`](../../lib/guida/contenuti.ts)

**Test (periferici)**

- Riordino dei test di navigazione esistenti che assumevano Impostazioni/Sponsor come voci dirette.
  [`voci-navigazione.test.ts`](../../lib/auth/voci-navigazione.test.ts)

- Nuovo test che esercita davvero il secondo gate (asserisce che `Allenatore.findFirst` non viene mai chiamato per un Site Manager).
  [`gruppi/actions.test.ts`](../../app/app/(gruppi-allenatori)/gruppi/actions.test.ts)
