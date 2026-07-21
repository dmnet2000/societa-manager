"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import {
  caricaFileCertificato,
  generaUrlFirmato,
  rimuoviFileCertificato,
  scaricaFileCertificato,
  MIME_AMMESSI,
  DIMENSIONE_MASSIMA_BYTE,
  contenutoCorrispondeAlMimeDichiarato,
} from "@/lib/storage/certificati";
import {
  collegaFileCertificato,
  trovaCertificatoPerAtleta,
} from "@/lib/db-rls/certificato-medico";
import { creaNotifica } from "@/lib/db-rls/notifica";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaEmailPerRuolo } from "@/lib/utenti/email-per-ruolo";
import { inviaEmail } from "@/lib/email/invia-email";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type CertificatoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #1: FR-11 ammette Genitore (della propria figlia/o) o Atleta (se
// stessa) - nessuna UI per altri Ruoli in questa storia. AC #3 e' garantito
// a livello di database dalle policy RLS "genitore_atleta_gestisce_certificato_*"
// su certificati_medici e dalle policy su storage.objects (migrazione Story
// 4.1) - un tentativo di caricare per un'Atleta non propria viene rifiutato
// li', non da un controllo applicativo duplicato qui.
export async function caricaCertificato(
  _prevState: CertificatoActionState,
  formData: FormData
): Promise<CertificatoActionState> {
  const forbidden = await requireRuolo(["GENITORE", "ATLETA"]);
  if (forbidden) return forbidden;

  const atletaId = String(formData.get("atletaId") ?? "");
  const file = formData.get("file");

  if (!atletaId) {
    return {
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    };
  }
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: { code: "VALIDATION", message: "Seleziona un file da caricare." },
    };
  }
  if (!MIME_AMMESSI.includes(file.type)) {
    return {
      error: {
        code: "VALIDATION",
        message: "Formato file non ammesso (solo PDF, JPG, PNG).",
      },
    };
  }
  if (file.size > DIMENSIONE_MASSIMA_BYTE) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il file supera la dimensione massima di 10MB.",
      },
    };
  }
  if (!(await contenutoCorrispondeAlMimeDichiarato(file))) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    };
  }

  try {
    const supabase = await createClient();
    const certificatoEsistente = await trovaCertificatoPerAtleta(supabase, atletaId);
    const vecchioFilePath = certificatoEsistente?.filePath as string | undefined;

    const filePath = await caricaFileCertificato(supabase, atletaId, file);
    await collegaFileCertificato(supabase, atletaId, filePath);

    if (vecchioFilePath) {
      try {
        await rimuoviFileCertificato(supabase, vecchioFilePath);
      } catch (err) {
        // Non bloccante (review fix, AC #4): il nuovo file e' gia' collegato
        // con successo, un vecchio file orfano nel bucket e' un problema di
        // pulizia (deferred-work.md), non un fallimento dell'operazione di
        // caricamento dal punto di vista dell'utente.
        console.error(err);
      }
    }

    // Story 4.2 (FR-12), AC #4: effetto collaterale non bloccante, stesso
    // pattern di rimuoviFileCertificato sopra - l'upload del Certificato
    // resta l'operazione primaria, un fallimento nella creazione della
    // notifica non deve mai far fallire l'azione. Su ogni caricamento
    // riuscito, sia primo sia ri-caricamento (nessuna distinzione).
    try {
      await creaNotifica(supabase, atletaId);
    } catch (err) {
      console.error(err);
    }

    // Story 4.3 (FR-13), AC #4: effetto collaterale non bloccante,
    // parallelo e indipendente dal blocco creaNotifica sopra - un
    // fallimento qui non deve mai impedire il tentativo dell'altro, ne'
    // far fallire l'upload. AC #5: nessun tentativo di invio se non ci
    // sono destinatari, non e' un errore.
    try {
      const destinatari = await elencaEmailPerRuolo("SEGRETERIA");
      if (destinatari.length > 0) {
        const atlete = await elencaAtlete(supabase);
        const atleta = atlete.find((a) => a.id === atletaId);
        if (!atleta) {
          // Review fix: caso limite difensivo (mai osservato in pratica) -
          // l'email parte comunque (fallback "un'Atleta" sotto) ma un log
          // distintivo rende questo percorso diverso dal successo pieno,
          // altrimenti indistinguibili in produzione.
          console.warn(
            `Story 4.3: Atleta ${atletaId} non risolvibile nell'elenco al momento dell'invio email alla Segreteria.`
          );
        }
        const fileScaricato = await scaricaFileCertificato(supabase, filePath);
        const contenuto = Buffer.from(await fileScaricato.arrayBuffer());

        await inviaEmail({
          destinatario: destinatari,
          oggetto: "Nuovo Certificato Medico caricato",
          testo: `È stato caricato un nuovo Certificato Medico per ${atleta?.nome ?? "un'Atleta"}.`,
          allegati: [
            {
              nomeFile: file.name,
              contenuto,
              tipoMime: file.type,
            },
          ],
        });
      }
    } catch (err) {
      console.error(err);
    }
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile caricare il Certificato. Riprova.",
      },
    };
  }

  revalidatePath("/certificato-medico");
  return { success: true };
}

// AC #2: URL firmato generato on-demand al momento del click, mai
// pre-generato lato server e incorporato nell'HTML (che ne vanificherebbe
// la scadenza breve). RLS su storage.objects (migrazione Story 4.1) e'
// l'unica autorita' che decide se la generazione riesce per questo
// atletaId - nessun controllo applicativo duplicato sull'appartenenza.
// _formData: parametro inutilizzato ma ricevuto in pratica quando la
// funzione e' collegata con `.bind(null, atletaId)` e invocata come action
// di un <form> (review fix: la firma precedente lo taceva).
export async function ottieniUrlCertificato(
  atletaId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma reale, vedi commento sopra
  _formData?: FormData
): Promise<void> {
  const forbidden = await requireRuolo(["GENITORE", "ATLETA"]);
  if (forbidden) {
    redirect("/certificato-medico");
  }

  const supabase = await createClient();
  // Review fix: nessuna redirect() dentro il try - redirect() lancia
  // un'eccezione di controllo riconosciuta dal framework Next.js; se fosse
  // dentro il try, il catch qui sotto la intercetterebbe come un errore
  // generico e la re-indirizzerebbe di nuovo, sovrascrivendo la
  // destinazione reale. Il try copre solo le chiamate che possono davvero
  // fallire; l'unica redirect() e' fuori, decisa a partire da `url`.
  let url: string | undefined;
  try {
    const certificato = await trovaCertificatoPerAtleta(supabase, atletaId);
    const filePath = certificato?.filePath as string | undefined;
    if (filePath) {
      url = await generaUrlFirmato(supabase, filePath);
    }
  } catch (err) {
    console.error(err);
  }

  redirect(url ?? "/certificato-medico");
}
