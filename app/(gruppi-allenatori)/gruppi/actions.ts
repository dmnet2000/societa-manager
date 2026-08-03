"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import {
  risolviAnnoAgonisticoCorrente,
  trovaAnnoAgonisticoCorrente,
} from "@/lib/anno-agonistico";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import { creaAtleta } from "@/lib/db-rls/atleta";
import { creaNotifica } from "@/lib/db-rls/notifica";
import { isCodiceFiscaleValido } from "@/lib/matching-codice-fiscale/valida-codice-fiscale";
import { estraiSessoDaCodiceFiscale } from "@/lib/matching-codice-fiscale/estrai-sesso-da-codice-fiscale";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type GruppoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const NON_GESTISCE_GRUPPO = {
  code: "FORBIDDEN",
  message: "Non gestisci questo Gruppo.",
};

// Story 9.15: autorizzazione a due livelli per assegnaAtleta/rimuoviAtleta,
// scritta localmente in questo modulo invece di importare
// risolviAutorizzazioneGruppo (app/(partite-campionati)/autorizzazione.ts,
// Epic 10) - stessa forma logica (Admin/Dirigente ampio, Allenatore
// verificato via GruppoAllenatore), ma Gruppo/GruppoAtleta/GruppoAllenatore
// sono di proprieta' di (gruppi-allenatori) (AD-2), un helper per QUESTO
// modulo non va condiviso tra moduli. Va chiamata DOPO la risoluzione del
// Gruppo gia' esistente in assegnaAtleta/rimuoviAtleta (recupero di
// annoAgonisticoId), non la duplica - passato come parametro.
async function risolviPossessoGruppo(
  gruppoId: string,
  annoAgonisticoIdGruppo: string
): Promise<{ ok: true } | { ok: false; error: { code: string; message: string } }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
    }

    const ruoli = parseRuoli(user?.app_metadata?.ruoli);
    if (ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE")) {
      return { ok: true };
    }

    const allenatore = user
      ? await prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        })
      : null;

    if (!allenatore) {
      return { ok: false, error: NON_GESTISCE_GRUPPO };
    }

    // Review fix (code review Story 9.15): le righe GruppoAllenatore non
    // vengono mai ripulite al cambio stagione (stesso fatto gia' documentato
    // in app/(partite-campionati)/autorizzazione.ts) - senza questo
    // confronto un Allenatore manterrebbe per sempre il possesso di un
    // Gruppo di una stagione passata, potendo riscrivere GruppoAtleta di
    // quella stagione chiusa tramite un gruppoId manomesso. Solo per il ramo
    // Allenatore: Admin/Dirigente restano ad accesso ampio invariato (AC #3).
    const annoCorrente = await trovaAnnoAgonisticoCorrente();
    if (!annoCorrente || annoAgonisticoIdGruppo !== annoCorrente.id) {
      return { ok: false, error: NON_GESTISCE_GRUPPO };
    }

    const possiede = await prisma.gruppoAllenatore.findUnique({
      where: { gruppoId_allenatoreId: { gruppoId, allenatoreId: allenatore.id } },
    });

    if (!possiede) {
      return { ok: false, error: NON_GESTISCE_GRUPPO };
    }

    return { ok: true };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Impossibile verificare i permessi. Riprova." },
    };
  }
}

// AC #1/#2: FR-6 ammette Dirigente o Admin. Gruppo non e' protetto da RLS
// (AD-9) - Prisma diretto, stesso pattern di creaPalestra (Story 2.1).
export async function creaGruppo(
  _prevState: GruppoActionState,
  formData: FormData
): Promise<GruppoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();

  // Review fix: due controlli distinti invece di uno solo - altrimenti una
  // categoria mancante veniva segnalata con lo stesso messaggio di un nome
  // vuoto, fuorviante rispetto alla causa reale (stesso fix già applicato a
  // creaCampo, Story 2.1).
  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome del Gruppo è obbligatorio." },
    };
  }
  if (!categoria) {
    return {
      error: { code: "VALIDATION", message: "La categoria del Gruppo è obbligatoria." },
    };
  }

  try {
    // AC #2: risolve/crea l'Anno Agonistico corrente prima del Gruppo (AD-8,
    // motore condiviso gia' riusato da confermaIscrizione, Story 1.6) - non
    // reimplementare questa logica qui.
    const anno = await risolviAnnoAgonisticoCorrente();
    await prisma.gruppo.create({
      data: { nome, categoria, annoAgonisticoId: anno.id },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare il Gruppo. Riprova." },
    };
  }

  revalidatePath("/gruppi");
  return { success: true };
}

