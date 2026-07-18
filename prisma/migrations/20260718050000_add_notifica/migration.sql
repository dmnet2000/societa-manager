-- Story 4.2 (FR-12): tabella "notifiche", protetta da RLS (AD-4/AD-9) -
-- nessuna nav/badge/toast globale esiste in questa codebase (app/layout.tsx
-- e' un guscio nudo), quindi la "notifica" e' una riga persistita + una
-- pagina che la elenca, stesso pattern minimale di ogni altra vista di
-- lista del progetto. Nessuna policy UPDATE/DELETE (nessun AC di questa
-- storia li richiede - stessa scelta gia' fatta per "certificati_medici",
-- Story 1.7/4.1).
--
-- Riuso totale di funzioni SECURITY DEFINER gia' esistenti, nessuna nuova:
--   - utente_possiede_atleta (Story 4.1, 20260718020000_certificati_storage_e_rls)
--     per l'INSERT del Genitore/Atleta che ha appena caricato il file.
--   - allenatore_possiede_atleta (Story 3.1, 20260717200000_atlete_allenatore_select)
--     per il SELECT scoped dell'Allenatore (proprio Gruppo).
-- Il Dirigente ha accesso ampio (solo controllo Ruolo, nessuna funzione
-- necessaria) - Admin/Segreteria restano fuori scope, nessun AC li nomina.
CREATE TABLE "notifiche" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifiche_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifiche" ADD CONSTRAINT "notifiche_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifiche" ENABLE ROW LEVEL SECURITY;

-- GRANT esplicito richiesto (tabella nello schema "public", a differenza di
-- storage.objects - AD-9/Story 4.1 Prerequisito #1).
GRANT SELECT, INSERT ON "notifiche" TO authenticated;

CREATE POLICY "genitore_atleta_crea_notifica" ON "notifiche"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta("atletaId")
  );

CREATE POLICY "allenatore_proprie_notifiche_select" ON "notifiche"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );

CREATE POLICY "dirigente_notifiche_select" ON "notifiche"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
  );
