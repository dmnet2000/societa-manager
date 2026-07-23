-- Story 5.2 (FR-27): permesso granulare per Gruppo, solo per il Ruolo
-- DIRIGENTE - Admin e Segreteria restano sempre ad accesso pieno (decisione
-- esplicita dell'utente in elicitazione, Segreteria ha gia' un ruolo
-- trasversale su tutto il club, es. vista orari di tutti i gruppi).
--
-- "gruppi_visibili_dirigente" non ha RLS ne' GRANT verso "authenticated"
-- (AD-9, stesso trattamento di "gruppi"/"slot" - dato puramente strutturale,
-- non personale/sanitario) - la policy su certificati_medici la legge
-- tramite una funzione SECURITY DEFINER, stesso identico pattern gia'
-- stabilito da "allenatore_possiede_atleta" (Story 3.1/4.5) per attraversare
-- tabelle prive di GRANT verso "authenticated".
CREATE TABLE "gruppi_visibili_dirigente" (
    "id" TEXT NOT NULL,
    "gruppoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruppi_visibili_dirigente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gruppi_visibili_dirigente_gruppoId_key" ON "gruppi_visibili_dirigente"("gruppoId");

ALTER TABLE "gruppi_visibili_dirigente" ADD CONSTRAINT "gruppi_visibili_dirigente_gruppoId_fkey"
  FOREIGN KEY ("gruppoId") REFERENCES "gruppi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nessuna riga = nessuna restrizione (comportamento di oggi, invariato) -
-- e' il "disattivato" implicito, non serve un interruttore separato.
CREATE OR REPLACE FUNCTION dirigente_vede_certificato_atleta(atleta_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM "gruppi_visibili_dirigente")
    OR EXISTS (
      SELECT 1
      FROM "gruppo_atlete" ga
      JOIN "gruppi_visibili_dirigente" gvd ON gvd."gruppoId" = ga."gruppoId"
      WHERE ga."atletaId" = atleta_id_param
    );
$$;

REVOKE EXECUTE ON FUNCTION dirigente_vede_certificato_atleta(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dirigente_vede_certificato_atleta(TEXT) TO authenticated;

-- Sostituisce le 3 policy esistenti (Story 1.7) che includevano DIRIGENTE
-- nello stesso array di ADMIN/SEGRETERIA: DIRIGENTE va rimosso da li' e
-- trattato con le sue policy dedicate sotto, altrimenti resterebbe comunque
-- ad accesso pieno (le policy multiple si combinano in OR in Postgres) e la
-- restrizione non avrebbe mai effetto.
DROP POLICY "admin_dirigente_segreteria_select" ON "certificati_medici";
DROP POLICY "admin_dirigente_segreteria_insert" ON "certificati_medici";
DROP POLICY "admin_dirigente_segreteria_update" ON "certificati_medici";

CREATE POLICY "admin_segreteria_select" ON "certificati_medici"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']);

CREATE POLICY "admin_segreteria_insert" ON "certificati_medici"
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']);

CREATE POLICY "admin_segreteria_update" ON "certificati_medici"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA'])
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SEGRETERIA']);

-- Scoped su tutte e tre le operazioni (non solo SELECT): senza scoping
-- anche su INSERT/UPDATE, un Dirigente potrebbe comunque confermare/
-- modificare un Certificato di un'Atleta che non puo' vedere - gap di
-- sicurezza reale, non ipotetico (confermaCertificato, Story 4.4).
CREATE POLICY "dirigente_select_scoped" ON "certificati_medici"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  );

CREATE POLICY "dirigente_insert_scoped" ON "certificati_medici"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  );

CREATE POLICY "dirigente_update_scoped" ON "certificati_medici"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
    AND dirigente_vede_certificato_atleta("atletaId")
  );
