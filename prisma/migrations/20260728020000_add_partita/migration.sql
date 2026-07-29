-- Story 10.2 (Epic 10, Gestione Partite e Campionati): Partita, non protetta
-- da RLS (AD-9) - dato strutturale, stesso trattamento di Campionato/Gruppo/
-- Slot. data/ora come stringhe (nessuna aritmetica di date richiesta, stesso
-- principio di Presenza.data/Slot.oraInizio). garaNumero univoco per
-- Gruppo+Campionato (non globalmente, e non per il solo Gruppo - review fix:
-- un Gruppo puo' essere collegato a piu' Campionati contemporaneamente,
-- Story 10.1 AC #5, e "Gara N" e' numerato per competizione, non global-
-- mente - senza campionatoId un Gara N che coincide per caso tra due
-- Campionati diversi dello stesso Gruppo sovrascriverebbe la Partita
-- sbagliata): chiave naturale per l'upsert idempotente sul re-import dello
-- stesso file (AC #2).
CREATE TABLE "partite" (
    "id" TEXT NOT NULL,
    "campionatoId" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "garaNumero" TEXT NOT NULL,
    "giornata" TEXT,
    "data" TEXT NOT NULL,
    "ora" TEXT NOT NULL,
    "squadraCasa" TEXT NOT NULL,
    "squadraOspite" TEXT NOT NULL,
    "risultato" TEXT,
    "parziali" TEXT,
    "statoDescrizione" TEXT,
    "impianto" TEXT,
    "indirizzoImpianto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partite_gruppoId_campionatoId_garaNumero_key" ON "partite"("gruppoId", "campionatoId", "garaNumero");

-- ON DELETE CASCADE su entrambe le FK (a differenza della FK di Campionato/
-- Gruppo verso AnnoAgonistico, che usa RESTRICT): una Partita non ha senso
-- senza il suo Campionato/Gruppo, stesso principio di GruppoCampionato
-- (Story 10.1).
ALTER TABLE "partite" ADD CONSTRAINT "partite_campionatoId_fkey" FOREIGN KEY ("campionatoId") REFERENCES "campionati"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partite" ADD CONSTRAINT "partite_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
