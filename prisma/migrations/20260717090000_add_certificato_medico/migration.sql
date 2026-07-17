-- Story 1.7: CertificatoMedico, protetta da RLS (AD-4/AD-9, esplicitamente
-- nel bind-list) - stesso pattern ormai consolidato di "atlete"/"iscrizioni":
-- policy separate per operazione, GRANT esplicito completo dall'inizio,
-- nessuna policy/GRANT DELETE (nessun AC di questa storia richiede di
-- eliminare un Certificato - stessa scelta gia' fatta per "iscrizioni",
-- Story 1.6, poi corretta anche li' in code review).
CREATE TABLE "certificati_medici" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "dataInizioValidita" TIMESTAMP(3),
    "dataFineValidita" TIMESTAMP(3) NOT NULL,
    "mesiValidita" INTEGER,
    "modulo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificati_medici_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "certificati_medici_atletaId_key" ON "certificati_medici"("atletaId");

ALTER TABLE "certificati_medici" ADD CONSTRAINT "certificati_medici_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "certificati_medici" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_dirigente_segreteria_select" ON "certificati_medici"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

CREATE POLICY "admin_dirigente_segreteria_insert" ON "certificati_medici"
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

CREATE POLICY "admin_dirigente_segreteria_update" ON "certificati_medici"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA'])
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

GRANT SELECT, INSERT, UPDATE ON "certificati_medici" TO authenticated;
