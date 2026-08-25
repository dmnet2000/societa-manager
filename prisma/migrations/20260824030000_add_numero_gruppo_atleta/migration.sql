-- Story 9.35: Numero di maglia per Atleta, specifico della coppia
-- Atleta+Gruppo+Stagione (GruppoAtleta, tabella fisica "gruppo_atlete") -
-- facoltativo fin da subito (nullable), nessun backfill necessario (campo
-- nuovo, mai valorizzato prima d'ora). Nessun vincolo di unicita' - decisione
-- esplicita in epics.md AC #3, due Atlete dello stesso Gruppo possono avere
-- lo stesso Numero.
ALTER TABLE "gruppo_atlete" ADD COLUMN "numero" INTEGER;
