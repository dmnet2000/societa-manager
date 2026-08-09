-- Story 16.1: Sponsor, entita' strutturale (AD-9) - nessuna policy RLS,
-- nessun GRANT verso "authenticated"/"service_role": accesso solo via Prisma
-- diretto con connessione privilegiata, stesso trattamento di
-- permessi_rotte/tesseramenti. "tipo" distingue solo il comportamento della
-- vetrina pubblica (Story 16.2), non la struttura dati.
CREATE TYPE "TipoSponsor" AS ENUM ('BANNER', 'CONVENZIONE');

CREATE TABLE "sponsor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoSponsor" NOT NULL,
    "descrizione" TEXT NOT NULL,
    "linkEsterno" TEXT,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_pkey" PRIMARY KEY ("id")
);

-- Review fix (2026-08-09, Acceptance Auditor + Blind Hunter, trovato
-- indipendentemente da entrambi): senza questo, "sponsor" riproduceva
-- esattamente il difetto "rls_disabled_in_public" gia' scoperto e corretto
-- per 17 tabelle strutturali il 2026-08-04
-- (20260804030000_fix_rls_disabled_public_tables) - ENABLE ROW LEVEL
-- SECURITY senza alcuna policy = deny-all di default via PostgREST per
-- "anon"/"authenticated"; REVOKE esplicito come garanzia aggiuntiva.
-- Prisma continua a leggere/scrivere invariato (connessione diretta,
-- bypassa sempre RLS/PostgREST).
ALTER TABLE "sponsor" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "sponsor" FROM anon, authenticated;
