# Epic 26 Context: Tesseramento multi-Federazione

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettere di registrare che un'Atleta è tesserata con una o più federazioni sportive (es. FIPAV, CSI, UISP) contemporaneamente nella stessa stagione, invece del singolo flag "tesserata" di oggi. Admin e Dirigente configurano l'elenco delle federazioni e, da un'unica tabella, confermano nuovi tesseramenti e correggono quelli esistenti.

## Stories

- Story 26.1: Configurazione Federazioni
- Story 26.2: Tesseramento per Federazione — tabella unica di conferma e modifica

## Requirements & Constraints

- Solo Admin e Dirigente gestiscono sia l'elenco Federazioni sia i Tesseramenti; Segreteria resta esclusa dal Tesseramento.
- Federazione: nome obbligatorio e univoco (case-insensitive), sigla opzionale, ordinabile, attivabile/disattivabile. Eliminazione fisica solo se mai usata in alcun Tesseramento di nessuna stagione; altrimenti solo disattivazione.
- Una Federazione disattivata non è selezionabile per nuovi tesseramenti, ma resta visibile/rimovibile dove già usata nella stagione corrente.
- I tesseramenti esistenti vengono migrati sulla Federazione FIPAV (creata dalla migrazione).
- Togliere l'ultima federazione a un'Atleta richiede una conferma esplicita e la riporta a "Non tesserata".
- Le modifiche riguardano solo l'Anno Agonistico corrente; le stagioni precedenti non vengono mai toccate. Nessun riporto al wizard nuova stagione.
- Ogni story aggiorna la guida in-app (`lib/guida/contenuti.ts`) per le pagine toccate.

## Technical Decisions

- `Federazione`: entità strutturale, accesso solo via Prisma diretto; migrazione con `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL … FROM anon, authenticated` (obbligatorio per ogni nuova tabella).
- `Tesseramento` resta una riga per Atleta+stagione (`@@unique([atletaId, annoAgonisticoId])`) con un nuovo campo `federazioneIds String[]` (array Postgres, query Prisma `has`). Nessuna FK sugli id: integrità validata nel codice.
- Invariante: una riga Tesseramento esiste ⇔ `federazioneIds` non vuoto; svuotare l'array elimina la riga.
- Tutti gli accessi al Tesseramento passano dal modulo unico `lib/tesseramento.ts` (`impostaFederazioni`, `federazioniDiAtleta`, `atleteTesserate`, `federazioneInUso`) per rendere economica un'eventuale futura migrazione a una riga per federazione.
- Server Actions: `requireRuolo([...])` in testa, errori come `{ error: { code, message } }` (`VALIDATION`/`INTERNAL`/`FORBIDDEN`), `revalidatePath` dopo la scrittura; scritture multiple in `$transaction` tutto-o-niente.

## UX & Interaction Patterns

- Pagina di configurazione Federazioni: stesso stile delle pagine di configurazione esistenti (form "nuova voce", card per voce con modifica, toggle attiva, riordino Su/Giù).
- `/app/conferma-tesseramenti`: matrice Atlete × Federazioni con checkbox pre-spuntati e un solo "Salva"; vengono inviate solo le righe modificate; conferma in pagina (non `window.confirm`) prima di svuotare un tesseramento. Touch target 44px, scroll orizzontale su mobile.
- `/app/gruppi` e `/app/i-miei-gruppi`: badge "Tesserata · FIPAV, CSI" / "Non tesserata".

## Cross-Story Dependencies

- 26.2 dipende da 26.1 (model `Federazione`, riga FIPAV, `federazioneInUso` nel modulo `lib/tesseramento.ts`).
- Estende Epic 13 (Conferma Tesseramento, Story 13.1) e tocca le letture introdotte da Story 9.33 in `/app/gruppi`.
