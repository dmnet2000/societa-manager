"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/auth-admin/client";
import { prisma } from "@/lib/prisma";
import { sincronizzaRuoliAppMetadata } from "@/lib/auth-admin/sync-roles";
import { parseRuoli } from "@/lib/ruoli";
import { requireRuolo } from "@/lib/auth/require-ruolo";

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

  revalidatePath("/admin");
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

  revalidatePath("/admin");
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

  revalidatePath("/admin");
}
