-- Story 7.2 (FR-32, AD-12): bucket Storage PUBBLICO (a differenza del
-- bucket privato "certificati-medici", Story 4.1) - il logo e' per natura
-- un asset da mostrare pubblicamente, non un dato sensibile. Un bucket
-- public = true serve gli oggetti tramite l'endpoint pubblico di Supabase
-- Storage, che bypassa RLS interamente per la lettura (AC #2) - nessuna
-- policy SELECT necessaria. RLS resta necessaria per INSERT/UPDATE (chi
-- puo' scrivere il bucket, AC #3). Nessuna policy DELETE (nessun AC la
-- richiede - la "sostituzione" avviene con upsert sullo stesso path fisso
-- "logo", mai una cancellazione esplicita).
-- ON CONFLICT DO NOTHING: idempotente su un secondo tentativo di
-- applicazione (ambiente di recupero, bucket gia' creato manualmente) -
-- lezione imparata da Story 4.1, dove la migrazione originale del bucket
-- "certificati-medici" ne era priva e non era piu' correggibile
-- retroattivamente una volta applicata (vedi Story 4.1 Review Findings).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logo-applicazione', 'logo-applicazione', true, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_logo_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  );

CREATE POLICY "admin_logo_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'logo-applicazione'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  )
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  );
