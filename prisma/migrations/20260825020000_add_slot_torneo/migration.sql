-- Story 20.9 (Epic 20, Torneo Memorial): SlotTorneo, "prenotazione per
-- fase" - entita' strutturale (AD-9), stesso trattamento RLS di ogni altra
-- tabella Torneo: RLS abilitata senza alcuna policy (deny-all di default) +
-- REVOKE esplicito da "anon"/"authenticated" nella stessa migrazione di
-- creazione - accesso solo via Prisma diretto (connessione privilegiata).
-- FK verso edizioni_torneo/palestre senza ON DELETE esplicito nello schema
-- Prisma (default Postgres/Prisma: NO ACTION/Restrict) - stesso identico
-- trattamento delle FK Torneo precedenti. Stesso CHECK discriminato
-- "fase = GIRONE <=> tabellone IS NULL" gia' stabilito per partite_torneo in
-- 20260824000000_add_fase_tabellone_partita_torneo, mirror-ato qui.
CREATE TABLE "slot_torneo" (
    "id" TEXT NOT NULL,
    "edizioneTorneoId" TEXT NOT NULL,
    "etichetta" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "ora" TEXT NOT NULL,
    "palestraId" TEXT NOT NULL,
    "fase" "FaseTorneo" NOT NULL,
    "tabellone" "TabelloneTorneo",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_torneo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "slot_torneo" ADD CONSTRAINT "slot_torneo_edizioneTorneoId_fkey" FOREIGN KEY ("edizioneTorneoId") REFERENCES "edizioni_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "slot_torneo" ADD CONSTRAINT "slot_torneo_palestraId_fkey" FOREIGN KEY ("palestraId") REFERENCES "palestre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stesso CHECK discriminato di partite_torneo (Story 20.4) - difesa in
-- profondita' a costo quasi nullo, mai fidarsi solo della disciplina
-- applicativa (validaCampiSlot, app/app/(torneo)/torneo/actions.ts).
ALTER TABLE "slot_torneo" ADD CONSTRAINT "slot_torneo_fase_tabellone_check" CHECK (
  ("fase" = 'GIRONE' AND "tabellone" IS NULL) OR
  ("fase" != 'GIRONE' AND "tabellone" IS NOT NULL)
);

-- Stesso pattern gia' corretto per 17 tabelle strutturali il 2026-08-04
-- (20260804030000_fix_rls_disabled_public_tables) e riapplicato ad ogni
-- tabella strutturale nuova da allora: ENABLE ROW LEVEL SECURITY senza
-- alcuna policy = deny-all di default via PostgREST per
-- "anon"/"authenticated"; REVOKE esplicito come garanzia aggiuntiva. Prisma
-- continua a leggere/scrivere invariato (connessione diretta, bypassa
-- sempre RLS/PostgREST).
ALTER TABLE "slot_torneo" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "slot_torneo" FROM anon, authenticated;

-- PartitaTorneo.slotTorneoId: assegnazione opzionale (nullable) - nessun
-- vincolo di unicita' (spec-20-9 Boundaries "Never": due Partite possono
-- puntare allo stesso Slot, la protezione contro la sovrascrittura e' solo
-- un avviso applicativo, mai un blocco DB). FK senza ON DELETE esplicito
-- (default Restrict) - stesso trattamento di ogni altra FK strutturale
-- Torneo, coerente col commento su slot_torneo sopra.
ALTER TABLE "partite_torneo" ADD COLUMN "slotTorneoId" TEXT;

ALTER TABLE "partite_torneo" ADD CONSTRAINT "partite_torneo_slotTorneoId_fkey" FOREIGN KEY ("slotTorneoId") REFERENCES "slot_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
