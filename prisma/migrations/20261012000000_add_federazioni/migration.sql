-- Story 26.1 (Epic 26, Tesseramento multi-Federazione): Federazione, entita'
-- strutturale (AD-9) - accesso solo via Prisma diretto con connessione
-- privilegiata, stesso trattamento di voci_menu_pubblico. Regola permanente
-- dal 2026-08-04 (20260804030000_fix_rls_disabled_public_tables): ENABLE ROW
-- LEVEL SECURITY senza alcuna policy = deny-all di default via PostgREST per
-- "anon"/"authenticated", piu' REVOKE esplicito come garanzia aggiuntiva.
-- Prisma continua a leggere/scrivere invariato.
CREATE TABLE "federazioni" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "ordine" INTEGER NOT NULL,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "federazioni_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "federazioni_nome_key" ON "federazioni"("nome");

ALTER TABLE "federazioni" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "federazioni" FROM anon, authenticated;

-- Seed: FIPAV, la federazione su cui la Story 26.2 migrera' tutti i
-- Tesseramenti gia' confermati (decisione utente 2026-10-12). Review fix:
-- id fisso e identico in ogni ambiente (non gen_random_uuid()), cosi' la
-- migrazione della 26.2 la riferisce per id e non per nome - il nome puo'
-- essere rinominato dall'utente nel frattempo.
INSERT INTO "federazioni" ("id", "nome", "sigla", "ordine", "attiva", "createdAt", "updatedAt")
VALUES ('federazione-fipav', 'FIPAV', 'FIPAV', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
