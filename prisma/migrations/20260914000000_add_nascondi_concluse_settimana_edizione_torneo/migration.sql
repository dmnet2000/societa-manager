-- Story 20.29: nascondere su /torneo (vista pubblica) le Categorie GIA'
-- CONCLUSE (tabelloneGenerato && classificaFinale !== null, criterio
-- invariato di app/torneo/page.tsx) per Settimana - mirror esatto di
-- 20260826010000_add_nomi_settimane_edizione_torneo (stessi due campi
-- "per Settimana" su EdizioneTorneo), ma con DEFAULT false (non NULL):
-- nessuna Categoria esistente deve sparire dalla vista pubblica al deploy
-- di questa migrazione, nessun backfill separato necessario (spec-20-29
-- Boundaries "Always"/"Never").
ALTER TABLE "edizioni_torneo" ADD COLUMN "nascondiConcluseSettimana1" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "edizioni_torneo" ADD COLUMN "nascondiConcluseSettimana2" BOOLEAN NOT NULL DEFAULT false;
