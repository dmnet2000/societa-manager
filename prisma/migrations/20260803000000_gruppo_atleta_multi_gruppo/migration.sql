-- Story 9.21: un'Atleta puo' ora essere assegnata a piu' Gruppi
-- contemporaneamente nella stessa stagione (es. "aggregata" a una
-- categoria superiore) - il vecchio vincolo su (atletaId, annoAgonisticoId)
-- (migrazione 20260717170000_add_gruppo_atleta, Story 2.4) imponeva "un
-- solo Gruppo per Atleta per stagione". Sostituito da un vincolo composito
-- che include anche gruppoId: blocca ancora un duplicato esatto (stessa
-- Atleta+Gruppo+stagione due volte) ma non piu' una seconda riga su un
-- Gruppo diverso.
DROP INDEX "gruppo_atlete_atletaId_annoAgonisticoId_key";

CREATE UNIQUE INDEX "gruppo_atlete_atletaId_gruppoId_annoAgonisticoId_key" ON "gruppo_atlete"("atletaId", "gruppoId", "annoAgonisticoId");
