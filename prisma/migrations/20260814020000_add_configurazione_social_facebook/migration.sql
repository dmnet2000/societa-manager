-- Story 18.13 (AD-12 esteso): tabella "configurazione_social_facebook",
-- protetta da RLS ADMIN+DIRIGENTE (non ADMIN-only come "configurazione_smtp"
-- - l'AC #6 della storia richiede esplicitamente che anche il Dirigente
-- possa configurare il token, coerente col resto dei contenuti pubblici
-- gestibili di questo Epic: Sponsor, Contatti pubblici, Pagina Facebook).
-- Contiene un Page Access Token Facebook in chiaro, protezione solo RLS
-- (nessuna cifratura applicativa, stessa scelta deliberata gia' fatta per
-- la password SMTP). Nessuna policy DELETE (nessun AC di questa storia la
-- richiede - stessa scelta gia' fatta per "configurazione_smtp").
CREATE TABLE "configurazione_social_facebook" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "ultimaLetturaOk" BOOLEAN NOT NULL DEFAULT true,
    "ultimoErrore" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurazione_social_facebook_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "configurazione_social_facebook" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON "configurazione_social_facebook" TO authenticated;

CREATE POLICY "admin_dirigente_configurazione_social_facebook_select" ON "configurazione_social_facebook"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
  );

CREATE POLICY "admin_dirigente_configurazione_social_facebook_insert" ON "configurazione_social_facebook"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
  );

CREATE POLICY "admin_dirigente_configurazione_social_facebook_update" ON "configurazione_social_facebook"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
  );
