-- Ruolo Direttore Tecnico: ottavo Ruolo del sistema, sola lettura della
-- composizione dei Gruppi (/app/composizione-gruppi). Unico statement in
-- questo file, stesso vincolo di 20260818000000_add_site_manager_ruolo:
-- "ALTER TYPE ... ADD VALUE" non puo' condividere la transazione con uno
-- statement che usa subito il nuovo valore.
ALTER TYPE "Ruolo" ADD VALUE 'DIRETTORE_TECNICO';
