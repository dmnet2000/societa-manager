-- Referto elettronico, story 4.1 (AD-7, AD-8, AD-11, AD-17): risultati dei set
-- chiusi dal tablet ("referto in corso"). Una riga per (gara, set); cancellare
-- una partita cancella anche i suoi risultati (CASCADE).
CREATE TABLE "risultati_set_referto" (
    "id" TEXT NOT NULL,
    "partitaTorneoId" TEXT NOT NULL,
    "numeroSet" INTEGER NOT NULL,
    "casa" INTEGER NOT NULL,
    "ospite" INTEGER NOT NULL,
    "seqFinale" INTEGER NOT NULL,
    "registroId" TEXT NOT NULL,
    "epoca" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risultati_set_referto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "risultati_set_referto_partitaTorneoId_numeroSet_key" ON "risultati_set_referto"("partitaTorneoId", "numeroSet");

ALTER TABLE "risultati_set_referto" ADD CONSTRAINT "risultati_set_referto_partitaTorneoId_fkey" FOREIGN KEY ("partitaTorneoId") REFERENCES "partite_torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "risultati_set_referto" ADD CONSTRAINT "risultati_set_referto_numeroSet_check" CHECK ("numeroSet" BETWEEN 1 AND 5);
ALTER TABLE "risultati_set_referto" ADD CONSTRAINT "risultati_set_referto_punti_check" CHECK ("casa" BETWEEN 0 AND 99 AND "ospite" BETWEEN 0 AND 99);
ALTER TABLE "risultati_set_referto" ADD CONSTRAINT "risultati_set_referto_seqFinale_check" CHECK ("seqFinale" >= 1);

-- AD-17: tabella nuova negata a ogni ruolo client - RLS senza alcuna policy
-- (deny-all via PostgREST) + REVOKE come garanzia aggiuntiva. Prisma
-- (connessione diretta) continua a leggere e scrivere.
ALTER TABLE "risultati_set_referto" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "risultati_set_referto" FROM anon, authenticated;
