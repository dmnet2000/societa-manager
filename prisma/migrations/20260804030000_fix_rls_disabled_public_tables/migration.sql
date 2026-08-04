-- Fix Supabase Security Advisor (segnalazione critica ricevuta dall'utente,
-- 2026-08-04): "rls_disabled_in_public" - il linter Supabase segnala ogni
-- tabella nello schema "public" con RLS disabilitata come potenzialmente
-- esposta via PostgREST, indipendentemente dai GRANT effettivamente
-- concessi (che questo progetto non ha mai verificato/documentato in modo
-- sistematico per le tabelle "strutturali" - AD-9 assumeva "nessun GRANT
-- concesso" senza mai revocarlo esplicitamente, a differenza del caso
-- gia' corretto di "_prisma_migrations", 2026-07-30).
--
-- Stesso identico pattern gia' applicato con successo a
-- "_prisma_migrations" (20260730000000_enable_rls_prisma_migrations):
-- ENABLE ROW LEVEL SECURITY senza alcuna policy = deny-all di default via
-- PostgREST per "anon"/"authenticated"; REVOKE esplicito come garanzia
-- aggiuntiva anche se RLS da solo gia' blocca l'accesso. Prisma continua a
-- leggere/scrivere invariato: la connessione diretta configurata in
-- DATABASE_URL bypassa sempre RLS (non passa mai da PostgREST/anon key) -
-- nessun impatto sul comportamento applicativo, solo chiusura di una
-- superficie di esposizione mai stata necessaria.
--
-- "permessi_rotte" ha un GRANT SELECT deliberato verso "service_role"
-- (20260804010000_grant_permessi_rotte_service_role, Story 12.4, letto dal
-- Proxy via lib/auth-admin/client.ts sotto runtime edge) - il REVOKE qui
-- sotto colpisce solo "anon"/"authenticated", "service_role" resta
-- intoccato.
--
-- Le 17 tabelle sotto sono l'intero elenco delle tabelle Prisma di questo
-- progetto MAI toccate da un "ENABLE ROW LEVEL SECURITY" in nessuna
-- migrazione precedente (verificato confrontando ogni @@map di
-- prisma/schema.prisma con ogni migrazione esistente) - a differenza di
-- atlete/certificati_medici/iscrizioni/presenze/notifiche/
-- misurazioni_atleta/configurazione_smtp (AD-4/AD-12, gia' protette da RLS
-- con policy dedicate, non toccate qui).

ALTER TABLE "utenti" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "utente_ruoli" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "allenatori" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "genitori_atlete" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anni_agonistici" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tesseramenti" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "configurazione_applicazione" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "palestre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gruppi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campionati" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gruppi_visibili_dirigente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gruppo_allenatori" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gruppo_atlete" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "slot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permessi_rotte" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "utenti" FROM anon, authenticated;
REVOKE ALL ON "utente_ruoli" FROM anon, authenticated;
REVOKE ALL ON "allenatori" FROM anon, authenticated;
REVOKE ALL ON "genitori_atlete" FROM anon, authenticated;
REVOKE ALL ON "anni_agonistici" FROM anon, authenticated;
REVOKE ALL ON "tesseramenti" FROM anon, authenticated;
REVOKE ALL ON "configurazione_applicazione" FROM anon, authenticated;
REVOKE ALL ON "palestre" FROM anon, authenticated;
REVOKE ALL ON "campi" FROM anon, authenticated;
REVOKE ALL ON "gruppi" FROM anon, authenticated;
REVOKE ALL ON "campionati" FROM anon, authenticated;
REVOKE ALL ON "partite" FROM anon, authenticated;
REVOKE ALL ON "gruppi_visibili_dirigente" FROM anon, authenticated;
REVOKE ALL ON "gruppo_allenatori" FROM anon, authenticated;
REVOKE ALL ON "gruppo_atlete" FROM anon, authenticated;
REVOKE ALL ON "slot" FROM anon, authenticated;
REVOKE ALL ON "permessi_rotte" FROM anon, authenticated;
