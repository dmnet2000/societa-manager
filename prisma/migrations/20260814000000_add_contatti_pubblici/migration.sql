-- Story 18.11: contatti pubblici della societa' (indirizzo, telefono, email
-- pubblica) per la pagina "/contatti". Colonne nullable su tabella gia'
-- strutturale/no-RLS - mirror esatto di "urlPaginaFacebook"
-- (20260813010000_add_url_pagina_facebook), nessun GRANT da toccare. Le 3
-- colonne raggruppate in un'unica migrazione perche' introdotte insieme da
-- questa unica storia.
ALTER TABLE "configurazione_applicazione"
  ADD COLUMN "indirizzoSede" TEXT,
  ADD COLUMN "telefonoPubblico" TEXT,
  ADD COLUMN "emailPubblica" TEXT;
