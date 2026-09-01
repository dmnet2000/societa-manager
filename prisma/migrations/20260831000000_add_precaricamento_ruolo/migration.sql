-- Story 9.41: precaricamento email per Segreteria/Dirigente (blocco
-- preventivo della registrazione, mirror del precaricamento Allenatore via
-- Codice Fiscale, Story 1.4). Mirror strutturale di "utente_ruoli" (una riga
-- per combinazione email+ruolo), non di "allenatori": "utenteId" NON e'
-- @unique qui, un Utente puo' agganciare piu' righe (una per Ruolo).
-- A differenza della prima migrazione Allenatore (storica, corretta solo in
-- seguito da 20260804030000_fix_rls_disabled_public_tables), ENABLE ROW
-- LEVEL SECURITY + REVOKE vanno qui, nella stessa migrazione di creazione -
-- convenzione corrente per ogni nuova tabella strutturale (AD-9).
CREATE TABLE "precaricamento_ruoli" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ruolo" "Ruolo" NOT NULL,
    "utenteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precaricamento_ruoli_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "precaricamento_ruoli_email_ruolo_key" ON "precaricamento_ruoli"("email", "ruolo");

ALTER TABLE "precaricamento_ruoli" ADD CONSTRAINT "precaricamento_ruoli_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "precaricamento_ruoli" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "precaricamento_ruoli" FROM anon, authenticated;
