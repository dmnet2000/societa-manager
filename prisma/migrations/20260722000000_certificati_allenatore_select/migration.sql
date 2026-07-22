-- Story 4.5 (FR-15): nessuna policy SELECT su "certificati_medici" copriva
-- finora il Ruolo ALLENATORE (solo ADMIN/DIRIGENTE/SEGRETERIA ad accesso
-- ampio e GENITORE/ATLETA sulla propria Atleta, migrazione Story 1.7/4.1) -
-- senza questa policy, elencaCertificati(supabase) (Story 4.4) restituirebbe
-- sempre un array vuoto per una sessione Allenatore e l'alert di scadenza
-- non potrebbe mai comparire in produzione.
-- Riusa la funzione SECURITY DEFINER "allenatore_possiede_atleta" gia'
-- creata in Story 3.1 (migrazione 20260717200000_atlete_allenatore_select)
-- per la policy equivalente su "atlete" - stessa logica di scoping (Atleta
-- appartenente a un Gruppo assegnato all'Allenatore), nessuna nuova
-- funzione da scrivere.
-- Nessun nuovo GRANT: GRANT SELECT, INSERT, UPDATE ON "certificati_medici"
-- TO authenticated (Story 1.7) e' gia' a livello di tabella, copre gia'
-- ogni Ruolo autenticato incluso Allenatore - mancava solo la policy.
CREATE POLICY "allenatore_proprie_atlete_certificato_select" ON "certificati_medici"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );
