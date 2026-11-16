-- Referto elettronico, story 3.2 (AD-6, AD-11, AD-17): rosa di una
-- SquadraTorneo (giocatori e tesserati), separata da Atleta. Contiene nomi di
-- minori: dati minimi, lettura filtrata da RLS, scrittura solo tramite la
-- funzione salva_rosa_squadra (versione + idempotenza in una transazione).

CREATE TYPE "RuoloTesserato" AS ENUM ('A', 'VA', 'M', 'FT', 'D');

CREATE TABLE "rose_squadra" (
    "id" TEXT NOT NULL,
    "squadraTorneoId" TEXT NOT NULL,
    "versione" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rose_squadra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "giocatori_rosa" (
    "id" TEXT NOT NULL,
    "rosaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "capitano" BOOLEAN NOT NULL DEFAULT false,
    "libero" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "giocatori_rosa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tesserati_rosa" (
    "id" TEXT NOT NULL,
    "rosaId" TEXT NOT NULL,
    "ruolo" "RuoloTesserato" NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "tesserati_rosa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "modifiche_rosa" (
    "idModifica" TEXT NOT NULL,
    "rosaId" TEXT NOT NULL,
    "versione" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modifiche_rosa_pkey" PRIMARY KEY ("idModifica")
);

CREATE UNIQUE INDEX "rose_squadra_squadraTorneoId_key" ON "rose_squadra"("squadraTorneoId");
CREATE UNIQUE INDEX "giocatori_rosa_rosaId_numero_key" ON "giocatori_rosa"("rosaId", "numero");
CREATE INDEX "tesserati_rosa_rosaId_idx" ON "tesserati_rosa"("rosaId");
CREATE INDEX "modifiche_rosa_rosaId_idx" ON "modifiche_rosa"("rosaId");

ALTER TABLE "rose_squadra" ADD CONSTRAINT "rose_squadra_squadraTorneoId_fkey" FOREIGN KEY ("squadraTorneoId") REFERENCES "squadre_torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "giocatori_rosa" ADD CONSTRAINT "giocatori_rosa_rosaId_fkey" FOREIGN KEY ("rosaId") REFERENCES "rose_squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tesserati_rosa" ADD CONSTRAINT "tesserati_rosa_rosaId_fkey" FOREIGN KEY ("rosaId") REFERENCES "rose_squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "modifiche_rosa" ADD CONSTRAINT "modifiche_rosa_rosaId_fkey" FOREIGN KEY ("rosaId") REFERENCES "rose_squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rose_squadra" ADD CONSTRAINT "rose_squadra_versione_check" CHECK ("versione" >= 0);
ALTER TABLE "giocatori_rosa" ADD CONSTRAINT "giocatori_rosa_numero_check" CHECK ("numero" BETWEEN 1 AND 99);
ALTER TABLE "giocatori_rosa" ADD CONSTRAINT "giocatori_rosa_nome_check" CHECK (char_length("nome") BETWEEN 1 AND 60 AND char_length("cognome") BETWEEN 1 AND 60);
ALTER TABLE "tesserati_rosa" ADD CONSTRAINT "tesserati_rosa_nome_check" CHECK (char_length("nome") BETWEEN 1 AND 60);
-- Al massimo un capitano per rosa.
CREATE UNIQUE INDEX "giocatori_rosa_un_capitano_key" ON "giocatori_rosa"("rosaId") WHERE "capitano";

-- Helper RLS (AD-17): il tablet dell'utente autenticato (attivo) e'
-- assegnato a una gara in cui la squadra e' casa o ospite. SECURITY DEFINER
-- perche' "authenticated" non ha accesso a utenti/assegnazioni_tablet/
-- partite_torneo (restano negate al tablet); restituisce solo un booleano.
CREATE OR REPLACE FUNCTION tablet_assegnato_squadra(squadra_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "partite_torneo" p
    JOIN "assegnazioni_tablet" a ON a."partitaTorneoId" = p."id"
    JOIN "utenti" u ON u."id" = a."utenteId"
    WHERE (p."squadraCasaId" = squadra_id_param OR p."squadraOspiteId" = squadra_id_param)
      AND u."supabaseAuthId" = auth.uid()::text
      AND u."attivo"
  );
$$;

REVOKE EXECUTE ON FUNCTION tablet_assegnato_squadra(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION tablet_assegnato_squadra(TEXT) TO authenticated;

-- RLS: sola lettura. Nessuna policy INSERT/UPDATE/DELETE: si scrive solo con
-- salva_rosa_squadra. modifiche_rosa: nessuna policy (deny-all) + REVOKE.
ALTER TABLE "rose_squadra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "giocatori_rosa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tesserati_rosa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modifiche_rosa" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_dirigente_select" ON "rose_squadra"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']);

CREATE POLICY "tablet_proprie_gare_select" ON "rose_squadra"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'TABLET'
    AND tablet_assegnato_squadra("squadraTorneoId")
  );

CREATE POLICY "admin_dirigente_select" ON "giocatori_rosa"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']);

CREATE POLICY "tablet_proprie_gare_select" ON "giocatori_rosa"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'TABLET'
    AND EXISTS (
      SELECT 1 FROM "rose_squadra" r
      WHERE r."id" = "rosaId" AND tablet_assegnato_squadra(r."squadraTorneoId")
    )
  );

CREATE POLICY "admin_dirigente_select" ON "tesserati_rosa"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']);

CREATE POLICY "tablet_proprie_gare_select" ON "tesserati_rosa"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'TABLET'
    AND EXISTS (
      SELECT 1 FROM "rose_squadra" r
      WHERE r."id" = "rosaId" AND tablet_assegnato_squadra(r."squadraTorneoId")
    )
  );

