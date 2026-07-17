-- Story 2.1: Palestra e Campo, non protette da RLS (AD-9, elencate
-- esplicitamente insieme a Slot/Gruppo/Allenatore) - nessuna policy RLS,
-- nessun GRANT verso "authenticated": l'accesso a runtime passa da Prisma
-- diretto con connessione privilegiata, mai dal client Supabase.
CREATE TABLE "palestre" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "indirizzo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palestre_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campi" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "palestraId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campi_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "campi" ADD CONSTRAINT "campi_palestraId_fkey" FOREIGN KEY ("palestraId") REFERENCES "palestre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
