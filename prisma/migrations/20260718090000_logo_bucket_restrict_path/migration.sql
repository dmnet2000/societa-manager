-- Story 7.2 (review fix, Edge Case Hunter): le policy INSERT/UPDATE
-- originali (20260718070000_add_logo_bucket) verificavano solo
-- bucket_id + Ruolo ADMIN, senza restringere il path dell'oggetto - un
-- Admin (via chiamata REST diretta, non l'app) poteva quindi scrivere
-- qualunque path in questo bucket PUBBLICO, non solo il path fisso "logo"
-- su cui l'intero design della storia si basa (caricaLogo(), Prerequisito
-- #1: "un solo path fisso, nessun riferimento DB necessario perche' c'e'
-- sempre e solo un path possibile"). Senza questo vincolo anche a livello
-- RLS, quell'invariante era garantito solo dall'applicazione, non dal
-- database - incoerente con il principio "RLS e' l'autorita', non un
-- controllo duplicato" gia' stabilito per certificati_medici/notifiche
-- (dove lo scoping usa (storage.foldername(name))[1] = atletaId).
DROP POLICY "admin_logo_insert" ON storage.objects;
DROP POLICY "admin_logo_update" ON storage.objects;

CREATE POLICY "admin_logo_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND name = 'logo'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  );

CREATE POLICY "admin_logo_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'logo-applicazione'
    AND name = 'logo'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  )
  WITH CHECK (
    bucket_id = 'logo-applicazione'
    AND name = 'logo'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
  );
