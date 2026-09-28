-- Story 18.34 (Epic 18): la sezione classifica si sposta dalla home su una
-- nuova pagina pubblica dedicata, /classifiche - mirror concettuale di
-- 20260825010000_add_torneo_voce_menu_pubblico (che ha aggiunto la voce
-- "Torneo" allo stesso modo), ma con l'ordine risolto via lookup SQL
-- sull'ordine ATTUALE della voce "Calendario" invece di un valore fisso -
-- piu' robusto: funziona correttamente anche se un Admin/Site Manager ha
-- gia' riordinato le voci da /app/menu-pubblico prima di questo deploy.
--
-- Le voci con ordine successivo a "Calendario" vengono spostate avanti di
-- una posizione per fare spazio - UPDATE eseguito PRIMA dell'INSERT cosi'
-- che la nuova voce "Classifiche" occupi esattamente il posto lasciato
-- libero subito dopo "Calendario", mai un ordine duplicato. L'UPDATE non
-- tocca la riga di "Calendario" stessa (filtro "ordine >", non ">="),
-- quindi il suo ordine resta invariato tra le due istruzioni sotto - la
-- sottoquery nell'INSERT puo' quindi rileggerlo in sicurezza.
--
-- Review fix (Blind Hunter + Edge Case Hunter): la sottoquery su
-- url = '/calendario' puo' restituire NULL se quella riga e' stata
-- rinominata/cancellata da un Admin/Site Manager prima di questo deploy
-- (aggiornaVoceMenuPubblico in lib/menu-pubblico.ts non protegge quello
-- specifico url), o essere ambigua se esistono righe url duplicati
-- (nessun vincolo di unicita' su "url" in schema.prisma) - senza guardia,
-- il primo caso farebbe fallire l'INSERT (NULL in una colonna NOT NULL) e
-- il secondo produrrebbe un ordine non deterministico. COALESCE con
-- ORDER BY "ordine" ASC LIMIT 1 risolve entrambi: se "/calendario" manca,
-- la voce "Classifiche" degrada a fine elenco (dopo l'ordine massimo
-- esistente, o 0 su una tabella vuota) invece di far fallire il deploy;
-- se esistono duplicati, si sceglie deterministicamente quello con
-- l'ordine piu' basso.
UPDATE "voci_menu_pubblico"
SET "ordine" = "ordine" + 1
WHERE "ordine" > COALESCE(
  (SELECT "ordine" FROM "voci_menu_pubblico" WHERE "url" = '/calendario' ORDER BY "ordine" ASC LIMIT 1),
  (SELECT MAX("ordine") FROM "voci_menu_pubblico"),
  0
);

INSERT INTO "voci_menu_pubblico" ("id", "etichetta", "url", "ordine", "visibile", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Classifiche',
  '/classifiche',
  COALESCE(
    (SELECT "ordine" FROM "voci_menu_pubblico" WHERE "url" = '/calendario' ORDER BY "ordine" ASC LIMIT 1),
    (SELECT MAX("ordine") FROM "voci_menu_pubblico"),
    0
  ) + 1,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
