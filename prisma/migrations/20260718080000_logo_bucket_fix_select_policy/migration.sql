-- Story 7.2: scoperto durante la verifica dal vivo (non anticipato in fase
-- di creazione della storia) - la migrazione precedente
-- (20260718070000_add_logo_bucket) assumeva che un bucket public = true
-- rendesse superflua una policy SELECT su storage.objects, perche' bypassa
-- RLS per l'endpoint pubblico anonimo di lettura (vero per AC #2). Falso
-- pero' per l'upload AUTENTICATO con upsert: true: caricaLogo() (Story
-- 7.2, lib/storage/logo.ts) usa upsert per sostituire il file esistente
-- sullo stesso path fisso "logo" - verificato dal vivo che Supabase
-- Storage, per decidere internamente se fare insert o update, esegue una
-- verifica di esistenza che richiede una policy SELECT autenticata. Senza
-- di essa, ogni upload (anche il primissimo, quando il file non esiste
-- ancora) falliva con "new row violates row-level security policy" -
-- confermato isolando il problema con upsert: false (funzionante) vs
-- upsert: true (fallito) sulla stessa sessione Admin.
CREATE POLICY "admin_logo_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'logo-applicazione'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  );
