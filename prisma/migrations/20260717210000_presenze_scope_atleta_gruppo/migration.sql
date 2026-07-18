-- Story 3.1 code review (Blind Hunter, confermato indipendentemente in due
-- esecuzioni separate + Edge Case Hunter): allenatore_possiede_slot
-- verificava solo che l'Allenatore possedesse lo Slot, MAI che l'Atleta
-- segnata facesse effettivamente parte del Gruppo di quello Slot. Un
-- Allenatore poteva quindi registrare una Presenza per QUALSIASI atletaId
-- (ottenuto in qualsiasi modo, es. un rosterAtletaId manomesso in una POST
-- diretta), purche' lo Slot fosse il proprio - AC #4 ("posso registrare
-- presenze solo per i Gruppi di cui sono Allenatore") era applicato solo a
-- meta'. Sostituita con una funzione che verifica entrambe le condizioni
-- (proprieta' dello Slot E appartenenza dell'Atleta al suo Gruppo) in
-- un'unica query - stesso pattern SECURITY DEFINER gia' introdotto per
-- allenatore_possiede_slot (migrazione 20260717190000_add_presenza).
CREATE OR REPLACE FUNCTION allenatore_possiede_slot_e_atleta(slot_id_param TEXT, atleta_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "slot" s
    JOIN "gruppo_allenatori" ga ON ga."gruppoId" = s."gruppoId"
    JOIN "allenatori" a ON a."id" = ga."allenatoreId"
    JOIN "utenti" u ON u."id" = a."utenteId"
    JOIN "gruppo_atlete" gat ON gat."gruppoId" = s."gruppoId" AND gat."atletaId" = atleta_id_param
    WHERE s."id" = slot_id_param
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;

REVOKE EXECUTE ON FUNCTION allenatore_possiede_slot_e_atleta(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION allenatore_possiede_slot_e_atleta(TEXT, TEXT) TO authenticated;

DROP POLICY "allenatore_proprio_gruppo_select" ON "presenze";
DROP POLICY "allenatore_proprio_gruppo_insert" ON "presenze";
DROP POLICY "allenatore_proprio_gruppo_update" ON "presenze";

CREATE POLICY "allenatore_proprio_gruppo_select" ON "presenze"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot_e_atleta("slotId", "atletaId")
  );

CREATE POLICY "allenatore_proprio_gruppo_insert" ON "presenze"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot_e_atleta("slotId", "atletaId")
  );

CREATE POLICY "allenatore_proprio_gruppo_update" ON "presenze"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot_e_atleta("slotId", "atletaId")
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot_e_atleta("slotId", "atletaId")
  );

-- allenatore_possiede_slot non e' piu' referenziata da alcuna policy.
DROP FUNCTION allenatore_possiede_slot(TEXT);
