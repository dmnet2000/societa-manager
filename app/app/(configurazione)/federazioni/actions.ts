"use server";

import { revalidatePath } from "next/cache";
import type { Ruolo } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import {
  elencaFederazioni,
  trovaFederazionePerNomeInsensitive,
  creaFederazione,
  aggiornaFederazione,
  impostaAttivaFederazione,
  riordinaFederazioni,
  eliminaFederazione,
} from "@/lib/federazioni";
import { federazioneInUso } from "@/lib/tesseramento";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type FederazioneActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 26.1 (Epic 26): stesso perimetro di /app/conferma-tesseramenti
// (decisione utente 2026-10-12) - mirror di ruoliAmmessi per
// /app/federazioni in route-guard.ts.
const RUOLI_GESTIONE_FEDERAZIONI: Ruolo[] = ["ADMIN", "DIRIGENTE"];

const LUNGHEZZA_MASSIMA_NOME = 80;
const LUNGHEZZA_MASSIMA_SIGLA = 20;

const PERCORSO = "/app/federazioni";

const ERRORE_DUPLICATO = {
  code: "VALIDATION",
  message: "Esiste già una federazione con questo nome.",
};
const ERRORE_NON_TROVATA = {
  code: "VALIDATION",
  message: "Federazione non trovata.",
};

// Review fix: codici Prisma riconosciuti invece di un generico INTERNAL -
// stesso pattern di ordine-squadre/actions.ts (P2025) e
// pagine-pubbliche/actions.ts (P2002). P2002: due salvataggi concorrenti
// con lo stesso nome esatto superano entrambi il controllo applicativo e
// urtano federazioni_nome_key. P2025: la Federazione e' stata eliminata da
// un'altra sessione nel frattempo.
function codicePrisma(err: unknown): string | undefined {
  return (err as { code?: string } | null)?.code;
}

// Review fix: spazi interni ripetuti compressi, cosi' "Centro  Sportivo" e
// "Centro Sportivo" non risultano due federazioni diverse.
function normalizza(valore: FormDataEntryValue | null): string {
  return String(valore ?? "").trim().replace(/\s+/g, " ");
}

function leggiCampi(formData: FormData) {
  const sigla = normalizza(formData.get("sigla"));
  return {
    nome: normalizza(formData.get("nome")),
    sigla: sigla === "" ? null : sigla,
  };
}

async function validaCampi(
  campi: { nome: string; sigla: string | null },
  escludiId?: string
): Promise<{ code: string; message: string } | null> {
  if (!campi.nome) {
    return { code: "VALIDATION", message: "Il nome è obbligatorio." };
  }
  if (campi.nome.length > LUNGHEZZA_MASSIMA_NOME) {
    return {
      code: "VALIDATION",
      message: `Il nome supera i ${LUNGHEZZA_MASSIMA_NOME} caratteri.`,
    };
  }
  if (campi.sigla && campi.sigla.length > LUNGHEZZA_MASSIMA_SIGLA) {
    return {
      code: "VALIDATION",
      message: `La sigla supera i ${LUNGHEZZA_MASSIMA_SIGLA} caratteri.`,
    };
  }
  const duplicato = await trovaFederazionePerNomeInsensitive(campi.nome, escludiId);
  if (duplicato) return ERRORE_DUPLICATO;
  return null;
}

export async function creaFederazioneAction(
  _prevState: FederazioneActionState,
  formData: FormData
): Promise<FederazioneActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_FEDERAZIONI);
  if (forbidden) return forbidden;

  const campi = leggiCampi(formData);
  try {
    const errore = await validaCampi(campi);
    if (errore) return { error: errore };
    await creaFederazione(campi);
  } catch (err) {
    if (codicePrisma(err) === "P2002") return { error: ERRORE_DUPLICATO };
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare la federazione. Riprova." },
    };
  }

  revalidatePath(PERCORSO);
  return { success: true };
}

