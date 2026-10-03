"use server";

import { revalidatePath } from "next/cache";
import type { Ruolo } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import {
  elencaGruppiOrdinati,
  riordinaGruppi,
  impostaVisibilitaGruppo,
  impostaVisibilitaClassifica,
  campionatoConClassificaInStagione,
} from "@/lib/ordine-squadre";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type OrdineSquadreActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 19.15 (Epic 19, Ruolo Site Manager): mirror esatto del perimetro di
// /app/menu-pubblico (Story 19.7) - funzionalita' nuova, nessun permesso
// preesistente da affiancare, DIRIGENTE resta escluso.
const RUOLI_ORDINE_SQUADRE: Ruolo[] = ["ADMIN", "SITE_MANAGER"];

// Nessuna libreria di drag-and-drop nel progetto (stesso principio gia'
// stabilito da /app/menu-pubblico, Story 19.7) - due bottoni Su/Giù, ciascuno
// scambia il Gruppo con il vicino nell'ordine attuale. Legge l'elenco
// completo (gia' ordinato) della stagione corrente invece di fidarsi di un
// indice passato dal client: l'ordine osservato dal client potrebbe essere
// stale se un'altra sessione ha riordinato nel frattempo.
export async function spostaGruppoAction(
  _prevState: OrdineSquadreActionState,
  formData: FormData
): Promise<OrdineSquadreActionState> {
  const forbidden = await requireRuolo(RUOLI_ORDINE_SQUADRE);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const direzione = String(formData.get("direzione") ?? "");
  if (direzione !== "su" && direzione !== "giu") {
    return { error: { code: "VALIDATION", message: "Direzione non valida." } };
  }

  try {
    // Sola lettura (trovaAnnoAgonisticoCorrente, MAI risolviAnnoAgonisticoCorrente
    // qui - side-effect di scrittura non ammissibile in un'azione di
    // riordino), stesso vincolo gia' rispettato in app/squadre/page.tsx.
    const annoCorrente = await trovaAnnoAgonisticoCorrente();
    if (!annoCorrente) {
      return {
        error: { code: "VALIDATION", message: "Nessuna stagione corrente trovata." },
      };
    }

    const gruppi = await elencaGruppiOrdinati(annoCorrente.id);
    const indice = gruppi.findIndex((g) => g.id === id);
    if (indice === -1) {
      return { error: { code: "VALIDATION", message: "Gruppo non trovato." } };
    }

    const indiceVicino = direzione === "su" ? indice - 1 : indice + 1;
    // Gia' al margine (primo Gruppo con "su", ultimo con "giu"): nessuna
    // operazione, non un errore - il bottone e' disabilitato lato client in
    // questo caso, ma il vero cancello resta qui.
    if (indiceVicino < 0 || indiceVicino >= gruppi.length) {
      return { success: true };
    }

    const nuovoOrdine = [...gruppi];
    [nuovoOrdine[indice], nuovoOrdine[indiceVicino]] = [
      nuovoOrdine[indiceVicino],
      nuovoOrdine[indice],
    ];
    await riordinaGruppi(nuovoOrdine.map((g) => g.id));
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile riordinare le squadre. Riprova." },
    };
  }

  revalidatePath("/app/ordine-squadre");
  revalidatePath("/squadre");
  return { success: true };
}

