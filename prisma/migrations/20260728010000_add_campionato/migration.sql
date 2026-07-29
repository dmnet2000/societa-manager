-- Story 10.1 (Epic 10, Gestione Partite e Campionati): Campionato e
-- GruppoCampionato, entrambe non protette da RLS (AD-9) - dato strutturale
-- (nessun dato sanitario/personale), stesso trattamento di Gruppo/Slot.
-- Nessuna policy RLS, nessun GRANT verso "authenticated": Prisma diretto con
-- connessione privilegiata, stesso pattern di GruppoAllenatore (Story 2.3).
CREATE TABLE "campionati" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "annoAgonisticoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campionati_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "campionati" ADD CONSTRAINT "campionati_annoAgonisticoId_fkey" FOREIGN KEY ("annoAgonisticoId") REFERENCES "anni_agonistici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tabella di giunzione molti-a-molti (un Gruppo puo' partecipare a piu'
-- Campionati contemporaneamente, un Campionato puo' essere condiviso da piu'
-- Gruppi). Il vincolo univoco su (gruppoId, campionatoId) rende il
-- collegamento a un Campionato esistente idempotente (Story 10.1 AC #2),
-- stesso principio di "gruppo_allenatori" (Story 2.3).
CREATE TABLE "gruppo_campionati" (
    "id" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "campionatoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruppo_campionati_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gruppo_campionati_gruppoId_campionatoId_key" ON "gruppo_campionati"("gruppoId", "campionatoId");

ALTER TABLE "gruppo_campionati" ADD CONSTRAINT "gruppo_campionati_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gruppo_campionati" ADD CONSTRAINT "gruppo_campionati_campionatoId_fkey" FOREIGN KEY ("campionatoId") REFERENCES "campionati"("id") ON DELETE CASCADE ON UPDATE CASCADE;
