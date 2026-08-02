-- Story 10.7 (Epic 10): Campionato appartiene direttamente a un solo Gruppo
-- (era un molti-a-molti tramite gruppo_campionati, Story 10.1) - corregge il
-- modello dati per rispecchiare il dominio reale (due squadre nello stesso
-- girone federale sono due Campionati distinti a sistema, mai condivisi).
-- Backfill: se un Campionato risultasse collegato a piu' di un Gruppo (mai
-- raggiungibile in pratica se non tramite "Collega Campionato esistente",
-- rimossa da questa stessa storia), viene tenuto il collegamento piu'
-- vecchio (createdAt crescente).

ALTER TABLE "campionati" ADD COLUMN "gruppoId" TEXT;

-- Review fix (Blind Hunter + Edge Case Hunter): senza questo controllo, un
-- Campionato collegato a piu' di un Gruppo verrebbe silenziosamente
-- assegnato al Gruppo piu' vecchio e gli altri collegamenti sarebbero
-- distrutti per sempre dalla DROP TABLE sotto - la "verifica manuale dopo
-- il deploy" prevista dalla storia arriverebbe troppo tardi. Questo blocco
-- interrompe la migrazione PRIMA di alterare qualunque dato se un simile
-- caso esistesse davvero, cosi' la verifica manuale avviene prima della
-- perdita di dati, non dopo.
DO $$
DECLARE
  campionati_condivisi INT;
BEGIN
  SELECT COUNT(*) INTO campionati_condivisi
  FROM (
    SELECT "campionatoId"
    FROM "gruppo_campionati"
    GROUP BY "campionatoId"
    HAVING COUNT(DISTINCT "gruppoId") > 1
  ) sub;

  IF campionati_condivisi > 0 THEN
    RAISE EXCEPTION 'Trovati % Campionati collegati a piu'' di un Gruppo - risolvere manualmente quale Gruppo deve restare proprietario prima di rieseguire questa migrazione (Story 10.7).', campionati_condivisi;
  END IF;
END $$;

UPDATE "campionati" c
SET "gruppoId" = sub."gruppoId"
FROM (
  SELECT DISTINCT ON ("campionatoId") "campionatoId", "gruppoId"
  FROM "gruppo_campionati"
  ORDER BY "campionatoId", "createdAt" ASC
) sub
WHERE c."id" = sub."campionatoId";

-- Se questo fallisce per NOT NULL, esistono Campionati senza alcuna riga in
-- gruppo_campionati (dati orfani) - da investigare manualmente prima di
-- procedere, non forzare un default silenzioso.
ALTER TABLE "campionati" ALTER COLUMN "gruppoId" SET NOT NULL;

ALTER TABLE "campionati" ADD CONSTRAINT "campionati_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "gruppo_campionati";
