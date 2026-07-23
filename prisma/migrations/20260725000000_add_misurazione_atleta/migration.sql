-- Story 6.1 (FR-24): MisurazioneAtleta, protetta da RLS (dato personale nel
-- tempo) - bind-list deliberatamente piu' stretto delle tabelle precedenti:
-- solo ALLENATORE (proprie Atlete) e ATLETA (se stessa), fedele al testo di
-- FR-24 ("Atleta o Allenatore"). Nessuna policy ADMIN/DIRIGENTE/SEGRETERIA:
-- questa tabella non e' nel bind-list originale di AD-4 e FR-24 non
-- menziona alcun Ruolo gestionale.
-- Log append-only (nessun AC richiede modifica/eliminazione di una
-- misurazione passata, stessa scelta di Presenza/Iscrizione) - nessuna
-- policy/GRANT UPDATE/DELETE.
CREATE TABLE "misurazioni_atleta" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valore" DOUBLE PRECISION NOT NULL,
    "unitaMisura" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "misurazioni_atleta_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "misurazioni_atleta" ADD CONSTRAINT "misurazioni_atleta_atletaId_fkey"
  FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "misurazioni_atleta" ENABLE ROW LEVEL SECURITY;

-- Riusa allenatore_possiede_atleta (Story 3.1/4.5,
-- 20260717200000_atlete_allenatore_select) - nessuna nuova funzione.
CREATE POLICY "allenatore_propria_atleta_misurazione_select" ON "misurazioni_atleta"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );

CREATE POLICY "allenatore_propria_atleta_misurazione_insert" ON "misurazioni_atleta"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_atleta("atletaId")
  );

-- Riusa atleta_possiede_presenza (Story 3.2,
-- 20260718010000_genitori_atlete_auto_aggancio) - nome storico legato a
-- "presenza" ma generica (verifica solo autoAggancio = true), nessuna nuova
-- funzione. Gate su autoAggancio esclude correttamente il Genitore (AC #5),
-- a differenza di utente_possiede_atleta (usata per i Certificati, include
-- deliberatamente anche il Genitore) - qui NON va riusata.
CREATE POLICY "atleta_propria_misurazione_select" ON "misurazioni_atleta"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza("atletaId")
  );

CREATE POLICY "atleta_propria_misurazione_insert" ON "misurazioni_atleta"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ATLETA'
    AND atleta_possiede_presenza("atletaId")
  );

GRANT SELECT, INSERT ON "misurazioni_atleta" TO authenticated;
