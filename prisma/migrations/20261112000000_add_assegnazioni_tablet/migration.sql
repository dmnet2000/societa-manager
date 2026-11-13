-- Referto elettronico, story 2.5 (AD-2, AD-15, AD-17): assegnazione delle
-- gare a un tablet. Una riga per gara (garaId = PartitaTorneo.id) con il
-- tablet assegnato (nullo = "nessun tablet") e l'epoca, che cresce a ogni
-- cambio di tablet. Cancellare le partite di una Categoria cancella anche le
-- loro assegnazioni (CASCADE); un Utente assegnato non si cancella
-- (RESTRICT).
CREATE TABLE "assegnazioni_tablet" (
    "id" TEXT NOT NULL,
    "partitaTorneoId" TEXT NOT NULL,
    "utenteId" TEXT,
    "epoca" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assegnazioni_tablet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assegnazioni_tablet_partitaTorneoId_key" ON "assegnazioni_tablet"("partitaTorneoId");

CREATE INDEX "assegnazioni_tablet_utenteId_idx" ON "assegnazioni_tablet"("utenteId");

ALTER TABLE "assegnazioni_tablet" ADD CONSTRAINT "assegnazioni_tablet_partitaTorneoId_fkey" FOREIGN KEY ("partitaTorneoId") REFERENCES "partite_torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assegnazioni_tablet" ADD CONSTRAINT "assegnazioni_tablet_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- L'epoca parte da 1 e non scende mai (AD-2).
ALTER TABLE "assegnazioni_tablet" ADD CONSTRAINT "assegnazioni_tablet_epoca_check" CHECK ("epoca" >= 1);

-- AD-17: tabella nuova negata a ogni ruolo client - stesso pattern di
-- partite_torneo (20260823020000_add_partita_torneo): RLS senza alcuna
-- policy = deny-all via PostgREST per "anon"/"authenticated" (quindi anche
-- per il JWT di un tablet), REVOKE come garanzia aggiuntiva. Prisma
-- (connessione diretta) continua a leggere e scrivere.
ALTER TABLE "assegnazioni_tablet" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "assegnazioni_tablet" FROM anon, authenticated;
