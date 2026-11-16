-- Referto elettronico, story 3.1 (AD-5): parametri del formato di gara.
-- Colonne JSON nullable; nessun dato scritto (default nel codice).
ALTER TABLE "edizioni_torneo" ADD COLUMN "parametriFormato" JSONB;

ALTER TABLE "categorie_torneo" ADD COLUMN "parametriFormato" JSONB;
