-- Story 18.29: URL della Pagina Instagram pubblica della societa' - solo un
-- link semplice (icona cliccabile in footer/contatti), MAI un feed embed
-- (Instagram non ha un equivalente ufficiale gratuito del Facebook Page
-- Plugin senza Token API, decisione gia' presa con l'utente in Story 18.5).
-- Colonna nullable su tabella gia' strutturale/no-RLS - mirror esatto di
-- "urlPaginaFacebook" (20260813010000_add_url_pagina_facebook), nessun GRANT
-- da toccare.
ALTER TABLE "configurazione_applicazione" ADD COLUMN "urlPaginaInstagram" TEXT;
