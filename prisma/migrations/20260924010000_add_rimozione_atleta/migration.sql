-- Story 9.43: archiviazione reversibile di un'Atleta "non più in società"/
-- "trasferita" - additiva, nessun backfill. Tutte le Atlete esistenti
-- restano implicitamente attive (rimossaIl NULL). Nessuna modifica alla RLS
-- (nessuna nuova tabella, la policy "admin_dirigente_segreteria_update" già
-- esistente su "atlete" - migrazione 20260716080000 - non restringe per
-- colonna, verificato: copre già queste tre colonne senza modifiche).
CREATE TYPE "MotivoRimozioneAtleta" AS ENUM ('NON_PIU_IN_SOCIETA', 'TRASFERITA');

ALTER TABLE "atlete" ADD COLUMN "rimossaIl" TIMESTAMP(3);
ALTER TABLE "atlete" ADD COLUMN "motivoRimozione" "MotivoRimozioneAtleta";
ALTER TABLE "atlete" ADD COLUMN "notaRimozione" TEXT;

-- Story 9.43 (review fix): rimossaIl diventa il filtro di default di
-- elencaAtlete/elencaAtletePubbliche/elencaAtletePerIds, applicato a quasi
-- ogni lettura della tabella - indice aggiunto nella stessa migrazione,
-- stesso principio dell'indice su "nome" (20260901000000).
CREATE INDEX "atlete_rimossaIl_idx" ON "atlete"("rimossaIl");
