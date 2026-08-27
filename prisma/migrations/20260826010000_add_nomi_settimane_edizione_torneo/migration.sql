-- Story 20.13: nome personalizzato delle Settimane del Torneo -
-- "Settimana 1"/"Settimana 2" e' oggi un'etichetta fissa hardcoded
-- (ETICHETTA_SETTIMANA, lib/settimana-torneo.ts). Entrambi i campi restano
-- facoltativi (nessun DEFAULT/backfill necessario) - nessuna Edizione e' mai
-- bloccata dal non averli impostati (spec-20-13 Boundaries "Always"), stringa
-- vuota nel form diventa null (aggiornaNomiSettimaneAction), mai una stringa
-- vuota persistita.
ALTER TABLE "edizioni_torneo" ADD COLUMN "nomeSettimana1" TEXT;
ALTER TABLE "edizioni_torneo" ADD COLUMN "nomeSettimana2" TEXT;
