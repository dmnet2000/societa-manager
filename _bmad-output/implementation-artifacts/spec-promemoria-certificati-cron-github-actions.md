---
title: 'Trigger GitHub Actions per il promemoria scadenza Certificati Medici'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'one-shot'
---

# Trigger GitHub Actions per il promemoria scadenza Certificati Medici

## Intent

**Problem:** l'endpoint `app/api/cron/promemoria-certificati` (Story 4.6) non ha mai avuto un trigger automatico funzionante — la Fase 6 di `docs/deploy-produzione.md` (Cloudflare Cron Trigger nativo) risulta strutturalmente non applicabile a questo build (scoperta durante Story 10.12), quindi i promemoria scadenza Certificato Medico non sono mai partiti da soli in produzione.

**Approach:** replicare lo stesso meccanismo appena costruito per la sincronizzazione FIPAV (Story 10.12) — un workflow GitHub Actions schedulato (`.github/workflows/promemoria-certificati.yml`) che chiama l'endpoint via HTTPS con lo stesso `CRON_SECRET`/`CRON_ENDPOINT_URL` già configurati, nessun nuovo secret. A differenza del battito orario di `sincronizza-fipav.yml`, qui **una sola volta al giorno**: l'endpoint confronta i giorni alla scadenza per data di calendario (non per timestamp), quindi una seconda esecuzione nello stesso giorno rimanderebbe lo stesso promemoria. Nessuna modifica al codice applicativo (`route.ts` invariato) — solo il trigger mancante.

## Suggested Review Order

- Nuovo workflow — schedule giornaliero, `concurrency` per evitare esecuzioni davvero in parallelo, `permissions: {}`, timeout/retry dimensionati sul carico reale (SMTP sequenziale per Certificato, non un singolo fetch come il sibling).
  [`promemoria-certificati.yml`](../../.github/workflows/promemoria-certificati.yml)

- Stesso irrigidimento (`permissions: {}`) propagato al workflow gemello per coerenza.
  [`sincronizza-fipav.yml:19`](../../.github/workflows/sincronizza-fipav.yml#L19)

- Documentazione — nuova Fase 6ter, con l'avviso sullo stesso schema di incidente silenzioso già noto dalla Fase 3ter (l'endpoint risponde sempre 200 anche quando zero email partono davvero) e una procedura di verifica reale (impostare temporaneamente la scadenza di un Certificato di prova).
  [`deploy-produzione.md:140`](../../docs/deploy-produzione.md#L140)
