"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import {
  calcolaIntervalloStagioneCorrente,
  risolviAnnoAgonisticoCorrente,
  trovaAnnoAgonisticoPrecedente,
} from "@/lib/anno-agonistico";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }. Nessun caso "success": il successo si
// conclude con un redirect (vedi sotto, review fix), mai restituito come
// stato.
export type WizardActionState =
  | { error: { code: string; message: string } }
  | undefined;

// AC #1/#2: FR-28 ammette Admin o Dirigente, analogo a creaGruppo/
// assegnaAllenatore (Story 2.2/2.3, app/(gruppi-allenatori)/gruppi/actions.ts).
export async function confermaWizardNuovaStagione(
  _prevState: WizardActionState,
  _formData: FormData
): Promise<WizardActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  let annoCorrente;
  let gruppiPrecedenti;
  try {
    // Find-or-create SOLO qui (percorso di scrittura) - mai in page.tsx
    // (Dev Notes Story 1.6/2.2, stesso principio di creaGruppo).
    annoCorrente = await risolviAnnoAgonisticoCorrente();

    // AC #3 (difensivo): ri-verifica contro una race/doppio-click tra il
    // caricamento della pagina e questa conferma - non ci si fida del solo
    // controllo gia' fatto in page.tsx.
    const numeroGruppiEsistenti = await prisma.gruppo.count({
      where: { annoAgonisticoId: annoCorrente.id },
    });
    if (numeroGruppiEsistenti > 0) {
      return {
        error: { code: "VALIDATION", message: "Questa stagione ha già dei Gruppi." },
      };
    }

    const intervalloCorrente = calcolaIntervalloStagioneCorrente(new Date());
    const annoPrecedente = await trovaAnnoAgonisticoPrecedente({
      dataInizio: intervalloCorrente.dataInizio,
    });
    if (!annoPrecedente) {
      return {
        error: { code: "VALIDATION", message: "Nessuna stagione precedente trovata." },
      };
    }

    gruppiPrecedenti = await prisma.gruppo.findMany({
      where: { annoAgonisticoId: annoPrecedente.id },
      include: { allenatori: true },
    });
  } catch (err) {
    // Review fix: prima solo risolviAnnoAgonisticoCorrente() e il
    // $transaction finale erano avvolti in try/catch - un errore transitorio
    // su count/trovaAnnoAgonisticoPrecedente/findMany propagava come
    // eccezione non gestita invece del contratto tipizzato { error } usato
    // dal resto dell'azione (stesso principio gia' applicato a
    // assegnaAtleta, Story 2.4).
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile avviare il wizard. Riprova." },
    };
  }

  if (gruppiPrecedenti.length === 0) {
    return {
      error: {
        code: "VALIDATION",
        message: "Nessun Gruppo da copiare dalla stagione precedente.",
      },
    };
  }

  // id generato esplicitamente (review-equivalente al pattern gia' stabilito
  // per le scritture supabase-js, qui per un motivo diverso): serve costruire
  // un unico array piatto di operazioni $transaction (stesso pattern di
  // salvaGruppiVisibiliDirigente, Story 5.2) - una riga GruppoAllenatore deve
  // referenziare l'id del NUOVO Gruppo, non ancora disponibile se lasciato al
  // default client-side di Prisma dentro un $transaction ad array piatto.
  const operazioni = gruppiPrecedenti.flatMap((gruppo) => {
    const nuovoGruppoId = randomUUID();
    return [
      prisma.gruppo.create({
        data: {
          id: nuovoGruppoId,
          nome: gruppo.nome,
          categoria: gruppo.categoria,
          annoAgonisticoId: annoCorrente.id,
        },
      }),
      // AC #5: un Gruppo senza Allenatori assegnati produce semplicemente
      // un array vuoto qui, nessun caso speciale.
      ...gruppo.allenatori.map((ga) =>
        prisma.gruppoAllenatore.create({
          data: { gruppoId: nuovoGruppoId, allenatoreId: ga.allenatoreId },
        })
      ),
    ];
  });

  try {
    // Tutto in un'unica transazione (Story 5.2): un fallimento a meta' non
    // deve lasciare una stagione con solo alcuni Gruppi copiati.
    await prisma.$transaction(operazioni);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile copiare i Gruppi. Riprova." },
    };
  }

  revalidatePath("/gruppi");
  // Review fix: un redirect verso /gruppi (invece di restituire uno stato
  // "success" mostrato sulla stessa pagina) - dopo la conferma, Next.js
  // ri-renderizza comunque subito la rotta corrente e, poiche' i Gruppi ora
  // esistono, il ramo di blocco dell'AC #3 avrebbe smontato il form prima
  // che l'utente potesse vedere un banner di successo (il messaggio non era
  // mai visibile in pratica). Vedere i Gruppi appena copiati elencati in
  // /gruppi e' una conferma piu' solida di un testo transitorio, e coincide
  // con "correggere dopo con /gruppi", il passo successivo gia' previsto.
  redirect("/gruppi");
}
