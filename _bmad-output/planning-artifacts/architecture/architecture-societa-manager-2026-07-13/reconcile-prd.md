---
title: Reconciliazione PRD vs Architecture Spine
scope: 'Gestione Settore Volley - Polisportiva'
created: 2026-07-14
sources:
  - _bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md
---

# Reconciliazione PRD → Architecture Spine

## Metodo

Per ciascuno dei 29 FR del PRD, verificato se compare (a) in una riga della Capability → Architecture Map, (b) nei `binds` di un AD, o (c) come voce esplicita in Deferred. Per gli NFR trasversali (§8), i Non-Obiettivi (§5, funzione di guardrail/constraints) e le Domande Aperte (§9), verificato se trovano contropartita in un AD, in una scelta di Stack, in Deferred, o restano esplicitamente aperti.

## 1. Copertura dei 29 FR

Tutti i 29 FR compaiono almeno una volta nello spine (via commento di range in Structural Seed, riga della Capability Map, `binds` di un AD, o voce Deferred). Nessun FR è completamente assente.

| FR | In perimetro v1? | Dove compare nello spine |
| --- | --- | --- |
| FR-1..FR-4 | Sì | `app/(orari-palestre)/`, Capability Map (AD-2, AD-8) |
| FR-5 | No (§6.2, rimandato a v1.1) | Solo incluso nel range "FR-1..FR-5" del modulo Orari-Palestre; **nessuna voce esplicita in Deferred** |
| FR-6, FR-7 | Sì | `app/(gruppi-allenatori)/`, Capability Map (AD-2, AD-8) |
| FR-8, FR-9 | Sì | `app/(presenze)/`, Capability Map (AD-2) |
| FR-10 | No (§6.2, incrementale) | Solo incluso nel range "FR-8..FR-10"; **nessuna voce esplicita in Deferred** |
| FR-11..FR-16 | Sì | `app/(certificati-medici)/`, Capability Map (AD-2, AD-4, AD-6, AD-7, AD-9, AD-10); FR-16 anche esplicito in AD-7 |
| FR-17 | Sì | `app/(iscrizioni)/`, Capability Map (AD-2, AD-4, AD-9) |
| FR-18..FR-21 | Sì | `app/(onboarding-import)/`, Capability Map (AD-2, AD-5, AD-10); FR-19 anche in Consistency Conventions (normalizzazione date) |
| FR-22, FR-23 | Sì | `app/(rollover-stagionale)/`, Capability Map (AD-2, AD-5, AD-8, AD-10); FR-22 esplicito nella regola di AD-5 (`unisciCertificato`) |
| FR-24, FR-25 | No (§6.2) | Solo incluso nel range "FR-24, FR-25" del modulo Dati-Atleta; **nessuna voce esplicita in Deferred** |
| FR-26 | Sì | `app/(amministrazione)/`, Capability Map (AD-2, AD-4) |
| FR-27 | No (§6.2, Should) | **Esplicito in Deferred**: "Permessi granulari fine oltre il ruolo base" |
| FR-28 | No (§6.2, Could) | **Esplicito in Deferred**: "Wizard Nuova Stagione" |
| FR-29 | Sì | `app/(amministrazione)/`, Capability Map (AD-2, AD-4) |

**Osservazione (non bloccante):** dei 5 FR fuori perimetro v1 (§6.2 del PRD), solo FR-27 e FR-28 ricevono una voce esplicita in Deferred con motivazione e percorso futuro. FR-5, FR-10, FR-24, FR-25 sono "coperti" solo per inclusione implicita nel range di un modulo — soddisfano il criterio minimo ("mappato direttamente"), ma il trattamento è incoerente rispetto a FR-27/FR-28: non è scritto da nessuna parte *perché* sono fuori v1 né *come* verranno aggiunti in futuro. Consigliato allineare il trattamento (anche solo una riga per ciascuno in Deferred) per coerenza documentale.

## 2. NFR Trasversali (§8 PRD)

| NFR | Trattamento nello spine |
| --- | --- |
| Sicurezza/Autenticazione | Risolto: Stack → Supabase Auth; AD-4 usa i claim del JWT; alternative (magic link, SSO) esplicitamente in Deferred. |
| Privacy dati sanitari | **Parzialmente risolto.** AD-4 (RLS), AD-6 (storage privato + URL firmati), AD-9 (client Supabase per tabelle RLS) coprono il *come* si controlla l'accesso. Il PRD (§9, punto 2) chiede esplicitamente attenzione anche al *dove/come si conservano* i dati sanitari (residenza/hosting, dato che sono spesso di minorenni) — questo non trova contropartita: nessuna menzione di regione del progetto Supabase/Cloudflare, né di considerazioni GDPR sulla localizzazione dei dati. **Vedi Gap 1 sotto.** |
| Piattaforma (web, no offline) | Soddisfatto implicitamente dall'intero paradigma (Next.js web app via Cloudflare Pages); nessun AD dedicato necessario. |
| Affidabilità (no SLA formale) | Superato in positivo: Deferred discute il rischio di auto-pausa Supabase Free tier e la mitigazione via cron giornaliero (AD-7). |
| Scala (~200, estensione ~1500) | Esplicito in Deferred: "Estensione pluri-settore (~1500 atlete)" con impatto dichiarato su AD-2 e schema. |
| Vincolo solo-dev / stack economico | Soddisfatto dall'intera tabella Stack (tutti piani Free) e da Deferred ("Ambiente di deploy": un solo progetto Supabase + un solo progetto Cloudflare Pages, no staging dedicato). |

## 3. Non-Obiettivi / Guardrail (§5 PRD)

