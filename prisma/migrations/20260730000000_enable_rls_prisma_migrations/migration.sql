-- Fix Supabase Security Advisor: "Table public._prisma_migrations is
-- public, but RLS has not been enabled". A differenza delle altre tabelle
-- strutturali non-RLS di questo progetto (Gruppo/Slot/Palestra/ecc., AD-9,
-- dove "nessuna RLS" e' una scelta deliberata e documentata perche' nessun
-- GRANT viene mai concesso ad "anon"/"authenticated" - l'accesso resta
-- Prisma diretto), _prisma_migrations e' creata automaticamente da Prisma
-- stesso (bookkeeping interno: nome/checksum/timestamp delle migrazioni
-- applicate), fuori da qualunque migrazione scritta a mano di questo
-- progetto e priva di qualunque caso d'uso legittimo lato API pubblica.
-- Abilitare RLS senza alcuna policy la rende completamente inaccessibile
-- via PostgREST (deny-all di default) - Prisma CLI continua a leggerla/
-- scriverla tramite la connessione diretta al database (bypassa RLS, non
-- passa mai da PostgREST/anon key), quindi nessun impatto sul deploy.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders (stesso principio "nessun GRANT" gia' documentato per
-- le altre tabelle non-RLS): revoca esplicitamente ogni privilegio di
-- default eventualmente presente sui ruoli PostgREST-facing, anche se RLS
-- da solo gia' li blocca in lettura/scrittura.
REVOKE ALL ON "public"."_prisma_migrations" FROM anon, authenticated;
