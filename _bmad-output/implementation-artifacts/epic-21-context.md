# Epic 21 Context: Ottimizzazione database

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Migliorare le performance delle query sul database via indici mirati, senza mai alterare il comportamento applicativo. Elenco aperto (come Epic 9/11/17/18): copertura incrementale, una segnalazione o un sospetto concreto alla volta — non un audit esaustivo in un solo colpo. Nessuna segnalazione strutturata esiste nei documenti di pianificazione (PRD/architettura) per questa epica: è nata da una richiesta diretta dell'utente il 2026-09-01 e si alimenta principalmente dall'Advisor "Query Performance"/"Index Recommendations" di Supabase, basato su statistiche reali di produzione (`pg_stat_statements`).

## Stories

- Story 21.1: Indice su Atleta.nome

## Requirements & Constraints

- Ogni story parte da una segnalazione concreta (Advisor Supabase, o un sospetto motivato nel codice) — mai un audit generico "a tappeto".
- Prima di aggiungere un indice va identificata e citata (file/riga) la query reale che lo giustifica.
- Un indice non cambia mai il risultato di una query, solo il suo costo di esecuzione — nessuna modifica di comportamento applicativo attesa da queste story, quindi nessun nuovo test funzionale oltre alla validazione dello schema.
- Ad oggi (inizio epica) `prisma/schema.prisma` non ha alcun `@@index` esplicito: ogni indice attuale del database viene solo da `@id`/`@unique`/`@@unique`. Questa è la prima epica dedicata a indici puramente di performance.

## Technical Decisions

- Prisma è il modello dati canonico: ogni cambio di schema (inclusi gli indici) passa da una migrazione Prisma versionata (`prisma/migrations/`) — mai un'operazione manuale sulla dashboard Supabase.
- Split di accesso ai dati (rilevante perché diverse tabelle candidate a indicizzazione, come Atleta, sono protette da RLS): le tabelle protette da RLS (CertificatoMedico, Atleta, Presenza, Iscrizione, Notifica, ConfigurazioneSmtp) sono lette/scritte a runtime via client Supabase autenticato, non via Prisma diretto — ma Prisma resta comunque il proprietario di schema e migrazioni per tutte le tabelle, RLS incluse. Aggiungere un indice su una tabella RLS non tocca le policy né il percorso di lettura runtime.
- `btree` è il metodo di default di Postgres per `CREATE INDEX`: le migrazioni non necessitano di specificare esplicitamente il metodo a meno che l'Advisor non richieda un tipo diverso (es. GIN/GiST).
