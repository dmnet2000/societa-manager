-- Referto elettronico, story 4.4 (AD-7, AD-11, AD-15, AD-17): backup opaco del
-- registro degli eventi del tablet. Una riga per gara; cancellare una partita
-- cancella anche il suo backup (CASCADE).
CREATE TABLE "backup_referto" (
    "id" TEXT NOT NULL,
    "partitaTorneoId" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "epoca" INTEGER NOT NULL,
    "ultimoSeq" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "blob" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_referto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "backup_referto_partitaTorneoId_key" ON "backup_referto"("partitaTorneoId");

ALTER TABLE "backup_referto" ADD CONSTRAINT "backup_referto_partitaTorneoId_fkey" FOREIGN KEY ("partitaTorneoId") REFERENCES "partite_torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "backup_referto" ADD CONSTRAINT "backup_referto_ultimoSeq_check" CHECK ("ultimoSeq" >= 1);

-- AD-17: tabella nuova negata a ogni ruolo client - RLS senza alcuna policy
-- (deny-all via PostgREST) + REVOKE come garanzia aggiuntiva.
ALTER TABLE "backup_referto" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "backup_referto" FROM anon, authenticated;
