-- Story 1.6: AnnoAgonistico (AD-8) - dato strutturale, non protetto da RLS
-- (non nel bind-list di AD-4), gestito via Prisma diretto.
CREATE TABLE "anni_agonistici" (
    "id" TEXT NOT NULL,
    "dataInizio" TIMESTAMP(3) NOT NULL,
    "dataFine" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anni_agonistici_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "anni_agonistici_dataInizio_dataFine_key" ON "anni_agonistici"("dataInizio", "dataFine");
