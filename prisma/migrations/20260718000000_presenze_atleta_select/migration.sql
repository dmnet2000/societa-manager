-- Story 3.2: prima policy RLS scoped per il Ruolo ATLETA in questa codebase.
-- FR-9 richiede che un'Atleta legga il proprio storico presenze, mai quello
-- di un'altra. Riusa lo stesso aggancio di identita' di Story 2.7
-- (GenitoreAtleta come corrispondenza Utente<->Atleta "a se stessa", non
-- protetta da RLS, AD-9) dentro una funzione SECURITY DEFINER - stesso
-- pattern esatto di allenatore_possiede_slot/allenatore_possiede_atleta
-- (Story 3.1): "genitori_atlete"/"utenti" non hanno GRANT verso
-- "authenticated", e concederne uno diretto esporrebbe email/Codice Fiscale
-- a chiunque sia autenticato.
CREATE OR REPLACE FUNCTION atleta_possiede_presenza(atleta_id_param TEXT)
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

REVOKE EXECUTE ON FUNCTION atleta_possiede_presenza(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION atleta_possiede_presenza(TEXT) TO authenticated;

-- Gate esplicito sul Ruolo ATLETA (non solo sulla relazione): "genitori_atlete"
-- non distingue un aggancio "a se stessa" da un aggancio Genitore<->figlia
-- (stessa ambiguita' gia' accettata in Story 2.7) - senza questo gate, un
-- Utente con SOLO il Ruolo Genitore erediterebbe involontariamente accesso
-- allo storico presenze della figlia tramite RLS (AC #4, Story 3.2).
-- Combinata in OR con le policy SELECT esistenti su "presenze"
-- (admin_dirigente_segreteria_select, allenatore_proprio_gruppo_select) -
-- nessuna delle due viene toccata: il lato Allenatore di questa storia e'
-- gia' completamente coperto da allenatore_proprio_gruppo_select (Story 3.1).
CREATE POLICY "atleta_propria_select" ON "presenze"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza("atletaId")
  );

-- Nessun nuovo GRANT su "presenze": GRANT SELECT ... TO authenticated e'
-- gia' concesso dalla migrazione Story 3.1 (20260717190000_add_presenza),
-- copre anche il Ruolo ATLETA.
