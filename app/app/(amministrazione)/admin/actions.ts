"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/auth-admin/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sincronizzaRuoliAppMetadata } from "@/lib/auth-admin/sync-roles";
import { parseRuoli } from "@/lib/ruoli";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { inviaEmail } from "@/lib/email/invia-email";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione - qui usato davvero: ogni azione verifica da se' che il
// chiamante sia Admin (requireRuolo), non si affida solo al route guard di
// proxy.ts (le Server Action sono endpoint indipendenti dal path della
// pagina che le importa).
export type AdminActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

async function contaAltriAdminAttivi(utenteIdEscluso: string): Promise<number> {
  return prisma.utente.count({
    where: {
      attivo: true,
      id: { not: utenteIdEscluso },
      ruoli: { some: { ruolo: "ADMIN" } },
    },
  });
}

// AC #1, #2: creazione utente da parte dell'Admin - usa admin.createUser
// (service-role), non signUp: e' l'Admin a creare l'account, non l'utente
// stesso (percorso distinto dall'auto-registrazione di Story 1.1).
export async function creaUtente(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: { code: "VALIDATION", message: "Email e password sono obbligatorie." },
    };
  }

  const ruoli = parseRuoli(formData.getAll("ruoli"));
  if (ruoli.length === 0) {
    return { error: { code: "VALIDATION", message: "Seleziona almeno un ruolo." } };
  }

  const admin = createAdminClient();

  let data, error;
  try {
    ({ data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }));
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'utente. Riprova." },
    };
  }

  // AC #2: l'email duplicata su admin.createUser e' stata verificata dal vivo
  // restituire error.code === "email_exists" - controlliamo anche
  // "user_already_exists" (il codice usato da supabase.auth.signUp, Story
  // 1.1) per robustezza rispetto a differenze di versione/metodo.
  if (error) {
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      return {
        error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
      };
    }
    console.error(error);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'utente. Riprova." },
    };
  }

  if (!data.user) {
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'utente. Riprova." },
    };
  }

  if (data.user.identities && data.user.identities.length === 0) {
    return {
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    };
  }

  try {
    // AC #1: crea il record Utente + Ruoli via Prisma (Utente non e' protetto
    // da RLS, AD-9 - gestibile via Prisma diretto, come in Story 1.1).
    await prisma.utente.create({
      data: {
        supabaseAuthId: data.user.id,
        email,
        ruoli: { create: ruoli.map((ruolo) => ({ ruolo })) },
      },
    });

    // AD-11: specchia i Ruoli su app_metadata (merge, non sostituzione).
    await sincronizzaRuoliAppMetadata(data.user.id, ruoli);
  } catch (err) {
    // Decisione presa in Story 1.1: nessun rollback automatico - lo stesso
    // comportamento della registrazione self-service (vedi Story 1.1 Review
    // Findings).
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'utente. Riprova." },
    };
  }

  revalidatePath("/app/admin");
  return { success: true };
}

// AC #3, #4: disattiva/riattiva un utente esistente. Nessuna scrittura su
// Supabase Auth qui: il controllo di attivo avviene al login
// (app/(auth)/accedi/actions.ts), non specchiato in app_metadata - vedi
// Dev Notes della story sul perche' non e' come i Ruoli (AD-11).
export async function impostaAttivoUtente(
  _prevState: AdminActionState,
  utenteId: string,
  attivo: boolean
): Promise<AdminActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  try {
    if (!attivo) {
      // Decisione: impedire di disattivare l'unico Admin attivo rimasto.
      const utente = await prisma.utente.findUniqueOrThrow({
        where: { id: utenteId },
        include: { ruoli: true },
      });
      const eAdmin = utente.ruoli.some((r) => r.ruolo === "ADMIN");
      if (eAdmin && (await contaAltriAdminAttivi(utenteId)) === 0) {
        return {
          error: {
            code: "VALIDATION",
            message: "Non puoi disattivare l'unico Admin attivo rimasto.",
          },
        };
      }
    }

    await prisma.utente.update({
      where: { id: utenteId },
      data: { attivo },
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare lo stato dell'utente. Riprova.",
      },
    };
  }

  revalidatePath("/app/admin");
}

