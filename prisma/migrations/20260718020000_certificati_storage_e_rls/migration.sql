-- Story 4.1: prima migrazione a toccare Supabase Storage. Bucket privato
-- (AD-6) per i file dei Certificati Medici - percorso file "{atletaId}/...",
-- cosi' le policy su storage.objects possono isolare per Atleta tramite
-- (storage.foldername(name))[1] (idiom standard di Supabase Storage).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('certificati-medici', 'certificati-medici', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

-- Nuove colonne su "certificati_medici" (AD-4, gia' RLS-protetta da Story 1.7).
-- dataFineValidita diventa opzionale: il nuovo flusso di upload (Story 4.1)
-- crea/aggiorna solo filePath, senza che Genitore/Atleta debbano trascrivere
-- una data di scadenza - quella spetta alla Segreteria in fase di conferma
-- (Story 4.4). Il flusso di import (Story 1.7, unisciCertificato) continua a
-- fornire sempre una data reale, non e' impattato.
ALTER TABLE "certificati_medici" ALTER COLUMN "dataFineValidita" DROP NOT NULL;
ALTER TABLE "certificati_medici" ADD COLUMN "filePath" TEXT;

-- Funzione SECURITY DEFINER condivisa da tre superfici (certificati_medici,
-- atlete, storage.objects): a differenza di atleta_possiede_presenza (Story
-- 3.2, gated su autoAggancio = true per escludere l'accesso di un Genitore ai
-- dati identity-specific di una figlia), qui la semantica e' opposta - sia
-- l'aggancio a se stessa sia l'aggancio Genitore<->figlia devono dare
-- accesso: gestire il certificato di una figlia e' esattamente il compito di
-- un Genitore (AC #1/#3, Story 4.1). Nessun gate su autoAggancio.
CREATE OR REPLACE FUNCTION utente_possiede_atleta(atleta_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "genitori_atlete" ga
    JOIN "utenti" u ON u."id" = ga."utenteId"
    WHERE ga."atletaId" = atleta_id_param
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;

REVOKE EXECUTE ON FUNCTION utente_possiede_atleta(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION utente_possiede_atleta(TEXT) TO authenticated;

-- Gap scoperto in fase di analisi (vedi Dev Notes Story 4.1): nessuna policy
-- RLS esisteva per GENITORE/ATLETA su "certificati_medici" (solo
-- ADMIN/DIRIGENTE/SEGRETERIA, Story 1.7) ne' su "atlete" per questi due
-- Ruoli - entrambe necessarie perche' AC #1 richiede che possano
-- caricare/leggere il proprio Certificato, e AC #3 richiede di mostrare il
-- nome della propria Atleta nel selettore (non un id grezzo). Gate doppio
-- (Ruolo + relazione), stesso principio di difesa in profondita' gia'
-- stabilito in Story 3.1/3.2. Combinate in OR con le policy esistenti, che
-- restano intatte.
CREATE POLICY "genitore_atleta_gestisce_certificato_select" ON "certificati_medici"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta("atletaId")
  );

CREATE POLICY "genitore_atleta_gestisce_certificato_insert" ON "certificati_medici"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta("atletaId")
  );

CREATE POLICY "genitore_atleta_gestisce_certificato_update" ON "certificati_medici"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta("atletaId")
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta("atletaId")
  );

-- Nessuna policy/GRANT DELETE: nessun AC di questa storia richiede la
-- rimozione di un Certificato (stessa scelta gia' fatta per presenze/iscrizioni).
GRANT SELECT, INSERT, UPDATE ON "certificati_medici" TO authenticated;

CREATE POLICY "genitore_atleta_propria_select" ON "atlete"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta(id)
  );

-- Policy su storage.objects per il bucket "certificati-medici" - la tabella
-- ha gia' RLS abilitata e i GRANT di base verso "authenticated" per
-- definizione dell'estensione Storage di Supabase, servono solo le POLICY
-- (a differenza delle tabelle nello schema "public" di questo progetto, dove
-- i GRANT vanno sempre concessi esplicitamente).
CREATE POLICY "certificati_medici_admin_dirigente_segreteria_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']
  );

CREATE POLICY "certificati_medici_genitore_atleta_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta((storage.foldername(name))[1])
  );

CREATE POLICY "certificati_medici_genitore_atleta_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta((storage.foldername(name))[1])
  );

CREATE POLICY "certificati_medici_genitore_atleta_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta((storage.foldername(name))[1])
  );
