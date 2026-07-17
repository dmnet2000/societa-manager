-- CreateEnum
CREATE TYPE "Ruolo" AS ENUM ('ALLENATORE', 'ATLETA', 'GENITORE', 'SEGRETERIA', 'DIRIGENTE', 'ADMIN');

-- CreateTable
CREATE TABLE "utenti" (
    "id" TEXT NOT NULL,
    "supabaseAuthId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utente_ruoli" (
    "id" TEXT NOT NULL,
    "utenteId" TEXT NOT NULL,
    "ruolo" "Ruolo" NOT NULL,

    CONSTRAINT "utente_ruoli_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utenti_supabaseAuthId_key" ON "utenti"("supabaseAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "utenti_email_key" ON "utenti"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utente_ruoli_utenteId_ruolo_key" ON "utente_ruoli"("utenteId", "ruolo");

-- AddForeignKey
ALTER TABLE "utente_ruoli" ADD CONSTRAINT "utente_ruoli_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "utenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
