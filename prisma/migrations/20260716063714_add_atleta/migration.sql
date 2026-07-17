-- CreateEnum
CREATE TYPE "Sesso" AS ENUM ('M', 'F');

-- CreateTable
CREATE TABLE "atlete" (
    "id" TEXT NOT NULL,
    "codiceFiscale" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sesso" "Sesso" NOT NULL,
    "dataNascita" TIMESTAMP(3) NOT NULL,
    "luogoNascita" TEXT,
    "provinciaNascita" TEXT,
    "indirizzo" TEXT,
    "cap" TEXT,
    "localitaResidenza" TEXT,
    "provinciaResidenza" TEXT,
    "categoria" TEXT,
    "matricola" TEXT,
    "dataPrimoTesseramento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atlete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atlete_codiceFiscale_key" ON "atlete"("codiceFiscale");

-- RowLevelSecurity (AD-4/AD-9): Prisma non esprime le policy nello schema,
-- vanno scritte qui come SQL grezzo. Accesso ampio (non scoped) per
-- Admin/Dirigente/Segreteria, come richiesto esplicitamente da AD-4 per
-- operazioni trasversali come l'import massivo (FR-19). Policy scoped per
-- Genitore (proprie Atlete)/Allenatore (propri Gruppi) arriveranno con le
-- storie che introducono quelle relazioni (1.5, Epic 2) - non ancora
-- implementabili qui.
ALTER TABLE "atlete" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_dirigente_segreteria_accesso_ampio" ON "atlete"
  FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );
