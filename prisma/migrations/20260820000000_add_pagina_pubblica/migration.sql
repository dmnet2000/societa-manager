-- Story 19.9 (Epic 19, Ruolo Site Manager): PaginaPubblica, entita'
-- strutturale (AD-9) - nessuna policy RLS, nessun GRANT verso
-- "anon"/"authenticated": accesso solo via Prisma diretto con connessione
-- privilegiata, stesso trattamento di voci_menu_pubblico/sponsor.
CREATE TABLE "pagine_pubbliche" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "contenutoHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagine_pubbliche_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pagine_pubbliche_slug_key" ON "pagine_pubbliche"("slug");

-- Stesso pattern gia' corretto per 17 tabelle strutturali il 2026-08-04
-- (20260804030000_fix_rls_disabled_public_tables) e riapplicato ad ogni
-- tabella strutturale nuova da allora (es. 20260819000000_add_voce_menu_pubblico):
-- ENABLE ROW LEVEL SECURITY senza alcuna policy = deny-all di default via
-- PostgREST per "anon"/"authenticated"; REVOKE esplicito come garanzia
-- aggiuntiva. Prisma continua a leggere/scrivere invariato (connessione
-- diretta, bypassa sempre RLS/PostgREST).
ALTER TABLE "pagine_pubbliche" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "pagine_pubbliche" FROM anon, authenticated;

-- Nessun seed (a differenza di voci_menu_pubblico, Story 19.6): non
-- esistono Pagine "attuali" da migrare - le prime righe arrivano solo dopo
-- la Story 19.10 (editor di creazione), non da questa migrazione.
