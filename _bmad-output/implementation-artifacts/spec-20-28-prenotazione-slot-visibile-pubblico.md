---
title: 'Story 20.28: Slot prenotato visibile anche sul prospetto ipotetico pubblico'
type: 'feature'
created: '2026-09-12'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '92cfff71d3064022ff2d86fb011a5f32ce0159f1'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** sulla vista pubblica `/torneo`, il prospetto ipotetico della seconda fase (Story 20.27) non mostra mai lo Slot che l'Admin ha eventualmente già prenotato in anticipo per una riga (Story 20.21, "Slot prenotato per..." in area admin) - un Visitatore non vede quindi data/ora/palestra anche quando l'Admin li ha già decisi, prima ancora che il tabellone reale esista. Richiesta esplicita dell'utente, dopo aver verificato dal vivo che questo era il comportamento attuale: "voglio che la prenotazione sia visibile ugualmente".

**Approach:** rinegoziazione esplicita del limite "Never" della Story 20.27 ("nessun controllo di prenotazione anticipata Slot... resta una funzionalità esclusivamente admin"), MA solo per la sola VISUALIZZAZIONE - mai il controllo interattivo. Per ciascuna riga del prospetto ipotetico (semifinale/finale), si cerca lo `SlotTorneo` eventualmente prenotato per quella esatta combinazione categoria+fase+tabellone+ordinale (stessa logica di lookup di `slotPerPrenotazione` in `tabellone/page.tsx`, qui solo la parte "slot attuale", mai la lista `slotDisponibili`) e, se presente, lo si mostra con lo stesso componente `MetaSlot` già usato per gli Slot di partite reali (data/ora/palestra + link "Naviga") - stesso identico trattamento visivo, nessun componente nuovo.

## Boundaries & Constraints

**Always:** riusare `MetaSlot` (già definito in `app/torneo/page.tsx`) invariato - nessuna nuova UI per mostrare lo Slot, stesso identico rendering delle partite reali. Riusare `elencaSlotTorneo(edizioneTorneoId)` (già esistente, `lib/torneo.ts`) per leggere tutti gli `SlotTorneo` dell'Edizione in un'unica query (mirror del pattern già in uso in `tabellone/page.tsx`), mai una query per riga del prospetto. La ricerca dello Slot prenotato per una riga avviene SOLO quando `accoppiamento.fase`/`accoppiamento.tabellone` sono valorizzati (stessa guardia già usata in admin) - nessuna ricerca per righe che non hanno un percorso di generazione reale.

