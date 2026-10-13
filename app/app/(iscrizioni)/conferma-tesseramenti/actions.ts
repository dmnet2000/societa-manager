"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { salvaModificheTesseramento } from "@/lib/tesseramento";

export type SalvaTesseramentiState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 26.2 (Epic 26, Tesseramento multi-Federazione): sostituisce
// confermaTesseramenti (conferma massiva Story 13.1 estensione 2026-08-06).
// La tabella invia, per ogni riga MODIFICATA (hidden "atletaModificata"),
// l'insieme completo delle Federazioni spuntate ("federazione:<atletaId>");
// le righe non toccate non vengono scritte, cosi' un salvataggio non
// sovrascrive le modifiche fatte nel frattempo da un altro utente su altre
// Atlete. Regole e scrittura tutto-o-niente in lib/tesseramento.ts.
export async function salvaTesseramenti(
  _prevState: SalvaTesseramentiState,
  formData: FormData
): Promise<SalvaTesseramentiState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const atletaIds = [...new Set(formData.getAll("atletaModificata").map(String))].filter(
    (id) => id !== ""
  );
  if (atletaIds.length === 0) {
    return { error: { code: "VALIDATION", message: "Nessuna modifica da salvare." } };
  }
  const modifiche = atletaIds.map((atletaId) => ({
    atletaId,
    federazioni: formData.getAll(`federazione:${atletaId}`).map(String),
  }));
  const consentiSvuotamento = formData.get("confermaRimozioneTotale") === "1";

  try {
    const anno = await risolviAnnoAgonisticoCorrente();
    const esito = await salvaModificheTesseramento(anno.id, modifiche, {
      consentiSvuotamento,
    });
    if (!esito.ok) {
      return {
        error: {
          code: "VALIDATION",
          message:
            esito.motivo === "conferma_richiesta"
              ? "Alcune Atlete resterebbero senza alcuna federazione: ricarica la pagina, ricontrolla e salva di nuovo confermando la rimozione."
              : "Una o più federazioni selezionate non esistono più o sono state disattivate. Ricarica la pagina e riprova.",
        },
      };
    }
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare i tesseramenti. Riprova.",
      },
    };
  }

  revalidatePath("/app/conferma-tesseramenti");
  revalidatePath("/app/gruppi");
  revalidatePath("/app/i-miei-gruppi");
  return { success: true };
}
