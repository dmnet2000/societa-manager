-- Story 1.8 AC #4: la code review di Story 1.6 aveva rimosso policy e GRANT
-- UPDATE su "iscrizioni" perche' nessun AC di quella storia li usava
-- (principio del minimo privilegio, vedi migrazione
-- 20260716220000_iscrizioni_remove_unused_update). Questa storia introduce
-- il primo UPDATE reale (disattivaIscrizione, esclusione manuale via
-- attiva=false) - vanno ripristinati, stessa policy gia' presente su
-- "certificati_medici" (Story 1.7).
CREATE POLICY "admin_dirigente_segreteria_update" ON "iscrizioni"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA'])
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

GRANT UPDATE ON "iscrizioni" TO authenticated;
