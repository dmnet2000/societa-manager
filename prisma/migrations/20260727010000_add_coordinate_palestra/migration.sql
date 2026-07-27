-- Story 9.6 (estensione post-done): Palestra.latitudine/longitudine, per
-- salvare la posizione precisa incollata dall'Admin/Dirigente da un link
-- Google Maps. Nullable: "palestre" ha gia' righe reali in produzione (da
-- Epic 2), a differenza di "allenatori" (Story 9.5, vuota al momento).
-- Palestra non e' protetta da RLS (AD-9) - nessuna policy da aggiornare.
ALTER TABLE "palestre" ADD COLUMN "latitudine" DOUBLE PRECISION;
ALTER TABLE "palestre" ADD COLUMN "longitudine" DOUBLE PRECISION;
