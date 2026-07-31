-- Code review Story 9.18: creaEAssegnaAtleta scrive su "atlete"/"notifiche"
-- tramite il client Supabase con la sessione dell'utente (mai Prisma diretto,
-- AD-9/AD-4) - senza queste policy INSERT un Allenatore riceve un rifiuto RLS
-- silenzioso, mascherato da un errore generico lato Server Action. Le policy
-- INSERT esistenti (Story 1.3 su "atlete", Story 4.2 su "notifiche")
-- ammettevano solo ADMIN/DIRIGENTE/SEGRETERIA e GENITORE/ATLETA - nessuna
-- ammetteva ALLENATORE, l'attore primario di questa storia (AC #1/#3 mai
-- raggiungibili in produzione prima di questo fix). GRANT INSERT su entrambe
-- le tabelle e' gia' concesso ad "authenticated" (migrazioni 20260716070500,
-- 20260718050000) - solo le policy mancano.
CREATE POLICY "allenatore_nuova_atleta_insert" ON "atlete"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
  );

-- Scoped a tipo = 'NUOVO_ATLETA' (principio del minimo privilegio): non
-- allargare la capacita' di ALLENATORE/ADMIN/DIRIGENTE di inserire notifiche
-- di tipo CERTIFICATO_CARICATO, che restano di competenza esclusiva del
-- flusso Genitore/Atleta (Story 4.2, policy "genitore_atleta_crea_notifica").
-- Per il ramo ALLENATORE: allenatore_possiede_atleta() (Story 3.1) e' gia'
-- vera al momento della chiamata perche' creaNotifica avviene solo dopo che
-- l'upsert di GruppoAtleta ha assegnato la nuova Atleta al Gruppo posseduto.
CREATE POLICY "allenatore_admin_dirigente_notifica_nuova_atleta_insert" ON "notifiche"
  FOR INSERT
  WITH CHECK (
    "tipo" = 'NUOVO_ATLETA'
    AND (
      (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
      OR (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
        AND allenatore_possiede_atleta("atletaId")
      )
    )
  );
