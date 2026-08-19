---
title: "Story 18.22: Foto dell'Allenatore nella sezione Staff"
type: 'feature'
created: '2026-08-19'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'b95a076'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/staff` (sito pubblico) mostra solo nome/cognome + Gruppi per ogni Allenatore, nessuna foto - un Visitatore non ha modo di riconoscere visivamente lo Staff.

**Approach:** Riusare la foto profilo già caricata da ogni Allenatore (Story 9.12, `lib/storage/foto-profilo.ts`) - stesso pattern di lettura già in uso in `il-mio-profilo/page.tsx` (`esisteFotoProfilo` + `generaUrlFirmatoFotoProfilo`, URL firmato a breve scadenza), ma con `createAdminClient()` (service-role, bypassa RLS) invece di `createClient()`: il bucket `foto-profilo-allenatori` è privato per scelta deliberata (AD-6), la sua policy RLS richiede un Ruolo tra `ALLENATORE`/`ADMIN`/`DIRIGENTE`/`SEGRETERIA` nel JWT - un Visitatore anonimo di `/staff` non ne ha nessuno.

## Boundaries & Constraints

**Always:** un Allenatore senza foto caricata mostra un placeholder a iniziali (renegoziato in party mode UI, 2026-08-19 - vedi Spec Change Log), mai un'immagine rotta. Nessuna modifica alla RLS/policy del bucket - resta tecnicamente privato, solo la lettura server-side lo bypassa per questa specifica pagina pubblica.

**Ask First:** **decisione presa esplicitamente con l'utente in apertura** (non assunta): il bucket è privato per privacy deliberata (stessa cautela dei certificati medici, AD-6) - mostrarlo su una pagina pubblica è un'inversione di quella scelta, solo per gli Allenatori. Opzioni presentate: riuso diretto (nessuna nuova azione richiesta), opt-in esplicito (nuovo campo/UI), upload pubblico separato (nuovo bucket/flusso). **Scelta dell'utente: riuso diretto** - nessun consenso/opt-in aggiuntivo, nessun nuovo upload.

**Never:** non toccare il bucket `foto-profilo-atlete` (Atlete, minorenni - fuori scope, nessuna richiesta). Non introdurre un URL pubblico permanente/non firmato per le foto - resta un URL firmato a breve scadenza, generato ad ogni render della pagina (coerente con `dynamic = "force-dynamic"` già in uso).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Allenatore con foto caricata | `esisteFotoProfilo` → `true` | foto mostrata accanto al nome | N/A |
| Allenatore senza foto | `esisteFotoProfilo` → `false` | placeholder a iniziali (cerchio `{colors.blu-carbone}`, testo bianco) | N/A |
| Errore Storage per un singolo Allenatore (transitorio) | `esisteFotoProfilo`/`generaUrlFirmatoFotoProfilo` lanciano | fail-soft: nessuna foto per quell'Allenatore, resto della pagina invariato | `console.error`, nessun crash |
| Nessun Allenatore nella stagione corrente | invariato | messaggio vuoto esistente, invariato | N/A |

</frozen-after-approval>

## Code Map

- `app/staff/page.tsx` -- import `createAdminClient` (`@/lib/auth-admin/client`, non `createClient`) + `BUCKET_FOTO_ALLENATORE`/`esisteFotoProfilo`/`generaUrlFirmatoFotoProfilo` (`@/lib/storage/foto-profilo`); dopo la query Prisma esistente, `Promise.all` sugli `allenatori` per risolvere `fotoUrl` per ciascuno (mirror del blocco try/catch fail-soft di `il-mio-profilo/page.tsx:35-43`, un errore per un singolo Allenatore non deve propagare); JSX: `<img>` condizionale prima di nome/gruppi, `eslint-disable-next-line @next/next/no-img-element` (mirror `il-mio-profilo/page.tsx:48`, URL firmato non ottimizzabile da `next/image`)
- `app/staff/staff.module.css` -- `.rigaAllenatore` diventa `display:flex` (foto + colonna testo, gap esistente `var(--space-4)`); nuova classe `.fotoAllenatore` (64×64, `border-radius:50%`, `object-fit:cover`, bordo `#e5e9ee` mirror del `.rigaAllenatore` esistente); nuovo wrapper `.infoAllenatore` per nome+gruppi (necessario perché `.rigaAllenatore` non è più un blocco singolo)
- **Nuovo file** `lib/iniziali-nome.ts` -- `inizialiNome(nome, cognome)`, funzione pura, estratta per essere testabile (nessuna pagina del progetto viene mai testata direttamente)
- **Nuovo file** `lib/iniziali-nome.test.ts` -- copertura della funzione sopra
- `app/staff/staff.module.css` -- nuova classe `.inizialiAllenatore` (stessa dimensione/forma di `.fotoAllenatore`, sfondo `{colors.blu-carbone}` `#0F2438`, testo bianco, stessa tipografia di `.nomeAllenatore`)