**Ask First:** nessuna prevista (richiesta esplicita e già confermata dall'utente dopo la diagnosi dal vivo).

**Never:** nessun form/controllo interattivo di prenotazione (`PrenotaSlotIpoteticoForm`/`prenotaSlotIpoteticoAction`) sulla vista pubblica - resta ESCLUSIVAMENTE un'azione admin (limite della Story 20.21 confermato, non rinegoziato: la pagina pubblica non ha sessione/ruolo, un Visitatore anonimo non deve poter scrivere una prenotazione). Nessuna modifica al ramo `tabelloneGenerato` esistente (tabellone reale già funzionante, fuori scope). Nessuna modifica all'area admin (`tabellone/page.tsx`, `PrenotaSlotIpoteticoForm.tsx`) - tocca solo la vista pubblica.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Riga del prospetto con uno Slot già prenotato | `SlotTorneo` con `prenotazioneCategoriaTorneoId`/`fase`/`tabellone`/`prenotazioneOrdinale` corrispondenti | La riga mostra data/ora/palestra (e link "Naviga" se disponibile), stesso identico trattamento di una partita reale | N/A |
| Riga del prospetto senza alcuna prenotazione | nessuno `SlotTorneo` corrispondente | Nessun elemento Slot mostrato (comportamento odierno invariato, `MetaSlot` già gestisce il caso null) | N/A |
| Finalina diretta del formato 6 (nessuna semifinale, `ordinale: null`) | riga "Finale" con `ordinale: null` | Stessa ricerca/visualizzazione, nessuna distinzione necessaria (mirror della gestione già esistente per le finali in admin) | N/A |
| Formato non riconosciuto (`prospettoIpotetico === null`) | es. Gironi sbilanciati | Nessun cambiamento - il messaggio esplicito esistente resta invariato, nessuna riga da cui cercare uno Slot | N/A |
| Tabellone reale già generato (`tabelloneGenerato === true`) | qualunque Categoria | Nessun cambiamento - questa story tocca solo il ramo `!tabelloneGenerato` | N/A |

</frozen-after-approval>

## Code Map

- `app/torneo/page.tsx` -- import `elencaSlotTorneo` da `@/lib/torneo` e i tipi `FaseTorneo`/`TabelloneTorneo` da `@prisma/client` (mirror di `tabellone/page.tsx`). Aggiungere `elencaSlotTorneo(edizione.id)` al `Promise.all` esistente che risolve `volantino`/`datiCategorie` (righe ~122-148) - letto UNA VOLTA per l'intera Edizione, non per Categoria. Nuova funzione locale `trovaSlotPrenotatoRiga(categoriaTorneoId, fase, tabellone, ordinale)` (mirror minimale della sola parte "slotAttuale" di `slotPerPrenotazione` in `tabellone/page.tsx`) che cerca in `slotTorneo` una riga con `prenotazioneCategoriaTorneoId`/`fase`/`tabellone`/`prenotazioneOrdinale` corrispondenti, `null` altrimenti. Nel ramo `!tabelloneGenerato` (righe ~439-473, dentro `sezione.semifinali.map`/`sezione.finali.map`), dopo il `<p>` con l'accoppiamento, aggiungere `{accoppiamento.fase && accoppiamento.tabellone && (<MetaSlot slotTorneo={trovaSlotPrenotatoRiga(categoria.id, accoppiamento.fase, accoppiamento.tabellone, accoppiamento.ordinale ?? null)} />)}`.

## Tasks & Acceptance

**Execution:**
- [ ] `app/torneo/page.tsx` -- leggere `SlotTorneo` dell'Edizione, cercare la prenotazione per ciascuna riga del prospetto ipotetico, mostrarla con `MetaSlot`

**Acceptance Criteria:**
- Given una riga del prospetto ipotetico con uno Slot già prenotato in admin, when un Visitatore apre `/torneo`, then vede data/ora/palestra di quello Slot sulla stessa riga
- Given una riga senza prenotazione, when la pagina si carica, then non compare alcun elemento Slot (comportamento invariato)
- Given il tabellone reale già generato per una Categoria, when la pagina si carica, then quella sezione resta invariata (nessun impatto di questa story)

## Verification

**Commands:**
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2085/2085 verdi (+5 nuovi test)
- `npm run build` -- riuscito (exit 0, "Compiled successfully")

**Review a 3 livelli:** Blind Hunter ha trovato un bug reale e serio (severità alta) - `MetaSlot` riusa `.metaSlot`/`.linkNaviga`, colorati quasi bianco per essere leggibili SOLO sullo sfondo blu scuro di `.matchCard` (unico contesto in cui il componente era usato finora); nel nuovo utilizzo dentro il prospetto ipotetico (sfondo chiaro della pagina), quel colore sarebbe stato praticamente invisibile (contrasto ~1:1) - il codice avrebbe mostrato lo Slot, ma l'utente non l'avrebbe visto comunque. Corretto con una variante esplicita (`suSfondoChiaro` su `MetaSlot`, nuove classi `.metaSlotChiaro`/`.linkNavigaChiaro`), senza toccare il comportamento invariato delle partite reali. Verification Gap Reviewer ha trovato una logica di ricerca duplicata e non testata (la stessa combinazione di criteri esisteva già, non estratta, in `tabellone/page.tsx`) - corretto estraendo `trovaSlotPrenotatoInMemoria` in `lib/torneo.ts` con 5 nuovi test, senza toccare l'area admin (limite "Never" della spec, rispettato). Edge Case Hunter ha sollevato rischi teorici (duplicati di prenotazione, fail-soft silenzioso) già esclusi/accettati per costruzione (vincolo applicativo già documentato nello schema, stesso pattern fail-soft già in uso in tutta la pagina). Altri finding minori (query non scoped per Categoria, scansione lineare, wrapper senza classe - quest'ultimo corretto con `.rigaProspetto`) loggati in `deferred-work.md`.

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Aprire `/torneo` per la categoria U17 (Slot già prenotati per diverse righe, verificato dal vivo con l'utente): verificare che ogni riga mostri lo Slot prenotato corrispondente, testo ben leggibile su sfondo chiaro.
- Verificare che nessun form/select di prenotazione compaia sulla pagina pubblica (sola lettura).
- Verificare che le partite reali (tabellone già generato) restino visivamente invariate (testo chiaro su sfondo scuro, come prima).
