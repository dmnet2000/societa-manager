-- Story 26.2 (Epic 26, Tesseramento multi-Federazione): ogni Tesseramento
-- registra le Federazioni con cui l'Atleta e' tesserata nella stagione
-- (array di id di "federazioni", nessuna FK - integrita' verificata in
-- lib/tesseramento.ts).
ALTER TABLE "tesseramenti" ADD COLUMN "federazioneIds" TEXT[] NOT NULL DEFAULT '{}';

-- FIPAV deve esistere per migrarvi i Tesseramenti gia' confermati
-- (decisione utente 2026-10-12). Creata dalla 20261012000000_add_federazioni
-- con id fisso. Review fix: ricreata SOLO se servono (esistono Tesseramenti)
-- e se non esiste ne' l'id fisso ne' una federazione chiamata "fipav" in
-- qualunque combinazione di maiuscole - cosi' non si crea mai un doppione
-- e l'INSERT non puo' urtare alcun vincolo unico (id, nome).
INSERT INTO "federazioni" ("id", "nome", "sigla", "ordine", "attiva", "createdAt", "updatedAt")
SELECT 'federazione-fipav', 'FIPAV', 'FIPAV',
       COALESCE((SELECT MAX("ordine") + 1 FROM "federazioni"), 0),
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "tesseramenti")
  AND NOT EXISTS (SELECT 1 FROM "federazioni" WHERE "id" = 'federazione-fipav')
  AND NOT EXISTS (SELECT 1 FROM "federazioni" WHERE lower("nome") = 'fipav');

-- Tutti i Tesseramenti esistenti -> FIPAV: per id fisso se presente
-- (anche se rinominata), altrimenti la riga che si chiama "fipav".
UPDATE "tesseramenti"
SET "federazioneIds" = ARRAY[
  COALESCE(
    (SELECT "id" FROM "federazioni" WHERE "id" = 'federazione-fipav'),
    (SELECT "id" FROM "federazioni" WHERE lower("nome") = 'fipav' ORDER BY "createdAt" LIMIT 1)
  )
];

-- Allineata allo schema Prisma (nessun @default): ogni scrittura passa
-- l'array esplicitamente.
ALTER TABLE "tesseramenti" ALTER COLUMN "federazioneIds" DROP DEFAULT;

-- Review fix: l'invariante di lib/tesseramento.ts ("una riga esiste solo
-- con array non vuoto, senza elementi NULL") garantita anche dal DB. Se
-- l'UPDATE sopra avesse prodotto {NULL} o {} la migrazione fallisce qui
-- invece di lasciare dati incoerenti. (Vincolo CHECK non modellato da
-- Prisma, che non lo considera nel confronto dello schema.)
ALTER TABLE "tesseramenti"
  ADD CONSTRAINT "tesseramenti_federazioneIds_non_vuoto"
  CHECK (cardinality("federazioneIds") > 0 AND array_position("federazioneIds", NULL) IS NULL);
