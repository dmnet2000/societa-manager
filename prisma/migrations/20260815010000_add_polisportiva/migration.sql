-- Story 18.20: campo urlSitoPolisportiva su ConfigurazioneApplicazione
-- (nullable, mirror urlPaginaFacebook, AD-9 no-RLS su questa tabella) +
-- bucket Storage per il logo della Polisportiva.
ALTER TABLE "configurazione_applicazione" ADD COLUMN "urlSitoPolisportiva" TEXT;

-- Bucket Storage PUBBLICO per il logo della Polisportiva - singleton a
-- livello di sito (path fisso "logo-polisportiva", nessuna colonna Prisma,
-- esistenza via Storage list()), mirror esatto di "foto-hero" (Story
-- 18.14) per la forma del path e per il perimetro Ruoli ADMIN+DIRIGENTE
-- (non ADMIN-only come "logo-applicazione", Story 7.2, che ha impiegato
-- TRE migrazioni per arrivare a policy corrette). Le tre policy sotto
-- (SELECT pubblica, INSERT, UPDATE) sono scritte correttamente fin da
-- questa unica migrazione, stessa disciplina gia' applicata a foto-hero.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logo-polisportiva', 'logo-polisportiva', true, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pubblico_logo_polisportiva_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'logo-polisportiva'
    AND name = 'logo-polisportiva'
  );

CREATE POLICY "admin_dirigente_logo_polisportiva_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'logo-polisportiva'
    AND name = 'logo-polisportiva'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

CREATE POLICY "admin_dirigente_logo_polisportiva_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'logo-polisportiva'
    AND name = 'logo-polisportiva'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  )
  WITH CHECK (
    bucket_id = 'logo-polisportiva'
    AND name = 'logo-polisportiva'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

-- Nessuna policy DELETE (sostituzione via upsert:true sullo stesso path
-- fisso, mai una cancellazione esplicita, mirror logo/sponsor-banner/
-- foto-squadra-gruppo/foto-hero). Nessun GRANT esplicito su
-- storage.objects: l'estensione Storage di Supabase concede gia' le basi
-- ad "authenticated", solo POLICY.
