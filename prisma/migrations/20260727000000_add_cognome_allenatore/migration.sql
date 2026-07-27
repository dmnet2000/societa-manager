-- Story 9.5: Allenatore.cognome, richiesto esplicitamente dall'utente per
-- completare l'anagrafica fin dal precaricamento (fino ad oggi solo "nome").
-- NOT NULL diretto senza DEFAULT: confermato con l'utente che la tabella
-- "allenatori" e' ancora vuota in produzione (nessun precaricamento
-- effettuato finora), quindi nessuna riga esistente puo' violare il vincolo.
-- Allenatore non e' protetta da RLS (AD-9) - nessuna policy da aggiornare.
ALTER TABLE "allenatori" ADD COLUMN "cognome" TEXT NOT NULL;
