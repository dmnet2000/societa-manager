-- Story 18.1 (Epic 18): la dashboard interna si e' spostata sotto il
-- prefisso /app - le righe gia' scritte in "permessi_rotte" (Story 12.1/
-- 12.4, Epic 12) usano il vecchio prefisso senza /app e smetterebbero di
-- essere trovate da rottaAbilitataPerRuolo (fail-closed per design),
-- disabilitando silenziosamente i permessi gia' configurati da un Admin in
-- produzione. Aggiorna ogni riga esistente aggiungendo il prefisso /app,
-- non solo la singola rotta oggi realmente migrata
-- (/precaricamento-allenatori) - una futura riga con un prefisso gia'
-- iniziante per "/app/" (nessuna oggi) resterebbe invariata grazie al WHERE.
UPDATE "permessi_rotte"
SET "rotta" = '/app' || "rotta"
WHERE "rotta" NOT LIKE '/app/%';
