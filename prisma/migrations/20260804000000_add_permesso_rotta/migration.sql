-- Story 12.1 (Epic 12, Permessi Configurabili da Admin): PermessoRotta,
-- mappa rotta x Ruolo -> abilitato. Non protetta da RLS (AD-9, stesso
-- trattamento di "gruppi_visibili_dirigente"/"gruppo_allenatori") - nessun
-- GRANT verso "authenticated", gestita via Prisma diretto con connessione
-- privilegiata.
CREATE TABLE "permessi_rotte" (
    "id" TEXT NOT NULL,
    "rotta" TEXT NOT NULL,
    "ruolo" "Ruolo" NOT NULL,
    "abilitato" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permessi_rotte_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permessi_rotte_rotta_ruolo_key" ON "permessi_rotte"("rotta", "ruolo");

-- Seed obbligatorio e bloccante (decisione presa con l'utente in fase di
-- apertura dell'Epic 12): replica ESATTAMENTE i permessi effettivi correnti
-- di lib/auth/route-guard.ts (PROTECTED_ROUTES) per ogni Ruolo diverso da
-- ADMIN. Nessuna riga per ADMIN (sempre escluso, accesso pieno hardcoded -
-- AC #2). Nessuna riga per le rotte ADMIN-only ("/admin",
-- "/precaricamento-allenatori", "/impostazioni", "/smtp", "/logo",
-- "/permessi-certificati") ne' per le combinazioni rotta+Ruolo oggi non
-- ammesse - assenza di riga = non abilitato (fail-closed), una volta che
-- Story 12.3 collega questa configurazione al controllo di accesso reale.
-- Questa migrazione NON modifica ne' route-guard.ts ne' il comportamento di
-- autorizzazione effettivo: la tabella non e' ancora letta da nessun
-- controllo (vedi Dev Notes della story per il dettaglio).
INSERT INTO "permessi_rotte" ("id", "rotta", "ruolo", "abilitato", "createdAt")
SELECT gen_random_uuid()::text, seed.rotta, seed.ruolo::"Ruolo", true, CURRENT_TIMESTAMP
FROM (VALUES
  ('/import-atlete', 'DIRIGENTE'),
  ('/conferma-iscrizioni', 'DIRIGENTE'),
  ('/conferma-iscrizioni', 'SEGRETERIA'),
  ('/palestre', 'DIRIGENTE'),
  ('/gruppi', 'DIRIGENTE'),
  ('/i-miei-gruppi', 'ALLENATORE'),
  ('/slot', 'DIRIGENTE'),
  ('/mio-orario', 'ALLENATORE'),
  ('/mio-orario', 'ATLETA'),
  ('/orari', 'SEGRETERIA'),
  ('/presenze', 'ALLENATORE'),
  ('/storico-presenze', 'ALLENATORE'),
  ('/storico-presenze', 'ATLETA'),
  ('/certificato-medico', 'GENITORE'),
  ('/certificato-medico', 'ATLETA'),
  ('/notifiche', 'ALLENATORE'),
  ('/notifiche', 'DIRIGENTE'),
  ('/conferma-certificati', 'DIRIGENTE'),
  ('/conferma-certificati', 'SEGRETERIA'),
  ('/vista-dirigente', 'DIRIGENTE'),
  ('/vista-allenatore', 'ALLENATORE'),
  ('/dati-fisici', 'ALLENATORE'),
  ('/dati-fisici', 'ATLETA'),
  ('/wizard-nuova-stagione', 'DIRIGENTE'),
  ('/il-mio-profilo', 'ALLENATORE'),
  ('/il-mio-profilo', 'ATLETA'),
  ('/campionati', 'DIRIGENTE'),
  ('/campionati', 'ALLENATORE'),
  ('/partite', 'DIRIGENTE'),
  ('/partite', 'ALLENATORE'),
  ('/partite', 'ATLETA'),
  ('/partite', 'GENITORE')
) AS seed(rotta, ruolo);
