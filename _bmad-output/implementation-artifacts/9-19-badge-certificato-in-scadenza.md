# Story 9.19: Badge "certificato in scadenza" nell'elenco Atlete di Gruppo e in Vista Dirigente

Status: backlog

## Story

As a Allenatore, Admin/Dirigente,
I want vedere subito quali Atlete di un Gruppo hanno il certificato medico in scadenza entro un mese, ovunque sia mostrato l'elenco delle Atlete del Gruppo (o un suo riepilogo aggregato),
so that posso sollecitare per tempo il rinnovo senza dover controllare atleta per atleta.

**Note aggiuntive:** richiesta esplicita dell'utente (2026-07-31), emersa durante la review di Story 9.17. **Perimetro deciso con l'utente** (l'app ha molti altri punti che citano nomi di Atlete, es. roster `/presenze`, select `/dati-fisici`, `/conferma-iscrizioni`, `/conferma-certificati`, griglia `/storico-presenze` — tutti esclusi): solo `/gruppi` (Admin/Dirigente), `/i-miei-gruppi` (Allenatore, Story 9.15) e `/vista-dirigente` (Story 5.1/5.2, il "riepilogo" — già mostra un conteggio aggregato "in scadenza" per Gruppo, non ancora i nomi).

**Scoperta chiave in analisi — non serve alcuna nuova soglia né funzione di calcolo data da zero**: questo progetto ha già, in tre punti diversi, la stessa identica logica "giorni alla scadenza di un Certificato" con soglia di 30 giorni per "in scadenza":
- `app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts` — `calcolaGiorniAScadenza(dataFineValidita, oggi): number | null` (Story 4.6), la funzione di base, già riusata due volte cross-modulo (commenti originali: *"non un terzo/quarto confronto data reimplementato da zero"*).
- `app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts` — usa la funzione sopra, aggiunge la regola "deve essere `CONFERMATO`", produce un bucket aggregato a 4 stati (`IN_REGOLA`/`IN_SCADENZA`/`SCADUTO`/`SENZA_CERTIFICATO`) per i conteggi di `/vista-dirigente`.
- `app/(certificati-medici)/certificato-medico/stato-certificato-visualizzato.ts` — stessa funzione di base, regole di visualizzazione diverse (5 stati testuali per la scheda personale).

Questa storia **riusa** `calcolaGiorniAScadenza` (stesso pattern già stabilito, non una quinta reimplementazione) per una nuova funzione minima locale al modulo `(gruppi-allenatori)`, e **riusa** direttamente `categorizzaStatoCertificato`/`atleteScadute` già esistenti in `/vista-dirigente` per il secondo drill-down (nessuna nuova soglia, nessun nuovo bucket).

## Acceptance Criteria

1. **Given** un Allenatore o un Admin/Dirigente sulla pagina `/i-miei-gruppi` o `/gruppi` **When** visualizza l'elenco delle Atlete assegnate a un Gruppo **Then** ogni Atleta con il certificato medico **confermato** che scade tra 0 e 30 giorni da oggi mostra un badge "Certificato in scadenza" accanto al nome (stesso stile del badge "Certificato scaduto" già esistente in `/presenze`, variante warning — non danger)
2. **Given** un'Atleta senza certificato, con certificato scaduto, o con certificato in regola (oltre 30 giorni) **When** visualizzata nello stesso elenco **Then** nessun badge "in scadenza" viene mostrato (un'Atleta con certificato scaduto mostra al più un badge "scaduto" se già previsto altrove, non "in scadenza" — i due stati sono incompatibili)
3. **Given** un Dirigente sulla pagina `/vista-dirigente` **When** visualizza la card di un Gruppo con almeno un'Atleta "in scadenza" **Then** lo stat-tile "in scadenza" diventa cliccabile/espandibile e mostra i nomi delle Atlete in scadenza, stesso identico pattern del drill-down "scaduto" già esistente (Story 5.1 AC #6)
4. **And** nessuna regressione sul comportamento esistente di `/gruppi`, `/i-miei-gruppi`, `/vista-dirigente` (Story 2.4/9.9/9.14/9.15/5.1/5.2) — suite Vitest invariata sui casi esistenti

## Dev Notes (analisi preliminare, da completare in fase di create-story)