export async function aggiornaFederazioneAction(
  _prevState: FederazioneActionState,
  formData: FormData
): Promise<FederazioneActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_FEDERAZIONI);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  // Review fix: con id vuoto escludiId sarebbe falsy (nessuna esclusione
  // dal controllo duplicati) e la scrittura fallirebbe come INTERNAL.
  if (!id) return { error: ERRORE_NON_TROVATA };
  const campi = leggiCampi(formData);
  try {
    const errore = await validaCampi(campi, id);
    if (errore) return { error: errore };
    await aggiornaFederazione(id, campi);
  } catch (err) {
    if (codicePrisma(err) === "P2002") return { error: ERRORE_DUPLICATO };
    if (codicePrisma(err) === "P2025") return { error: ERRORE_NON_TROVATA };
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la federazione. Riprova." },
    };
  }

  revalidatePath(PERCORSO);
  return { success: true };
}

export async function impostaAttivaFederazioneAction(
  _prevState: FederazioneActionState,
  formData: FormData
): Promise<FederazioneActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_FEDERAZIONI);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: ERRORE_NON_TROVATA };
  const attivaGrezzo = formData.get("attiva");
  // Mirror di impostaVisibileVoceMenuPubblicoAction: un valore
  // mancante/malformato non diventa "false" silenziosamente.
  if (attivaGrezzo !== "true" && attivaGrezzo !== "false") {
    return { error: { code: "VALIDATION", message: "Valore di stato non valido." } };
  }

  try {
    await impostaAttivaFederazione(id, attivaGrezzo === "true");
  } catch (err) {
    if (codicePrisma(err) === "P2025") return { error: ERRORE_NON_TROVATA };
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare lo stato della federazione. Riprova.",
      },
    };
  }

  revalidatePath(PERCORSO);
  return { success: true };
}

// Stesso schema di spostaVoceMenuPubblicoAction: legge l'ordine attuale dal
// DB invece di fidarsi di un indice passato dal client.
export async function spostaFederazioneAction(
  _prevState: FederazioneActionState,
  formData: FormData
): Promise<FederazioneActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_FEDERAZIONI);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const direzione = String(formData.get("direzione") ?? "");
  if (direzione !== "su" && direzione !== "giu") {
    return { error: { code: "VALIDATION", message: "Direzione non valida." } };
  }

  try {
    const federazioni = await elencaFederazioni();
    const indice = federazioni.findIndex((f) => f.id === id);
    if (indice === -1) return { error: ERRORE_NON_TROVATA };

    const indiceVicino = direzione === "su" ? indice - 1 : indice + 1;
    // Gia' al margine: nessuna operazione, non un errore.
    if (indiceVicino < 0 || indiceVicino >= federazioni.length) {
      return { success: true };
    }

    const nuovoOrdine = [...federazioni];
    [nuovoOrdine[indice], nuovoOrdine[indiceVicino]] = [
      nuovoOrdine[indiceVicino],
      nuovoOrdine[indice],
    ];
    await riordinaFederazioni(nuovoOrdine.map((f) => f.id));
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile riordinare le federazioni. Riprova." },
    };
  }

  revalidatePath(PERCORSO);
  return { success: true };
}

// Eliminazione fisica solo per una Federazione mai usata in alcun
// Tesseramento di nessuna stagione - altrimenti resta la sola
// disattivazione, che preserva lo storico (decisione dell'epica).
export async function eliminaFederazioneAction(
  _prevState: FederazioneActionState,
  formData: FormData
): Promise<FederazioneActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_FEDERAZIONI);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: ERRORE_NON_TROVATA };
  try {
    if (await federazioneInUso(id)) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Questa federazione è usata in almeno un tesseramento e non può essere eliminata: puoi disattivarla.",
        },
      };
    }
    await eliminaFederazione(id);
  } catch (err) {
    // Review fix: gia' eliminata (doppio invio o altra sessione) - l'esito
    // voluto e' raggiunto, nessun errore da mostrare.
    if (codicePrisma(err) !== "P2025") {
      console.error(err);
      return {
        error: { code: "INTERNAL", message: "Impossibile eliminare la federazione. Riprova." },
      };
    }
  }

  revalidatePath(PERCORSO);
  return { success: true };
}
