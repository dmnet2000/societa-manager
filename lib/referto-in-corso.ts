import "server-only";
import { prisma } from "@/lib/prisma";
import type { RichiestaRisultatoSet, RispostaRisultatoSet } from "@/lib/api-tablet/contratto";

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
