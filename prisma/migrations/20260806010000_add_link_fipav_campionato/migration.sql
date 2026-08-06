-- Story 10.8: link opzionale al portale FIPAV/Lega Pallavolo del girone.
-- Colonna nullable su tabella gia' strutturale/no-RLS (nessun GRANT da
-- toccare).
ALTER TABLE "campionati" ADD COLUMN "linkFipav" TEXT;
