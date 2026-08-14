"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import {
  salvaEmailSegreteria,
  salvaUrlPaginaFacebook,
  salvaContattiPubblici,
} from "@/lib/configurazione-applicazione";
import {
  leggiConfigurazioneSocialFacebook,
  salvaTokenFacebook,
} from "@/lib/db-rls/configurazione-social-facebook";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type EmailSegreteriaActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const LUNGHEZZA_MASSIMA_EMAIL = 254;
// Formato semplice, stesso livello di rigore gia' accettato altrove nel
// progetto (nessuna libreria di validazione dedicata) - basta a scartare
// valori chiaramente non plausibili, non una RFC 5322 completa.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Story 9.31: mirror di salvaNomeSettoreAction (app/(configurazione)/logo/actions.ts)
// - stesso perimetro (ConfigurazioneApplicazione, no-RLS, requireRuolo come
// unico cancello).
export async function salvaEmailSegreteriaAction(
  _prevState: EmailSegreteriaActionState,
  formData: FormData
): Promise<EmailSegreteriaActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const valore = String(formData.get("emailSegreteria") ?? "").trim();

  if (valore.length > LUNGHEZZA_MASSIMA_EMAIL) {
    return {
      error: {
        code: "VALIDATION",
        message: `L'indirizzo email supera i ${LUNGHEZZA_MASSIMA_EMAIL} caratteri.`,
      },
    };
  }
  if (valore && !FORMATO_EMAIL.test(valore)) {
    return {
      error: { code: "VALIDATION", message: "Indirizzo email non valido." },
    };
  }

  try {
    // Stringa vuota = l'Admin vuole rimuovere la configurazione (nessuna
    // email di notifica verra' piu' inviata), non un valore letterale
    // vuoto - stesso principio di salvaNomeSettoreAction.
    await salvaEmailSegreteria(valore || null);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare l'Email Segreteria. Riprova.",
      },
    };
  }

  revalidatePath("/app/impostazioni");
  return { success: true };
}

export type PaginaFacebookActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const LUNGHEZZA_MASSIMA_LINK_ESTERNO = 500;

// Mirror di linkEsternoValido (app/(sponsor)/sponsor/actions.ts, Story 16.1
// review fix) / linkFipavValido (app/(partite-campionati)/campionati/actions.ts,
// Story 10.8 review fix) - il valore e' usato come link diretto in /contatti
// e come base per estrarre lo slug della Pagina (lib/facebook-graph.ts,
// Story 18.13), un javascript:/data: non validato qui sarebbe un problema
// anche in quei contesti.
function urlPaginaFacebookValido(valore: string): boolean {
  if (valore.length > LUNGHEZZA_MASSIMA_LINK_ESTERNO) return false;
  try {
    const url = new URL(valore);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Story 18.5 (AC #1): a differenza di salvaEmailSegreteriaAction sopra
// (ADMIN-only), qui requireRuolo ammette anche DIRIGENTE - stesso array a
// due Ruoli gia' usato altrove nel progetto (es.
// wizard-nuova-stagione/actions.ts).
export async function salvaUrlPaginaFacebookAction(
  _prevState: PaginaFacebookActionState,
  formData: FormData
): Promise<PaginaFacebookActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const valore = String(formData.get("urlPaginaFacebook") ?? "").trim();

  if (valore && !urlPaginaFacebookValido(valore)) {
    return {
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    };
  }

  try {
    // Stringa vuota = l'Admin/Dirigente vuole rimuovere la configurazione
    // (la sezione social smette di comparire in home, AC #3) - stesso
    // principio di salvaEmailSegreteriaAction.
    await salvaUrlPaginaFacebook(valore || null);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare la Pagina Facebook. Riprova.",
      },
    };
  }

  revalidatePath("/app/impostazioni");
  return { success: true };
}

export type ContattiPubbliciActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const LUNGHEZZA_MASSIMA_INDIRIZZO = 300;
const LUNGHEZZA_MASSIMA_TELEFONO = 30;
// Formato permissivo (cifre, spazi, + - ( ) . /) - nessun precedente di
// validazione telefono esiste nel progetto, questo e' il primo. Stesso
// livello di rigore gia' accettato per FORMATO_EMAIL: scarta solo valori
// chiaramente non plausibili, non una validazione E.164 completa.
const FORMATO_TELEFONO = /^[0-9+\-\s().\/]+$/;
const LUNGHEZZA_MASSIMA_EMAIL_PUBBLICA = 254;

