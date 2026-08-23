"use server";

import { revalidatePath } from "next/cache";
import type { Ruolo } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { urlVoceMenuValido } from "@/lib/validazione-url";
import {
  elencaVociMenuPubblico,
  elencaVociMenuPubblicoVisibili,
  creaVoceMenuPubblico,
  aggiornaVoceMenuPubblico,
  trovaVoceMenuPubblicoPerId,
  impostaVisibileVoceMenuPubblico,
  riordinaVociMenuPubblico,
} from "@/lib/menu-pubblico";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type VoceMenuPubblicoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 19.7 (Epic 19): AC limita esplicitamente questa pagina ad
// ADMIN/SITE_MANAGER, non DIRIGENTE - a differenza delle altre rotte di
// "Gestione sito" (Impostazioni/Sponsor/Foto squadre), dove Dirigente aveva
// gia' un permesso preesistente da affiancare (Story 19.1 decisione 3),
// questa e' una funzionalita' nuova senza permesso preesistente da
// rispettare.
const RUOLI_GESTIONE_MENU_PUBBLICO: Ruolo[] = ["ADMIN", "SITE_MANAGER"];

const LUNGHEZZA_MASSIMA_ETICHETTA = 40;

// Story 19.14 (Epic 19, Ruolo Site Manager): urlVoceMenuValido e' stata
// spostata in lib/validazione-url.ts - un modulo "use server" come questo
// puo' esportare solo funzioni async (ogni export diventa un riferimento a
// Server Action), quindi non poteva piu' restare qui nel momento in cui il
// blocco Pulsante dell'editor a blocchi (pagine-pubbliche/actions.ts) ha
// avuto bisogno di riusarla tal quale. Comportamento invariato.
function leggiCampi(formData: FormData) {
  return {
    etichetta: String(formData.get("etichetta") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
  };
}

function validaCampi(
  campi: {
    etichetta: string;
    url: string;
  },
  urlAttuale?: string
): { code: string; message: string } | null {
  if (!campi.etichetta) {
    return { code: "VALIDATION", message: "L'etichetta è obbligatoria." };
  }
  if (campi.etichetta.length > LUNGHEZZA_MASSIMA_ETICHETTA) {
    return {
      code: "VALIDATION",
      message: `L'etichetta supera i ${LUNGHEZZA_MASSIMA_ETICHETTA} caratteri.`,
    };
  }
  if (!urlVoceMenuValido(campi.url, urlAttuale)) {
    return {
      code: "VALIDATION",
      message:
        'URL non valido (deve iniziare con "/" per una pagina del sito, oppure con http:// o https:// per un link esterno).',
    };
  }
  return null;
}

export async function creaVoceMenuPubblicoAction(
  _prevState: VoceMenuPubblicoActionState,
  formData: FormData
): Promise<VoceMenuPubblicoActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_MENU_PUBBLICO);
  if (forbidden) return forbidden;

  const campi = leggiCampi(formData);
  const errore = validaCampi(campi);
  if (errore) return { error: errore };

  try {
    await creaVoceMenuPubblico(campi);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare la voce di menu. Riprova." },
    };
  }

  revalidatePath("/app/menu-pubblico");
  return { success: true };
}

export async function aggiornaVoceMenuPubblicoAction(
  _prevState: VoceMenuPubblicoActionState,
  formData: FormData
): Promise<VoceMenuPubblicoActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_MENU_PUBBLICO);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const campi = leggiCampi(formData);
  // Code review (intent_gap): letta PRIMA della validazione per esentare
  // dal controllo rottaRiservata() il caso "url invariato" (vedi
  // urlVoceMenuValido) - se la voce non esiste piu' (id invalido/gia'
  // rimossa), voceEsistente resta undefined e la validazione si comporta
  // come prima (sempre rottaRiservata), nessun caso speciale da gestire qui:
  // aggiornaVoceMenuPubblico sotto fallirebbe comunque con lo stesso errore
  // INTERNAL di oggi.
  const voceEsistente = await trovaVoceMenuPubblicoPerId(id).catch((err) => {
    console.error(err);
    return null;
  });
  const errore = validaCampi(campi, voceEsistente?.url);
  if (errore) return { error: errore };

  try {
    await aggiornaVoceMenuPubblico(id, campi);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la voce di menu. Riprova." },
    };
  }

  revalidatePath("/app/menu-pubblico");
  return { success: true };
}

