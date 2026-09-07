-- Story 20.21 (Epic 20, Torneo Memorial): SlotTorneo guadagna una
-- prenotazione anticipata opzionale per una riga precisa del prospetto
-- ipotetico (Story 20.20) - Categoria + fase/tabellone (gia' colonne
-- esistenti su questa tabella) + ordinale (nuovo, distingue Semifinale 1 da
-- Semifinale 2 dello stesso tabellone). Mirror esatto del trattamento di
-- "campoId" nella migrazione 20260830000000_add_campo_slot_torneo: FK
-- nullable ON DELETE RESTRICT ON UPDATE CASCADE, nessun CHECK nuovo,
-- nessuna modifica RLS (gia' abilitata sulla tabella, invariata da questa
-- storia). "prenotazioneOrdinale" e' un Int semplice, nessuna FK - la sua
-- validita' (1|2 solo per fase SEMIFINALE, sempre null altrove) e' garantita
-- in Server Action (prenotaSlotIpoteticoAction), mai un CHECK DB, stesso
-- principio di "numeroMassimoSquadre" (spec-20-21 Boundaries "Always").
-- Nessun vincolo di unicita' su (prenotazioneCategoriaTorneoId, fase,
-- tabellone, prenotazioneOrdinale): la protezione contro doppie
-- prenotazioni sulla stessa riga resta applicativa (spec-20-21 Boundaries
-- "Never"), stesso principio gia' stabilito per l'assegnazione
-- Slot->Partita in 20260825020000_add_slot_torneo.
ALTER TABLE "slot_torneo" ADD COLUMN "prenotazioneCategoriaTorneoId" TEXT;
ALTER TABLE "slot_torneo" ADD COLUMN "prenotazioneOrdinale" INTEGER;

ALTER TABLE "slot_torneo" ADD CONSTRAINT "slot_torneo_prenotazioneCategoriaTorneoId_fkey" FOREIGN KEY ("prenotazioneCategoriaTorneoId") REFERENCES "categorie_torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
