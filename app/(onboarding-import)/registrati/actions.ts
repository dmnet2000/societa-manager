"use server";

import { headers } from "next/headers";
import type { Ruolo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sincronizzaRuoliAppMetadata } from "@/lib/auth-admin/sync-roles";
import { RUOLI_VALIDI } from "@/lib/ruoli";
import {
  isCodiceFiscaleValido,
  trovaAllenatorePerCodiceFiscale,
  trovaPerCodiceFiscale,
} from "@/lib/matching-codice-fiscale";
import {
  normalizzaEmailRuolo,
  trovaPrecaricamentoRuolo,
  RUOLI_BLOCCATI_SENZA_PRECARICAMENTO,
} from "@/lib/matching-email-ruolo";
import { createAdminClient } from "@/lib/auth-admin/client";
import { inviaEmail } from "@/lib/email/invia-email";
import { elencaEmailPerRuolo } from "@/lib/utenti/email-per-ruolo";

// Spec "Gate di conferma Admin per l'auto-registrazione di Ruoli sensibili":
// derivato per differenza (fail-safe) invece di elencare i 4 Ruoli sensibili
// a mano (fail-open, review fix Blind Hunter) - un futuro ottavo Ruolo senza
// aggancio CF finisce automaticamente sotto il gate anche se nessuno
// aggiorna questa lista, invece di bypassarlo silenziosamente. Riusa il
// meccanismo Utente.attivo gia' esistente (default true, controllato
// fail-closed al login, toggle Attiva/Disattiva gia' in /app/admin) invece
// di introdurre un nuovo campo/stato.
const RUOLI_CON_AGGANCIO_CF: Ruolo[] = ["ALLENATORE", "ATLETA", "GENITORE"];

