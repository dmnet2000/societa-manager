"use server";

import { redirect } from "next/navigation";
import type { Ruolo } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sincronizzaRuoliAppMetadata } from "@/lib/auth-admin/sync-roles";
import { RUOLI_VALIDI } from "@/lib/ruoli";
import {
  isCodiceFiscaleValido,
  trovaAllenatorePerCodiceFiscale,
  trovaPerCodiceFiscale,
} from "@/lib/matching-codice-fiscale";
import { createAdminClient } from "@/lib/auth-admin/client";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione (non usato qui: login/registrazione non fanno controlli
// di autorizzazione, solo autenticazione/validazione).
export type RegistrazioneState =
  | { error: { code: string; message: string } }
  | undefined;

export async function registrati(
  _prevState: RegistrazioneState,
  formData: FormData
): Promise<RegistrazioneState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const ruoliSelezionati = formData.getAll("ruoli").map(String) as Ruolo[];
  const codiceFiscaleAllenatore = String(
    formData.get("codiceFiscaleAllenatore") ?? ""
  )
    .trim()
    .toUpperCase();
  const codiceFiscaleFiglio = String(formData.get("codiceFiscaleFiglio") ?? "")
    .trim()
    .toUpperCase();
  const codiceFiscaleAtleta = String(formData.get("codiceFiscaleAtleta") ?? "")
    .trim()
    .toUpperCase();

  if (!email || !password) {
    return {
      error: {
        code: "VALIDATION",
        message: "Email e password sono obbligatorie.",
      },
    };
  }

  // Set: sia per scartare i Ruoli non validi, sia per deduplicare eventuali
  // valori ripetuti - senza dedup, una create annidata di Prisma con lo
  // stesso Ruolo due volte urterebbe contro @@unique([utenteId, ruolo]).
  const ruoli = [
    ...new Set(ruoliSelezionati.filter((r) => RUOLI_VALIDI.includes(r))),
  ];
  if (ruoli.length === 0) {
    return { error: { code: "VALIDATION", message: "Seleziona almeno un ruolo." } };
  }

  // Story 1.5 AC #2/#3/#5: a differenza del CF Allenatore (opzionale, aggancio
  // best-effort dopo il signUp), il CF della figlia/o e' obbligatorio per il
  // Ruolo Genitore e va risolto PRIMA del signUp - un mismatch blocca l'intera
  // registrazione, nessun account "a meta'" da correggere in un secondo momento.
  let atletaDaAgganciare: { id: string } | null = null;
  if (ruoli.includes("GENITORE")) {
    if (!codiceFiscaleFiglio) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Il Codice Fiscale della figlia/o è obbligatorio per il Ruolo Genitore.",
        },
      };
    }

    if (!isCodiceFiscaleValido(codiceFiscaleFiglio)) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Codice Fiscale della figlia/o non valido (deve essere di 16 caratteri alfanumerici).",
        },
      };
    }

    // Deviazione documentata da AD-9 (vedi Dev Notes Story 1.5): il Genitore
    // non ha ancora una sessione a questo punto (siamo prima del signUp) ne'
    // avra' mai, con questa storia, una policy RLS che gli permetta di
    // leggere "atlete" con la propria sessione - si usa quindi il client
    // service-role solo per questo lookup puntuale, mai esposto al client.
    let atleta;
    try {
      atleta = await trovaPerCodiceFiscale(createAdminClient(), codiceFiscaleFiglio);
    } catch {
      return {
        error: {
          code: "INTERNAL",
          message: "Impossibile completare la registrazione. Riprova.",
        },
      };
    }

    if (!atleta) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Nessuna Atleta trovata con questo Codice Fiscale. Verifica di aver inserito il codice corretto.",
        },
      };
    }

    atletaDaAgganciare = atleta;
  }

  // Story 2.7: l'Atleta si registra per se stessa. Stesso identico
  // ragionamento del blocco GENITORE sopra (CF obbligatorio, risolto prima
  // del signUp, un mismatch blocca l'intera registrazione) - variabile
  // separata perche' i due blocchi possono coesistere indipendentemente se
  // un Utente selezionasse sia ATLETA sia GENITORE (es. un'atleta maggiorenne
  // che e' anche genitore di un'altra atleta - caso raro ma non impedito dal
  // form). GenitoreAtleta e' riusata deliberatamente qui nonostante il nome:
  // la sua funzione reale e' "correla un Utente a un'Atleta", non
  // specificamente un genitore - vedi Dev Notes Story 2.7 per il
  // ragionamento completo (nessuna migrazione, nessuna nuova policy RLS
  // necessaria, a differenza di un ipotetico Atleta.utenteId).
  let atletaPropriaDaAgganciare: { id: string } | null = null;
  if (ruoli.includes("ATLETA")) {
    if (!codiceFiscaleAtleta) {
      return {
        error: {
          code: "VALIDATION",
          message: "Il tuo Codice Fiscale è obbligatorio per il Ruolo Atleta.",
        },
      };
    }

    if (!isCodiceFiscaleValido(codiceFiscaleAtleta)) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Codice Fiscale non valido (deve essere di 16 caratteri alfanumerici).",
        },
      };
    }

    let atletaPropria;
    try {
      atletaPropria = await trovaPerCodiceFiscale(
        createAdminClient(),
        codiceFiscaleAtleta
      );
    } catch {
      return {
        error: {
          code: "INTERNAL",
          message: "Impossibile completare la registrazione. Riprova.",
        },
      };
    }

    if (!atletaPropria) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Nessuna Atleta trovata con questo Codice Fiscale. Verifica di aver inserito il tuo Codice Fiscale corretto.",
        },
      };
    }

    atletaPropriaDaAgganciare = atletaPropria;
  }

  const supabase = await createClient();

  let data, error;
  try {
    ({ data, error } = await supabase.auth.signUp({ email, password }));
  } catch {
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    };
  }

  // AC #1/#4: a seconda della versione/config di Supabase Auth, l'email
  // duplicata può arrivare come errore esplicito (`user_already_exists`) o,
  // per non permettere l'enumerazione delle email, in modo silenzioso
  // (nessun errore, ma `identities` vuoto) - vanno gestiti entrambi i casi.
  if (error) {
    if (error.code === "user_already_exists") {
      return {
        error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
      };
    }
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    };
  }

  if (!data.user) {
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    };
  }

  if (data.user.identities && data.user.identities.length === 0) {
    return {
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    };
  }

  try {
    // AC #1: crea il record Utente + Ruoli via Prisma (Utente non e' protetto
    // da RLS, AD-9 - gestibile via Prisma diretto).
    const utente = await prisma.utente.create({
      data: {
        supabaseAuthId: data.user.id,
        email,
        ruoli: { create: ruoli.map((ruolo) => ({ ruolo })) },
      },
    });

    // AD-11: specchia i Ruoli su app_metadata per le letture edge-safe nel Proxy.
    await sincronizzaRuoliAppMetadata(data.user.id, ruoli);

    // Story 1.4 AC #3/#4: aggancio a un Allenatore precaricato - solo se il
    // Ruolo Allenatore e' selezionato e viene fornito un Codice Fiscale. Se
    // non corrisponde a nessun precaricamento (o e' gia' agganciato a un
    // altro Utente), la registrazione procede comunque normalmente, nessun
    // record viene creato qui (fuori scope, vedi Dev Notes).
    if (ruoli.includes("ALLENATORE") && codiceFiscaleAllenatore) {
      const allenatore = await trovaAllenatorePerCodiceFiscale(
        codiceFiscaleAllenatore
      );
      if (allenatore && !allenatore.utenteId) {
        await prisma.allenatore.update({
          where: { id: allenatore.id },
          data: { utenteId: utente.id },
        });
      }
    }

    // Story 1.5 AC #1/#4: l'Atleta e' gia' stata risolta e validata prima
    // del signUp - qui si crea solo il record di collegamento (relazione
    // molti-a-molti, nessun vincolo che impedisca a un secondo Genitore di
    // agganciarsi alla stessa Atleta).
    if (atletaDaAgganciare) {
      await prisma.genitoreAtleta.create({
        data: { utenteId: utente.id, atletaId: atletaDaAgganciare.id },
      });
    }

    // Story 2.7: aggancio dell'Atleta a se stessa, indipendente dal blocco
    // GENITORE sopra. autoAggancio: true (Story 3.2 review fix) - distingue
    // questo aggancio da quello Genitore<->figlia sopra: la policy RLS
    // "atleta_propria_select" su "presenze" (Story 3.2) verifica questo
    // flag per concedere lettura SOLO per la propria Atleta, mai per una
    // figlia, anche quando lo stesso Utente ha entrambi i Ruoli.
    if (atletaPropriaDaAgganciare) {
      await prisma.genitoreAtleta.create({
        data: {
          utenteId: utente.id,
          atletaId: atletaPropriaDaAgganciare.id,
          autoAggancio: true,
        },
      });
    }
  } catch {
    // Decisione: nessun rollback automatico. L'utente Supabase Auth puo'
    // restare senza un Utente/Ruoli completo (registrazione a meta') - un
    // ritentativo con la stessa email urtera' contro "Email gia' registrata"
    // finche' non viene ripulito manualmente. Accettato per questa storia:
    // vedi Review Findings nella story 1.1.
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    };
  }

  redirect("/");
}
