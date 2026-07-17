-- Story 2.3: GruppoAllenatore, tabella di giunzione molti-a-molti tra
-- Gruppo e Allenatore, entrambe non protette da RLS (AD-9) - nessuna policy
-- RLS, nessun GRANT verso "authenticated": Prisma diretto con connessione
-- privilegiata, stesso pattern di GenitoreAtleta (Story 1.5). Il vincolo
-- univoco su (gruppoId, allenatoreId) rende l'assegnazione idempotente
-- (AC #3): un tentativo di duplicato viola il vincolo, trattato come
-- successo dall'applicazione invece di un errore.
CREATE TABLE "gruppo_allenatori" (
    "id" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "allenatoreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruppo_allenatori_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gruppo_allenatori_gruppoId_allenatoreId_key" ON "gruppo_allenatori"("gruppoId", "allenatoreId");

ALTER TABLE "gruppo_allenatori" ADD CONSTRAINT "gruppo_allenatori_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gruppo_allenatori" ADD CONSTRAINT "gruppo_allenatori_allenatoreId_fkey" FOREIGN KEY ("allenatoreId") REFERENCES "allenatori"("id") ON DELETE CASCADE ON UPDATE CASCADE;