## Tasks & Acceptance

**Execution:**
- [x] `staff/page.tsx` -- `createAdminClient`, risoluzione `fotoUrl` per Allenatore (fail-soft, in parallelo)
- [x] `staff/page.tsx` -- JSX: foto condizionale
- [x] `staff.module.css` -- layout flex + nuove classi
- [x] `lib/iniziali-nome.ts` + test -- placeholder a iniziali (post party mode UI)
- [x] `staff/page.tsx` + `staff.module.css` -- placeholder condizionale, sostituisce il "niente" iniziale

**Acceptance Criteria:**
- Given un Allenatore con foto profilo già caricata, when un Visitatore apre `/staff`, then vede la sua foto accanto al nome
- Given un Allenatore senza foto, when la stessa pagina viene aperta, then vede un placeholder a iniziali (cerchio `{colors.blu-carbone}`), mai un'immagine rotta
- Given la RLS del bucket `foto-profilo-allenatori`, when questa storia viene completata, then nessuna policy è stata modificata - la lettura pubblica passa solo dal client privilegiato lato server

## Spec Change Log

- 2026-08-19 (party mode UI, post-implementazione): il vincolo "nessun placeholder inventato" (AC #2 originale) è stato rinegoziato con l'utente dopo una discussione multi-persona sul layout - la riga con foto/senza foto affiancate creava un'incoerenza visiva ("buchi" a sinistra su metà delle righe). Nuova direzione: placeholder a iniziali, stessi token DESIGN.md (`{colors.blu-carbone}`, tipografia di `.nomeAllenatore}`) - nessun nuovo colore/font introdotto. Bonus segnalato in stanza: evita anche il secondo giro a Storage per chi non ha foto (il codice lo evitava già, `generaUrlFirmatoFotoProfilo` chiamata solo se `esisteFotoProfilo` è vero).

## Verification

**Commands:**
- `npx vitest run` (dalla root del repo) -- expected: tutti i test verdi (nessun nuovo test: pagina pubblica, stesso trattamento di ogni altra pagina del progetto - mai testate direttamente)
- `npx tsc --noEmit` -- expected: pulito
- `npm run lint` -- expected: 0 errori
- `npm run build` -- expected: `/staff` resta `ƒ` (dynamic), nessuna regressione di shape

**Manual checks (if no CLI):**
- Dopo il deploy: un Allenatore con foto profilo caricata compare con la foto su `/staff`; un Allenatore senza foto compare come oggi (solo nome+Gruppi)

## Suggested Review Order

**Il client privilegiato (il punto più a rischio - deroga deliberata alla RLS)**

- `createAdminClient()` invece di `createClient()` - verificare che sia usato SOLO per questa lettura, non propagato ad altre query della pagina che non ne hanno bisogno (Prisma resta invariato, non passa da Supabase).
  [`staff/page.tsx`](../../app/staff/page.tsx)

**Fail-soft (nessun test diretto possibile, come ogni altra pagina pubblica)**

- Un errore Storage per un singolo Allenatore non deve rompere l'intera pagina - verificare a occhio il try/catch per-Allenatore.
  [`staff/page.tsx`](../../app/staff/page.tsx)
