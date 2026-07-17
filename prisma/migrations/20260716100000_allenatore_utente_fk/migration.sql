-- Code review Story 1.4: Allenatore.utenteId era solo una colonna univoca
-- senza vincolo di integrita' referenziale verso "utenti".
ALTER TABLE "allenatori" ADD CONSTRAINT "allenatori_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;
