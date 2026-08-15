-- Story 18.14: bucket Storage PUBBLICO per la foto di sfondo dell'hero -
-- singleton a livello di sito (path fisso "foto-hero", nessuna colonna
-- Prisma, esistenza via Storage list()), mirror esatto di
-- "logo-applicazione" (Story 7.2) per la forma del path, ma con perimetro
-- Ruoli ADMIN+DIRIGENTE (mirror "sponsor-banner", Story 16.1) invece di
-- ADMIN-only.
--
-- A differenza del bucket logo (che ha impiegato TRE migrazioni per
-- arrivare a uno stato corretto: bucket iniziale senza restrizione di path
-- sulle policy INSERT/UPDATE - 20260718070000 -, poi fix path -
-- 20260718090000 -, poi fix SELECT ADMIN-only che bloccava la lettura
-- pubblica - 20260725020000), qui le tre policy (SELECT pubblica, INSERT,
-- UPDATE) sono scritte correttamente fin da questa unica migrazione: la
-- home pubblica anonima deve poter verificare l'esistenza della foto via
-- list() (stesso motivo per cui "foto-squadra-gruppo", Story 18.4, ha gia'
-- applicato la lezione), quindi la SELECT non puo' essere ADMIN-only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('foto-hero', 'foto-hero', true, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pubblico_foto_hero_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'foto-hero'
    AND name = 'foto-hero'
  );

CREATE POLICY "admin_dirigente_foto_hero_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'foto-hero'
    AND name = 'foto-hero'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

CREATE POLICY "admin_dirigente_foto_hero_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'foto-hero'
    AND name = 'foto-hero'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  )
  WITH CHECK (
    bucket_id = 'foto-hero'
    AND name = 'foto-hero'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

-- Nessuna policy DELETE (nessun AC la richiede - sostituzione via
-- upsert:true sullo stesso path fisso, mai una cancellazione esplicita,
-- mirror logo/sponsor-banner/foto-squadra-gruppo). Nessun GRANT esplicito
-- su storage.objects: l'estensione Storage di Supabase concede gia' le
-- basi ad "authenticated", solo POLICY.
