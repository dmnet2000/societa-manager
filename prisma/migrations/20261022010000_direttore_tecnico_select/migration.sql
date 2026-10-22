-- Ruolo Direttore Tecnico: lettura di Atlete e Iscrizioni per
-- /app/composizione-gruppi (sola lettura - nessuna policy INSERT/UPDATE/
-- DELETE). Stesso pattern di "allenatore_tutte_atlete_select"
-- (20260730010000): condizione sul solo Ruolo nel JWT, le policy FOR SELECT
-- si combinano in OR con quelle esistenti, che restano invariate. GRANT
-- SELECT verso "authenticated" gia' concesso su entrambe le tabelle.
-- Tesseramento non serve qui: letto via Prisma diretto (lib/tesseramento.ts).
CREATE POLICY "direttore_tecnico_select" ON "atlete"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRETTORE_TECNICO'
  );

CREATE POLICY "direttore_tecnico_select" ON "iscrizioni"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRETTORE_TECNICO'
  );
