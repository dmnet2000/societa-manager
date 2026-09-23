-- Story 10.11: distingue una Partita mai toccata a mano da una corretta
-- manualmente (Story 10.4, aggiornaPartita) - la sincronizzazione FIPAV
-- (sincronizzaGareFipav) smette di riscrivere data/ora/impianto/
-- indirizzoImpianto per una Partita con questo campo a true. DEFAULT false
-- (non NULL): ogni Partita esistente resta pienamente sincronizzabile al
-- deploy, nessun backfill separato necessario.
ALTER TABLE "partite" ADD COLUMN "modificataManualmente" BOOLEAN NOT NULL DEFAULT false;