// Story 19.16 (Epic 19, Ruolo Site Manager): mirror esatto di
// impostaVisibileVoceMenuPubblicoAction (app/app/(configurazione)/menu-pubblico/actions.ts) -
// stesso perimetro di Ruoli e stessa doppia revalidatePath di
// spostaGruppoAction sopra. Nessun controllo "almeno un Gruppo visibile"
// (a differenza della voce di menu, dove nascondere l'ultima voce visibile
// romperebbe la NavPubblica su ogni pagina pubblica): /squadre gestisce gia'
// esplicitamente il caso "0 Gruppi visibili" con lo stesso messaggio
// dell'AC #4 di Story 18.8 (spec-19-16 I/O matrix), nessuna interazione da
// impedire qui.
export async function impostaVisibilitaGruppoAction(
  _prevState: OrdineSquadreActionState,
  formData: FormData
): Promise<OrdineSquadreActionState> {
  const forbidden = await requireRuolo(RUOLI_ORDINE_SQUADRE);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const visibilePubblicoGrezzo = formData.get("visibilePubblico");

  // Mirror del fix gia' applicato a impostaVisibileVoceMenuPubblicoAction:
  // un valore mancante/malformato non deve essere trattato come "false"
  // silenziosamente.
  if (visibilePubblicoGrezzo !== "true" && visibilePubblicoGrezzo !== "false") {
    return { error: { code: "VALIDATION", message: "Valore di visibilità non valido." } };
  }
  const visibilePubblico = visibilePubblicoGrezzo === "true";

  try {
    await impostaVisibilitaGruppo(id, visibilePubblico);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare la visibilità della squadra. Riprova.",
      },
    };
  }

  revalidatePath("/app/ordine-squadre");
  revalidatePath("/squadre");
  return { success: true };
}

// Story 19.17 (Epic 19, Ruolo Site Manager): mirror di
// impostaVisibilitaGruppoAction per la classifica di un Campionato su
// /classifiche - stesso perimetro di Ruoli, stessa validazione esplicita del
// valore (mai "false" silenzioso). Revalida /app/ordine-squadre e
// /classifiche (non /squadre: la classifica non compare li'). Nessun
// controllo "almeno una visibile": /classifiche gestisce gia' il caso vuoto
// con "Nessuna classifica disponibile al momento.".
// Review fix: l'id viene accettato solo se stringa (trim), e il Campionato
// deve appartenere alla stagione corrente e avere un link FIPAV (stesso
// approccio di scope di spostaGruppoAction - mai fidarsi di un id arbitrario
// arrivato dal client). Un Campionato sparito tra la verifica e la scrittura
// (Prisma P2025) produce un messaggio dedicato invece di un generico
// "Riprova".
export async function impostaVisibilitaClassificaAction(
  _prevState: OrdineSquadreActionState,
  formData: FormData
): Promise<OrdineSquadreActionState> {
  const forbidden = await requireRuolo(RUOLI_ORDINE_SQUADRE);
  if (forbidden) return forbidden;

  const idGrezzo = formData.get("id");
  const id = typeof idGrezzo === "string" ? idGrezzo.trim() : "";
  const classificaVisibileGrezzo = formData.get("classificaVisibile");

  if (!id) {
    return { error: { code: "VALIDATION", message: "Campionato non valido." } };
  }
  if (classificaVisibileGrezzo !== "true" && classificaVisibileGrezzo !== "false") {
    return { error: { code: "VALIDATION", message: "Valore di visibilità non valido." } };
  }
  const classificaVisibile = classificaVisibileGrezzo === "true";

  try {
    // Sola lettura (trovaAnnoAgonisticoCorrente, mai
    // risolviAnnoAgonisticoCorrente), stesso vincolo di spostaGruppoAction.
    const annoCorrente = await trovaAnnoAgonisticoCorrente();
    if (!annoCorrente) {
      return {
        error: { code: "VALIDATION", message: "Nessuna stagione corrente trovata." },
      };
    }
    if (!(await campionatoConClassificaInStagione(id, annoCorrente.id))) {
      return { error: { code: "VALIDATION", message: "Campionato non valido." } };
    }

    await impostaVisibilitaClassifica(id, classificaVisibile);
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return {
        error: {
          code: "VALIDATION",
          message: "Campionato non trovato. Ricarica la pagina.",
        },
      };
    }
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare la visibilità della classifica. Riprova.",
      },
    };
  }

  revalidatePath("/app/ordine-squadre");
  revalidatePath("/classifiche");
  return { success: true };
}