// Story 18.11 (AC #1): stesso perimetro di salvaUrlPaginaFacebookAction
// sopra (["ADMIN", "DIRIGENTE"]), non l'ADMIN-only di
// salvaEmailSegreteriaAction - l'epica dice esplicitamente "editabili da
// Admin/Dirigente". Un solo Server Action per i 3 campi insieme (mirror di
// salvaContattiPubblici, lib/configurazione-applicazione.ts): ogni campo e'
// validato indipendentemente, ma un errore su uno solo blocca l'intero
// submit (nessun salvataggio parziale) - stesso principio fail-closed gia'
// in uso nelle action esistenti.
export async function salvaContattiPubbliciAction(
  _prevState: ContattiPubbliciActionState,
  formData: FormData
): Promise<ContattiPubbliciActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const indirizzoSede = String(formData.get("indirizzoSede") ?? "").trim();
  const telefonoPubblico = String(formData.get("telefonoPubblico") ?? "").trim();
  const emailPubblica = String(formData.get("emailPubblica") ?? "").trim();

  // Indirizzo: solo limite di lunghezza, nessun formato imposto (testo libero).
  if (indirizzoSede.length > LUNGHEZZA_MASSIMA_INDIRIZZO) {
    return {
      error: {
        code: "VALIDATION",
        message: `L'indirizzo supera i ${LUNGHEZZA_MASSIMA_INDIRIZZO} caratteri.`,
      },
    };
  }

  if (telefonoPubblico.length > LUNGHEZZA_MASSIMA_TELEFONO) {
    return {
      error: {
        code: "VALIDATION",
        message: `Il telefono supera i ${LUNGHEZZA_MASSIMA_TELEFONO} caratteri.`,
      },
    };
  }
  if (telefonoPubblico && !FORMATO_TELEFONO.test(telefonoPubblico)) {
    return {
      error: { code: "VALIDATION", message: "Numero di telefono non valido." },
    };
  }

  // FORMATO_EMAIL riusato invariato (stesso regex di emailSegreteria sopra)
  // - campo distinto, mai sovrascrive/riusa emailSegreteria (AC #4).
  if (emailPubblica.length > LUNGHEZZA_MASSIMA_EMAIL_PUBBLICA) {
    return {
      error: {
        code: "VALIDATION",
        message: `L'indirizzo email supera i ${LUNGHEZZA_MASSIMA_EMAIL_PUBBLICA} caratteri.`,
      },
    };
  }
  if (emailPubblica && !FORMATO_EMAIL.test(emailPubblica)) {
    return {
      error: { code: "VALIDATION", message: "Indirizzo email non valido." },
    };
  }

  try {
    // Stringa vuota = l'Admin/Dirigente vuole rimuovere quel campo (sparisce
    // da /contatti alla successiva visita, AC #2) - stesso principio delle
    // altre action di questo file. I 3 campi sono indipendenti: uno vuoto
    // non tocca gli altri due (upsert con l'intero oggetto, non un merge
    // parziale lato action - salvaContattiPubblici scrive sempre tutti e 3).
    await salvaContattiPubblici({
      indirizzoSede: indirizzoSede || null,
      telefonoPubblico: telefonoPubblico || null,
      emailPubblica: emailPubblica || null,
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare i Contatti pubblici. Riprova.",
      },
    };
  }

  revalidatePath("/app/impostazioni");
  return { success: true };
}

export type TokenFacebookActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const LUNGHEZZA_MASSIMA_TOKEN = 512;

// Story 18.13 (AC #6): a differenza della password SMTP (salvaConfigurazione,
// smtp/actions.ts, ADMIN-only), qui requireRuolo ammette anche DIRIGENTE -
// stesso perimetro di salvaUrlPaginaFacebookAction/salvaContattiPubbliciAction
// sopra (vedi Dev Notes della storia per la motivazione, la nota tecnica
// preliminare di epics.md suggeriva "stessa protezione di ConfigurazioneSmtp"
// ma l'AC #6 e' esplicito su Admin/Dirigente - risolto a favore dell'AC).
//
// Valore vuoto = NON modificare il token esistente (mirror della password
// SMTP) - a differenza di urlPaginaFacebook/Contatti pubblici sopra, qui un
// valore vuoto non rimuove la configurazione: un token e' un segreto,
// svuotarlo per un submit senza intenzione esplicita sarebbe distruttivo.
// Nessun AC richiede la possibilita' di rimuovere il token, non implementata.
export async function salvaTokenFacebookAction(
  _prevState: TokenFacebookActionState,
  formData: FormData
): Promise<TokenFacebookActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const accessToken = String(formData.get("accessToken") ?? "").trim();

  if (accessToken.length > LUNGHEZZA_MASSIMA_TOKEN) {
    return {
      error: {
        code: "VALIDATION",
        message: `Il token supera i ${LUNGHEZZA_MASSIMA_TOKEN} caratteri.`,
      },
    };
  }

  try {
    const supabase = await createClient();

    if (!accessToken) {
      // Fix code review: prima un submit vuoto restituiva sempre successo,
      // anche se nessun token era mai stato configurato (bypassabile senza
      // JS, l'unico guard era l'attributo HTML required) - un vero "non
      // modificare" ha senso solo se esiste gia' qualcosa da non
      // modificare, mirror esatto del controllo gia' fatto da
      // salvaConfigurazione (SMTP, smtp/actions.ts) prima di accettare una
      // password vuota.
      const esistente = await leggiConfigurazioneSocialFacebook(supabase);
      if (!esistente) {
        return {
          error: {
            code: "VALIDATION",
            message: "Il token è obbligatorio al primo salvataggio.",
          },
        };
      }
      return { success: true };
    }

    await salvaTokenFacebook(supabase, accessToken);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare il Token Facebook. Riprova.",
      },
    };
  }

  revalidatePath("/app/impostazioni");
  return { success: true };
}
