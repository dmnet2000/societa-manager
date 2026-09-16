-- Story 20.34: campo Refertista (chi ha compilato il referto cartaceo)
-- per ogni PartitaTorneo - testo libero facoltativo, additivo (nessun
-- backfill, ogni incontro esistente resta con refertista = null). Stesso
-- trattamento nullable senza DEFAULT gia' usato per nomeSettimana1/2
-- (migrazione 20260826010000_add_nomi_settimane_edizione_torneo).
ALTER TABLE "partite_torneo" ADD COLUMN "refertista" TEXT;
