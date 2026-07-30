-- Story 9.15: un Allenatore deve poter assegnare al proprio Gruppo
-- un'Atleta qualunque (decisione esplicita con l'utente: visibilita' ampia,
-- come Admin/Dirigente/Segreteria oggi - non solo le Atlete gia' nel
-- proprio Gruppo). La policy esistente "allenatore_proprie_atlete_select"
-- (20260717200000_atlete_allenatore_select) scopa la visibilita' tramite
-- allenatore_possiede_atleta() - insufficiente per popolare un elenco di
-- Atlete assegnabili non ancora nel proprio Gruppo.
--
-- Nessuna funzione SECURITY DEFINER necessaria qui (a differenza della
-- policy sopra): nessuno scoping da attraversare, la condizione riguarda
-- solo il Ruolo nel JWT, stesso identico pattern di
-- "admin_dirigente_segreteria_select"
-- (20260716080000_atlete_restrict_delete/migration.sql). Le policy per lo
-- stesso comando (FOR SELECT) si combinano in OR - questa si somma alle due
-- gia' esistenti, nessuna delle due va rimossa (Task 1, story file).
--
-- GRANT SELECT su "atlete" verso "authenticated" e' gia' concesso (Story
-- 1.3, 20260716070500_grant_atlete_access) - solo una nuova policy
-- permissiva, nessun nuovo GRANT necessario.
CREATE POLICY "allenatore_tutte_atlete_select" ON "atlete"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
  );
