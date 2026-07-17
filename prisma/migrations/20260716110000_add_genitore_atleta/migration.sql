-- Story 1.5: tabella di giunzione molti-a-molti Genitore-Atleta (ERD:
-- GENITORE }o--o{ ATLETA). Non protetta da RLS (non nel bind-list di AD-4),
-- gestita via Prisma diretto - il vincolo FK verso "atlete" e' comunque
-- applicato da Postgres indipendentemente dalla RLS su quella tabella.
CREATE TABLE "genitori_atlete" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genitori_atlete_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "genitori_atlete_utenteId_atletaId_key" ON "genitori_atlete"("utenteId", "atletaId");

ALTER TABLE "genitori_atlete" ADD CONSTRAINT "genitori_atlete_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "utenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "genitori_atlete" ADD CONSTRAINT "genitori_atlete_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
