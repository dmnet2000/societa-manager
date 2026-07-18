-- Story 3.1: Presenza, protetta da RLS (AD-4/AD-9, esplicitamente nel
-- bind-list). AD-8: nessuna colonna annoAgonisticoId propria (eredita la
-- stagione transitivamente tramite Slot -> Gruppo, come Slot stesso).
CREATE TABLE "presenze" (
    "id" TEXT NOT NULL,
    "atletaId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presenze_pkey" PRIMARY KEY ("id")
);

-- Rende idempotente la registrazione (AC #3): un upsert su questa chiave
-- aggiorna la riga esistente invece di duplicarla.
CREATE UNIQUE INDEX "presenze_atletaId_slotId_data_key" ON "presenze"("atletaId", "slotId", "data");

ALTER TABLE "presenze" ADD CONSTRAINT "presenze_atletaId_fkey" FOREIGN KEY ("atletaId") REFERENCES "atlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "presenze" ADD CONSTRAINT "presenze_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "presenze" ENABLE ROW LEVEL SECURITY;

-- Prima policy RLS di questa codebase con scoping relazionale (non solo per
-- Ruolo, AD-4): un Allenatore puo' scrivere/leggere solo per i Gruppi di cui
-- e' allenatore (AC #4), attraverso Presenza -> Slot -> Gruppo ->
-- GruppoAllenatore -> Allenatore -> Utente -> auth.uid().
--
-- Le tabelle attraversate ("slot", "gruppo_allenatori", "allenatori",
-- "utenti") non hanno alcun GRANT verso il ruolo "authenticated" (AD-9: si
-- leggono solo via Prisma diretto con connessione privilegiata) - una
-- subquery inline nella policy fallirebbe per mancanza di permessi, e
-- concedere un GRANT diretto esporrebbe email ("utenti") e Codice Fiscale
-- ("allenatori") a qualsiasi utente autenticato tramite l'API REST, non solo
-- all'Allenatore proprietario. Una funzione SECURITY DEFINER (pattern
-- standard Supabase per questo esatto caso) esegue la verifica con i
-- privilegi del proprietario della funzione, senza richiedere che il ruolo
-- "authenticated" abbia accesso diretto alle tabelle attraversate - la
-- funzione restituisce solo un booleano, non le righe sottostanti.
-- SET search_path = public: protegge da hijacking dello schema, obbligatorio
-- per funzioni SECURITY DEFINER (altrimenti un search_path malevolo
-- impostato dal chiamante potrebbe far risolvere i nomi di tabella non
-- qualificati su uno schema diverso).
CREATE OR REPLACE FUNCTION allenatore_possiede_slot(slot_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "slot" s
    JOIN "gruppo_allenatori" ga ON ga."gruppoId" = s."gruppoId"
    JOIN "allenatori" a ON a."id" = ga."allenatoreId"
    JOIN "utenti" u ON u."id" = a."utenteId"
    WHERE s."id" = slot_id_param
      AND u."supabaseAuthId" = auth.uid()::text
  );
$$;

REVOKE EXECUTE ON FUNCTION allenatore_possiede_slot(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION allenatore_possiede_slot(TEXT) TO authenticated;

CREATE POLICY "admin_dirigente_segreteria_select" ON "presenze"
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

CREATE POLICY "admin_dirigente_segreteria_insert" ON "presenze"
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

CREATE POLICY "admin_dirigente_segreteria_update" ON "presenze"
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA'])
  WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE', 'SEGRETERIA']);

-- Due policy separate (permissive, combinate in OR da Postgres) invece di
-- un'unica espressione booleana gigante con quella sopra - piu' leggibile,
-- stesso principio di composizione gia' usato per i Ruoli multipli.
CREATE POLICY "allenatore_proprio_gruppo_select" ON "presenze"
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot("slotId")
  );

CREATE POLICY "allenatore_proprio_gruppo_insert" ON "presenze"
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot("slotId")
  );

CREATE POLICY "allenatore_proprio_gruppo_update" ON "presenze"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot("slotId")
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ALLENATORE'
    AND allenatore_possiede_slot("slotId")
  );

-- Nessuna policy/GRANT DELETE: nessun AC di questa storia richiede la
-- rimozione di una Presenza (stessa scelta gia' fatta per iscrizioni/
-- certificati_medici).
GRANT SELECT, INSERT, UPDATE ON "presenze" TO authenticated;
