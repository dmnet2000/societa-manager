# Sprint Change Proposal — 2026-07-18

## 1. Issue Summary

Durante la preparazione della Story 4.3 (Mail automatica alla Segreteria, FR-13), è emerso che l'architettura originale prevedeva **Resend** come provider email transazionale — un servizio esterno che richiede un nuovo account/API key. L'utente possiede invece già una casella email attiva presso Aruba, che vuole riutilizzare via SMTP standard. Ha inoltre richiesto che i parametri di invio email siano **configurabili da un'interfaccia Admin** (non hardcoded in variabili d'ambiente), aprendo l'opportunità di una sezione di configurazione applicativa più ampia (a partire da: parametri SMTP + logo dell'app).

**Categoria:** nuovo requisito emerso da vincolo pratico dello stakeholder (provider email preferito) + richiesta esplicita di una capability non pianificata (configurazione applicativa runtime).

## 2. Impact Analysis

- **Epic 4 (Compliance Visite Mediche):** Story 4.3 resta valida nell'intento (FR-13 invariato) ma la sua implementazione ora dipende da una nuova Story 7.1 completata prima. Nessuna modifica alle Story 4.1/4.2 già `done`.
- **Nuovo Epic 7 (Configurazione Applicazione):** 2 nuove storie (7.1 Configurazione SMTP — bloccante per 4.3; 7.2 Configurazione logo — non bloccante, v1.1).
- **PRD:** 2 nuovi FR (FR-31, FR-32), nuova sezione §4.12; FR-31 aggiunto al perimetro v1 (§6.1, bloccante per lo stesso motivo di FR-13/FR-16); FR-32 aggiunto a "Fuori Perimetro v1" (§6.2).
- **Architettura:** nuovo AD-12 (Configurazione applicativa gestita da Admin, persistita in DB); Stack aggiornato (Resend → Nodemailer/SMTP); Capability Map e Structural Seed aggiornati con la nuova area `(configurazione)/`.
- **Nessun impatto** su Epic 1/2/3/5/6 o sulle storie già completate.

## 3. Recommended Approach

**Direct Adjustment** (Opzione 1 del checklist): nessun rollback necessario, nessuna revisione dell'MVP oltre allo spostamento di FR-32 fuori perimetro v1 (branding non bloccante). Il piano di esecuzione si adatta semplicemente eseguendo Epic 7 (Story 7.1 poi 7.2) prima di riprendere Story 4.3, senza rinumerare gli epic già completati.

**Rischio:** basso. **Effort:** basso-medio (2 storie di dimensione contenuta, pattern già consolidati nel progetto — tabella di configurazione RLS-protetta simile a `certificati_medici`, bucket pubblico analogo ma speculare al bucket privato di Story 4.1).

## 4. Detailed Change Proposals

Tutte le modifiche sotto sono state approvate incrementalmente dall'utente durante il workflow `correct-course`.

### PRD (`prds/prd-societa-manager-2026-07-13/prd.md`)
- Nuova sezione §4.12 "Configurazione Applicazione" con FR-31 (Configurazione SMTP) e FR-32 (Configurazione logo applicazione).
- §6.1 (In Perimetro v1): aggiunto FR-31, con nota sul perché è bloccante.
- §6.2 (Fuori Perimetro v1): aggiunto FR-32.

### Epics (`epics.md`)
- Nuovo Epic 7 "Configurazione Applicazione" (FR-31, FR-32), con nota esplicita sulla sequenza di esecuzione (precede Story 4.3).
- Story 7.1 "Configurazione SMTP", Story 7.2 "Configurazione logo applicazione" (quest'ultima marcata Could/v1.1).
- FR Coverage Map aggiornata con FR-31/FR-32.

### Architettura (`ARCHITECTURE-SPINE.md`)
- Nuovo AD-12 "Configurazione applicativa gestita da Admin, persistita in DB": tabella dedicata RLS ADMIN-only per SMTP (password in chiaro, protetta solo da RLS — scelta deliberata, coerente con il resto del progetto), bucket Storage **pubblico** per il logo (contrasto esplicito con AD-6, bucket privato dei certificati).
- Stack: riga Resend sostituita con Nodemailer (SMTP generico).
- Capability Map: nuova riga Configurazione Applicazione; riga Certificati Medici estesa con AD-12.
- Structural Seed: nuova cartella `app/(configurazione)/`; `lib/email/` ridescritto.
- Frontmatter: `binds` esteso a `FR-1..FR-32`, `updated` a 2026-07-18.

### Sprint tracking (`sprint-status.yaml`)
- Nuovo blocco `epic-7` con `7-1-configurazione-smtp` e `7-2-configurazione-logo-applicazione`, inserito **prima** di `4-3-mail-automatica-alla-segreteria` nell'ordine del file (non nella numerazione) — con commento esplicito sul motivo, così la logica di auto-discovery "prima storia backlog dall'alto" rispetta la dipendenza.

## 5. Implementation Handoff

**Scope: Minor-Moderate.** Nessuna revisione strategica necessaria (PM/Architect), nessuna riorganizzazione di backlog oltre al riposizionamento già applicato. Procede direttamente all'implementazione (create-story → dev-story → code-review) per Story 7.1 e 7.2, poi ripresa di Story 4.3 con la nuova dipendenza soddisfatta.

**Success criteria:** Story 7.1 permette all'Admin di salvare/aggiornare parametri SMTP funzionanti (verificati con un invio reale via la casella Aruba dell'utente); Story 4.3, quando ripresa, invia l'email alla Segreteria usando quella configurazione, non più Resend.
