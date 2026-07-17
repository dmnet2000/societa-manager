-- Story 2.5: Slot, non protetto da RLS (AD-9) - nessuna policy RLS, nessun
-- GRANT verso "authenticated": Prisma diretto con connessione privilegiata,
-- stesso pattern di Campo/Gruppo. AD-2: Orari-Palestre e' l'unico
-- proprietario della mutazione di Slot, incluso il suo FK verso Gruppo.
-- AD-8: nessuna colonna annoAgonisticoId - eredita l'Anno Agonistico
-- transitivamente tramite Gruppo (a differenza di Iscrizione/GruppoAtleta).
-- oraInizio/oraFine sono TEXT ("HH:MM"), non TIME: nessuna aritmetica su
-- orari richiesta in questa storia.
CREATE TYPE "GiornoSettimana" AS ENUM ('LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA');

CREATE TABLE "slot" (
    "id" TEXT NOT NULL,
    "giorno" "GiornoSettimana" NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "oraFine" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "slot" ADD CONSTRAINT "slot_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "campi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slot" ADD CONSTRAINT "slot_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