// AC #5: assegna/rimuove Ruoli - sostituisce l'intero insieme UtenteRuolo
// dell'utente target, poi risincronizza app_metadata. Nessuna invalidazione
// della sessione corrente: la staleness del JWT e' accettata da AD-11.
export async function aggiornaRuoliUtente(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const utenteId = String(formData.get("utenteId") ?? "");
  const ruoli = parseRuoli(formData.getAll("ruoli"));

  if (ruoli.length === 0) {
    return { error: { code: "VALIDATION", message: "Seleziona almeno un ruolo." } };
  }

  try {
    // supabaseAuthId va derivato da utenteId lato server, mai accettato da un
    // campo del form: altrimenti un submit manomesso potrebbe sincronizzare
    // i Ruoli su app_metadata di un utente diverso da quello aggiornato.
    const utente = await prisma.utente.findUniqueOrThrow({
      where: { id: utenteId },
      include: { ruoli: true },
    });

    const eraAdmin = utente.ruoli.some((r) => r.ruolo === "ADMIN");
    const restaAdmin = ruoli.includes("ADMIN");

    // Decisione: impedire di rimuovere il Ruolo ADMIN all'unico Admin attivo.
    if (eraAdmin && !restaAdmin && (await contaAltriAdminAttivi(utenteId)) === 0) {
      return {
        error: {
          code: "VALIDATION",
          message: "Non puoi rimuovere il ruolo Admin all'unico Admin attivo rimasto.",
        },
      };
    }

    await prisma.$transaction([
      prisma.utenteRuolo.deleteMany({ where: { utenteId } }),
      prisma.utenteRuolo.createMany({
        data: ruoli.map((ruolo) => ({ utenteId, ruolo })),
      }),
    ]);

    await sincronizzaRuoliAppMetadata(utente.supabaseAuthId, ruoli);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare i Ruoli. Riprova." },
    };
  }

  revalidatePath("/app/admin");
}

// Story 9.11 (Parte B): valore concordato esplicitamente con l'utente in
// fase di creazione della storia - un club piccolo dove la comunicazione
// della nuova password all'Utente avviene fuori banda (es. di persona,
// WhatsApp) dall'Admin. Nessun meccanismo "cambio password obbligatorio al
// primo accesso" (non nativo in Supabase Auth, fuori perimetro): l'Utente va
// invitato a cambiarla da /modifica-password (Story 9.4) una volta rientrato.
const PASSWORD_FISSA_RESET = "Volley@Mogliano";

// AC #7, #8, #9: reset diretto della password di un Utente a un valore fisso
// noto, senza richiedere la password attuale - pensato per sbloccare
// rapidamente chi non riesce a usare il recupero via email (Story 9.11,
// Parte A). Nessun controllo "unico Admin attivo" (a differenza di
// impostaAttivoUtente/aggiornaRuoliUtente): resettare la password non toglie
// il Ruolo Admin a nessuno.
export async function reimpostaPasswordFissaUtente(
  _prevState: AdminActionState,
  utenteId: string
): Promise<AdminActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  try {
    // supabaseAuthId derivato da utenteId lato server, mai accettato da un
    // campo del form - stesso principio anti-manomissione gia' applicato in
    // aggiornaRuoliUtente sopra.
    const utente = await prisma.utente.findUniqueOrThrow({
      where: { id: utenteId },
      include: { ruoli: true },
    });

    // Review fix (code review Story 9.11, Blind Hunter): senza questo, un
    // Admin potrebbe reimpostare silenziosamente la password di un altro
    // Admin (o della propria) al valore fisso noto - presa di controllo di
    // un account Admin da parte di un altro Admin. Deciso con l'utente:
    // bloccare sempre su un bersaglio Admin (a differenza del controllo
    // "unico Admin attivo" di impostaAttivoUtente/aggiornaRuoliUtente, qui
    // il rischio e' la presa di controllo, non la perdita di accesso Admin
    // all'app - vale quindi per QUALUNQUE Admin bersaglio, non solo l'ultimo).
    const eAdmin = utente.ruoli.some((r) => r.ruolo === "ADMIN");
    if (eAdmin) {
      return {
        error: {
          code: "VALIDATION",
          message: "Non puoi reimpostare la password di un altro Admin con questa funzione.",
        },
      };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(utente.supabaseAuthId, {
      password: PASSWORD_FISSA_RESET,
    });

    if (error) {
      console.error(error);
      return {
        error: { code: "INTERNAL", message: "Impossibile reimpostare la password. Riprova." },
      };
    }

    // Review fix (code review Story 9.11, Blind Hunter): traccia minima di
    // accountability per un'azione che sovrascrive silenziosamente una
    // credenziale - chi l'ha eseguita e su quale Utente, nei log server
    // (nessuna infrastruttura di audit dedicata esiste in questo progetto).
    const supabaseChiamante = await createClient();
    const {
      data: { user: chiamante },
    } = await supabaseChiamante.auth.getUser();
    console.log(
      `[reimpostaPasswordFissaUtente] password reimpostata da ${chiamante?.email ?? "sconosciuto"} su utenteId=${utenteId}`
    );
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile reimpostare la password. Riprova." },
    };
  }
}

