---
title: "Story 18.24: Elenco Atlete a blocchi per categoria su Squadre, con foto e Numero"
type: 'feature'
created: '2026-08-25'
status: 'in-progress'
review_loop_iteration: 0
context: []
baseline_commit: 'c66b97f2fd3fa53e5c62599cdf709b58c665e03c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/squadre` (Story 18.8) esclude deliberatamente ogni dato di Atleta per privacy - ma l'utente ha chiesto esplicitamente di mostrare l'elenco Atlete di ogni Squadra (nome, foto, Numero), raggruppate in blocchi per categoria a partire dall'ordine scelto dal Site Manager (Story 19.15) e col Numero di maglia (Story 9.35).

**Approach:** **rovescia esplicitamente** la Story 18.8 AC #2, su conferma diretta dell'utente (AskUserQuestion, 2026-08-24): nome e foto profilo (se caricata) di ogni Atleta diventano pubblici su `/squadre`. La foto riusa il bucket privato `foto-profilo-atlete` tramite un URL firmato generato lato server con `createAdminClient()` (client privilegiato, bypassa RLS) - stesso meccanismo esatto già in uso per la foto Allenatore in `/staff` (Story 18.22). I Gruppi restano ordinati per `ordine` (Story 19.15); un nuovo raggruppamento in blocchi visivi inizia ogni volta che la `categoria` del Gruppo corrente differisce dal Gruppo precedente in quell'ordine - **nessuna lista di categorie fissata nel codice**.

## Boundaries & Constraints

**Always:** `createAdminClient()` necessario anche solo per leggere `nome`/`id` delle Atlete (non solo la foto) - la RLS di `atlete` non concede alcun accesso a un Visitatore anonimo (nessuna policy pubblica esiste), quindi anche l'elenco base richiede il client privilegiato, non solo il download della foto (a differenza di `/staff`, dove Allenatore è comunque leggibile via Prisma diretto - AD-9). Una nuova lettura dedicata e ristretta (`elencaAtletePubbliche`, solo `id`+`nome`) - **mai** riusare `elencaAtlete` esistente, che espone anche `codiceFiscale`/`categoria` (dati non ammessi qui). `GruppoAtleta` letto via Prisma diretto (non protetta da RLS, AD-9) e unito in memoria con le Atlete lette via `createAdminClient()` - **mai** un `include` Prisma diretto da `Gruppo`/`GruppoAtleta` verso `Atleta`, che bypasserebbe la RLS attraverso la connessione privilegiata di Prisma invece che tramite una lettura esplicita e consapevole (stesso vincolo architetturale già documentato in `/app/gruppi/page.tsx`).

**Ask First:** nessuna - i punti di scope sono già decisi in `epics.md`.

