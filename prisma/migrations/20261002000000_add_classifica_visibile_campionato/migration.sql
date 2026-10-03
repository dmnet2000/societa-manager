-- Story 19.17 (Epic 19, Ruolo Site Manager): interruttore di visibilita'
-- della classifica di un Campionato sulla pagina pubblica /classifiche,
-- controllabile da /app/ordine-squadre - mirror di
-- 20260911000000_add_visibile_pubblico_gruppo. DEFAULT true: nessuna
-- classifica esistente sparisce al deploy (spec-19-17 Boundaries "Always"),
-- si applica sia alle righe esistenti sia a ogni nuovo Campionato.
-- RLS: "campionati" ha gia' ENABLE ROW LEVEL SECURITY + REVOKE ALL FROM
-- anon, authenticated (20260804030000_fix_rls_disabled_public_tables) - la
-- nuova colonna ne eredita la protezione, nessuna modifica RLS qui.
ALTER TABLE "campionati" ADD COLUMN "classificaVisibile" BOOLEAN NOT NULL DEFAULT true;
