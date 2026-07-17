-- Story 2.2: Gruppo, non protetto da RLS (AD-9, elencato esplicitamente
-- insieme a Palestra/Campo/Slot/Allenatore) - nessuna policy RLS, nessun
-- GRANT verso "authenticated": l'accesso a runtime passa da Prisma diretto
-- con connessione privilegiata, mai dal client Supabase. FK diretta verso
-- AnnoAgonistico (AD-8) - nessun onDelete esplicito, usa il default Restrict
-- di Postgres (nessuna UI di eliminazione Anno Agonistico esiste oggi).
CREATE TABLE "gruppi" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "annoAgonisticoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruppi_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "gruppi" ADD CONSTRAINT "gruppi_annoAgonisticoId_fkey" FOREIGN KEY ("annoAgonisticoId") REFERENCES "anni_agonistici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
