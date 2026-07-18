-- Story 3.1: scoperto durante la verifica dal vivo (non anticipato in fase
-- di creazione della storia) - nessuna storia precedente aveva mai richiesto
-- che un Allenatore leggesse la tabella "atlete": la policy SELECT esistente
-- (Story 1.3, "admin_dirigente_segreteria_select") ammette solo ADMIN,
-- DIRIGENTE, SEGRETERIA. FR-8 richiede pero' che l'Allenatore veda il roster
-- delle proprie Atlete per registrare le presenze (elencaAtlete(supabase)
-- restituiva 0 righe per una sessione Allenatore, roster sempre vuoto).
--
-- Stesso pattern SECURITY DEFINER gia' introdotto per "presenze"
-- (migrazione 20260717190000_add_presenza) - la scoping via GruppoAtleta ->
-- GruppoAllenatore attraversa tabelle ("gruppo_atlete", "gruppo_allenatori",
-- "allenatori", "utenti") senza GRANT diretto verso "authenticated" (AD-9).
CREATE OR REPLACE FUNCTION allenatore_possiede_atleta(atleta_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "gruppo_atlete" ga2
    JOIN "gruppo_allenatori" ga ON ga."gruppoId" = ga2."gruppoId"
    JOIN "allenatori" a ON a."id" = ga."allenatoreId"
    JOIN "utenti" u ON u."id" = a."utenteId"
    WHERE ga2."atletaId" = atleta_id_param
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;

REVOKE EXECUTE ON FUNCTION allenatore_possiede_atleta(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION allenatore_possiede_atleta(TEXT) TO authenticated;

-- GRANT SELECT su "atlete" verso "authenticated" e' gia' concesso (Story 1.3,
-- 20260716070500_grant_atlete_access) - solo una nuova policy permissiva
-- (combinata in OR con quella esistente), nessun nuovo GRANT necessario.
CREATE POLICY "allenatore_proprie_atlete_select" ON "atlete"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta(id)
  );
