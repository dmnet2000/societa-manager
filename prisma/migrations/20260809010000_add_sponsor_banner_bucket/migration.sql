-- Story 16.1 (Task 2): bucket Storage PUBBLICO (come "logo-applicazione",
-- Story 7.2) ma con path PER-ENTITA' (come "certificati-medici", Story 4.1)
-- invece di un path fisso - ogni Sponsor ha la propria immagine, il path e'
-- il suo id. Un bucket public = true bypassa RLS per la lettura tramite
-- l'endpoint pubblico (nessuna policy SELECT necessaria per la vetrina
-- pubblica di Story 16.2) - RLS resta necessaria solo per INSERT/UPDATE (chi
-- puo' scrivere) e, per lo stesso motivo gia' scoperto in Story 7.2
-- (20260718080000_logo_bucket_fix_select_policy), anche per SELECT: Supabase
-- Storage verifica l'esistenza dell'oggetto per decidere insert/update
-- quando upload() e' chiamato con upsert:true. Applicato qui fin da subito
-- (non in due passaggi come per il logo), lezione gia' imparata. Nessuna
-- policy DELETE (nessun AC la richiede - mai un hard-delete di uno Sponsor,
-- AC #3/#4).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sponsor-banner', 'sponsor-banner', true, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- A differenza del path fisso "logo" (dove le policy verificano anche
-- name = 'logo'), qui il path e' un id di Sponsor diverso per ogni riga -
-- nessun valore singolo da confrontare. Nessuna funzione di possesso: solo
-- ADMIN/DIRIGENTE gestiscono gli Sponsor (AC #5), nessuna dimensione di
-- appartenenza per-utente da verificare (a differenza di
-- foto-profilo-atlete/allenatori).
CREATE POLICY "admin_dirigente_sponsor_banner_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'sponsor-banner'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

CREATE POLICY "admin_dirigente_sponsor_banner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'sponsor-banner'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

CREATE POLICY "admin_dirigente_sponsor_banner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'sponsor-banner'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  )
  WITH CHECK (
    bucket_id = 'sponsor-banner'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );
