-- Story 9.31: destinatario unico configurabile per l'email di notifica
-- upload Certificato Medico (Story 4.3), sostituisce la derivazione da
-- Ruolo Segreteria. Colonna nullable su tabella gia' strutturale/no-RLS
-- (stesso trattamento di "nomeSettore", nessun GRANT da toccare).
ALTER TABLE "configurazione_applicazione" ADD COLUMN "emailSegreteria" TEXT;
