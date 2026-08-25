-- Story 20.11 (Epic 20, Torneo Memorial): numero progressivo di gara, un'unica
-- sequenza per l'intera Edizione (mai per singola Categoria, mai riparte tra
-- girone e fasi successive - spec-20-11 Boundaries "Always"). edizioneTorneoId
-- e' denormalizzato qui (il valore "vero" resta comunque derivabile da
-- categorie_torneo.edizioneTorneoId, e DEVE sempre coincidere) - necessario
-- perche' un vincolo @@unique in Postgres non puo' attraversare una
-- relazione, serve una colonna reale sulla stessa tabella (spec-20-11 Design
-- Notes), stesso scoping "per Edizione" gia' scelto per SlotTorneo (Story
-- 20.9, edizioneTorneoId).

-- Passo 1: entrambe le colonne nullable per permettere il backfill sotto
-- (non possono essere NOT NULL fin da subito, eventuali righe pre-esistenti
-- non hanno ancora un valore) - stesso pattern "sicuro anche se la tabella
-- non e' vuota" gia' applicato in 20260824020000_add_ordine_gruppo
-- (ROW_NUMBER) e 20260825000000_add_nome_edizione_torneo (colonna nullable +
-- backfill + SET NOT NULL). L'Epic 20 non e' mai stata deployata in
-- produzione a oggi, ma la migrazione resta scritta come se partite_torneo
-- potesse gia' avere righe.
ALTER TABLE "partite_torneo" ADD COLUMN "edizioneTorneoId" TEXT;
ALTER TABLE "partite_torneo" ADD COLUMN "numero" INTEGER;

-- Passo 2: backfill di edizioneTorneoId per eventuali righe pre-esistenti,
-- derivato dalla Categoria collegata (il valore "vero", vedi commento sopra)
-- - categorie_torneo.edizioneTorneoId e' a sua volta NOT NULL con FK valida,
-- nessuna riga puo' restare nulla dopo questo UPDATE.
UPDATE "partite_torneo" AS pt
SET "edizioneTorneoId" = ct."edizioneTorneoId"
FROM "categorie_torneo" AS ct
WHERE pt."categoriaTorneoId" = ct.id;

-- Passo 3: backfill di "numero", una sequenza indipendente per
-- edizioneTorneoId (PARTITION BY, stesso principio "per Edizione, non
-- globale" del campo stesso), ordinata per "createdAt" - l'unico criterio
-- cronologico disponibile per righe gia' esistenti, che riflette l'ordine
-- reale di generazione. "id" come secondo criterio (tie-breaker
-- deterministico, mirror del secondo criterio gia' usato in
-- 20260824020000_add_ordine_gruppo) per il caso limite di due righe con lo
-- stesso "createdAt" esatto (es. createMany in blocco, stesso timestamp).
UPDATE "partite_torneo" AS pt
SET "numero" = backfill."numero"
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "edizioneTorneoId" ORDER BY "createdAt" ASC, "id" ASC) AS "numero"
    FROM "partite_torneo"
) AS backfill
WHERE pt."id" = backfill."id";

-- Passo 4: dopo il backfill, entrambe le colonne diventano obbligatorie -
-- ogni nuova PartitaTorneo le valorizza sempre da qui in poi
-- (creaPartiteTorneo, lib/torneo.ts, mai piu' opzionali per il chiamante).
ALTER TABLE "partite_torneo" ALTER COLUMN "edizioneTorneoId" SET NOT NULL;
ALTER TABLE "partite_torneo" ALTER COLUMN "numero" SET NOT NULL;

-- FK verso edizioni_torneo, mirror esatto di
-- slot_torneo_edizioneTorneoId_fkey (20260825020000_add_slot_torneo) - senza
-- ON DELETE esplicito (default Prisma/Postgres: NO ACTION/Restrict), stesso
-- identico trattamento di ogni altra FK strutturale Torneo.
ALTER TABLE "partite_torneo" ADD CONSTRAINT "partite_torneo_edizioneTorneoId_fkey" FOREIGN KEY ("edizioneTorneoId") REFERENCES "edizioni_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Il vero cancello (spec-20-11 Boundaries "Always") contro una collisione di
-- numero tra due generazioni concorrenti nella stessa Edizione (check-then-act
-- non atomico in prossimoNumeroPartitaTorneo, lib/torneo.ts) - mai fidarsi
-- solo della disciplina applicativa, stesso principio del vincolo unico
-- preesistente sotto. CREATE UNIQUE INDEX, non ADD CONSTRAINT ... UNIQUE -
-- mirror esatto della sintassi gia' generata da Prisma per l'indice unico
-- esistente su (categoriaTorneoId, squadraCasaId, squadraOspiteId), vedi
-- 20260823020000_add_partita_torneo riga 38.
CREATE UNIQUE INDEX "partite_torneo_edizioneTorneoId_numero_key" ON "partite_torneo"("edizioneTorneoId", "numero");
