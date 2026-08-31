-- Story 20.18 (Epic 20, Torneo Memorial): SlotTorneo guadagna una FK
-- opzionale verso Campo (Epic 2, riuso diretto) accanto a quella gia'
-- esistente verso Palestra - una Palestra a doppio campo puo' cosi' ospitare
-- due SlotTorneo paralleli sullo stesso orario, uno per Campo (spec-20-18
-- Intent). Nullable: null per una Palestra senza Campi censiti
-- (comportamento pre-esistente, invariato) o per il percorso di creazione
-- singola (semifinali/finali, Story 20.9), mai toccato da questa storia.
-- Mirror esatto del trattamento di "palestraId" nella migrazione di
-- creazione (20260825020000_add_slot_torneo): ON DELETE RESTRICT ON UPDATE
-- CASCADE, nessun CHECK nuovo, nessuna modifica RLS (gia' abilitata sulla
-- tabella, invariata da questa storia).
ALTER TABLE "slot_torneo" ADD COLUMN "campoId" TEXT;

ALTER TABLE "slot_torneo" ADD CONSTRAINT "slot_torneo_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "campi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
