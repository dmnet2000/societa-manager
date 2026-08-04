-- Story 13.1: Tesseramento, entita' strutturale (AD-9) - nessuna policy RLS,
-- nessun GRANT verso "authenticated"/"service_role": accesso solo via Prisma
-- diretto con connessione privilegiata, stesso trattamento di
-- gruppo_allenatori (Story 2.3) - a differenza di "iscrizioni" (RLS, AD-4).
-- Coinvolge solo ADMIN/DIRIGENTE (Segreteria esplicitamente esclusa in
-- apertura dell'Epic 13), Ruoli che hanno gia' accesso Prisma diretto
-- ovunque nel progetto.
CREATE TABLE "tesseramenti" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "annoAgonisticoId" TEXT NOT NULL,
    "confermataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tesseramenti_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tesseramenti_atletaId_annoAgonisticoId_key" ON "tesseramenti"("atletaId", "annoAgonisticoId");

ALTER TABLE "tesseramenti" ADD CONSTRAINT "tesseramenti_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tesseramenti" ADD CONSTRAINT "tesseramenti_annoAgonisticoId_fkey" FOREIGN KEY ("annoAgonisticoId") REFERENCES "anni_agonistici"("id") ON DELETE CASCADE ON UPDATE CASCADE;