export async function impostaVisibileVoceMenuPubblicoAction(
  _prevState: VoceMenuPubblicoActionState,
  formData: FormData
): Promise<VoceMenuPubblicoActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_MENU_PUBBLICO);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const visibileGrezzo = formData.get("visibile");

  // Mirror del fix gia' applicato a impostaAttivaSponsor (Story 16.1 review
  // fix): un valore mancante/malformato non deve essere trattato come
  // "false" silenziosamente.
  if (visibileGrezzo !== "true" && visibileGrezzo !== "false") {
    return { error: { code: "VALIDATION", message: "Valore di visibilità non valido." } };
  }
  const visibile = visibileGrezzo === "true";

  try {
    // Review fix: senza questo controllo, nascondere l'ultima voce visibile
    // rimasta svuota elencaVociMenuPubblicoVisibili() - app/NavPubblica.tsx
    // (Story 19.8) tratta una tabella senza voci visibili come un errore
    // esplicito e bloccante (decisione dell'epica, nessun fallback
    // silenzioso), quindi l'intero sito pubblico smetterebbe di renderizzare
    // (ogni pagina pubblica monta HeaderPubblico -> NavPubblica) fino a
    // quando qualcuno non rimostra una voce. Controllato solo quando si sta
    // nascondendo (mostrare una voce non puo' mai azzerare il conteggio).
    if (!visibile) {
      const vociVisibili = await elencaVociMenuPubblicoVisibili();
      const restanoVisibili = vociVisibili.some((v) => v.id !== id);
      if (!restanoVisibili) {
        return {
          error: {
            code: "VALIDATION",
            message:
              "Non puoi nascondere l'ultima voce visibile: il menu del sito pubblico deve avere sempre almeno una voce.",
          },
        };
      }
    }

    await impostaVisibileVoceMenuPubblico(id, visibile);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare la visibilità della voce. Riprova.",
      },
    };
  }

  revalidatePath("/app/menu-pubblico");
  return { success: true };
}

// Nessuna libreria di drag-and-drop nel progetto (primo caso di riordino
// manuale) - due bottoni Su/Giù, ciascuno scambia la voce con la vicina
// nell'ordine attuale. Legge l'elenco completo (gia' ordinato) invece di
// fidarsi di un indice passato dal client: l'ordine osservato dal client
// potrebbe essere stale se un'altra sessione ha riordinato nel frattempo.
export async function spostaVoceMenuPubblicoAction(
  _prevState: VoceMenuPubblicoActionState,
  formData: FormData
): Promise<VoceMenuPubblicoActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_MENU_PUBBLICO);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const direzione = String(formData.get("direzione") ?? "");
  if (direzione !== "su" && direzione !== "giu") {
    return { error: { code: "VALIDATION", message: "Direzione non valida." } };
  }

  try {
    const voci = await elencaVociMenuPubblico();
    const indice = voci.findIndex((v) => v.id === id);
    if (indice === -1) {
      return { error: { code: "VALIDATION", message: "Voce non trovata." } };
    }

    const indiceVicino = direzione === "su" ? indice - 1 : indice + 1;
    // Gia' al margine (prima voce con "su", ultima con "giu"): nessuna
    // operazione, non un errore - il bottone e' disabilitato lato client in
    // questo caso, ma il vero cancello resta qui.
    if (indiceVicino < 0 || indiceVicino >= voci.length) {
      return { success: true };
    }

    const nuovoOrdine = [...voci];
    [nuovoOrdine[indice], nuovoOrdine[indiceVicino]] = [
      nuovoOrdine[indiceVicino],
      nuovoOrdine[indice],
    ];
    await riordinaVociMenuPubblico(nuovoOrdine.map((v) => v.id));
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile riordinare le voci. Riprova." },
    };
  }

  revalidatePath("/app/menu-pubblico");
  return { success: true };
}
