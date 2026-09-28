-- Story 10.12: sincronizzazione automatica delle Partite dal portale
-- FIPAV/Lega, cadenza configurabile dall'app - due colonne nullable su
-- "configurazione_applicazione" (tabella gia' strutturale/no-RLS, mirror
-- esatto di "urlPaginaInstagram", 20260909000000), nessun GRANT da toccare.
-- frequenzaSincronizzazioneFipavOre: cadenza reale (in ore), editabile da
-- Admin su /app/impostazioni - fallback 24 ore quando NULL (mai impostato).
-- ultimaSincronizzazioneFipavAutomaticaIl: aggiornato solo quando l'endpoint
-- app/api/cron/sincronizza-fipav esegue davvero (mai su uno skip), mai dal
-- bottone manuale (Story 10.11, traccia separata).
ALTER TABLE "configurazione_applicazione" ADD COLUMN "frequenzaSincronizzazioneFipavOre" INTEGER;
ALTER TABLE "configurazione_applicazione" ADD COLUMN "ultimaSincronizzazioneFipavAutomaticaIl" TIMESTAMP(3);
