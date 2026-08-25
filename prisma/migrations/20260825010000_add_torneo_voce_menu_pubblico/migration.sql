-- Story 20.6 (follow-up, 2026-08-25, richiesta esplicita dell'utente):
-- /torneo (sezione pubblica del Torneo Memorial, Story 20.6) era raggiungibile
-- solo digitando l'URL - nessuna voce nel menu pubblico dinamico
-- (voci_menu_pubblico, Story 19.6). Aggiunta qui una voce "Torneo" tra
-- "Calendario" e "Staff" (stesso principio di posizionamento tematico del
-- seed originario, 20260819000000_add_voce_menu_pubblico) - le voci
-- successive vengono spostate avanti di una posizione per fare spazio,
-- mai un ordine duplicato. Un Admin/Site Manager può comunque riordinare
-- liberamente da /app/menu-pubblico dopo il deploy, questo è solo l'ordine
-- iniziale.
UPDATE "voci_menu_pubblico" SET "ordine" = "ordine" + 1 WHERE "ordine" >= 3;

INSERT INTO "voci_menu_pubblico" ("id", "etichetta", "url", "ordine", "visibile", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Torneo', '/torneo', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
