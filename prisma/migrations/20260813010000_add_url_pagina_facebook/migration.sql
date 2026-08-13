-- Story 18.5: URL della Pagina Facebook pubblica della societa', usato per
-- il Page Plugin ufficiale (embed "ultimi post" in home pubblica, nessun
-- token/API). Colonna nullable su tabella gia' strutturale/no-RLS - mirror
-- esatto di "emailSegreteria" (20260806000000_add_email_segreteria), nessun
-- GRANT da toccare.
ALTER TABLE "configurazione_applicazione" ADD COLUMN "urlPaginaFacebook" TEXT;