- **Nuova funzione locale**: `app/(gruppi-allenatori)/gruppi/certificato-in-scadenza.ts` — `certificatoInScadenza(dataFineValidita: string | null, oggi: Date): boolean`, riusa `calcolaGiorniAScadenza` (import cross-modulo da `app/api/cron/promemoria-certificati/`, già pattern stabilito), `true` se `giorni !== null && giorni >= 0 && giorni <= 30`. **Non richiede lo stato `CONFERMATO`** (a differenza di `categorizzaStatoCertificato`) — stesso livello di semplicità di `certificato-scaduto.ts` (Story 4.5), che è la funzione più vicina per questo tipo di badge-su-elenco (da confermare in fase di creazione storia se lo stato `CONFERMATO` vada invece richiesto anche qui).
- **Componente condiviso**: `AtletaAssegnata.tsx` (`app/(gruppi-allenatori)/gruppi/`) è già riusato invariato sia da `/gruppi` (`GruppoRow.tsx`) sia da `/i-miei-gruppi` (`MioGruppoCard.tsx`, Story 9.15) — estendere il suo tipo `Atleta` con `certificatoInScadenza: boolean` e il badge copre **entrambe** le pagine con una sola modifica. Nuova classe CSS in `gruppi.module.css` (badge già esiste in `presenze.module.css` come riferimento di stile, variante warning).
- **`gruppi/page.tsx` e `i-miei-gruppi/page.tsx`**: nessuna delle due pagine legge oggi `CertificatoMedico` — aggiungere `elencaCertificati(supabase)` al `Promise.all` esistente (stesso pattern di join in memoria già usato in `presenze/page.tsx`/`vista-dirigente/page.tsx`: mai un `include` Prisma diretto su `certificati_medici`, RLS-protetta AD-4/AD-9), calcolare `certificatoInScadenza` una volta per l'intero elenco Atlete (non solo per il roster assegnato), cosi' il flag e' coerente sia in `atleteGruppo` (roster, mostra il badge) sia in `atleteDisponibili` (dropdown di assegnazione, il flag li' e' innocuo/non renderizzato).
- **`vista-dirigente`**: aggiungere `atleteInScadenza: string[]` a `GruppoCardData` (`page.tsx`), popolato in parallelo ad `atleteScadute` quando `categorizzaStatoCertificato(...) === "IN_SCADENZA"` (già calcolato nello stesso ciclo esistente, nessuna nuova query). `GruppoCard.tsx`: lo stato locale `espanso` (oggi un singolo booleano per il solo bucket "scaduto") va esteso per tracciare quale dei due bucket è espanso (es. `useState<"scaduto" | "scadenza" | null>(null)`), stesso pattern di `aria-expanded`/`aria-controls` già stabilito.
- **Da chiarire in fase di create-story, non presumere**: se il badge su `/gruppi`/`/i-miei-gruppi` deve rispettare la stessa regola "solo se `CONFERMATO`" di `categorizzaStatoCertificato` (coerenza con Vista Dirigente) oppure restare semplice come `certificato-scaduto.ts` (nessun controllo di stato). Impatto pratico: un certificato appena ri-caricato ma non ancora confermato dalla Segreteria (Story 4.4, `IN_ATTESA`) con vecchia data futura entro 30 giorni comparirebbe "in scadenza" nella prima opzione, "senza badge" nella seconda.
- **File NON da toccare**: `certificato-scaduto.ts`/`PresenzeForm.tsx` (badge "scaduto" esistente, fuori scope), `calcolaGiorniAScadenza`/`categorizzaStatoCertificato`/`calcolaStatoCertificatoVisualizzato` (riusati, non modificati).

### References

- [Source: app/api/cron/promemoria-certificati/calcola-giorni-a-scadenza.ts — funzione di base da riusare]
- [Source: app/(amministrazione)/vista-dirigente/categorizza-stato-certificato.ts + page.tsx + GruppoCard.tsx — pattern esatto del drill-down "scaduto" da replicare per "in scadenza"]
- [Source: app/(presenze)/presenze/certificato-scaduto.ts + PresenzeForm.tsx + presenze.module.css (.badge) — stile badge warning di riferimento]
- [Source: app/(gruppi-allenatori)/gruppi/AtletaAssegnata.tsx — componente condiviso da estendere, copre sia /gruppi sia /i-miei-gruppi]
- [Source: app/(gruppi-allenatori)/gruppi/page.tsx, app/(gruppi-allenatori)/i-miei-gruppi/page.tsx — pagine da estendere con elencaCertificati]
