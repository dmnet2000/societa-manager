-- Story 5.2 - review fix: dirigente_vede_certificato_atleta non era scoped
-- alla stagione. Righe "stale" in gruppi_visibili_dirigente riferite a
-- Gruppi di una stagione passata (mai ripulite dopo un rollover, ne' l'AC
-- #6 ne' l'implementazione originale prevedevano una pulizia automatica)
-- producevano due esiti opposti entrambi sbagliati:
--   (a) un'Atleta appartenuta in passato a un Gruppo autorizzato ma non
--       piu' oggi restava comunque visibile (sovra-esposizione);
--   (b) se restavano solo righe "orfane" di una stagione passata,
--       NOT EXISTS risultava falso (tabella non vuota) ma nessuna Atleta
--       della stagione corrente faceva mai match sul JOIN -> il Dirigente
--       non vedeva NESSUN Certificato, non "tutti" come dichiarato dall'AC
--       #6 (il comportamento atteso quando "nessuna restrizione e' attiva
--       per la stagione corrente").
-- Fix: sia il controllo "la restrizione e' attiva" sia il match di
-- appartenenza vengono ora scoped alla stagione corrente, verificata
-- tramite le colonne dataInizio/dataFine gia' presenti su
-- "anni_agonistici" (nessuna necessita' di replicare in SQL l'euristica
-- agosto-giugno gia' calcolata lato applicativo).
CREATE OR REPLACE FUNCTION dirigente_vede_certificato_atleta(atleta_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM "gruppi_visibili_dirigente" gvd
      JOIN "gruppi" g ON g.id = gvd."gruppoId"
      JOIN "anni_agonistici" aa ON aa.id = g."annoAgonisticoId"
      WHERE aa."dataInizio" <= CURRENT_DATE AND aa."dataFine" >= CURRENT_DATE
    )
    OR EXISTS (
      SELECT 1
      FROM "gruppo_atlete" ga
      JOIN "gruppi_visibili_dirigente" gvd ON gvd."gruppoId" = ga."gruppoId"
      JOIN "gruppi" g ON g.id = gvd."gruppoId"
      JOIN "anni_agonistici" aa ON aa.id = g."annoAgonisticoId"
      WHERE ga."atletaId" = atleta_id_param
        AND aa."dataInizio" <= CURRENT_DATE AND aa."dataFine" >= CURRENT_DATE
    );
$$;