// Story 9.38: corregge l'email di un Utente Supabase Auth mai confermato
// (probabile errore di battitura in fase di registrazione, Story 1.1/11.4 -
// il link di conferma non e' mai potuto arrivare a un indirizzo sbagliato) e
// rigenera/reinvia il link di conferma al nuovo indirizzo. Non tocca
// registrati/actions.ts (AC #5): logica di generazione/invio del link
// deliberatamente duplicata qui, non estratta in un helper condiviso - vedi
// Design Notes della story per il motivo (i due file distinguono l'errore di
// invio fallito con messaggi diversi, pubblico vs Admin-facing).
export async function correggiEmailUtenteAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const utenteId = String(formData.get("utenteId") ?? "");
  // Review fix: normalizzata in minuscolo, non solo trim - stesso principio
  // gia' applicato altrove nel progetto per email (es.
  // lib/utenti/email-destinatari-atleta.ts) per evitare che due indirizzi
  // che differiscono solo per maiuscole/minuscole vengano trattati come
  // distinti (stessa casella per qualunque provider reale).
  const nuovaEmail = String(formData.get("nuovaEmail") ?? "").trim().toLowerCase();

  // Review fix: un semplice controllo "contiene @" accettava anche indirizzi
  // palesemente malformati (es. "a@", "@b", "a@@b") - una regex semplice
  // (non una libreria di validazione dedicata, fuori scope) basta per
  // scartare i casi piu' grossolani senza pretendere di validare RFC 5322 per
  // intero.
  const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_VALIDA.test(nuovaEmail)) {
    return {
      error: { code: "VALIDATION", message: "Inserisci un indirizzo email valido." },
    };
  }

  let utente;
  try {
    // supabaseAuthId derivato da utenteId lato server, mai accettato da un
    // campo del form - stesso principio anti-manomissione gia' applicato in
    // aggiornaRuoliUtente/reimpostaPasswordFissaUtente sopra.
    utente = await prisma.utente.findUniqueOrThrow({
      where: { id: utenteId },
      include: { ruoli: true },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile correggere l'email. Riprova." },
    };
  }

  // Mirror esatto del blocco anti-presa-di-controllo di
  // reimpostaPasswordFissaUtente (Story 9.11): chi controlla l'email di un
  // Admin controlla anche un futuro "password dimenticata" di quell'Admin -
  // vale per QUALUNQUE Admin bersaglio, non solo l'ultimo attivo.
  const eAdmin = utente.ruoli.some((r) => r.ruolo === "ADMIN");
  if (eAdmin) {
    return {
      error: {
        code: "VALIDATION",
        message: "Non puoi correggere l'email di un altro Admin con questa funzione.",
      },
    };
  }

  const admin = createAdminClient();

  // Il server non si fida mai dello stato mostrato in UI
  // (emailConfermata calcolato in page.tsx decide solo se mostrare il form):
  // questa azione verifica da se' che il bersaglio non abbia mai confermato
  // l'account, PRIMA di correggere qualunque cosa.
  let datiUtenteAuth;
  try {
    const { data, error } = await admin.auth.admin.getUserById(utente.supabaseAuthId);
    if (error || !data.user) {
      console.error(error);
      return {
        error: { code: "INTERNAL", message: "Impossibile correggere l'email. Riprova." },
      };
    }
    datiUtenteAuth = data.user;
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile correggere l'email. Riprova." },
    };
  }

  if (datiUtenteAuth.email_confirmed_at) {
    return {
      error: {
        code: "VALIDATION",
        message:
          "Questo Utente ha già confermato l'account: questa funzione corregge solo un'email mai confermata.",
      },
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    utente.supabaseAuthId,
    { email: nuovaEmail }
  );

  if (updateError) {
    console.error(updateError);
    // Review fix: distingue un vero conflitto di email (mirror del doppio
    // controllo gia' usato in creaUtente/registrati per admin.createUser/
    // generateLink) da un qualunque altro fallimento (rete, rate limit,
    // ecc.) - senza questo, un problema transitorio di Supabase veniva
    // mostrato all'Admin come "email già in uso", fuorviante.
    const eConflittoEmail =
      updateError.code === "email_exists" || updateError.code === "user_already_exists";
    return {
      error: eConflittoEmail
        ? {
            code: "VALIDATION",
            message:
              "Impossibile correggere l'email: verifica che non sia già in uso da un altro Utente.",
          }
        : { code: "INTERNAL", message: "Impossibile correggere l'email. Riprova." },
    };
  }

  const emailPrecedente = utente.email;

  try {
    await prisma.utente.update({
      where: { id: utenteId },
      data: { email: nuovaEmail },
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message:
          "Email corretta su Supabase ma non nel database: contatta l'assistenza tecnica.",
      },
    };
  }

  // Review fix (Story 9.11, riusato qui): traccia minima di accountability
  // per un'azione che sovrascrive silenziosamente una credenziale - chi l'ha
  // eseguita, su quale Utente, vecchia e nuova email, nei log server (nessuna
  // infrastruttura di audit dedicata esiste in questo progetto).
  const supabaseChiamante = await createClient();
  const {
    data: { user: chiamante },
  } = await supabaseChiamante.auth.getUser();
  console.log(
    `[correggiEmailUtenteAction] email corretta da ${chiamante?.email ?? "sconosciuto"} su utenteId=${utenteId}: ${emailPrecedente} -> ${nuovaEmail}`
  );

  // Story 11.4 (riusato qui, NON estratto - AC #5): generateLink con un
  // valore casuale per "password" - verificato via ricerca web (vedi Design
  // Notes della story) che non sovrascrive la password reale gia' impostata
  // su un Utente esistente non confermato; il campo resta comunque
  // obbligatorio a livello di tipo TypeScript.
  let link: string;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email: nuovaEmail,
      password: randomUUID(),
    });

    if (error) {
      throw error;
    }
    if (!data.properties?.hashed_token) {
      throw new Error("generateLink: hashed_token mancante nella risposta");
    }

    const headersList = await headers();
    const host = headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    link = `${proto}://${host}/conferma-registrazione?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
  } catch (err) {
    console.error(
      `[correggiEmailUtenteAction] generazione del link di conferma fallita per ${nuovaEmail}`,
      err
    );
    // Review fix: l'email e' gia' stata corretta su Supabase+Prisma sopra -
    // revalidatePath comunque, cosi' la pagina Admin riflette subito la
    // nuova email anche quando il resto del flusso (link/invio) fallisce.
    revalidatePath("/app/admin");
    return {
      error: {
        code: "EMAIL_NON_INVIATA",
        message:
          "Email corretta ma impossibile generare il nuovo link di conferma. Ripeti la correzione con la stessa email per riprovare.",
      },
    };
  }

  try {
    await inviaEmail({
      destinatario: nuovaEmail,
      oggetto: "Conferma la tua registrazione",
      testo: `Per completare la registrazione, apri questo link: ${link}\n\nSe non hai richiesto tu questa registrazione, ignora questa email.`,
    });
  } catch (err) {
    console.error(
      `[correggiEmailUtenteAction] invio email di conferma fallito per ${nuovaEmail}`,
      err
    );
    // Review fix: stesso motivo del ramo generateLink sopra - l'email e'
    // gia' stata corretta, la pagina deve rifletterlo subito.
    revalidatePath("/app/admin");
    return {
      error: {
        code: "EMAIL_NON_INVIATA",
        message:
          "Email corretta ma impossibile inviare il nuovo link di conferma. Ripeti la correzione con la stessa email per riprovare.",
      },
    };
  }

  revalidatePath("/app/admin");
  return { success: true };
}
