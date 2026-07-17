-- Story 1.6: Iscrizione, protetta da RLS (AD-4/AD-9, esplicitamente nel
-- bind-list) - stesso pattern di "atlete" (Story 1.3), applicando fin da
-- subito le lezioni di quella code review: policy separate per operazione
-- (non un'unica FOR ALL) e GRANT esplicito incluso da subito (senza,
-- "permission denied" - auto_expose_new_tables non attivo). Nessuna policy
-- o GRANT DELETE: nessun AC di questa storia richiede di eliminare
-- un'Iscrizione.
CREATE TABLE "iscrizioni" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "annoAgonisticoId" TEXT NOT NULL,
    "confermataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iscrizioni_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "iscrizioni_atletaId_annoAgonisticoId_key" ON "iscrizioni"("atletaId", "annoAgonisticoId");

ALTER TABLE "iscrizioni" ADD CONSTRAINT "iscrizioni_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "iscrizioni" ADD CONSTRAINT "iscrizioni_annoAgonisticoId_fkey" FOREIGN KEY ("annoAgonisticoId") REFERENCES "anni_agonistici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "iscrizioni" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_dirigente_segreteria_select" ON "iscrizioni"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

CREATE POLICY "admin_dirigente_segreteria_insert" ON "iscrizioni"
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

CREATE POLICY "admin_dirigente_segreteria_update" ON "iscrizioni"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA'])
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

GRANT SELECT, INSERT, UPDATE ON "iscrizioni" TO authenticated;
