-- Story 18.4: bucket Storage PUBBLICO per la foto di squadra di un Gruppo -
-- nessuna nuova colonna su "gruppi": esistenza + updated_at derivati da
-- Storage list(), stesso principio gia' stabilito per "logo-applicazione"
-- (Story 7.2) e "sponsor-banner" (Story 16.1). Path PIATTO (il nome
-- oggetto e' direttamente il gruppoId, nessuna sottocartella) - mirror di
-- "sponsor-banner", diverso da "foto-profilo-*" (path nidificato
-- "{entitaId}/foto") - le policy sotto confrontano quindi "name"
-- direttamente, non (storage.foldername(name))[1].
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('foto-squadra-gruppo', 'foto-squadra-gruppo', true, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- A differenza di "sponsor-banner" (gestito solo da ADMIN/DIRIGENTE, nessuna
-- funzione di possesso necessaria), qui anche l'Allenatore ASSEGNATO al
-- Gruppo puo' caricare la foto (AC #1/#2) - serve quindi una funzione di
-- possesso, mirror esatto di utente_possiede_allenatore
-- (20260728000000_add_foto_profilo/migration.sql) con un JOIN in piu' per
-- risalire da Gruppo ad Allenatore tramite la tabella di giunzione
-- gruppo_allenatori.
CREATE OR REPLACE FUNCTION utente_possiede_gruppo(gruppo_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "gruppo_allenatori" ga
    JOIN "allenatori" a ON a."id" = ga."allenatoreId"
    JOIN "utenti" u ON u."id" = a."utenteId"
    WHERE ga."gruppoId" = gruppo_id_param
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;

REVOKE EXECUTE ON FUNCTION utente_possiede_gruppo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION utente_possiede_gruppo(TEXT) TO authenticated;

-- Policy SELECT PUBBLICA (nessuna condizione di Ruolo) fin da questa prima
-- migrazione - non opzionale nemmeno per un bucket pubblico: list() (usato
-- sia dai form di upload per-Gruppo sia dalla home pubblica per sapere quali
-- Gruppi hanno una foto) passa da RLS, a differenza del GET diretto
-- sull'endpoint pubblico dell'oggetto che la bypassa. Il bucket
-- "logo-applicazione" ha impiegato DUE migrazioni correttive per arrivare
-- qui (prima nessuna SELECT - 20260718080000 - poi SELECT solo ADMIN che
-- rompeva /accedi/NavBar non autenticati - 20260725020000): qui la home
-- pubblica e' SEMPRE anonima, quindi si scrive bene fin da subito.
CREATE POLICY "foto_squadra_gruppo_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'foto-squadra-gruppo');

-- Sia INSERT sia UPDATE: caricaFotoSquadra usa upsert:true (sostituzione,
-- non accumulo di versioni) - dimenticare la policy UPDATE ha gia' causato
-- un bug reale nel bucket logo (20260718090000_logo_bucket_restrict_path),
-- non ripeterlo qui.
CREATE POLICY "foto_squadra_gruppo_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'foto-squadra-gruppo'
    AND (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
      OR (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
        AND utente_possiede_gruppo(name)
      )
    )
  );

CREATE POLICY "foto_squadra_gruppo_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'foto-squadra-gruppo'
    AND (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
      OR (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
        AND utente_possiede_gruppo(name)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'foto-squadra-gruppo'
    AND (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
      OR (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
        AND utente_possiede_gruppo(name)
      )
    )
  );

-- Nessun GRANT esplicito su storage.objects: l'estensione Storage di
-- Supabase concede gia' le basi ad "authenticated", solo POLICY - stesso
-- principio gia' verificato per tutti i bucket precedenti.