REVOKE ALL ON "rose_squadra", "giocatori_rosa", "tesserati_rosa", "modifiche_rosa" FROM anon, authenticated;
GRANT SELECT ON "rose_squadra", "giocatori_rosa", "tesserati_rosa" TO authenticated;

-- Scrittura atomica della rosa (AD-6, AD-11). Esiti: JSON {esito:'ok'|
-- 'conflitto', versione}; errori: eccezione con messaggio che inizia per
-- 'FORBIDDEN' o 'VALIDATION'. Mai nomi nei messaggi di errore.
CREATE OR REPLACE FUNCTION salva_rosa_squadra(
  squadra_id_param TEXT,
  versione_base INT,
  id_modifica TEXT,
  giocatori JSONB,
  tesserati JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ruoli JSONB := auth.jwt() -> 'app_metadata' -> 'ruoli';
  autorizzato BOOLEAN := FALSE;
  rosa_id TEXT;
  versione_corrente INT;
  modifica RECORD;
  el JSONB;
  numeri INT[] := ARRAY[]::INT[];
  n_capitani INT := 0;
  numero_val NUMERIC;
  nome_val TEXT;
  cognome_val TEXT;
  ruolo_val TEXT;
BEGIN
  -- Autorizzazione come la lettura RLS (AD-17).
  IF auth.uid() IS NULL OR ruoli IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF ruoli ?| array['ADMIN', 'DIRIGENTE'] THEN
    autorizzato := TRUE;
  ELSIF ruoli ? 'TABLET' AND tablet_assegnato_squadra(squadra_id_param) THEN
    autorizzato := TRUE;
  END IF;
  IF NOT autorizzato THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Validazione strutturale.
  IF squadra_id_param IS NULL OR NOT EXISTS (SELECT 1 FROM "squadre_torneo" WHERE "id" = squadra_id_param) THEN
    RAISE EXCEPTION 'VALIDATION: squadra non trovata';
  END IF;
  IF versione_base IS NULL OR versione_base < 0 THEN
    RAISE EXCEPTION 'VALIDATION: versione_base non valida';
  END IF;
  IF id_modifica IS NULL OR id_modifica !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'VALIDATION: idModifica non e'' un UUID';
  END IF;
  IF giocatori IS NULL OR jsonb_typeof(giocatori) <> 'array'
     OR tesserati IS NULL OR jsonb_typeof(tesserati) <> 'array' THEN
    RAISE EXCEPTION 'VALIDATION: giocatori e tesserati devono essere array';
  END IF;
  IF jsonb_array_length(giocatori) > 99 OR jsonb_array_length(tesserati) > 50 THEN
    RAISE EXCEPTION 'VALIDATION: troppi elementi';
  END IF;

  FOR el IN SELECT value FROM jsonb_array_elements(giocatori) LOOP
    IF jsonb_typeof(el) <> 'object' OR jsonb_typeof(el -> 'numero') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'VALIDATION: giocatore non valido';
    END IF;
    numero_val := (el ->> 'numero')::NUMERIC;
    IF numero_val <> trunc(numero_val) OR numero_val < 1 OR numero_val > 99 THEN
      RAISE EXCEPTION 'VALIDATION: numero di maglia fuori da 1-99';
    END IF;
    IF numero_val::INT = ANY (numeri) THEN
      RAISE EXCEPTION 'VALIDATION: numero di maglia doppio';
    END IF;
    numeri := numeri || numero_val::INT;
    IF jsonb_typeof(el -> 'nome') IS DISTINCT FROM 'string'
       OR jsonb_typeof(el -> 'cognome') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'VALIDATION: nome e cognome obbligatori';
    END IF;
    nome_val := btrim(el ->> 'nome');
    cognome_val := btrim(el ->> 'cognome');
    IF char_length(nome_val) NOT BETWEEN 1 AND 60 OR char_length(cognome_val) NOT BETWEEN 1 AND 60 THEN
      RAISE EXCEPTION 'VALIDATION: nome o cognome vuoto o oltre 60 caratteri';
    END IF;
    IF (el ? 'capitano' AND jsonb_typeof(el -> 'capitano') NOT IN ('boolean', 'null'))
       OR (el ? 'libero' AND jsonb_typeof(el -> 'libero') NOT IN ('boolean', 'null')) THEN
      RAISE EXCEPTION 'VALIDATION: capitano e libero devono essere booleani';
    END IF;
    IF COALESCE((el ->> 'capitano')::BOOLEAN, FALSE) THEN
      n_capitani := n_capitani + 1;
    END IF;
  END LOOP;
  IF n_capitani > 1 THEN
    RAISE EXCEPTION 'VALIDATION: piu'' di un capitano';
  END IF;

  FOR el IN SELECT value FROM jsonb_array_elements(tesserati) LOOP
    IF jsonb_typeof(el) <> 'object'
       OR jsonb_typeof(el -> 'ruolo') IS DISTINCT FROM 'string'
       OR jsonb_typeof(el -> 'nome') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'VALIDATION: tesserato non valido';
    END IF;
    ruolo_val := el ->> 'ruolo';
    IF ruolo_val NOT IN ('A', 'VA', 'M', 'FT', 'D') THEN
      RAISE EXCEPTION 'VALIDATION: ruolo non valido';
    END IF;
    nome_val := btrim(el ->> 'nome');
    IF char_length(nome_val) NOT BETWEEN 1 AND 60 THEN
      RAISE EXCEPTION 'VALIDATION: nome vuoto o oltre 60 caratteri';
    END IF;
  END LOOP;

  -- Rosa esistente: bloccata. Se manca, si crea (versione 0) solo quando il
  -- salvataggio verra' davvero applicato: un conflitto non scrive nulla.
  SELECT r."id", r."versione" INTO rosa_id, versione_corrente
  FROM "rose_squadra" r
  WHERE r."squadraTorneoId" = squadra_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Senza rosa, un idModifica gia' registrato appartiene a un'altra rosa.
    IF EXISTS (SELECT 1 FROM "modifiche_rosa" WHERE "idModifica" = id_modifica) THEN
      RAISE EXCEPTION 'VALIDATION: idModifica gia'' usato per un''altra rosa';
    END IF;
    IF versione_base <> 0 THEN
      RETURN jsonb_build_object('esito', 'conflitto', 'versione', 0);
    END IF;

    INSERT INTO "rose_squadra" ("id", "squadraTorneoId", "versione", "updatedAt")
    VALUES (gen_random_uuid()::TEXT, squadra_id_param, 0, CURRENT_TIMESTAMP)
    ON CONFLICT ("squadraTorneoId") DO NOTHING;

    SELECT r."id", r."versione" INTO rosa_id, versione_corrente
    FROM "rose_squadra" r
    WHERE r."squadraTorneoId" = squadra_id_param
    FOR UPDATE;
  END IF;

  -- Idempotenza: idModifica gia' applicato.
  SELECT m."rosaId", m."versione" INTO modifica
  FROM "modifiche_rosa" m
  WHERE m."idModifica" = id_modifica;
  IF FOUND THEN
    IF modifica."rosaId" <> rosa_id THEN
      RAISE EXCEPTION 'VALIDATION: idModifica gia'' usato per un''altra rosa';
    END IF;
    RETURN jsonb_build_object('esito', 'ok', 'versione', modifica."versione");
  END IF;

  IF versione_base <> versione_corrente THEN
    RETURN jsonb_build_object('esito', 'conflitto', 'versione', versione_corrente);
  END IF;

  DELETE FROM "giocatori_rosa" WHERE "rosaId" = rosa_id;
  DELETE FROM "tesserati_rosa" WHERE "rosaId" = rosa_id;

  INSERT INTO "giocatori_rosa" ("id", "rosaId", "numero", "nome", "cognome", "capitano", "libero")
  SELECT gen_random_uuid()::TEXT, rosa_id, (g ->> 'numero')::NUMERIC::INT, btrim(g ->> 'nome'), btrim(g ->> 'cognome'),
         COALESCE((g ->> 'capitano')::BOOLEAN, FALSE), COALESCE((g ->> 'libero')::BOOLEAN, FALSE)
  FROM jsonb_array_elements(giocatori) AS g;

  INSERT INTO "tesserati_rosa" ("id", "rosaId", "ruolo", "nome")
  SELECT gen_random_uuid()::TEXT, rosa_id, (t ->> 'ruolo')::"RuoloTesserato", btrim(t ->> 'nome')
  FROM jsonb_array_elements(tesserati) AS t;

  versione_corrente := versione_corrente + 1;
  UPDATE "rose_squadra" SET "versione" = versione_corrente, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = rosa_id;
  INSERT INTO "modifiche_rosa" ("idModifica", "rosaId", "versione") VALUES (id_modifica, rosa_id, versione_corrente);

  RETURN jsonb_build_object('esito', 'ok', 'versione', versione_corrente);
END;
$$;

REVOKE EXECUTE ON FUNCTION salva_rosa_squadra(TEXT, INT, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION salva_rosa_squadra(TEXT, INT, TEXT, JSONB, JSONB) TO authenticated;
