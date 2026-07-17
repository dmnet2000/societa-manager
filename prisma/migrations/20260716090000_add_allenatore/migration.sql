-- CreateTable
CREATE TABLE "allenatori" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codiceFiscale" TEXT NOT NULL,
    "utenteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allenatori_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allenatori_codiceFiscale_key" ON "allenatori"("codiceFiscale");

-- CreateIndex
CREATE UNIQUE INDEX "allenatori_utenteId_key" ON "allenatori"("utenteId");
