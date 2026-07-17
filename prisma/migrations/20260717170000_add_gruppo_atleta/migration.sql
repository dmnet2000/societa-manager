-- Story 2.4: GruppoAtleta, tabella di giunzione tra Gruppo e Atleta,
-- non protetta da RLS (AD-9) - nessuna policy RLS, nessun GRANT verso
-- "authenticated": Prisma diretto con connessione privilegiata, stesso
-- pattern di GenitoreAtleta (Story 1.5), nonostante la FK verso Atleta
-- (RLS-protetta, AD-4) - la FK e' solo un vincolo di integrita'
-- referenziale Postgres, indipendente da RLS/PostgREST (vedi Dev Notes
-- Story 2.4: nessuna lettura delle colonne di Atleta deve passare da qui).
-- annoAgonisticoId e' denormalizzato dal Gruppo assegnato al momento
-- della scrittura: il vincolo univoco su (atletaId, annoAgonisticoId)
-- esprime "un'Atleta ha un solo Gruppo per Anno Agonistico" (AC #2) - un
-- @@unique non puo' riferirsi a una colonna di Gruppo.
CREATE TABLE "gruppo_atlete" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "annoAgonisticoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruppo_atlete_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gruppo_atlete_atletaId_annoAgonisticoId_key" ON "gruppo_atlete"("atletaId", "annoAgonisticoId");

ALTER TABLE "gruppo_atlete" ADD CONSTRAINT "gruppo_atlete_gruppoId_fkey" FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gruppo_atlete" ADD CONSTRAINT "gruppo_atlete_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gruppo_atlete" ADD CONSTRAINT "gruppo_atlete_annoAgonisticoId_fkey" FOREIGN KEY ("annoAgonisticoId") REFERENCES "anni_agonistici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
