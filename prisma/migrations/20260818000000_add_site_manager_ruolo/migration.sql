-- Story 19.1: settimo Ruolo del sistema (SITE_MANAGER) - delega la gestione
-- del sito pubblico senza concedere accesso Admin completo. Unico statement
-- in questo file: Postgres non permette che "ALTER TYPE ... ADD VALUE"
-- condivida la transazione con uno statement che usa subito il nuovo valore
-- (fallirebbe con "unsafe use of new value of enum type" se unito a un'altra
-- migrazione nella stessa transazione).
ALTER TYPE "Ruolo" ADD VALUE 'SITE_MANAGER';
