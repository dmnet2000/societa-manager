-- Story 19.6 (Epic 19, Ruolo Site Manager): VoceMenuPubblico, entita'
-- strutturale (AD-9) - nessuna policy RLS, nessun GRANT verso
-- "anon"/"authenticated": accesso solo via Prisma diretto con connessione
-- privilegiata, stesso trattamento di sponsor/permessi_rotte.
CREATE TABLE "voci_menu_pubblico" (
    "id" TEXT NOT NULL,
    "etichetta" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL,
    "visibile" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voci_menu_pubblico_pkey" PRIMARY KEY ("id")
);

-- Stesso pattern gia' corretto per 17 tabelle strutturali il 2026-08-04
-- (20260804030000_fix_rls_disabled_public_tables) e riapplicato ad ogni
-- tabella strutturale nuova da allora (es. 20260809000000_add_sponsor):
-- ENABLE ROW LEVEL SECURITY senza alcuna policy = deny-all di default via
-- PostgREST per "anon"/"authenticated"; REVOKE esplicito come garanzia
-- aggiuntiva. Prisma continua a leggere/scrivere invariato (connessione
-- diretta, bypassa sempre RLS/PostgREST).
ALTER TABLE "voci_menu_pubblico" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "voci_menu_pubblico" FROM anon, authenticated;

-- AC (Story 19.6): seed obbligatorio delle 5 voci attualmente hard-coded in
-- app/NavPubblica.tsx (VOCI), stesso ordine di visualizzazione (0-4) - la
-- Story 19.8 potra' attivare la lettura da questa tabella senza un menu
-- vuoto al primo deploy. Questa migrazione NON modifica NavPubblica.tsx:
-- l'array hard-coded resta l'unica fonte di verita' effettiva finche' la
-- Story 19.8 non lo collega a questa tabella.
INSERT INTO "voci_menu_pubblico" ("id", "etichetta", "url", "ordine", "visibile", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, seed.etichetta, seed.url, seed.ordine, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Home', '/', 0),
  ('Squadre', '/squadre', 1),
  ('Calendario', '/calendario', 2),
  ('Staff', '/staff', 3),
  ('Contatti', '/contatti', 4)
) AS seed(etichetta, url, ordine);
