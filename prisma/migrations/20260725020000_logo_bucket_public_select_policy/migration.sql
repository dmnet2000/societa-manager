-- 2026-07-25: la policy SELECT su "logo-applicazione" (Story 7.2,
-- 20260718080000_logo_bucket_fix_select_policy) era ADMIN-only - introdotta
-- solo per far funzionare l'upsert lato scrittura (Supabase Storage verifica
-- l'esistenza dell'oggetto internamente), ma come effetto collaterale
-- impediva anche la LETTURA di leggiInfoLogo() (lib/storage/logo.ts) a
-- chiunque non fosse Admin - inclusi NavBar per gli utenti non-Admin e la
-- nuova pagina di login (/accedi, Utente non ancora autenticato), che deve
-- poter mostrare il logo prima di qualunque sessione. Il bucket e' gia'
-- pubblico (public = true, Story 7.2): il contenuto dell'oggetto e'
-- comunque scaricabile da chiunque tramite l'endpoint pubblico, che bypassa
-- RLS - rendere pubblica anche la sola LISTA/metadato (non il contenuto,
-- gia' pubblico) non introduce alcuna nuova esposizione. Ristretto al path
-- fisso "logo" di questo bucket, stesso principio delle policy
-- INSERT/UPDATE (20260718090000_logo_bucket_restrict_path).
DROP POLICY "admin_logo_select" ON storage.objects;

CREATE POLICY "pubblico_logo_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'logo-applicazione'
    AND name = 'logo'
  );
