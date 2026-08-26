-- Story 9.39: normalizza in maiuscolo le Atlete gia' esistenti in
-- anagrafica, create prima della Story 9.36 (che sanifica solo le nuove
-- creazioni). Migrazione solo-dati, nessun cambio di schema. Operazione
-- idempotente: una riga gia' interamente maiuscola resta invariata.
UPDATE "atlete" SET "nome" = UPPER("nome") WHERE "nome" <> UPPER("nome");
