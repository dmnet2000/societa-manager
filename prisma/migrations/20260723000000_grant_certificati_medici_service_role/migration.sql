-- Story 4.6: il Route Handler del Cron promemoria scadenza legge
-- "certificati_medici" con il client service-role (createAdminClient(),
-- nessuna sessione utente esiste in un Cron) - stesso identico gap gia'
-- scoperto due volte in questo progetto (Story 1.5 "atlete", Story 4.3
-- "configurazione_smtp"): "service_role" bypassa la RLS ma non i GRANT di
-- base, le tabelle create via migrazione diretta non hanno GRANT di default
-- per nessun ruolo Postgres (auto_expose_new_tables non attivo) - serve
-- comunque il privilegio esplicito. Solo SELECT: il Cron legge soltanto, non
-- scrive mai certificati_medici.
GRANT SELECT ON "certificati_medici" TO service_role;
