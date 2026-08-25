-- Story 20.4 (Epic 20, Torneo Memorial): fase/tabellone su partite_torneo -
-- nessuna migrazione dati per le righe esistenti (DEFAULT 'GIRONE' le copre
-- tutte automaticamente, "tabellone" resta NULL per loro, coerente con una
-- partita di girone). Stesso trattamento strutturale (AD-9) delle colonne
-- precedenti di questa tabella - RLS gia' abilitata/revocata in
-- 20260823020000_add_partita_torneo, nessuna policy da toccare qui.
CREATE TYPE "FaseTorneo" AS ENUM ('GIRONE', 'SEMIFINALE', 'FINALE_VINCENTI', 'FINALE_PERDENTI');

CREATE TYPE "TabelloneTorneo" AS ENUM ('POSIZIONI_1_4', 'POSIZIONI_5_8');

ALTER TABLE "partite_torneo" ADD COLUMN "fase" "FaseTorneo" NOT NULL DEFAULT 'GIRONE';
ALTER TABLE "partite_torneo" ADD COLUMN "tabellone" "TabelloneTorneo";

-- Review fix (Blind Hunter, Story 20.4): "fase"/"tabellone" non erano
-- imposti come un'unione discriminata a livello DB (un chiamante poteva in
-- teoria passare fase=GIRONE con tabellone valorizzato, o una fase diversa
-- da GIRONE con tabellone nullo) - solo la disciplina lato applicazione lo
-- garantiva. Un CHECK e' una difesa in profondita' a costo quasi nullo,
-- stesso principio gia' seguito per il vincolo "squadraCasaId <>
-- squadraOspiteId" in 20260823020000_add_partita_torneo.
ALTER TABLE "partite_torneo" ADD CONSTRAINT "partite_torneo_fase_tabellone_check" CHECK (
  ("fase" = 'GIRONE' AND "tabellone" IS NULL) OR
  ("fase" != 'GIRONE' AND "tabellone" IS NOT NULL)
);
