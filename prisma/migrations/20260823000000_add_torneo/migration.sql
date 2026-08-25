-- Story 20.1 (Epic 20, Torneo Memorial): EdizioneTorneo/CategoriaTorneo,
-- entita' strutturali (AD-9) - nessuna policy RLS, nessun GRANT verso
-- "anon"/"authenticated": accesso solo via Prisma diretto con connessione
-- privilegiata, stesso trattamento di sponsor/voci_menu_pubblico/
-- pagine_pubbliche. FK di categorie_torneo verso edizioni_torneo senza
-- ON DELETE esplicito (default Postgres/Prisma: NO ACTION/Restrict) -
-- stesso identico trattamento di gruppi -> anni_agonistici.
CREATE TYPE "SettimanaTorneo" AS ENUM ('SETTIMANA_1', 'SETTIMANA_2');

CREATE TABLE "edizioni_torneo" (
    "id" TEXT NOT NULL,
    "anno" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edizioni_torneo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "edizioni_torneo_anno_key" ON "edizioni_torneo"("anno");

CREATE TABLE "categorie_torneo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "settimana" "SettimanaTorneo" NOT NULL,
    "numeroMassimoSquadre" INTEGER NOT NULL,
    "edizioneTorneoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorie_torneo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "categorie_torneo" ADD CONSTRAINT "categorie_torneo_edizioneTorneoId_fkey" FOREIGN KEY ("edizioneTorneoId") REFERENCES "edizioni_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stesso pattern gia' corretto per 17 tabelle strutturali il 2026-08-04
-- (20260804030000_fix_rls_disabled_public_tables) e riapplicato ad ogni
-- tabella strutturale nuova da allora (es. 20260819000000_add_voce_menu_pubblico):
-- ENABLE ROW LEVEL SECURITY senza alcuna policy = deny-all di default via
-- PostgREST per "anon"/"authenticated"; REVOKE esplicito come garanzia
-- aggiuntiva. Prisma continua a leggere/scrivere invariato (connessione
-- diretta, bypassa sempre RLS/PostgREST).
ALTER TABLE "edizioni_torneo" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "edizioni_torneo" FROM anon, authenticated;

ALTER TABLE "categorie_torneo" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "categorie_torneo" FROM anon, authenticated;