// Review fix (Blind Hunter): etichette italiane per la mail di notifica agli
// Admin - prima mostrava i valori grezzi dell'enum (es. "DIRIGENTE"),
// incoerente con il resto del prodotto (stesse etichette gia' in uso nelle
// checkbox di NuovoUtenteForm.tsx/UtenteRow.tsx, non importabili qui perche'
// Client Component).
const ETICHETTA_RUOLO: Record<Ruolo, string> = {
  ALLENATORE: "Allenatore",
  ATLETA: "Atleta",
  GENITORE: "Genitore",
  SEGRETERIA: "Segreteria",
  DIRIGENTE: "Dirigente",
  ADMIN: "Admin",
  SITE_MANAGER: "Site manager",
};

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione (non usato qui: login/registrazione non fanno controlli
// di autorizzazione, solo autenticazione/validazione). Story 11.4: mirror
// esatto di RecuperaPasswordState (recupera-password/actions.ts) - il
// successo non fa piu' redirect diretto (conferma email richiesta, vedi
// Dev Notes della storia), mostra invece un messaggio.
export type RegistrazioneState =
  | { successo: true; messaggio: string; error?: undefined }
  | { successo?: undefined; messaggio?: undefined; error: { code: string; message: string } }
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

  // Story 9.41: controllo di precaricamento per Segreteria/Dirigente, PRIMA
  // di generateLink (stesso ordine gia' seguito sopra per il CF obbligatorio
  // di Genitore/Atleta) - mai un account Supabase Auth creato per una
  // registrazione poi rifiutata. Tutti i Ruoli bloccati selezionati devono
  // avere una riga precaricata: manca anche uno solo -> rifiutata, nominando
  // il/i Ruolo/i mancante/i. Rieseguito anche su un reinvio (vedi Design
  // Notes dello spec): innocuo, le righe precaricate esistono ancora.
  const ruoliBloccatiSelezionati = ruoli.filter((r) =>
    RUOLI_BLOCCATI_SENZA_PRECARICAMENTO.includes(r)
  );
  if (ruoliBloccatiSelezionati.length > 0) {
    const ruoliMancanti: Ruolo[] = [];
    try {
      for (const ruolo of ruoliBloccatiSelezionati) {
        const precaricamento = await trovaPrecaricamentoRuolo(email, ruolo);
        if (!precaricamento) {
          ruoliMancanti.push(ruolo);
        }
      }
    } catch {
      return {
        error: {
          code: "INTERNAL",
          message: "Impossibile completare la registrazione. Riprova.",
        },
      };
    }
    if (ruoliMancanti.length > 0) {
      // Review fix (Blind Hunter + Acceptance Auditor): "il Ruolo X, Y" era
      // grammaticalmente errato quando mancava più di un Ruolo (articolo
      // singolare con un elenco plurale) - "il/i" concorda ora col numero
      // di Ruoli mancanti.
      const etichettaRuoli = ruoliMancanti.map((r) => ETICHETTA_RUOLO[r]).join(", ");
      const articolo = ruoliMancanti.length > 1 ? "i Ruoli" : "il Ruolo";
      return {
        error: {
          code: "VALIDATION",
          message: `Questa email non è precaricata per ${articolo} ${etichettaRuoli}. Contatta un Admin.`,
        },
      };
    }
  }

  // Story 11.4: generateLink (Admin API, service-role) invece di
  // supabase.auth.signUp() col client di sessione - crea comunque l'utente
  // Supabase Auth (non confermato) ma SENZA inviare l'email nativa di
  // Supabase (mai usata in questo progetto, stesso motivo di
  // richiediRecuperoPassword in recupera-password/actions.ts). L'email di
  // conferma viene inviata piu' sotto, dopo la creazione dei record Prisma,
  // con l'SMTP applicativo e un link/token_hash proprio (non soggetto al
  // flusso PKCE di Supabase - vedi Dev Notes della storia per il motivo
  // preciso per cui questo risolve il sintomo Safari/iOS).
  const admin = createAdminClient();

  let data, error;
  try {
    ({ data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
    }));
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
  // Non verificato empiricamente con generateLink (Admin API) invece di
  // signUp() - mantenuto lo stesso controllo per prudenza (vedi Dev Notes
  // della storia, Task 1: nessun ambiente disponibile in questa sessione
  // per verificarlo senza toccare la produzione).
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

  // Review fix (code review Story 11.4, decision-needed risolto con
  // l'utente): se un Utente Prisma per questo supabaseAuthId esiste gia',
  // questo NON e' un nuovo tentativo di registrazione ma un REINVIO del
  // link di conferma per un account creato in un tentativo precedente
  // rimasto non confermato (email di conferma fallita, o link scaduto
  // prima che l'Utente lo aprisse - il sintomo Safari/iOS di questa
  // storia rende quest'ultimo caso probabile). generateLink su un Utente
  // Supabase esistente ma NON confermato ha gia' restituito successo sopra
  // (non un errore "user_already_exists", riservato agli account gia'
  // confermati) con un hashed_token fresco - saltare prisma.utente.create
  // (che urterebbe il vincolo unique su supabaseAuthId, il vicolo cieco
  // segnalato in review) ed andare direttamente al reinvio dell'email e'
  // la correzione. Ruoli/aggancio del primo tentativo restano quelli gia'
  // salvati - un reinvio non modifica la registrazione in corso, solo il
  // link di conferma.
  const utenteEsistente = await prisma.utente
    .findUnique({ where: { supabaseAuthId: data.user.id } })
    .catch(() => null);

  if (!utenteEsistente) {
    try {
      // Spec "Gate di conferma Admin": conteggio degli Admin ATTIVI (non
      // "tutti gli Admin mai creati") - serve sia per decidere se il gate
      // scatta sia per l'eccezione di bootstrap sotto. Pattern di
      // riferimento: contaAltriAdminAttivi in
      // app/app/(amministrazione)/admin/actions.ts (qui pero' senza
      // esclusione, l'Utente non esiste ancora).
      const numeroAdminAttivi = await prisma.utente.count({
        where: { attivo: true, ruoli: { some: { ruolo: "ADMIN" } } },
      });
      // Story 9.41: Segreteria/Dirigente escluse dal gate "Ruoli sensibili" -
      // per loro il precaricamento (controllo gia' superato sopra) sostituisce
      // interamente l'attivazione manuale Admin. Admin/Site Manager restano
      // sensibili, invariato.
      const ruoloSensibile = ruoli.some(
        (r) =>
          !RUOLI_CON_AGGANCIO_CF.includes(r) &&
          !RUOLI_BLOCCATI_SENZA_PRECARICAMENTO.includes(r)
      );
      // Eccezione bootstrap: se non esiste alcun Admin attivo (nessuno mai
      // registrato, o l'unico esistente e' stato disattivato), il nuovo
      // Admin parte attivo - altrimenti nessuno potrebbe mai confermare
      // nessuno, incluso se stesso. Limite noto e accettato (review fix,
      // Blind Hunter + Edge Case Hunter, deciso con l'utente): l'eccezione
      // copre solo ADMIN - una registrazione con SOLO un altro Ruolo
      // sensibile (Dirigente/Segreteria/Site Manager) mentre zero Admin sono
      // attivi resterebbe attivo:false senza alcun Admin a cui notificare.
      // Rischio ritenuto vicino al teorico in questo progetto (richiede che
      // TUTTI gli Admin vengano disattivati), non risolto qui - vedi
      // deferred-work.md. Recupero in quel caso: intervento diretto sul
      // database, come per la perdita dell'ultimo Admin di qualunque sistema.
      const bootstrap = ruoli.includes("ADMIN") && numeroAdminAttivi === 0;

      // AC #1: crea il record Utente + Ruoli via Prisma (Utente non e' protetto
      // da RLS, AD-9 - gestibile via Prisma diretto).
      const utente = await prisma.utente.create({
        data: {
          supabaseAuthId: data.user.id,
          email,
          attivo: !ruoloSensibile || bootstrap,
          ruoli: { create: ruoli.map((ruolo) => ({ ruolo })) },
        },
      });

      // Review fix (Blind Hunter): spostata subito dopo la create, prima
      // degli altri effetti collaterali sotto (sincronizzaRuoliAppMetadata,
      // aggancio Allenatore/Genitore/Atleta) - se uno di quelli lancia, il
      // ramo catch esterno la saltava comunque, ma un ritentativo con la
      // stessa email prende il ramo `utenteEsistente` (sopra), che non la
      // riesegue mai: la notifica sarebbe andata persa per sempre nonostante
      // l'Utente attivo:false fosse gia' stato creato. Qui il rischio di
      // salto e' minimo (nessun await tra la create e questo blocco).
      if (ruoloSensibile && !bootstrap) {
        try {
          const emailAdmin = await elencaEmailPerRuolo("ADMIN");
          await inviaEmail({
            destinatario: emailAdmin,
            oggetto: "Nuova registrazione da confermare",
            testo: `${email} si e' registrato/a con un Ruolo che richiede conferma (${ruoli.map((r) => ETICHETTA_RUOLO[r]).join(", ")}). Accedi a /app/admin per attivarlo/a.`,
          });
        } catch (err) {
          console.error(
            `[registrati] notifica agli Admin del gate di conferma fallita per ${email}`,
            err
          );
        }
      }

      // AD-11: specchia i Ruoli su app_metadata per le letture edge-safe nel Proxy.
      await sincronizzaRuoliAppMetadata(data.user.id, ruoli);

      // Story 9.41: claim delle righe PrecaricamentoRuolo per i Ruoli
      // bloccati effettivamente selezionati - solo qui, nel ramo "prima
      // creazione" (mai su un reinvio, stessa posizione del claim Allenatore
      // sotto, nessun rischio di doppio claim su un retry). La guardia
      // utenteId:null e' puramente difensiva (no-op per costruzione: il
      // controllo sopra ha gia' verificato che le righe esistono, e non
      // possono essere gia' agganciate - vedi Design Notes dello spec).
      for (const ruolo of ruoliBloccatiSelezionati) {
        await prisma.precaricamentoRuolo.updateMany({
          where: { email: normalizzaEmailRuolo(email), ruolo, utenteId: null },
          data: { utenteId: utente.id },
        });
      }

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
      // ritentativo con la stessa email trova ora l'Utente assente e riprova
      // la creazione da capo (stesso ramo `if (!utenteEsistente)`), non piu'
      // un vicolo cieco. Accettato per questa storia: vedi Review Findings
      // nella story 1.1.
      return {
        error: {
          code: "INTERNAL",
          message: "Impossibile completare la registrazione. Riprova.",
        },
      };
    }
  }

  // Story 11.4 (AC #1): link proprio con token_hash (mai action_link, non
  // gestito dall'adapter cookie di questa app) - mirror esatto di
  // richiediRecuperoPassword (recupera-password/actions.ts).
  // Review fix: costruzione del link avvolta in un try/catch - a questo
  // punto l'Utente Supabase Auth e i record Prisma sono gia' stati creati
  // (o gia' esistenti, ramo reinvio sopra); se la forma della risposta di
  // generateLink si discostasse da quella assunta (data.properties assente/
  // malformato - non verificato empiricamente, vedi sopra) o headers()
  // lanciasse, la Server Action lanciava non gestita invece di restituire
  // lo stesso {error: {...}} amichevole garantito ovunque nel resto della
  // funzione.
  let link: string;
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    if (!data.properties?.hashed_token) {
      throw new Error("generateLink: hashed_token mancante nella risposta");
    }
    link = `${proto}://${host}/conferma-registrazione?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
  } catch (err) {
    console.error(`[registrati] costruzione del link di conferma fallita per ${email}`, err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    };
  }

  // Story 11.4 (AC #5): try/catch separato da quello sopra - a questo punto
  // l'utente Supabase Auth e i record Prisma sono gia' stati creati, un
  // fallimento qui (SMTP applicativo non configurato/irraggiungibile) non
  // deve mostrare un falso successo, ma nemmeno tentare un rollback (nessun
  // meccanismo esiste in questo codice, stessa politica di sopra).
  try {
    await inviaEmail({
      destinatario: email,
      oggetto: "Conferma la tua registrazione",
      testo: `Per completare la registrazione, apri questo link: ${link}\n\nSe non hai richiesto tu questa registrazione, ignora questa email.`,
    });
  } catch (err) {
    // Review fix: identificativo (email) aggiunto al log - senza, lo staff
    // non aveva modo di rintracciare la registrazione bloccata da questo
    // fallimento (AC #5, "Contatta la segreteria" presupponeva che fosse
    // possibile trovarla).
    console.error(`[registrati] invio email di conferma fallito per ${email}`, err);
    // Review fix: messaggio ora onesto (AC #5, "invita l'Utente a
    // riprovare") - un nuovo tentativo con la stessa email ora reinvia
    // davvero l'email (vedi il ramo utenteEsistente sopra), non e' piu' un
    // vicolo cieco come prima di questo fix.
    return {
      error: {
        code: "EMAIL_NON_INVIATA",
        message:
          "Registrazione creata ma impossibile inviare l'email di conferma. Riprova tra qualche minuto o contatta la segreteria.",
      },
    };
  }

  return {
    successo: true,
    messaggio: "Registrazione quasi completata: controlla la tua email e apri il link per accedere.",
  };
}
