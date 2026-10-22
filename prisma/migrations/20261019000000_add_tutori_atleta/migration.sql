-- Story 27.1 (Epic 27, Iscrizione online): cittadinanza dell'Atleta e
-- anagrafica dei Genitori/Tutori richieste dal modulo di iscrizione
-- (docs/ModuloIscrizione.pdf).

-- Colonna additiva, nullable, nessun backfill: l'import federale non la
-- fornisce (e non la tocca, omessa dal suo oggetto di aggiornamento).
ALTER TABLE "atlete" ADD COLUMN "cittadinanza" TEXT;

CREATE TABLE "tutori_atleta" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "posizione" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "codiceFiscale" TEXT NOT NULL,
    "luogoNascita" TEXT,
    "dataNascita" TIMESTAMP(3),
    "indirizzo" TEXT,
    "cap" TEXT,
    "localitaResidenza" TEXT,
    "provinciaResidenza" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "intestatarioRicevuta" BOOLEAN NOT NULL DEFAULT false,
    "utenteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutori_atleta_pkey" PRIMARY KEY ("id"),
    -- Al massimo 2 Genitori/Tutori per Atleta (come il modulo cartaceo).
    -- Non esprimibile nello schema Prisma: vive solo qui.
    CONSTRAINT "tutori_atleta_posizione_check" CHECK ("posizione" IN (1, 2))
);

CREATE UNIQUE INDEX "tutori_atleta_atletaId_posizione_key" ON "tutori_atleta"("atletaId", "posizione");

-- FK verso utenti senza indice = scansione completa a ogni ON DELETE SET NULL
-- di un Utente (lezione Epic 21) - indice dedicato, riportato nello schema
-- Prisma con @@index([utenteId]).
CREATE INDEX "tutori_atleta_utenteId_idx" ON "tutori_atleta"("utenteId");

-- Al piu' un intestatario della ricevuta per Atleta - indice unico parziale,
-- non esprimibile nello schema Prisma (garanzia DB oltre alla validazione
-- del Server Action). lib/db-rls/tutore-atleta.ts azzera il flag prima di
-- riscriverlo, per non violarlo durante uno scambio 1 <-> 2.
CREATE UNIQUE INDEX "tutori_atleta_intestatario_ricevuta_key" ON "tutori_atleta"("atletaId") WHERE "intestatarioRicevuta";

ALTER TABLE "tutori_atleta" ADD CONSTRAINT "tutori_atleta_atletaId_fkey"
  FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tutori_atleta" ADD CONSTRAINT "tutori_atleta_utenteId_fkey"
  FOREIGN KEY ("utenteId") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Regola permanente (2026-08-04): RLS abilitata + REVOKE esplicito, poi
-- solo i GRANT/policy strettamente necessari. Dato personale (anche di
-- terzi senza account): ADMIN/SEGRETERIA leggono e scrivono, DIRIGENTE
-- legge (mirror di "atlete"). Nessun accesso GENITORE/ATLETA in questa
-- story (rimandato alla 27.3): nessuna policy li ammette, quindi una
-- query PostgREST con quei Ruoli restituisce zero righe.
ALTER TABLE "tutori_atleta" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "tutori_atleta" FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON "tutori_atleta" TO authenticated;

CREATE POLICY "admin_dirigente_segreteria_select" ON "tutori_atleta"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "admin_segreteria_insert" ON "tutori_atleta"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']
  );

CREATE POLICY "admin_segreteria_update" ON "tutori_atleta"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']
  );

CREATE POLICY "admin_segreteria_delete" ON "tutori_atleta"
  FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']
  );
