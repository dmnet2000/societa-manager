-- Story 4.4 (FR-14): stato del Certificato Medico - assente fino ad ora.
-- Default CONFERMATO: le righe esistenti provengono tutte dall'import
-- federale (Story 1.3/1.7, dati gia' fidati) - il percorso di solo upload
-- (Story 4.1, collegaFileCertificato) sovrascrive esplicitamente con
-- IN_ATTESA ad ogni caricamento, non si appoggia a questo default. Nessun
-- nuovo GRANT: GRANT SELECT, INSERT, UPDATE ON "certificati_medici" TO
-- authenticated (Story 1.7) e' a livello di tabella, copre gia' la nuova
-- colonna.
CREATE TYPE "StatoCertificato" AS ENUM ('IN_ATTESA', 'CONFERMATO');
ALTER TABLE "certificati_medici" ADD COLUMN "stato" "StatoCertificato" NOT NULL DEFAULT 'CONFERMATO';
