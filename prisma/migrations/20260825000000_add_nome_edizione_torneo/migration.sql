-- Story 20.7: Nome dell'Edizione del Torneo - obbligatorio fin da subito
-- (deciso con l'utente via AskUserQuestion), nessun vincolo di unicita'
-- (solo "anno" resta @unique). Backfill "Torneo Memorial" (nome dell'epica
-- stessa) per le Edizioni gia' esistenti tramite un DEFAULT temporaneo,
-- rimosso subito dopo: le nuove Edizioni devono specificare il Nome
-- esplicitamente in creazione (creaEdizioneTorneoAction), mai un default
-- silenzioso.
ALTER TABLE "edizioni_torneo" ADD COLUMN "nome" TEXT NOT NULL DEFAULT 'Torneo Memorial';

ALTER TABLE "edizioni_torneo" ALTER COLUMN "nome" DROP DEFAULT;
