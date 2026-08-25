-- Story 19.15 (Epic 19, Ruolo Site Manager): ordine di visualizzazione dei
-- Gruppi sulla pagina pubblica /squadre - mirror esatto di
-- VoceMenuPubblico.ordine (Story 19.6/19.7). Gruppo resta non protetto da RLS
-- (AD-9, tabella strutturale gia' esistente) - nessuna modifica RLS qui, solo
-- l'aggiunta della colonna.

-- Passo 1: colonna nullable per permettere il backfill sotto (non puo' essere
-- NOT NULL fin da subito, le righe esistenti non hanno ancora un valore).
ALTER TABLE "gruppi" ADD COLUMN "ordine" INTEGER;

-- Passo 2: backfill alfabetico per nome, SCOPED per annoAgonisticoId (prima
-- istanza nel progetto di un backfill con window function) - Gruppi di
-- stagioni diverse ricevono ciascuno il proprio ordine 0,1,2... indipendente,
-- mai un contatore globale attraverso tutte le stagioni esistite.
-- Review fix (Blind Hunter + Edge Case Hunter + Verification Gap Reviewer,
-- convergenti su tutti e 3): "nome" non e' univoco per stagione (nessun
-- vincolo DB) - senza un tie-breaker, due Gruppi omonimi nella stessa
-- stagione riceverebbero un ordine relativo arbitrario/non riproducibile.
-- "id" aggiunto come secondo criterio, deterministico per costruzione (UUID
-- univoco), stesso principio "mai un ordinamento ambiguo" gia' richiesto
-- altrove nel progetto.
UPDATE "gruppi" AS g
SET "ordine" = backfill."ordine"
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "annoAgonisticoId" ORDER BY "nome" ASC, "id" ASC) - 1 AS "ordine"
    FROM "gruppi"
) AS backfill
WHERE g."id" = backfill."id";

-- Passo 3: dopo il backfill, la colonna diventa obbligatoria - stesso
-- pattern di VoceMenuPubblico.ordine (NOT NULL, nessun default).
ALTER TABLE "gruppi" ALTER COLUMN "ordine" SET NOT NULL;