**Never:** mai `codiceFiscale`/`categoria`(Atleta)/altri campi di `elencaAtlete` esposti qui - solo `id`+`nome`+foto+Numero. Mai una modifica alla privacy del bucket `foto-profilo-atlete` (RLS/policy invariate, stesso principio di Story 18.22 AC #3) - la foto resta recuperata lato server con URL firmato a breve scadenza, mai un URL diretto/permanente pubblicamente costruibile.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gruppo con Atlete assegnate | N righe GruppoAtleta | elenco Atlete con foto/placeholder+nome+Numero (se impostato) | N/A |
| Gruppo senza Atlete assegnate | 0 righe GruppoAtleta | scheda Gruppo compare comunque, messaggio esplicito nella sezione Atlete | N/A |
| Atleta senza foto caricata | `esisteFotoProfilo` → false | placeholder a iniziali (stesso stile Story 18.22) | N/A |
| Atleta con Numero impostato / non impostato | `numero` non-null / null | Numero mostrato solo se non-null | N/A |
| Due Gruppi consecutivi (nell'ordine 19.15) con la stessa categoria | es. "Under 14" seguito da "Under 14" | un solo blocco/intestazione per entrambi | N/A |
| Due Gruppi della stessa categoria NON consecutivi nell'ordine | es. "Serie D", "Under 14", "Serie D" | due blocchi separati con la stessa intestazione - comportamento accettato, non un bug (I/O matrix di spec-19-15) | N/A |

</frozen-after-approval>

## Code Map

- `lib/db-rls/atleta.ts` -- nuova `elencaAtletePubbliche(supabaseAdmin: SupabaseClient): Promise<{id:string; nome:string}[]>` - `select("id, nome")` esplicito (mai `elencaAtlete`, che espone `codiceFiscale`/`categoria`), commento esplicito "richiede createAdminClient(), la RLS di atlete non concede alcun accesso pubblico"
- `lib/iniziali-nome.ts` -- nuova `inizialiNomeCompleto(nomeCompleto: string): string` - Atleta ha un solo campo `nome` ("Cognome Nome", convenzione pre-esistente), non nome/cognome separati come Allenatore; estrae le iniziali dei primi due token dello spazio, mirror concettuale di `inizialiNome` ma per un singolo campo. Test in `lib/iniziali-nome.test.ts`.
- **Nuovo file** `lib/raggruppa-gruppi-per-categoria.ts` -- `raggruppaGruppiPerCategoriaContigua<T extends {categoria: string}>(gruppi: T[]): {categoria: string; gruppi: T[]}[]` - funzione pura, un nuovo gruppo di blocco ogni volta che `categoria` cambia rispetto al Gruppo precedente nell'array (già ordinato per `ordine` dal chiamante) - mirror del principio "funzione pura estratta per essere testabile" già seguito da `lib/raggruppa-per-settimana.ts`. Test in `lib/raggruppa-gruppi-per-categoria.test.ts`.
- `app/squadre/page.tsx` -- estesa: `createAdminClient()` in aggiunta a `createClient()` (quest'ultimo resta per `foto-squadra`, bucket pubblico, invariato); nuova query `prisma.gruppoAtleta.findMany({where:{annoAgonisticoId}, select:{atletaId:true, gruppoId:true, numero:true}})`; `elencaAtletePubbliche(supabaseAdmin)`; join in memoria (mirror `/app/gruppi/page.tsx`); per ogni Atleta, foto via `esisteFotoProfilo`/`generaUrlFirmatoFotoProfilo` (`BUCKET_FOTO_ATLETA`, `lib/storage/foto-profilo.ts`) con lo stesso pattern fail-soft per-Atleta di `/staff`; `raggruppaGruppiPerCategoriaContigua` applicata all'elenco Gruppi prima del render; nuova sezione "Atlete" dentro `.schedaGruppo`, ordinata per `numero` crescente (null in fondo) poi `nome`
- `app/squadre/squadre.module.css` -- nuove classi per il blocco categoria (intestazione) e la sezione Atlete (mirror `.rigaAllenatore`/`.fotoAllenatore`/`.inizialiAllenatore` di `app/staff/staff.module.css`, adattate al contesto di `/squadre`)

## Tasks & Acceptance

**Execution:**
- [ ] `lib/db-rls/atleta.ts` -- `elencaAtletePubbliche`
- [ ] `lib/iniziali-nome.ts` -- `inizialiNomeCompleto` + test
- [ ] `lib/raggruppa-gruppi-per-categoria.ts` + test
- [ ] `app/squadre/page.tsx` -- query estesa, join, raggruppamento, sezione Atlete
- [ ] `app/squadre/squadre.module.css` -- stili blocco/Atlete

**Acceptance Criteria:** vedi `epics.md` Story 18.24 (Given/When/Then, verbatim - non duplicati qui).

## Design Notes

**Perché una funzione pura dedicata per il raggruppamento:** stessa disciplina già stabilita nel progetto (`raggruppaPerSettimana`) - la logica "blocco = run contigua della stessa categoria" è facilmente testabile in isolamento senza montare l'intera pagina (mai testata direttamente in questo progetto), e riduce il rischio di un bug di raggruppamento silenzioso rispetto a scriverla inline nel JSX.

## Verification

**Commands:**
- `npx vitest run` -- expected: tutti i test verdi, inclusi i nuovi
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: nessuna regressione

**Manual checks (obbligatorio):**
- Un Visitatore apre `/squadre` dopo che alcune Atlete hanno un Numero/foto impostati (verifica: elenco Atlete visibile, foto o placeholder a iniziali, Numero se presente), verifica che i blocchi per categoria riflettano l'ordine impostato in `/app/ordine-squadre`, verifica che nessun dato riservato (codice fiscale, contatti) sia mai presente nell'HTML della pagina.
