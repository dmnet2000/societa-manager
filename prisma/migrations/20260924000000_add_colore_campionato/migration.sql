-- Richiesta utente (2026-09-24): colore opzionale per Campionato, per
-- distinguerli visivamente sul sito pubblico (/calendario, teaser home).
-- Nullable, nessun DEFAULT: un Campionato esistente resta senza colore
-- (styling invariato) finche' qualcuno non lo imposta esplicitamente.
ALTER TABLE "campionati" ADD COLUMN "colore" TEXT;