// AC #1/#2: FR-7 ammette Dirigente o Admin. GruppoAllenatore non e'
// protetta da RLS (AD-9) - Prisma diretto, stesso pattern di creaGruppo.
export async function assegnaAllenatore(
  _prevState: GruppoActionState,
  formData: FormData
): Promise<GruppoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const gruppoId = String(formData.get("gruppoId") ?? "");
  const allenatoreId = String(formData.get("allenatoreId") ?? "");

  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }
  if (!allenatoreId) {
    return { error: { code: "VALIDATION", message: "Allenatore non specificato." } };
  }

  try {
    await prisma.gruppoAllenatore.create({ data: { gruppoId, allenatoreId } });
  } catch (err) {
    // AC #3: idempotente - un'assegnazione gia' esistente viola
    // @@unique([gruppoId, allenatoreId]) (Prisma P2002), trattato come
    // successo invece di un check-then-insert che lascerebbe una finestra
    // di race (stesso pattern di inserisciIscrizione, Story 1.6).
    if ((err as { code?: string }).code !== "P2002") {
      console.error(err);
      return {
        error: { code: "INTERNAL", message: "Impossibile assegnare l'Allenatore. Riprova." },
      };
    }
  }

  revalidatePath("/gruppi");
  return { success: true };
}

