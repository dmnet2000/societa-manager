"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/auth-admin/client";
import { inviaEmail } from "@/lib/email/invia-email";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }. Il ramo di successo porta anche il testo del
// messaggio (a differenza di modificaPassword): qui il messaggio DEVE essere
// identico in ogni caso (AC #2, anti-enumerazione), quindi lo genera il
// server una sola volta invece di farlo ricostruire al Client Component.
export type RecuperaPasswordState =
  | { successo: true; messaggio: string; error?: undefined }
  | { successo?: undefined; messaggio?: undefined; error: { code: string; message: string } }
  | undefined;

// AC #2: stesso identico messaggio indipendentemente da: email inesistente,
// invio SMTP fallito/non configurato, o invio riuscito - mai rivelare quale
// dei tre casi si e' verificato.
const MESSAGGIO_SUCCESSO_GENERICO =
  "Se l'indirizzo è registrato, riceverai un'email con le istruzioni per reimpostare la password.";

// Review fix (code review Story 9.11, Blind Hunter + Edge Case Hunter): il
// ramo "email esistente" fa un vero invio SMTP (round-trip di rete reale),
// il ramo "email inesistente" no - senza un tempo minimo comune, la sola
// latenza di risposta distinguerebbe i due casi anche a parita' di
// messaggio, vanificando parzialmente l'anti-enumerazione di AC #2/#6.
const DURATA_MINIMA_MS = 300;

export async function richiediRecuperoPassword(
  _prevState: RecuperaPasswordState,
  formData: FormData
): Promise<RecuperaPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: { code: "VALIDATION", message: "L'email è obbligatoria." } };
  }

  const inizio = Date.now();

  try {
    const admin = createAdminClient();
    // AD-12/Story 9.11 Dev Notes: generateLink (service-role) genera il token
    // di recupero SENZA inviare alcuna email - l'invio passa dall'SMTP
    // applicativo gia' esistente (inviaEmail), non dalle impostazioni email
    // native di Supabase.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    // Email inesistente (o altro errore Supabase): loggato per diagnosi
    // interna, ma la risposta al chiamante resta indistinguibile dal
    // successo (AC #2).
    if (error || !data) {
      console.error("[richiediRecuperoPassword] generateLink fallito", error);
    } else {
      // Dev Notes: usare hashed_token nel proprio URL, mai action_link
      // (punta al dominio Supabase, non gestito dall'adapter cookie di
      // questa app). Review fix: "&type=recovery" rimosso dal link - non
      // letto ne' da reimposta-password/page.tsx ne' da actions.ts (il
      // server usa sempre "recovery", cablato), era testo morto.
      const headersList = await headers();
      const host = headersList.get("host");
      const proto = headersList.get("x-forwarded-proto") ?? "https";
      const link = `${proto}://${host}/reimposta-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;

      await inviaEmail({
        destinatario: email,
        oggetto: "Recupero password",
        testo: `Per reimpostare la tua password, apri questo link (valido per un tempo limitato): ${link}\n\nSe non hai richiesto tu il recupero password, ignora questa email.`,
      });
    }
  } catch (err) {
    // Copre sia un fallimento di generateLink sia di inviaEmail (es.
    // CONFIGURAZIONE_SMTP_MANCANTE) - stesso principio anti-enumerazione: non
    // rivelare all'esterno se l'SMTP applicativo e' configurato o meno.
    console.error("[richiediRecuperoPassword] errore imprevisto", err);
  }

  const trascorso = Date.now() - inizio;
  if (trascorso < DURATA_MINIMA_MS) {
    await new Promise((resolve) => setTimeout(resolve, DURATA_MINIMA_MS - trascorso));
  }

  return { successo: true, messaggio: MESSAGGIO_SUCCESSO_GENERICO };
}
