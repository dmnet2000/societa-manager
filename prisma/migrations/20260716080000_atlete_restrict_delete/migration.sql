-- Code review Story 1.3: la policy FOR ALL originaria concedeva a
-- Segreteria/Dirigente anche DELETE, non richiesto esplicitamente da AD-4
-- ("accesso ampio" non specifica le operazioni) - deciso con l'utente di
-- restringere DELETE al solo Admin.
DROP POLICY "admin_dirigente_segreteria_accesso_ampio" ON "atlete";

CREATE POLICY "admin_dirigente_segreteria_select" ON "atlete"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "admin_dirigente_segreteria_insert" ON "atlete"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "admin_dirigente_segreteria_update" ON "atlete"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "admin_delete" ON "atlete"
  FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN']
  );
