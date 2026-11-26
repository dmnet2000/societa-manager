import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type {
  BackupSalvato,
  RichiestaBackup,
  RichiestaRisultatoSet,
  RispostaBackup,
  RispostaRisultatoSet,
} from "@/lib/api-tablet/contratto";

// Referto elettronico, story 4.1 (AD-7, AD-8, AD-11): "referto in corso" sul
// server. Per ora solo i risultati dei set chiusi; mai scritture su
// PartitaTorneo.

type RigaRisultato = {
  numeroSet: number;
  casa: number;
  ospite: number;
  seqFinale: number;
};

// Upsert monotono: la riga si aggiorna solo se il nuovo seqFinale e' maggiore
// di quello salvato (una ripetizione o un invio vecchio non cambiano nulla),
// in una sola istruzione atomica. Se la WHERE esclude l'aggiornamento
// RETURNING non restituisce righe e si legge quella salvata. Restituisce
// sempre la riga salvata sul server.
export async function salvaRisultatoSet(
  garaId: string,
  epoca: number,
  numeroSet: number,
  richiesta: RichiestaRisultatoSet
): Promise<RispostaRisultatoSet> {
  const { registroId, casa, ospite, seqFinale } = richiesta;
  const scritte = await prisma.$queryRaw<RigaRisultato[]>`
    INSERT INTO "risultati_set_referto"
      ("id", "partitaTorneoId", "numeroSet", "casa", "ospite", "seqFinale", "registroId", "epoca", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid()::text, ${garaId}, ${numeroSet}, ${casa}, ${ospite}, ${seqFinale}, ${registroId}, ${epoca}, now(), now())
    ON CONFLICT ("partitaTorneoId", "numeroSet") DO UPDATE SET
      "casa" = EXCLUDED."casa",
      "ospite" = EXCLUDED."ospite",
      "seqFinale" = EXCLUDED."seqFinale",
      "registroId" = EXCLUDED."registroId",
      "epoca" = EXCLUDED."epoca",
      "updatedAt" = now()
    WHERE EXCLUDED."seqFinale" > "risultati_set_referto"."seqFinale"
    RETURNING "numeroSet", "casa", "ospite", "seqFinale"`;
  let riga = scritte[0];
  if (riga === undefined) {
    const esistenti = await prisma.$queryRaw<RigaRisultato[]>`
      SELECT "numeroSet", "casa", "ospite", "seqFinale"
      FROM "risultati_set_referto"
      WHERE "partitaTorneoId" = ${garaId} AND "numeroSet" = ${numeroSet}`;
    riga = esistenti[0];
  }
  if (riga === undefined) throw new Error("risultato set non trovato dopo l'upsert");
  return {
    numeroSet: Number(riga.numeroSet),
    casa: Number(riga.casa),
    ospite: Number(riga.ospite),
    seqFinale: Number(riga.seqFinale),
  };
}

type RigaBackup = {
  registroId: string;
  epoca: number;
  ultimoSeq: number;
  hash: string;
  blob: string;
};

/** Esito di `salvaBackup`: salvato (o gia' presente piu' recente), conflitto di registro o hash errato. */
export type EsitoSalvaBackup =
  | { readonly esito: "ok"; readonly salvato: RispostaBackup }
  | { readonly esito: "conflitto" }
  | { readonly esito: "hash-errato" };

function sha256Hex(testo: string): string {
  return createHash("sha256").update(testo, "utf8").digest("hex");
}

// Backup opaco del registro (story 4.4, AD-7, AD-11, AD-15). Prima dell'SQL si
// verifica lo SHA-256 del blob (mai interpretato). L'upsert e' atomico: la riga
// si scrive se non esiste, se ha un'epoca minore (il primo backup dell'epoca
// corrente diventa il registro attivo) oppure se e' la stessa epoca, lo stesso
// registroId e ultimoSeq maggiore. Se non si scrive, si legge la riga salvata:
// stessa epoca e registroId diverso -> conflitto, altrimenti ok con il salvato.
// Il blob contiene nomi: mai nei log.
export async function salvaBackup(
  garaId: string,
  epoca: number,
  richiesta: RichiestaBackup
): Promise<EsitoSalvaBackup> {
  const { registroId, ultimoSeq, hash, blob } = richiesta;
  if (sha256Hex(blob) !== hash) return { esito: "hash-errato" };

  const scritte = await prisma.$queryRaw<{ registroId: string; ultimoSeq: number }[]>`
    INSERT INTO "backup_referto"
      ("id", "partitaTorneoId", "registroId", "epoca", "ultimoSeq", "hash", "blob", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid()::text, ${garaId}, ${registroId}, ${epoca}, ${ultimoSeq}, ${hash}, ${blob}, now(), now())
    ON CONFLICT ("partitaTorneoId") DO UPDATE SET
      "registroId" = EXCLUDED."registroId",
      "epoca" = EXCLUDED."epoca",
      "ultimoSeq" = EXCLUDED."ultimoSeq",
      "hash" = EXCLUDED."hash",
      "blob" = EXCLUDED."blob",
      "updatedAt" = now()
    WHERE "backup_referto"."epoca" < EXCLUDED."epoca"
      OR ("backup_referto"."epoca" = EXCLUDED."epoca"
        AND "backup_referto"."registroId" = EXCLUDED."registroId"
        AND "backup_referto"."ultimoSeq" < EXCLUDED."ultimoSeq")
    RETURNING "registroId", "ultimoSeq"`;
  const scritta = scritte[0];
  if (scritta !== undefined) {
    return {
      esito: "ok",
      salvato: { registroId: scritta.registroId, ultimoSeq: Number(scritta.ultimoSeq) },
    };
  }

  const esistenti = await prisma.$queryRaw<{ registroId: string; epoca: number; ultimoSeq: number }[]>`
    SELECT "registroId", "epoca", "ultimoSeq"
    FROM "backup_referto"
    WHERE "partitaTorneoId" = ${garaId}`;
  const esistente = esistenti[0];
  if (esistente === undefined) throw new Error("backup non trovato dopo l'upsert");
  if (Number(esistente.epoca) === epoca && esistente.registroId !== registroId) {
    return { esito: "conflitto" };
  }
  return {
    esito: "ok",
    salvato: { registroId: esistente.registroId, ultimoSeq: Number(esistente.ultimoSeq) },
  };
}

/** Backup salvato della gara, o `null` se non c'e' (story 4.4; lo usa la ripresa, 4.10). */
export async function leggiBackup(garaId: string): Promise<BackupSalvato | null> {
  const righe = await prisma.$queryRaw<RigaBackup[]>`
    SELECT "registroId", "epoca", "ultimoSeq", "hash", "blob"
    FROM "backup_referto"
    WHERE "partitaTorneoId" = ${garaId}`;
  const riga = righe[0];
  if (riga === undefined) return null;
  return {
    registroId: riga.registroId,
    epoca: Number(riga.epoca),
    ultimoSeq: Number(riga.ultimoSeq),
    hash: riga.hash,
    blob: riga.blob,
  };
}
