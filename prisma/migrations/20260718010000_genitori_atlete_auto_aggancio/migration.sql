-- Story 3.2 code review (Blind Hunter): la policy RLS "atleta_propria_select"
-- su "presenze" (migrazione 20260718000000_presenze_atleta_select) concedeva
-- lettura per QUALSIASI riga "genitori_atlete" dell'Utente, non solo per il
-- proprio aggancio "a se stessa" - un Utente con doppio Ruolo Atleta+Genitore
-- (caso esplicitamente supportato dalla registrazione, Story 2.7, gia'
-- testato in registrati/actions.test.ts) otteneva quindi accesso allo
-- storico presenze di una figlia tramite il proprio aggancio Genitore,
-- violazione reale di AC #3 ("nessun accesso allo storico di altre Atlete").
--
-- "genitori_atlete" non aveva alcuna colonna che distinguesse un aggancio
-- "a se stessa" da un aggancio Genitore<->figlia: aggiunta qui.
ALTER TABLE "genitori_atlete" ADD COLUMN "autoAggancio" BOOLEAN NOT NULL DEFAULT false;

-- Aggiorna la funzione SECURITY DEFINER (Story 3.2) per richiedere
-- esplicitamente autoAggancio = true - la policy "atleta_propria_select" non
-- va toccata, referenzia la funzione per nome/firma, non per corpo.
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
      AND ga."autoAggancio" = true
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;