Verificato che lo spine non introduca nulla in contraddizione:

- Nessun algoritmo di assegnazione slot-allenatore nello spine (FR-2 resta "caricamento diretto"). Coerente.
- Nessun ruolo "Gestore palestra" o "Medico sportivo" nello Structural Seed (`UTENTE }o--o{ RUOLO`, generico). Coerente.
- Iscrizioni limitate a FR-17 (conferma), nessuna funzione di pagamento/iscrizione federale nel modello dati. Coerente.
- Nessuna entità "Tesseramento"/validità tesseramento nell'ERD. Coerente.

Nessuna violazione trovata.

## 4. Domande Aperte (§9 PRD)

| # | Domanda | Trattamento nello spine |
| --- | --- | --- |
| 1 | Autenticazione | Risolta per il v1 (Supabase Auth); dettaglio ulteriore in Deferred. **Nota:** la voce Deferred cita erroneamente "PRD §11" — la sezione corretta nel PRD è §9. Refuso di cross-reference, non un gap sostanziale. |
| 2 | Conservazione/hosting dati sanitari | **Non affrontata la parte "dove".** Vedi Gap 1. |
| 3 | Contenuto Wizard Nuova Stagione (FR-28) | Rimandata a Deferred, coerente con lo status Could del PRD (anche se il PRD chiedeva che fosse "definita in architettura" — qui viene ri-rimandata, non decisa; accettabile dato lo status Could/non bloccante). |
| 4 | Log di accesso/audit su dati sanitari | Esplicita in Deferred, con percorso di estensione futura di AD-4. Risolta. |

## 5. Gap rilevati

### Gap 1 — Residenza/hosting dei dati sanitari non affrontata (PRD §8, §9.2)
Il PRD chiede esplicitamente, per i Certificati Medici (dati sensibili, spesso di minorenni), attenzione dedicata a *dove* vengono conservati, oltre a *come* sono protetti. Lo spine copre solo il "come" (AD-4 RLS, AD-6 storage privato/URL firmati, AD-9 client Supabase autenticato). Non c'è traccia di una decisione o anche solo di un'assunzione esplicita su regione del progetto Supabase/Cloudflare, residenza dei dati o considerazioni GDPR minori. Questo è il punto della PRD più esplicitamente segnalato come "da approfondire in architettura" che non ha ricevuto risposta, nemmeno come Deferred.

### Gap 2 — Incoerenza nella Capability → Architecture Map su Presenza/Atleta e RLS
AD-4 e AD-9 dichiarano esplicitamente nei propri `Binds` che `Presenza` e `Atleta` sono tabelle protette da RLS, lette/scritte tramite client Supabase autenticato. Tuttavia:
- La riga Capability Map "Presenze (FR-8..FR-10)" cita solo **AD-2** come governance — non AD-4 né AD-9.
- La riga Capability Map "Onboarding e Import (FR-18..FR-21)" (proprietaria di Atleta, AD-10) cita solo **AD-2, AD-5, AD-10** — non AD-4 né AD-9, pur scrivendo su Atleta che è dichiarata protetta da RLS.

Questo disallineamento tra i `Binds` degli AD e le righe della Capability Map rischia di far implementare questi due moduli con connessione Prisma privilegiata (come le tabelle non-RLS elencate in AD-9: Palestra, Campo, Slot, Gruppo, Allenatore) invece che tramite client Supabase autenticato, bypassando di fatto le policy RLS per due entità che il PRD tratta come sensibili (dati sanitari collegati e dati anagrafici di minorenni).

### Gap 3 — Import massivo (FR-19) non conciliato con RLS scoping per ruolo (AD-4/AD-9)
AD-4 descrive policy RLS basate su claim ruolo + entità collegate (Genitore→proprie Atlete, Allenatore→propri Gruppi). FR-19 richiede che Admin/Dirigente importino/aggiornino l'intero archivio Atlete (fino a ~200 record, su tutti i gruppi) in un colpo solo. Non è specificato quale policy RLS autorizza Admin/Dirigente a scrivere su tutte le Atlete (non solo "le proprie"), né se l'import passa dal client Supabase con sessione utente (AD-9) o necessita di un percorso privilegiato dedicato. Rischio concreto di bloccarsi in implementazione se le policy RLS sono scritte pensando solo ai casi Genitore/Allenatore.

### Osservazione minore — Trattamento incoerente dei FR fuori-perimetro (vedi tabella §1)
FR-5, FR-10, FR-24, FR-25 soddisfano il criterio minimo di mappatura (inclusi nel range di un modulo) ma, a differenza di FR-27/FR-28, non hanno una voce Deferred dedicata che ne spieghi l'esclusione dal v1. Non blocca l'avvio ma è un'incoerenza documentale facilmente sanabile.

### Refuso minore — Cross-reference errato
La prima voce di Deferred ("Meccanismo di autenticazione dettagliato...") cita "PRD §11", sezione inesistente nel PRD attuale (le Domande Aperte sono in §9). Correggere il riferimento.

## 6. Sintesi

- **29/29 FR** trovano una contropartita almeno diretta nello spine; nessun FR è silenziosamente scomparso.
- **NFR e Non-Obiettivi**: sostanzialmente coperti, con un'eccezione reale (Gap 1, residenza dati sanitari).
- **Domande Aperte**: 3 su 4 risolte o esplicitamente rimandate; 1 (hosting/residenza) resta scoperta.
- **Gap architetturali interni** (non richiesti esplicitamente dal task ma emersi dalla lettura incrociata): 2 e 3 sopra, relativi a coerenza tra AD-4/AD-9 e la Capability Map, e allo scoping RLS per l'import massivo.
