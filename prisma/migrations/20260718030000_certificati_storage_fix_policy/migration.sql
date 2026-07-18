-- Story 4.1 code review (Acceptance Auditor): la migrazione precedente
-- creava solo la policy SELECT per i Ruoli ampi (ADMIN/DIRIGENTE/SEGRETERIA)
-- su storage.objects, non le corrispondenti INSERT/UPDATE previste dal
-- design della storia stessa ("stesso doppio accesso - ampio + scoped - gia'
-- usato per certificati_medici", che invece ha correttamente SELECT/INSERT/
-- UPDATE per entrambi i gruppi). Rilevante per la futura Story 4.4, dove la
-- Segreteria deve poter inserire manualmente un Certificato ricevuto fuori
-- app (FR-14) - senza queste policy, il file allegato non potrebbe mai
-- essere caricato nel bucket da quei Ruoli.
CREATE POLICY "certificati_medici_admin_dirigente_segreteria_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "certificati_medici_admin_dirigente_segreteria_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  )
  WITH CHECK (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );
