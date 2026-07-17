-- I nuovi ruoli Postgres (authenticated) non hanno accesso di default alle
-- tabelle create via migrazione diretta (auto_expose_new_tables non attivo,
-- vedi supabase/config.toml) - servono GRANT espliciti oltre alla RLS
-- (Postgres verifica i privilegi a livello di tabella PRIMA delle policy).
GRANT SELECT, INSERT, UPDATE, DELETE ON "atlete" TO authenticated;
