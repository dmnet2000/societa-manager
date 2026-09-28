-- Story 10.12 (review fix, 2026-09-28): rilevato un bug di produzione dopo
-- il primo tentativo reale del cron (app/api/cron/sincronizza-fipav) - il
-- ciclo elaborava tutti i Campionati con linkFipav nella stessa richiesta
-- (sequenziale prima, poi in parallelo), rischiando sia un timeout lato
-- workflow GitHub Actions sia di bombardare il portale FIPAV con piu'
-- richieste ravvicinate. Corretto elaborando un solo Campionato per
-- invocazione (scelto in rotazione, il meno recentemente sincronizzato),
-- invocato ogni 10 minuti invece che ogni ora.
--
-- Il tracciamento dell'ultima esecuzione riuscita si sposta quindi da un
-- unico timestamp globale su "configurazione_applicazione" (aggiunto nella
-- migrazione precedente 20260927000000, rimosso qui - nessun dato utile
-- puo' esserci maturato, la funzionalita' e' stata appena introdotta) a un
-- timestamp per-Campionato su "campionati". frequenzaSincronizzazioneFipavOre
-- resta invariato su "configurazione_applicazione" (continua a governare
-- ogni quante ore un singolo Campionato viene ri-sincronizzato).
ALTER TABLE "configurazione_applicazione" DROP COLUMN "ultimaSincronizzazioneFipavAutomaticaIl";

ALTER TABLE "campionati" ADD COLUMN "ultimaSincronizzazioneFipavIl" TIMESTAMP(3);
