-- Story 19.2: estende le policy RLS del bucket "logo-applicazione" (Story
-- 7.2, review fix 20260718090000_logo_bucket_restrict_path) al Ruolo
-- SITE_MANAGER, in coppia con requireRuolo(["ADMIN","SITE_MANAGER"]) di
-- caricaLogoAction (app/app/(configurazione)/logo/actions.ts) - additivo,
-- ADMIN resta invariato, e il vincolo name = 'logo' (Story 7.2) resta
-- identico, solo il Ruolo ammesso si allarga.
-- Review fix (Blind Hunter): le policy rinominate da "admin_logo_*" a
-- "logo_*" - il nome precedente era fuorviante ora che permettono anche
-- SITE_MANAGER, non solo ADMIN.
-- Review fix (Blind Hunter): questa estensione RLS non e' verificabile dal
-- vivo in questo sandbox (motore Prisma WASM rotto) - a differenza del
-- controllo requireRuolo applicativo (coperto da test), il rifiuto di
-- scrittura diretta sul bucket per un Ruolo diverso da ADMIN/SITE_MANAGER
-- resta una garanzia non testata automaticamente, da confermare dall'utente
-- dopo il deploy in un ambiente funzionante.
DROP POLICY "admin_logo_insert" ON storage.objects;
DROP POLICY "admin_logo_update" ON storage.objects;

CREATE POLICY "logo_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND name = 'logo'
    AND (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
      OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'SITE_MANAGER'
    )
  );

CREATE POLICY "logo_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'logo-applicazione'
    AND name = 'logo'
    AND (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
      OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'SITE_MANAGER'
    )
  )
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND name = 'logo'
    AND (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
      OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'SITE_MANAGER'
    )
  );
