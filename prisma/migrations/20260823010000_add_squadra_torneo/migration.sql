-- Story 20.2 (Epic 20, Torneo Memorial): SquadraTorneo, entita' strutturale
-- (AD-9) - nessuna policy RLS, nessun GRANT verso "anon"/"authenticated":
-- accesso solo via Prisma diretto con connessione privilegiata, stesso
-- trattamento di edizioni_torneo/categorie_torneo
-- (20260823000000_add_torneo). FK verso categorie_torneo senza ON DELETE
-- esplicito (default Postgres/Prisma: NO ACTION/Restrict) - stesso
-- identico trattamento di categorie_torneo -> edizioni_torneo.
CREATE TYPE "GironeTorneo" AS ENUM ('GIRONE_A', 'GIRONE_B');

CREATE TABLE "squadre_torneo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "girone" "GironeTorneo" NOT NULL,
    "referente" TEXT,
    "contatto" TEXT,
    "categoriaTorneoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "squadre_torneo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "squadre_torneo" ADD CONSTRAINT "squadre_torneo_categoriaTorneoId_fkey" FOREIGN KEY ("categoriaTorneoId") REFERENCES "categorie_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stesso pattern gia' corretto per 17 tabelle strutturali il 2026-08-04
-- (20260804030000_fix_rls_disabled_public_tables) e riapplicato ad ogni
-- tabella strutturale nuova da allora: ENABLE ROW LEVEL SECURITY senza
-- alcuna policy = deny-all di default via PostgREST per
-- "anon"/"authenticated"; REVOKE esplicito come garanzia aggiuntiva.
-- Prisma continua a leggere/scrivere invariato (connessione diretta,
-- bypassa sempre RLS/PostgREST).
ALTER TABLE "squadre_torneo" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "squadre_torneo" FROM anon, authenticated;
