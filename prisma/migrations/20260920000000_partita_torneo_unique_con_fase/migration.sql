-- Bug finali: il vincolo unico (categoriaTorneoId, squadraCasaId,
-- squadraOspiteId) impediva a una finale di rigiocare una coppia gia'
-- incontratasi nel girone con lo stesso orientamento casa/ospite (es. 1°A vs
-- 2°A) - la generazione delle finali falliva con P2002 dopo il salvataggio
-- della seconda semifinale. "fase" entra nel vincolo (colonna NOT NULL,
-- default GIRONE): la protezione contro il doppio calendario di girone resta
-- identica, semifinali/finali non collidono piu' con i gironi. Nessun dato
-- esistente puo' violare il nuovo indice (e' meno restrittivo del vecchio).
DROP INDEX "partite_torneo_categoriaTorneoId_squadraCasaId_squadraOspit_key";

CREATE UNIQUE INDEX "partite_torneo_categoria_fase_casa_ospite_key" ON "partite_torneo"("categoriaTorneoId", "fase", "squadraCasaId", "squadraOspiteId");
