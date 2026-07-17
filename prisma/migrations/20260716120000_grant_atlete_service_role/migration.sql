-- Story 1.5: il lookup Atleta-per-CF in fase di registrazione Genitore usa il
-- client service-role (nessuna sessione utente disponibile pre-signup, vedi
-- Dev Notes della storia). Come gia' scoperto in Story 1.3 per "authenticated",
-- le tabelle create via migrazione diretta non hanno GRANT di default per
-- nessun ruolo Postgres (auto_expose_new_tables non attivo) - "service_role"
-- bypassa la RLS ma non i GRANT di base, serve comunque il privilegio esplicito.
GRANT SELECT ON "atlete" TO service_role;