// AC #1/#2/#3: FR-30 ammette Dirigente o Admin, analogo a FR-7. GruppoAtleta
// non e' protetta da RLS (AD-9) nonostante la FK verso Atleta (RLS-protetta,
// AD-4) - stesso principio di GenitoreAtleta (Story 1.5): la FK e' solo un
// vincolo di integrita' referenziale, non un permesso di lettura.
export async function assegnaAtleta(
  _prevState: GruppoActionState,
  formData: FormData
): Promise<GruppoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const gruppoId = String(formData.get("gruppoId") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");

  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }
  if (!atletaId) {
    return { error: { code: "VALIDATION", message: "Atleta non specificata." } };
  }

  let gruppo: { annoAgonisticoId: string } | null;
  try {
    // Serve l'annoAgonisticoId del Gruppo target (impostato alla sua
    // creazione, Story 2.2) - non risolviAnnoAgonisticoCorrente(): il Gruppo
    // esiste gia' e porta con se' la propria stagione. Dentro il try: un
    // errore di connessione qui non deve mai propagarsi come eccezione non
    // gestita (review fix - prima era fuori dal blocco try/catch).
    gruppo = await prisma.gruppo.findUnique({
      where: { id: gruppoId },
      select: { annoAgonisticoId: true },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile assegnare l'Atleta. Riprova." },
    };
  }
  if (!gruppo) {
    return { error: { code: "VALIDATION", message: "Gruppo non trovato." } };
  }

  // Story 9.15 (AC #2): Admin/Dirigente restano ad accesso ampio, un
  // Allenatore puo' agire solo sul proprio Gruppo (GruppoAllenatore) della
  // stagione corrente.
  const possesso = await risolviPossessoGruppo(gruppoId, gruppo.annoAgonisticoId);
  if (!possesso.ok) {
    return { error: possesso.error };
  }

  try {
    // Story 9.21: upsert sulla chiave composita (atletaId, gruppoId,
    // annoAgonisticoId) - un'Atleta puo' ora essere assegnata a piu' Gruppi
    // contemporaneamente nella stessa stagione (decisione esplicita
    // dell'utente: assegnaAtleta non "sposta" piu' nulla, e' sempre
    // additiva). Riassegnare allo stesso Gruppo trova la riga esistente e la
    // "aggiorna" con gli stessi valori (no-op idempotente, AC #2/#3);
    // assegnarla a un Gruppo diverso crea una nuova riga senza toccare le
    // altre (AC #1) - un unico passo atomico, non un check-then-write con
    // una finestra di race.
    await prisma.gruppoAtleta.upsert({
      where: {
        atletaId_gruppoId_annoAgonisticoId: {
          atletaId,
          gruppoId,
          annoAgonisticoId: gruppo.annoAgonisticoId,
        },
      },
      create: { atletaId, gruppoId, annoAgonisticoId: gruppo.annoAgonisticoId },
      update: { gruppoId },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile assegnare l'Atleta. Riprova." },
    };
  }

  // Review fix (code review Story 9.15): senza revalidatePath("/i-miei-gruppi")
  // la pagina self-service dell'Allenatore restava con dati non aggiornati
  // dopo un'assegnazione riuscita - Next.js 16 non rinfresca automaticamente
  // la route chiamante senza un revalidatePath/refresh() esplicito.
  revalidatePath("/gruppi");
  revalidatePath("/i-miei-gruppi");
  return { success: true };
}

// Story 9.14 (AC #1): GruppoAtleta e' una tabella di giunzione pura, nessuna
// riga dipendente altrove nello schema (a differenza di Allenatore/Slot,
// Story 9.9/9.13) - nessun guard di blocco necessario, la cancellazione non
// perde storico ne' richiede un hard-delete di un'entita' di dominio.
export async function rimuoviAtleta(
  _prevState: GruppoActionState,
  formData: FormData
): Promise<GruppoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const gruppoId = String(formData.get("gruppoId") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");

  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }
  if (!atletaId) {
    return { error: { code: "VALIDATION", message: "Atleta non specificata." } };
  }

  let gruppo: { annoAgonisticoId: string } | null;
  try {
    // Stesso blocco di risoluzione dell'annoAgonisticoId gia' usato in
    // assegnaAtleta - non reinventarlo.
    gruppo = await prisma.gruppo.findUnique({
      where: { id: gruppoId },
      select: { annoAgonisticoId: true },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile rimuovere l'Atleta. Riprova." },
    };
  }
  if (!gruppo) {
    return { error: { code: "VALIDATION", message: "Gruppo non trovato." } };
  }

  // Story 9.15 (AC #2): stesso principio di assegnaAtleta - un Allenatore
  // puo' rimuovere Atlete solo dal proprio Gruppo della stagione corrente.
  const possesso = await risolviPossessoGruppo(gruppoId, gruppo.annoAgonisticoId);
  if (!possesso.ok) {
    return { error: possesso.error };
  }

  try {
    // deleteMany (non delete su una chiave univoca): idempotente, non lancia
    // se la riga non esiste piu' (doppio submit, o l'Atleta e' gia' stata
    // rimossa/riassegnata altrove) - AC #1 non richiede che l'assegnazione
    // esista ancora, solo che non esista piu' dopo la chiamata.
    await prisma.gruppoAtleta.deleteMany({
      where: { atletaId, annoAgonisticoId: gruppo.annoAgonisticoId, gruppoId },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile rimuovere l'Atleta. Riprova." },
    };
  }

  revalidatePath("/gruppi");
  revalidatePath("/i-miei-gruppi");
  return { success: true };
}

// Story 9.18 (AC #1-#4): un Allenatore crea una nuova Atleta non ancora in
// anagrafica direttamente dalla pagina del proprio Gruppo (/i-miei-gruppi)
// e la assegna contestualmente - AD-10 esteso (deciso con l'utente, vedi
// ARCHITECTURE-SPINE.md): questa e' la seconda funzione, oltre a
// Onboarding-Import, autorizzata a richiamare creaAtleta() condivisa.
export async function creaEAssegnaAtleta(
  _prevState: GruppoActionState,
  formData: FormData
): Promise<GruppoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const gruppoId = String(formData.get("gruppoId") ?? "");
  const cognome = String(formData.get("cognome") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const dataNascitaGrezza = String(formData.get("dataNascita") ?? "").trim();
  const codiceFiscale = String(formData.get("codiceFiscale") ?? "")
    .trim()
    .toUpperCase();
  const email = String(formData.get("email") ?? "").trim();
  const cellulare = String(formData.get("cellulare") ?? "").trim();

  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }
  if (!cognome) {
    return { error: { code: "VALIDATION", message: "Il cognome è obbligatorio." } };
  }
  if (!nome) {
    return { error: { code: "VALIDATION", message: "Il nome è obbligatorio." } };
  }
  if (!dataNascitaGrezza) {
    return {
      error: { code: "VALIDATION", message: "La data di nascita è obbligatoria." },
    };
  }
  // Review fix (code review Story 9.18): un valore non parsabile (bypass del
  // widget <input type="date">) produceva un Invalid Date che poi lanciava un
  // RangeError dentro creaAtleta/serializza (.toISOString()), mascherato
  // dall'errore generico INTERNAL invece di un errore di validazione chiaro.
  const dataNascita = new Date(dataNascitaGrezza);
  if (Number.isNaN(dataNascita.getTime())) {
    return {
      error: { code: "VALIDATION", message: "Data di nascita non valida." },
    };
  }
  if (!codiceFiscale) {
    return {
      error: { code: "VALIDATION", message: "Il codice fiscale è obbligatorio." },
    };
  }
  if (!isCodiceFiscaleValido(codiceFiscale)) {
    return { error: { code: "VALIDATION", message: "Codice fiscale non valido." } };
  }

  // AC #1: sesso derivato dal Codice Fiscale (posizioni 9-10), non richiesto
  // esplicitamente all'Allenatore - vedi Dev Notes story file per i limiti
  // (omocodia non gestita).
  const sesso = estraiSessoDaCodiceFiscale(codiceFiscale);
  if (!sesso) {
    return {
      error: {
        code: "VALIDATION",
        message:
          "Impossibile determinare il sesso dal codice fiscale inserito. Verifica il codice fiscale.",
      },
    };
  }

  let gruppo: { annoAgonisticoId: string } | null;
  try {
    // Stesso blocco di risoluzione dell'annoAgonisticoId gia' usato in
    // assegnaAtleta - non reinventarlo.
    gruppo = await prisma.gruppo.findUnique({
      where: { id: gruppoId },
      select: { annoAgonisticoId: true },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'Atleta. Riprova." },
    };
  }
  if (!gruppo) {
    return { error: { code: "VALIDATION", message: "Gruppo non trovato." } };
  }

  // AC #4: stesso principio di autorizzazione di assegnaAtleta/rimuoviAtleta
  // - un Allenatore puo' creare/assegnare solo sul proprio Gruppo.
  const possesso = await risolviPossessoGruppo(gruppoId, gruppo.annoAgonisticoId);
  if (!possesso.ok) {
    return { error: possesso.error };
  }

  const supabase = await createClient();

  // AC #2: Codice Fiscale duplicato - Atleta.codiceFiscale e' gia' @unique,
  // ma un controllo esplicito qui produce un messaggio chiaro invece di un
  // errore generico di vincolo DB propagato da creaAtleta. Review fix (code
  // review Story 9.18): usa il client supabase (RLS, AD-9) invece di Prisma
  // diretto - Atleta e' protetta da RLS e non e' tra le tabelle ammesse per
  // l'accesso privilegiato a runtime; le policy SELECT esistenti coprono gia'
  // sia ADMIN/DIRIGENTE/SEGRETERIA sia ALLENATORE (Story 9.16).
  let esistente: { id: string } | null;
  try {
    const { data, error } = await supabase
      .from("atlete")
      .select("id")
      .eq("codiceFiscale", codiceFiscale)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    esistente = data;
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'Atleta. Riprova." },
    };
  }
  if (esistente) {
    return {
      error: {
        code: "VALIDATION",
        message: "Esiste già un'Atleta con questo Codice Fiscale.",
      },
    };
  }

  let nuovaAtletaId: string;
  try {
    // "nome" resta un'unica colonna (nessuna colonna "cognome" separata,
    // Dev Notes) - stesso formato "Cognome e Nome" gia' usato dall'import
    // federale (Story 1.2, import-atlete/parser.ts).
    nuovaAtletaId = await creaAtleta(supabase, {
      codiceFiscale,
      nome: `${cognome} ${nome}`,
      sesso,
      dataNascita,
      email: email || null,
      cellulare: cellulare || null,
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'Atleta. Riprova." },
    };
  }

  try {
    // Stesso upsert atomico sulla chiave composita gia' usato in
    // assegnaAtleta (Story 9.21: atletaId+gruppoId+annoAgonisticoId) -
    // l'assegnazione e' parte della garanzia primaria di AC #1 ("...creata e
    // assegnata..."), un suo fallimento va riportato come errore (a
    // differenza della notifica sotto, effetto collaterale). Il ramo
    // `update` resta di fatto irraggiungibile qui: nuovaAtletaId e' appena
    // stata creata, non puo' gia' avere una riga GruppoAtleta.
    await prisma.gruppoAtleta.upsert({
      where: {
        atletaId_gruppoId_annoAgonisticoId: {
          atletaId: nuovaAtletaId,
          gruppoId,
          annoAgonisticoId: gruppo.annoAgonisticoId,
        },
      },
      create: {
        atletaId: nuovaAtletaId,
        gruppoId,
        annoAgonisticoId: gruppo.annoAgonisticoId,
      },
      update: { gruppoId },
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile assegnare la nuova Atleta al Gruppo. Riprova.",
      },
    };
  }

  // AC #3: effetto collaterale non bloccante, stesso identico pattern gia'
  // stabilito in certificato-medico/actions.ts (Story 4.2/4.3) - un
  // fallimento qui non deve mai far fallire la creazione+assegnazione gia'
  // riuscita.
  try {
    await creaNotifica(supabase, nuovaAtletaId, "NUOVO_ATLETA");
  } catch (err) {
    console.error(err);
  }

  // Review fix (code review Story 9.18): stessa coppia di revalidatePath gia'
  // usata da assegnaAtleta/rimuoviAtleta - requireRuolo ammette anche
  // ADMIN/DIRIGENTE per questa action, che vedono il roster anche in /gruppi.
  revalidatePath("/gruppi");
  revalidatePath("/i-miei-gruppi");
  return { success: true };
}
