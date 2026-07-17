---
title: Reconciliation — Brief vs PRD (Gestione Settore Volley - Polisportiva)
created: 2026-07-13
---

# Reconciliation: brief.md → prd.md

Source input: `_bmad-output/planning-artifacts/briefs/brief-societa-manager-2026-07-13/brief.md`
Downstream: `_bmad-output/planning-artifacts/prds/prd-societa-manager-2026-07-13/prd.md`

## Method

Walked the brief section by section (Executive Summary, Il Problema, La Soluzione, Chi la usa, Criteri di Successo, Perimetro Must/Should/Could/Won't, Regole di Business, Scala e Vision, Vincoli di Tempo) and located, for each meaningful point, where it lands in the PRD (Vision, JTBD, User Journeys, Glossario, FR, Non-Obiettivi, MVP scope, Metriche di Successo, NFR, Vincoli/Domande Aperte). "Covered" means present in *some* form per the task's own criterion — an FR, NFR, non-goal, glossary term, journey, or success metric all count, even if the brief phrased it as a different artifact type (e.g. a "Must" scope bullet realized only as an FR without a matching success metric still counts as covered).

## Traceability by section

### Executive Summary
- Three concrete problems (orari, presenze, certificati) → PRD Vision (§1), Feature sections 4.1/4.3/4.4. Covered.
- "Non un gestionale generale, la segreteria ne ha già uno" → PRD Vision (§1), Non-Obiettivi bullet 3. Covered.
- "Nasce da un'esigenza personale e pratica: recuperare il tempo perso... automatizzando quello che si può automatizzare senza costruire l'ennesimo gestionale generalista" → **not carried into PRD Vision.** §0 mentions the reader is "l'utente stesso, sviluppatore unico con assistenza AI" (a structural/process note), but the *motivational, first-person "why now"* framing — this exists to reclaim the author's own lost time — is flattened into a generic third-person problem statement. See Gap 1.

### Il Problema
- WhatsApp/Excel/telefonate as informal channels, cost in time → PRD Vision (§1). Covered.
- Concrete risk: atleta in campo with expired certificate unnoticed → PRD Vision (§1), near-verbatim. Covered.
- Each role needs a different piece of information, none served today → PRD §2.1 JTBD, one bullet per role. Covered.

### La Soluzione
- Visibilità orari (loaded, not computed) → FR-1, FR-2, Non-Obiettivi bullet 1. Covered.
- Gestione presenze per gruppo con storico → FR-8, FR-9. Covered.
- Ciclo di vita certificato medico (upload → conferma, notifiche non invasive) → FR-11–FR-16. Covered.
- Onboarding via codice fiscale (import federale + rollover) → FR-18–FR-23, Glossario "Codice Fiscale". Covered.
- Principio "niente rumore" (segnalare solo eccezioni reali) → PRD Vision (§1) verbatim, formalized further as counter-metric SM-C1. Covered, and reinforced.

### Chi la usa (6 roles)
All six roles (Allenatore, Atleta, Genitore, Segreteria/Amministrazione, Dirigente/Responsabile settore, Admin di sistema) appear in PRD §2.1 JTBD with matching responsibilities. Covered, with two nuances:
- Segreteria brief text: "inserisce/conferma le visite mediche ricevute" — PRD FR-14 only models "confermare/validare" an already-uploaded certificate; there is no FR for Segreteria to directly *input* a certificate she received through another channel (e.g., handed in on paper). Partial gap — see Gap 4.
- Dirigente brief text: "ha visibilità d'insieme su orari, presenze e certificati" — the JTBD bullet restates this aspiration, but no FR grants the Dirigente a cross-group overview (unlike Segreteria's FR-5 for schedules). Partial gap — see Gap 3.

### Criteri di Successo (4 bullets)
1. "Nessuna atleta in campo senza stato certificato visibile" → SM-1. Covered directly.
2. "Tempo speso a rincorrere certificati si riduce" → SM-2. Covered directly.
3. "Allenatori, atlete e genitori trovano da soli orario e informazioni" → not restated as a §7 success metric, but realized via FR-3, FR-4, JTBD bullets, UJ-2. Covered in FR/journey form (per task's own inclusion criterion), though it would read stronger with an explicit SM.
4. "Passaggio di stagione non richiede ricostruire da zero" → not a §7 metric, but realized via FR-22, FR-23, UJ-3, Glossario "Anno Agonistico". Covered in FR/journey form.

### Perimetro
- **Must** (6 roles, anno agonistico, Palestra→Campo→Slot, viste orario personali, presenze+storico, ciclo certificati, conferma iscrizione, onboarding CF, rollover) → all mapped 1:1 to PRD §6.1 MVP scope (FR-1,2,3,4,6,7,8,9,11–23,26). Covered completely.
- **Should** (dati antropometrici/test fisici, vista orari trasversale segreteria, permessi granulari sanitari) → FR-24, FR-5, FR-27, all correctly flagged "Should" in PRD §6.2. Covered, and PRD adds a useful `[NOTE FOR PM]` flagging FR-27 for re-prioritization given sensitive-data risk — a faithful amplification, not a drift.
- **Could** (trend/percentuale presenze, grafici test fisici, wizard nuova stagione) → FR-10, FR-25, FR-28, all flagged "Could" in §6.2. Covered.
- **Won't** (algoritmo incastro orari, ruoli Gestore palestra/Medico sportivo, funzioni gestionali complete segreteria) → PRD §5 Non-Obiettivi, 3 matching bullets. Covered. (PRD adds a 4th non-goal on tesseramento federale not present in the brief's Won't list — additive, not a discrepancy, likely sourced from the addendum.)

### Regole di Business Non Negoziabili (7 rules)
All seven — anno agonistico 1 ago–30 giu, certificato su anno solare, merge su data più recente in import, riporto Under 13 con esclusione manuale, alert non bloccante, promemoria 30/7gg ai 4 destinatari, codice fiscale come chiave unica — map cleanly to PRD Glossario entries and FR-15, FR-16, FR-22, FR-23. Covered completely and precisely (this is the most faithfully transcribed section of the whole PRD).

### Scala e Vision
"~200 atlete volley oggi, ipotetica estensione a ~1500 atlete multi-settore, ordine di grandezza per l'architettura non requisito v1" → PRD §8 NFR "Scala" bullet, near-verbatim. Covered.

### Vincoli di Tempo
"Deadline target: l'app deve essere pronta per l'avvio del nuovo anno agonistico, il 1° agosto" → **not captured anywhere in the PRD as a project delivery constraint.** The PRD's several "1° agosto" mentions (UJ-3, Glossario, §4.7 title) all describe the *recurring seasonal rollover mechanic*, not the *one-time delivery deadline* for shipping v1. No NFR, Vincoli/Guardrail (§9), or Domande Aperte (§10) entry flags that this first release is time-boxed to a specific external date. Given the current date (2026-07-13) is roughly three weeks before that deadline, this is a significant omission for a solo-developer project — see Gap 2.

## Gaps found

1. **Delivery deadline dropped.** The brief's dedicated "Vincoli di Tempo" section states a hard external constraint — the app must be ready for the new season's start on August 1 — but the PRD never states this as a project/delivery constraint anywhere (not in Vision, NFR §8, Vincoli/Guardrail §9, or Domande Aperte §10). Every "1° agosto" reference in the PRD is about the recurring rollover mechanic, not the ship date. Given today is 2026-07-13, this is a live, urgent constraint that a reader of the PRD alone would have no way of knowing.

2. **Personal/motivational "why now" framing flattened.** The brief's Executive Summary frames the project as born from the author's own lived pain ("nasce da un'esigenza personale e pratica: recuperare il tempo perso... senza costruire l'ennesimo gestionale generalista"). The PRD's Vision (§1) restates the functional substance but drops the first-person, motivational origin story — it reads as a generic product vision rather than "I'm building this to get my own time back." §0's note about a solo developer with AI assistance is adjacent but doesn't recover this framing.

3. **Dirigente's cross-group overview has no FR.** The brief gives the Dirigente "visibilità d'insieme su orari, presenze e certificati" across all groups. The PRD's JTBD (§2.1) restates the aspiration, but unlike the analogous Segreteria capability (FR-5, cross-group schedule view), no FR grants the Dirigente an equivalent overview of attendance and certificate status across groups — only partial, indirect visibility via notification FRs (FR-12, FR-16).

4. **Segreteria's "inserisce" narrowed to "conferma" only.** The brief says Segreteria "inserisce/conferma le visite mediche ricevute" — implying she can also directly log a certificate received outside the app (e.g., handed in on paper), not just confirm one already uploaded by genitore/atleta. PRD FR-14 only models confirmation/validation of an existing upload; there's no FR for Segreteria-initiated certificate entry.

## Non-gaps worth noting (covered, but weakly)

- Success criteria 3 and 4 from the brief ("self-service scheduling," "no season-rebuild") are not restated as explicit §7 success metrics, unlike criteria 1 and 2 (SM-1, SM-2). They are still realized through FRs and journeys, which satisfies the task's inclusion bar, but the PRD's success-metrics section is measurably thinner than the brief's success-criteria list (2 of 4 promoted to formal metrics).
