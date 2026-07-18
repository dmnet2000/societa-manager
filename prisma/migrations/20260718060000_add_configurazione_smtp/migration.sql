-- Story 7.1 (FR-31, AD-12): tabella "configurazione_smtp", protetta da RLS
-- ADMIN-only (AD-9 esteso) - contiene una password SMTP in chiaro,
-- protezione solo RLS (nessuna cifratura applicativa, scelta deliberata,
-- vedi AD-12). Nessuna policy DELETE (nessun AC di questa storia la
-- richiede - stessa scelta gia' fatta per "certificati_medici"/"notifiche").
CREATE TABLE "configurazione_smtp" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "porta" INTEGER NOT NULL,
    "sicura" BOOLEAN NOT NULL DEFAULT true,
    "utente" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mittente" TEXT NOT NULL,
    "nomeMittente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurazione_smtp_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "configurazione_smtp" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON "configurazione_smtp" TO authenticated;

CREATE POLICY "admin_configurazione_smtp_select" ON "configurazione_smtp"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN');

CREATE POLICY "admin_configurazione_smtp_insert" ON "configurazione_smtp"
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN');

CREATE POLICY "admin_configurazione_smtp_update" ON "configurazione_smtp"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN')
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN');
