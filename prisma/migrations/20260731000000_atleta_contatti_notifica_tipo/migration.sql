-- Story 9.18: contatti opzionali per Atleta (email/cellulare per
-- comunicazioni, quando un Allenatore crea una nuova Atleta dalla pagina
-- del proprio Gruppo) - nullable, nessuna riga esistente da toccare, nessun
-- nuovo GRANT necessario (Atleta gia' RLS-protetta con GRANT esistente,
-- Story 1.3 - una nuova colonna nullable non richiede nulla in piu').
ALTER TABLE "atlete" ADD COLUMN "email" TEXT;
ALTER TABLE "atlete" ADD COLUMN "cellulare" TEXT;

-- Story 9.18: Notifica guadagna un discriminatore "tipo" - la pagina
-- /notifiche mostrava finora sempre "Nuovo certificato caricato per...",
-- un secondo evento (creazione nuova Atleta da parte di un Allenatore, Task
-- 4) richiede un testo diverso. DEFAULT retrocompatibile: le righe
-- esistenti (Story 4.2) restano implicitamente CERTIFICATO_CARICATO senza
-- alcun backfill esplicito necessario.
CREATE TYPE "TipoNotifica" AS ENUM ('CERTIFICATO_CARICATO', 'NUOVO_ATLETA');
ALTER TABLE "notifiche" ADD COLUMN "tipo" "TipoNotifica" NOT NULL DEFAULT 'CERTIFICATO_CARICATO';
