-- Story 4.1 review fix (scoperto durante la verifica dal vivo delle patch
-- di code review): rimuoviFileCertificato() (lib/storage/certificati.ts,
-- chiamata da caricaCertificato in app/(certificati-medici)/certificato-medico/actions.ts
-- per ripulire il vecchio file su un ri-caricamento, AC #4) chiama
-- .storage.from(...).remove(...) con la sessione dell'Utente autenticato,
-- mai service-role - ma nessuna policy DELETE esisteva su storage.objects
-- per il bucket "certificati-medici", per nessun Ruolo. Senza questa policy
-- la rimozione falliva silenziosamente (l'errore e' intenzionalmente non
-- bloccante, vedi commento nella Server Action) e il vecchio file restava
-- orfano nel bucket ad ogni ri-caricamento - verificato dal vivo, non solo
-- teorico.
CREATE POLICY "certificati_medici_genitore_atleta_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'certificati-medici'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['GENITORE', 'ATLETA']
    AND utente_possiede_atleta((storage.foldername(name))[1])
  );
