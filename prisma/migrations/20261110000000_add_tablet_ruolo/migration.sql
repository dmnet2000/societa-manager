-- Ruolo Tablet (referto elettronico dei tornei, AD-12): utente dedicato a un
-- tablet, creato dall'Admin col solo nome, che entra solo dall'app e mai nel
-- sito. Nessuna policy RLS nuova: le tabelle negate oggi restano negate.
-- Unico statement in questo file, stesso vincolo di
-- 20261022000000_add_direttore_tecnico_ruolo: "ALTER TYPE ... ADD VALUE" non
-- puo' condividere la transazione con uno statement che usa subito il nuovo
-- valore.
ALTER TYPE "Ruolo" ADD VALUE 'TABLET';
