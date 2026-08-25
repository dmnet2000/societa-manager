-- Story 20.3 (Epic 20, Torneo Memorial): PartitaTorneo, entita' strutturale
-- (AD-9) - nessuna policy RLS, nessun GRANT verso "anon"/"authenticated":
-- accesso solo via Prisma diretto con connessione privilegiata, stesso
-- trattamento di edizioni_torneo/categorie_torneo/squadre_torneo. FK verso
-- categorie_torneo/squadre_torneo senza ON DELETE esplicito nello schema
-- Prisma (default Postgres/Prisma: NO ACTION/Restrict) - stesso identico
-- trattamento delle FK Torneo precedenti, scritto esplicitamente qui come
-- nelle migrazioni precedenti.
CREATE TABLE "partite_torneo" (
    "id" TEXT NOT NULL,
    "categoriaTorneoId" TEXT NOT NULL,
    "squadraCasaId" TEXT NOT NULL,
    "squadraOspiteId" TEXT NOT NULL,
    "set1Casa" INTEGER,
    "set1Ospite" INTEGER,
    "set2Casa" INTEGER,
    "set2Ospite" INTEGER,
    "set3Casa" INTEGER,
    "set3Ospite" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partite_torneo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "partite_torneo" ADD CONSTRAINT "partite_torneo_categoriaTorneoId_fkey" FOREIGN KEY ("categoriaTorneoId") REFERENCES "categorie_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partite_torneo" ADD CONSTRAINT "partite_torneo_squadraCasaId_fkey" FOREIGN KEY ("squadraCasaId") REFERENCES "squadre_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partite_torneo" ADD CONSTRAINT "partite_torneo_squadraOspiteId_fkey" FOREIGN KEY ("squadraOspiteId") REFERENCES "squadre_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Review fix (Edge Case Hunter, Story 20.3): rete di sicurezza a livello DB
-- contro un doppio invio concorrente di "Genera calendario" (la guardia
-- applicativa in generaCalendarioGironiAction e' un check-then-act non
-- atomico) - senza questo vincolo unico, due chiamate concorrenti potrebbero
-- entrambe superare il controllo e creare la stessa coppia due volte,
-- raddoppiando silenziosamente i punti di una Squadra in classifica.
CREATE UNIQUE INDEX "partite_torneo_categoriaTorneoId_squadraCasaId_squadraOspit_key" ON "partite_torneo"("categoriaTorneoId", "squadraCasaId", "squadraOspiteId");

-- Review fix (Edge Case Hunter, Story 20.3): nessuna Squadra puo' giocare
-- contro se stessa - generaCoppieGirone non lo produce mai per costruzione,
-- ma un CHECK e' una difesa in profondita' a costo quasi nullo contro un
-- inserimento manomesso/diretto sul database.
ALTER TABLE "partite_torneo" ADD CONSTRAINT "partite_torneo_squadre_diverse_check" CHECK ("squadraCasaId" <> "squadraOspiteId");

-- Stesso pattern gia' corretto per 17 tabelle strutturali il 2026-08-04
-- (20260804030000_fix_rls_disabled_public_tables) e riapplicato ad ogni
-- tabella strutturale nuova da allora: ENABLE ROW LEVEL SECURITY senza
-- alcuna policy = deny-all di default via PostgREST per
-- "anon"/"authenticated"; REVOKE esplicito come garanzia aggiuntiva.
-- Prisma continua a leggere/scrivere invariato (connessione diretta,
-- bypassa sempre RLS/PostgREST).
ALTER TABLE "partite_torneo" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "partite_torneo" FROM anon, authenticated;
