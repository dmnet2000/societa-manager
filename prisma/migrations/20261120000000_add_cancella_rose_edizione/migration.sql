-- Referto elettronico, story 3.13 (AD-4, AD-14): privacy delle rose.
-- Cancella tutte le rose delle squadre dell'Edizione. Solo ADMIN.
-- SECURITY DEFINER: la scrittura sulle rose resta solo nel database.
-- Giocatori, tesserati e modifiche_rosa vanno via in cascata (FK ON DELETE
-- CASCADE). Restituisce il numero di rose cancellate.

CREATE OR REPLACE FUNCTION cancella_rose_edizione(edizione_id_param TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ruoli JSONB := auth.jwt() -> 'app_metadata' -> 'ruoli';
  cancellate INT;
BEGIN
  IF auth.uid() IS NULL OR ruoli IS NULL OR NOT (ruoli ? 'ADMIN') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  DELETE FROM "rose_squadra" r
  USING "squadre_torneo" s, "categorie_torneo" c
  WHERE r."squadraTorneoId" = s."id"
    AND s."categoriaTorneoId" = c."id"
    AND c."edizioneTorneoId" = edizione_id_param;

  GET DIAGNOSTICS cancellate = ROW_COUNT;
  RETURN cancellate;
END;
$$;

REVOKE EXECUTE ON FUNCTION cancella_rose_edizione(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cancella_rose_edizione(TEXT) TO authenticated;
