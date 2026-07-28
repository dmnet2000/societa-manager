-- Story 9.12: due bucket Storage PRIVATI (a differenza di "logo-applicazione",
-- pubblico - qui le foto riguardano persone reali, incluse Atlete minorenni,
-- stessa cautela di AD-6/"certificati-medici"). Nessuna nuova tabella/colonna:
-- path fisso "{entitaId}/foto" per oggetto (upsert:true, un solo file corrente
-- per entita'), esistenza verificata con list() - stesso pattern del logo
-- (Story 7.2), qui reso privato e applicato due volte (Atleta/Allenatore).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('foto-profilo-atlete', 'foto-profilo-atlete', false, 5242880, ARRAY['image/jpeg', 'image/png']),
  ('foto-profilo-allenatori', 'foto-profilo-allenatori', false, 5242880, ARRAY['image/jpeg', 'image/png']);

-- Non esisteva alcuna funzione "e' il mio proprio record Allenatore" in questo
-- progetto: allenatore_possiede_atleta/allenatore_possiede_slot* verificano il
-- possesso di UN'ALTRA entita' (Atleta/Slot) tramite Gruppo, non l'identita'
-- del proprio record Allenatore. Stesso stile di utente_possiede_atleta
-- (20260718020000_certificati_storage_e_rls/migration.sql).
CREATE OR REPLACE FUNCTION utente_possiede_allenatore(allenatore_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "allenatori" a
    JOIN "utenti" u ON u."id" = a."utenteId"
    WHERE a."id" = allenatore_id_param
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;

REVOKE EXECUTE ON FUNCTION utente_possiede_allenatore(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION utente_possiede_allenatore(TEXT) TO authenticated;

-- Per l'Atleta si riusa atleta_possiede_presenza (Story 3.2,
-- 20260718010000_genitori_atlete_auto_aggancio/migration.sql), gia' gated su
-- autoAggancio = true (esclude correttamente il Genitore - self-service puro
-- di questa storia) - nessuna nuova funzione necessaria per l'Atleta.

-- Policy su storage.objects per "foto-profilo-atlete". ALLENATORE e' incluso
-- nel gruppo "ampio" per decisione esplicita dell'utente (Story 9.12): anche
-- Allenatore/Admin/Dirigente/Segreteria devono poter vedere le foto, non solo
-- il proprietario. ATLETA non e' nel gruppo ampio (stesso principio gia'
-- usato per "certificati_medici": GENITORE/ATLETA restano fuori dal SELECT
-- gestionale) - le serve quindi una policy propria per vedere la sua stessa
-- foto.
CREATE POLICY "foto_profilo_atlete_ampia_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'foto-profilo-atlete'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ALLENATORE', 'ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "foto_profilo_atlete_propria_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'foto-profilo-atlete'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza((storage.foldername(name))[1])
  );

-- Sia INSERT sia UPDATE: caricaFotoProfilo usa upsert:true (sostituzione, non
-- accumulo di versioni come i certificati). Lezione appresa nella Story 7.2
-- (20260718090000_logo_bucket_restrict_path/migration.sql, review fix): un
-- upload con upsert:true su un path gia' esistente richiede anche la policy
-- UPDATE, non solo INSERT - dimenticarla la' e' stato un bug reale, non
-- ripeterlo qui.
CREATE POLICY "foto_profilo_atlete_propria_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'foto-profilo-atlete'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza((storage.foldername(name))[1])
  );

CREATE POLICY "foto_profilo_atlete_propria_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'foto-profilo-atlete'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'foto-profilo-atlete'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza((storage.foldername(name))[1])
  );

-- Policy speculari su "foto-profilo-allenatori". ALLENATORE e' gia' nel
-- gruppo ampio sotto, quindi copre anche la visualizzazione della propria
-- foto da parte dell'Allenatore stesso - nessuna policy SELECT "propria"
-- separata necessaria qui (a differenza dell'Atleta sopra).
CREATE POLICY "foto_profilo_allenatori_ampia_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'foto-profilo-allenatori'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ALLENATORE', 'ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "foto_profilo_allenatori_propria_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'foto-profilo-allenatori'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND utente_possiede_allenatore((storage.foldername(name))[1])
  );

CREATE POLICY "foto_profilo_allenatori_propria_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'foto-profilo-allenatori'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND utente_possiede_allenatore((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'foto-profilo-allenatori'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND utente_possiede_allenatore((storage.foldername(name))[1])
  );

-- Nessun GRANT esplicito su storage.objects: l'extension Storage di Supabase
-- concede gia' le basi ad "authenticated" (stesso principio gia' verificato
-- per certificati-medici/logo-applicazione - solo POLICY, mai GRANT li').
