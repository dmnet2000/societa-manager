-- Code review Story 1.6: nessun AC/codice di questa storia esegue mai un
-- UPDATE su "iscrizioni" - la policy e il GRANT concessi "per sicurezza"
-- erano una superficie di scrittura non necessaria (principio del minimo
-- privilegio, stessa lezione gia' applicata restringendo il DELETE su
-- "atlete" in Story 1.3).
DROP POLICY "admin_dirigente_segreteria_update" ON "iscrizioni";

REVOKE UPDATE ON "iscrizioni" FROM authenticated;
