-- 2026-07-25: tabella "configurazione_applicazione", riga singola su id
-- fisso (stesso pattern di "configurazione_smtp", Story 7.1) per il nome
-- del settore mostrato in NavBar e nella pagina di login. NON protetta da
-- RLS (AD-9, a differenza di "configurazione_smtp") - nessun GRANT verso
-- "authenticated"/"anon": l'accesso a runtime passa sempre da Prisma
-- diretto (connessione privilegiata), mai dal client Supabase - stesso
-- trattamento di "palestre"/"gruppi". Necessario perche' /accedi legge
-- questo valore PRIMA dell'autenticazione, quando non esiste alcuna
-- sessione con cui RLS potrebbe funzionare comunque.
CREATE TABLE "configurazione_applicazione" (
    "id" TEXT NOT NULL,
    "nomeSettore" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurazione_applicazione_pkey" PRIMARY KEY ("id")
);
