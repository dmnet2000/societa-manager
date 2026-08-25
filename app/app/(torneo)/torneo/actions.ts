"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import { caricaVolantinoTorneo } from "@/lib/storage/volantino-torneo";
import { validaFileImmagine } from "@/lib/storage/validazione-immagine";
import {
  trovaEdizioneTorneoPerId,
  creaEdizioneTorneo,
  cancellaEdizioneTorneo,
  creaCategoriaTorneo,
  aggiornaCategoriaTorneo,
  cancellaCategoriaTorneo,
  trovaCategoriaTorneoPerId,
  contaSquadreTorneo,
  creaSquadraTorneo,
  aggiornaSquadraTorneo,
  cancellaSquadraTorneo,
  trovaSquadraTorneoPerId,
  elencaSquadreTorneo,
  contaPartiteTorneo,
  contaPartiteTorneoTabellone,
  creaPartiteTorneo,
  cancellaPartiteTorneo,
  elencaPartiteTorneo,
  aggiornaRisultatoPartitaTorneo,
  trovaPartitaTorneoPerId,
} from "@/lib/torneo";
import { isSettimanaTorneoValida } from "@/lib/settimana-torneo";
import { isGironeTorneoValido } from "@/lib/girone-torneo";
import { calcolaClassificaGirone } from "@/lib/classifica-girone-torneo";
import {
  risultatoValido,
  esitoPartita,
  haRisultatoCompleto,
  type RisultatoSet,
} from "@/lib/risultato-partita-torneo";
import type { SettimanaTorneo, GironeTorneo, TabelloneTorneo, FaseTorneo } from "@prisma/client";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione. Mirror di SlotActionState (app/(orari-palestre)/slot/actions.ts).
export type TorneoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const NUMERO_MASSIMO_SQUADRE_MIN = 2;
const NUMERO_MASSIMO_SQUADRE_MAX = 8;

// Review fix (Blind Hunter + Edge Case Hunter, indipendentemente, Story
// 20.1): "anno" passava solo /^\d+$/ (nessun anno del genere torneo reale e'
// mai "0" o "99999") - stesso principio di range gia' applicato a
// numeroMassimoSquadre sotto, nessun valore assurdo accettato.
const ANNO_MIN = 2000;
const ANNO_MAX = 2100;

// Story 20.1 (Epic 20, Torneo Memorial): gestione riservata ad Admin/
// Dirigente, stesso perimetro di Epic 10 Campionati/Partite (dominio
// sportivo) - decisione di scomposizione epics.md 2026-08-23.
export async function creaEdizioneTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const annoGrezzo = String(formData.get("anno") ?? "").trim();
  if (!annoGrezzo) {
    return { error: { code: "VALIDATION", message: "L'anno è obbligatorio." } };
  }
  // Controllo distinto da Number.isInteger su un valore gia' non-vuoto:
  // un regex su sole cifre evita di accettare notazioni numeriche valide in
  // JS ma non volute qui (es. "1e3", "0x10", spazi interni) - stesso
  // principio gia' applicato a isGiornoSettimanaValido/FORMATO_ORA
  // (app/(orari-palestre)/slot/actions.ts), un cast diretto non protegge da
  // dati malformati.
  if (!/^\d+$/.test(annoGrezzo)) {
    return {
      error: { code: "VALIDATION", message: "L'anno deve essere un numero intero." },
    };
  }
  const anno = Number(annoGrezzo);
  if (anno < ANNO_MIN || anno > ANNO_MAX) {
    return {
      error: {
        code: "VALIDATION",
        message: `L'anno deve essere tra ${ANNO_MIN} e ${ANNO_MAX}.`,
      },
    };
  }
  // Story 20.7: Nome obbligatorio (deciso con l'utente). Validato dopo
  // l'anno: stesso ordine "prima il campo che c'era gia', poi il nuovo" gia'
  // seguito quando Volantino/altri campi sono stati aggiunti in questa
  // stessa epica. Review fix (Edge Case Hunter + Blind Hunter): un limite
  // massimo (100, stesso valore del maxLength lato client sul form) e' ora
  // imposto anche qui - senza, un FormData manomesso poteva bypassare il
  // maxLength del widget e salvare un nome arbitrariamente lungo, poi
  // renderizzato senza troncamento in un <h1> (titolo pagina interna e
  // pubblica).
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) {
    return { error: { code: "VALIDATION", message: "Il nome è obbligatorio." } };
  }
  if (nome.length > 100) {
    return {
      error: { code: "VALIDATION", message: "Il nome non può superare i 100 caratteri." },
    };
  }

  try {
    await creaEdizioneTorneo(anno, nome);
  } catch (err) {
    // Vincolo @unique su "anno" (prisma/schema.prisma) - un'Edizione gia'
    // esistente per lo stesso anno viene rifiutata come errore utente
    // esplicito (spec-20-1 I/O matrix: "già esistente" -> VALIDATION), non
    // come INTERNAL generico - stesso pattern gia' applicato a
    // creaPaginaPubblicaAction (app/(configurazione)/pagine-pubbliche/actions.ts)
    // per il vincolo @unique su "slug".
    if ((err as { code?: string }).code === "P2002") {
      return {
        error: {
          code: "VALIDATION",
          message: `Esiste già un'Edizione per l'anno ${anno}.`,
        },
      };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare l'Edizione. Riprova." },
    };
  }

  revalidatePath("/app/torneo");
  return { success: true };
}

// spec-20-1 Design Notes: l'Edizione non e' eliminabile se ha Categorie
// (qualunque, non solo con squadre iscritte - SquadraTorneo non esiste
// ancora, adeguamento rispetto all'AC originale di epics.md). Cancellazione
// atomica (deleteMany con where composto, non findUnique+delete separati -
// stesso identico pattern anti-TOCTOU di cancellaSlot,
// app/(orari-palestre)/slot/actions.ts).
export async function cancellaEdizioneTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: { code: "VALIDATION", message: "Edizione non specificata." } };
  }

  try {
    const risultato = await cancellaEdizioneTorneo(id);

    if (risultato.count === 0) {
      const edizione = await trovaEdizioneTorneoPerId(id);
      if (!edizione) {
        return {
          error: { code: "INTERNAL", message: "Impossibile cancellare l'Edizione. Riprova." },
        };
      }
      return {
        error: {
          code: "VALIDATION",
          message: "Impossibile cancellare: questa Edizione ha ancora Categorie collegate.",
        },
      };
    }
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare l'Edizione. Riprova." },
    };
  }

  revalidatePath("/app/torneo");
  return { success: true };
}

// Story 20.5 (Epic 20, Torneo Memorial): mirror ESATTO della sequenza di
// validazione a 4 passaggi di caricaFotoHeroAction
// (app/(configurazione)/impostazioni/actions.ts) - stessi messaggi di errore
// letterali gia' in uso. Perimetro ADMIN/DIRIGENTE-only (non SITE_MANAGER,
// a differenza di caricaFotoHeroAction): il Torneo e' sempre e solo
// Admin/Dirigente, stesso perimetro di ogni altra Server Action di questo
// file. Nessuna nuova colonna Prisma: esistenza/data derivate da Storage
// list() (lib/storage/volantino-torneo.ts), mai persistite.
export async function caricaVolantinoTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const edizioneTorneoId = String(formData.get("edizioneTorneoId") ?? "");
  if (!edizioneTorneoId) {
    return { error: { code: "VALIDATION", message: "Edizione non specificata." } };
  }

  const validazione = await validaFileImmagine(formData.get("file"));
  if ("error" in validazione) {
    return validazione;
  }
  const { file } = validazione;

  // Mirror del controllo "Edizione non trovata" di creaCategoriaTorneoAction
  // sopra: un edizioneTorneoId non piu' esistente (Edizione cancellata in
  // un'altra scheda, campo nascosto stantio) viene rifiutato esplicitamente
  // qui, prima dell'upload - stesso principio "mai un INTERNAL generico dove
  // un VALIDATION mirato e' possibile".
  const edizione = await trovaEdizioneTorneoPerId(edizioneTorneoId);
  if (!edizione) {
    return { error: { code: "VALIDATION", message: "Edizione non trovata." } };
  }

  try {
    const supabase = await createClient();
    // Review fix (Edge Case Hunter): usa l'id canonico appena verificato
    // (edizione.id), non la stringa grezza letta da formData - stesso
    // principio "mai fidarsi del client per il path di scoping" gia' in uso
    // nel resto dell'epica.
    await caricaVolantinoTorneo(supabase, edizione.id, file);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile caricare il volantino. Riprova." },
    };
  }

  revalidatePath(`/app/torneo/${edizione.id}`);
  return { success: true };
}

type CampiCategoriaValidati = {
  nome: string;
  settimana: SettimanaTorneo;
  numeroMassimoSquadre: number;
};

// Validazione estratta (mirror validaCampiSlot,
// app/(orari-palestre)/slot/actions.ts) per essere riusata da
// creaCategoriaTorneoAction e aggiornaCategoriaTorneoAction senza due copie
// da tenere manualmente allineate.
function validaCampiCategoria(
  formData: FormData
): { error: { code: string; message: string } } | { valori: CampiCategoriaValidati } {
  const nome = String(formData.get("nome") ?? "").trim();
  const settimana = String(formData.get("settimana") ?? "");
  const numeroMassimoSquadreGrezzo = String(formData.get("numeroMassimoSquadre") ?? "").trim();

  if (!nome) {
    return { error: { code: "VALIDATION", message: "Il nome è obbligatorio." } };
  }
  if (!settimana) {
    return { error: { code: "VALIDATION", message: "La settimana è obbligatoria." } };
  }
  if (!isSettimanaTorneoValida(settimana)) {
    return { error: { code: "VALIDATION", message: "Settimana non valida." } };
  }
  if (!numeroMassimoSquadreGrezzo) {
    return {
      error: { code: "VALIDATION", message: "Il numero massimo di squadre è obbligatorio." },
    };
  }
  if (!/^\d+$/.test(numeroMassimoSquadreGrezzo)) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il numero massimo di squadre deve essere un numero intero.",
      },
    };
  }
  const numeroMassimoSquadre = Number(numeroMassimoSquadreGrezzo);
  if (
    numeroMassimoSquadre < NUMERO_MASSIMO_SQUADRE_MIN ||
    numeroMassimoSquadre > NUMERO_MASSIMO_SQUADRE_MAX
  ) {
    return {
      error: {
        code: "VALIDATION",
        message: `Il numero massimo di squadre deve essere tra ${NUMERO_MASSIMO_SQUADRE_MIN} e ${NUMERO_MASSIMO_SQUADRE_MAX}.`,
      },
    };
  }

  return { valori: { nome, settimana, numeroMassimoSquadre } };
}

export async function creaCategoriaTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const edizioneTorneoId = String(formData.get("edizioneTorneoId") ?? "");
  if (!edizioneTorneoId) {
    return { error: { code: "VALIDATION", message: "Edizione non specificata." } };
  }

  const validazione = validaCampiCategoria(formData);
  if ("error" in validazione) return validazione;
  const { nome, settimana, numeroMassimoSquadre } = validazione.valori;

  // Review fix (Blind Hunter + Edge Case Hunter, indipendentemente, Story
  // 20.1): un edizioneTorneoId non piu' esistente (Edizione cancellata in
  // un'altra scheda, link obsoleto) violerebbe altrimenti solo il vincolo FK
  // a livello di database, catturato dal catch generico sotto come INTERNAL
  // - un errore esplicito e specifico e' piu' corretto, stesso principio di
  // "mai un INTERNAL generico dove un VALIDATION mirato e' possibile".
  const edizione = await trovaEdizioneTorneoPerId(edizioneTorneoId);
  if (!edizione) {
    return { error: { code: "VALIDATION", message: "Edizione non trovata." } };
  }

  try {
    await creaCategoriaTorneo({ nome, settimana, numeroMassimoSquadre, edizioneTorneoId });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare la Categoria. Riprova." },
    };
  }

  revalidatePath(`/app/torneo/${edizioneTorneoId}`);
  return { success: true };
}

// Nessuna guardia di dipendenza in questa story (spec-20-1 Design Notes):
// SquadraTorneo non esiste ancora. Review fix (Blind Hunter + Edge Case
// Hunter, indipendentemente, Story 20.1): update scoped anche per
// edizioneTorneoId (non solo id) - un id/edizioneTorneoId non corrispondenti
// (tampering, bug futuro) ora falliscono esplicitamente invece di aggiornare
// una riga e rivalidare la pagina di un'altra Edizione.
export async function aggiornaCategoriaTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const edizioneTorneoId = String(formData.get("edizioneTorneoId") ?? "");
  if (!id || !edizioneTorneoId) {
    return { error: { code: "VALIDATION", message: "Categoria non specificata." } };
  }

  const validazione = validaCampiCategoria(formData);
  if ("error" in validazione) return validazione;
  const { nome, settimana, numeroMassimoSquadre } = validazione.valori;

  try {
    // Review fix (Blind Hunter + Verification Gap Reviewer, indipendentemente,
    // Story 20.2): questa azione esiste dalla Story 20.1, quando
    // SquadraTorneo non esisteva ancora - ora che esiste, abbassare il
    // massimo sotto il numero di Squadre gia' iscritte lasciava la Categoria
    // silenziosamente "fuori dal proprio limite", senza alcun errore.
    const numeroSquadreAttuali = await contaSquadreTorneo(id);
    if (numeroSquadreAttuali > numeroMassimoSquadre) {
      return {
        error: {
          code: "VALIDATION",
          message: `Non puoi impostare un massimo inferiore alle ${numeroSquadreAttuali} squadre già iscritte.`,
        },
      };
    }

    const risultato = await aggiornaCategoriaTorneo(id, edizioneTorneoId, {
      nome,
      settimana,
      numeroMassimoSquadre,
    });
    if (risultato.count === 0) {
      return {
        error: { code: "VALIDATION", message: "Categoria non trovata in questa Edizione." },
      };
    }
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Categoria. Riprova." },
    };
  }

  revalidatePath(`/app/torneo/${edizioneTorneoId}`);
  return { success: true };
}

// Story 20.2: la Categoria non e' piu' eliminabile con Squadre collegate
// (guardia estesa in cancellaCategoriaTorneo, lib/torneo.ts, obbligo
// ereditato da spec-20-1 Design Notes). Review fix (Blind Hunter + Edge
// Case Hunter, indipendentemente, Story 20.1): delete scoped anche per
// edizioneTorneoId (stesso motivo di aggiornaCategoriaTorneoAction sopra).
// Su count === 0 (ora tre cause possibili: id/edizioneTorneoId non
// corrispondenti, riga gia' cancellata, O bloccata da Squadre collegate) si
// disambigua con trovaCategoriaTorneoPerId, stesso schema di
// cancellaEdizioneTorneoAction sopra: se la Categoria esiste ancora sotto
// la stessa Edizione, il blocco e' dovuto a Squadre iscritte (messaggio
// esplicito); altrimenti e' un mismatch/riga inesistente (messaggio
// invariato rispetto a Story 20.1).
export async function cancellaCategoriaTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const edizioneTorneoId = String(formData.get("edizioneTorneoId") ?? "");
  if (!id || !edizioneTorneoId) {
    return { error: { code: "VALIDATION", message: "Categoria non specificata." } };
  }

  try {
    const risultato = await cancellaCategoriaTorneo(id, edizioneTorneoId);
    if (risultato.count === 0) {
      const categoria = await trovaCategoriaTorneoPerId(id);
      if (categoria && categoria.edizioneTorneoId === edizioneTorneoId) {
        return {
          error: {
            code: "VALIDATION",
            message: "Impossibile cancellare: questa Categoria ha ancora Squadre collegate.",
          },
        };
      }
      return {
        error: { code: "VALIDATION", message: "Categoria non trovata in questa Edizione." },
      };
    }
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare la Categoria. Riprova." },
    };
  }

  revalidatePath(`/app/torneo/${edizioneTorneoId}`);
  return { success: true };
}

type CampiSquadraValidati = {
  nome: string;
  girone: GironeTorneo;
  referente: string | null;
  contatto: string | null;
};

// Validazione estratta (mirror validaCampiCategoria sopra) per essere
// riusata da creaSquadraTorneoAction e aggiornaSquadraTorneoAction senza
// due copie da tenere manualmente allineate. referente/contatto sono
// opzionali (spec-20-2: "campo indipendente, vuoto non mostra nulla") -
// una stringa vuota dopo trim diventa null, mai una stringa vuota
// persistita.
function validaCampiSquadra(
  formData: FormData
): { error: { code: string; message: string } } | { valori: CampiSquadraValidati } {
  const nome = String(formData.get("nome") ?? "").trim();
  const girone = String(formData.get("girone") ?? "");
  const referenteGrezzo = String(formData.get("referente") ?? "").trim();
  const contattoGrezzo = String(formData.get("contatto") ?? "").trim();

  if (!nome) {
    return { error: { code: "VALIDATION", message: "Il nome è obbligatorio." } };
  }
  if (!girone) {
    return { error: { code: "VALIDATION", message: "Il girone è obbligatorio." } };
  }
  if (!isGironeTorneoValido(girone)) {
    return { error: { code: "VALIDATION", message: "Girone non valido." } };
  }

  return {
    valori: {
      nome,
      girone,
      referente: referenteGrezzo || null,
      contatto: contattoGrezzo || null,
    },
  };
}

// Story 20.2 (Epic 20, Torneo Memorial): gestione riservata ad Admin/
// Dirigente, stesso perimetro delle Server Action Edizione/Categoria sopra.
export async function creaSquadraTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const categoriaTorneoId = String(formData.get("categoriaTorneoId") ?? "");
  if (!categoriaTorneoId) {
    return { error: { code: "VALIDATION", message: "Categoria non specificata." } };
  }

  const validazione = validaCampiSquadra(formData);
  if ("error" in validazione) return validazione;
  const { nome, girone, referente, contatto } = validazione.valori;

  // Review fix (Edge Case Hunter, Story 20.2): trovaCategoriaTorneoPerId/
  // contaSquadreTorneo erano fuori dal try/catch sotto - un errore DB
  // transitorio su una delle due sarebbe propagato non gestito invece del
  // messaggio INTERNAL amichevole gia' garantito per il resto del progetto.
  // Ora l'intera azione (lettura + guardia + scrittura) e' in un solo
  // try/catch.
  try {
    // Mirror del controllo "Edizione non trovata" di creaCategoriaTorneoAction
    // sopra: un categoriaTorneoId non piu' esistente (Categoria cancellata
    // in un'altra scheda, link obsoleto) violerebbe altrimenti solo il
    // vincolo FK a livello di database - un errore esplicito e specifico e'
    // piu' corretto. La stessa lettura fornisce anche numeroMassimoSquadre
    // per il controllo del limite sotto.
    const categoria = await trovaCategoriaTorneoPerId(categoriaTorneoId);
    if (!categoria) {
      return { error: { code: "VALIDATION", message: "Categoria non trovata." } };
    }

    // spec-20-2 Design Notes: il vero cancello e' qui (confronto
    // applicativo), non un vincolo DB CHECK - richiederebbe una subquery non
    // banale in Postgres. Nota di rischio (Blind Hunter + Edge Case Hunter,
    // indipendentemente, review Story 20.2): due iscrizioni concorrenti
    // sull'ultimo posto libero potrebbero entrambe superare questo controllo
    // prima che l'insert di una delle due si concluda (check-then-act, non
    // atomico) - rischio ritenuto accettabile per un pannello di gestione
    // interno a bassa concorrenza (poche persone, non una vendita
    // pubblica), loggato in deferred-work.md per un eventuale irrobustimento
    // futuro (transazione serializable o vincolo a livello DB).
    const numeroSquadreAttuali = await contaSquadreTorneo(categoriaTorneoId);
    if (numeroSquadreAttuali >= categoria.numeroMassimoSquadre) {
      return {
        error: {
          code: "VALIDATION",
          message: `Numero massimo di squadre raggiunto (${categoria.numeroMassimoSquadre}).`,
        },
      };
    }

    // Review fix (Blind Hunter + Edge Case Hunter, indipendentemente, Story
    // 20.3): il calendario di girone (generaCalendarioGironiAction) e'
    // generato una sola volta a partire dalle Squadre esistenti in quel
    // momento - una nuova Squadra iscritta dopo non giocherebbe mai contro
    // le altre del suo girone, senza alcun avviso.
    const numeroPartiteEsistenti = await contaPartiteTorneo(categoriaTorneoId);
    if (numeroPartiteEsistenti > 0) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Non puoi iscrivere una nuova Squadra: il calendario è già stato generato per questa Categoria.",
        },
      };
    }

    await creaSquadraTorneo({ nome, girone, referente, contatto, categoriaTorneoId });
    revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}`);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile iscrivere la Squadra. Riprova." },
    };
  }

  return { success: true };
}

// Review fix (Blind Hunter + Edge Case Hunter, indipendentemente, Story
// 20.2): edizioneTorneoId arrivava come campo nascosto lato client, mai
// verificato, usato solo per costruire il percorso di revalidatePath - un
// valore stantio/manomesso avrebbe rivalidato la pagina sbagliata pur con
// la mutazione stessa correttamente scoped su id+categoriaTorneoId. Ora
// derivato lato server da trovaCategoriaTorneoPerId(categoriaTorneoId),
// nessun campo nascosto piu' necessario nel form.
export async function aggiornaSquadraTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const categoriaTorneoId = String(formData.get("categoriaTorneoId") ?? "");
  if (!id || !categoriaTorneoId) {
    return { error: { code: "VALIDATION", message: "Squadra non specificata." } };
  }

  const validazione = validaCampiSquadra(formData);
  if ("error" in validazione) return validazione;
  const { nome, girone, referente, contatto } = validazione.valori;

  try {
    const categoria = await trovaCategoriaTorneoPerId(categoriaTorneoId);
    if (!categoria) {
      return { error: { code: "VALIDATION", message: "Categoria non trovata." } };
    }

    // Review fix (Blind Hunter + Edge Case Hunter, indipendentemente, Story
    // 20.3): il girone di una Squadra determina a quale girone appartengono
    // i suoi incontri (PartitaTorneo non ha un campo girone proprio, lo
    // deriva dalla Squadra) - cambiarlo dopo che il calendario e' stato
    // generato sposterebbe silenziosamente i suoi incontri già disputati
    // fuori dalla classifica del girone originale (calcolaClassificaGirone
    // scarta una partita se la Squadra non e' tra quelle passate). Bloccato
    // solo se il girone cambia davvero e il calendario esiste già.
    const squadraAttuale = await trovaSquadraTorneoPerId(id);
    if (squadraAttuale && squadraAttuale.girone !== girone) {
      const numeroPartiteEsistenti = await contaPartiteTorneo(categoriaTorneoId);
      if (numeroPartiteEsistenti > 0) {
        return {
          error: {
            code: "VALIDATION",
            message:
              "Non puoi cambiare il girone: il calendario è già stato generato per questa Categoria.",
          },
        };
      }
    }

    const risultato = await aggiornaSquadraTorneo(id, categoriaTorneoId, {
      nome,
      girone,
      referente,
      contatto,
    });
    if (risultato.count === 0) {
      return {
        error: { code: "VALIDATION", message: "Squadra non trovata in questa Categoria." },
      };
    }

    revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}`);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Squadra. Riprova." },
    };
  }

  return { success: true };
}

// Review fix (Blind Hunter + Edge Case Hunter + Verification Gap Reviewer,
// tutti e tre indipendentemente, Story 20.3): da quando PartitaTorneo
// referenzia SquadraTorneo con FK Restrict, cancellare una Squadra con
// incontri gia' generati falliva a livello DB e finiva nel catch generico
// come INTERNAL "Riprova" - fuorviante, perche' un retry non puo' mai
// riuscire. La guardia e' ora esplicita in cancellaSquadraTorneo
// (lib/torneo.ts), qui count === 0 e' disambiguato con
// trovaSquadraTorneoPerId, stesso schema di cancellaCategoriaTorneoAction.
export async function cancellaSquadraTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const categoriaTorneoId = String(formData.get("categoriaTorneoId") ?? "");
  if (!id || !categoriaTorneoId) {
    return { error: { code: "VALIDATION", message: "Squadra non specificata." } };
  }

  try {
    const categoria = await trovaCategoriaTorneoPerId(categoriaTorneoId);
    if (!categoria) {
      return { error: { code: "VALIDATION", message: "Categoria non trovata." } };
    }

    const risultato = await cancellaSquadraTorneo(id, categoriaTorneoId);
    if (risultato.count === 0) {
      const squadra = await trovaSquadraTorneoPerId(id);
      if (!squadra || squadra.categoriaTorneoId !== categoriaTorneoId) {
        return {
          error: { code: "VALIDATION", message: "Squadra non trovata in questa Categoria." },
        };
      }
      return {
        error: {
          code: "VALIDATION",
          message: "Impossibile cancellare: questa Squadra ha già incontri generati.",
        },
      };
    }

    revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}`);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare la Squadra. Riprova." },
    };
  }

  return { success: true };
}

// Story 20.3 (Epic 20, Torneo Memorial): genera tutte le coppie "tutti
// contro tutti" (all'italiana) di UN girone - mai tra le due squadre[i] e
// squadre[i] stessa, mai tra gironi diversi (quell'incrocio e' il
// tabellone di Story 20.4, chiamato con le Squadre gia' filtrate per un
// solo girone alla volta sotto).
function generaCoppieGirone(
  squadre: { id: string }[],
  categoriaTorneoId: string
): { categoriaTorneoId: string; squadraCasaId: string; squadraOspiteId: string }[] {
  const coppie: { categoriaTorneoId: string; squadraCasaId: string; squadraOspiteId: string }[] =
    [];
  for (let i = 0; i < squadre.length; i++) {
    for (let j = i + 1; j < squadre.length; j++) {
      coppie.push({
        categoriaTorneoId,
        squadraCasaId: squadre[i].id,
        squadraOspiteId: squadre[j].id,
      });
    }
  }
  return coppie;
}

// spec-20-3 Boundaries: generata una sola volta per Categoria (idempotente
// - rifiutata esplicitamente se PartitaTorneo esistono gia'), richiede
// almeno 2 Squadre per girone (altrimenti rifiutata con errore esplicito).
// Nessun incrocio tra gironi diversi qui (Story 20.4).
export async function generaCalendarioGironiAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const categoriaTorneoId = String(formData.get("categoriaTorneoId") ?? "");
  if (!categoriaTorneoId) {
    return { error: { code: "VALIDATION", message: "Categoria non specificata." } };
  }

  try {
    const categoria = await trovaCategoriaTorneoPerId(categoriaTorneoId);
    if (!categoria) {
      return { error: { code: "VALIDATION", message: "Categoria non trovata." } };
    }

    // Idempotenza: rigenerare il calendario dopo l'inserimento di
    // risultati li farebbe perdere (spec-20-3 Design Notes) - bloccata
    // esplicitamente qui. Check-then-act non atomico (stesso rischio
    // accettato, stessa nota gia' presente in creaSquadraTorneoAction sopra
    // per il limite di Squadre: pannello interno a bassa concorrenza).
    const numeroPartiteEsistenti = await contaPartiteTorneo(categoriaTorneoId);
    if (numeroPartiteEsistenti > 0) {
      return {
        error: {
          code: "VALIDATION",
          message: "Il calendario è già stato generato per questa Categoria.",
        },
      };
    }

    const squadre = await elencaSquadreTorneo(categoriaTorneoId);
    const squadreGironeA = squadre.filter((s) => s.girone === "GIRONE_A");
    const squadreGironeB = squadre.filter((s) => s.girone === "GIRONE_B");

    if (squadreGironeA.length < 2 || squadreGironeB.length < 2) {
      return {
        error: {
          code: "VALIDATION",
          message: "Servono almeno 2 Squadre in ciascun girone per generare il calendario.",
        },
      };
    }

    const righe = [
      ...generaCoppieGirone(squadreGironeA, categoriaTorneoId),
      ...generaCoppieGirone(squadreGironeB, categoriaTorneoId),
    ];
    await creaPartiteTorneo(righe);

    revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}/risultati`);
  } catch (err) {
    // Review fix (Edge Case Hunter, Story 20.3): il controllo di idempotenza
    // sopra (contaPartiteTorneo) e' un check-then-act non atomico - due
    // generazioni concorrenti potrebbero entrambe superarlo. Il vincolo
    // unico su (categoriaTorneoId, squadraCasaId, squadraOspiteId)
    // (prisma/schema.prisma) e' il vero cancello: qui la violazione (P2002)
    // e' tradotta nello stesso messaggio esplicito di "già generato" invece
    // del generico "Riprova", che in questo caso non potrebbe mai riuscire.
    if ((err as { code?: string }).code === "P2002") {
      return {
        error: {
          code: "VALIDATION",
          message: "Il calendario è già stato generato per questa Categoria.",
        },
      };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile generare il calendario. Riprova." },
    };
  }

  return { success: true };
}

// Story 20.8: cancella TUTTE le partite (girone e tabellone insieme) di una
// Categoria - sblocca la catena Categoria->Squadre->Partite, oggi bloccata
// per sempre una volta generato un calendario (cancellaSquadraTorneo
// rifiuta una Squadra con partite esistenti). Nessuna guardia di
// idempotenza necessaria a differenza di generaCalendarioGironiAction
// sopra: cancellare 0 partite non e' un errore, e' un esito valido (Nessuna
// partita da rimuovere).
export async function cancellaPartiteTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const categoriaTorneoId = String(formData.get("categoriaTorneoId") ?? "");
  if (!categoriaTorneoId) {
    return { error: { code: "VALIDATION", message: "Categoria non specificata." } };
  }

  let categoria: { edizioneTorneoId: string } | null;
  try {
    categoria = await trovaCategoriaTorneoPerId(categoriaTorneoId);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare le partite. Riprova." },
    };
  }
  if (!categoria) {
    return { error: { code: "VALIDATION", message: "Categoria non trovata." } };
  }

  try {
    await cancellaPartiteTorneo(categoriaTorneoId);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare le partite. Riprova." },
    };
  }

  // Review fix (Verification Gap Reviewer): revalidatePath ora fuori dal
  // try/catch della cancellazione - prima, un revalidatePath fallito dopo
  // una cancellazione gia' riuscita produceva un falso "Impossibile
  // cancellare le partite. Riprova." nonostante i dati fossero gia' stati
  // cancellati in modo irreversibile (l'ambiguita' piu' pericolosa
  // possibile per un'azione distruttiva). Anche la Categoria (per
  // edizioneTorneoId) e' ora letta separatamente prima, cosi' un suo
  // fallimento non si confonde con un fallimento della cancellazione vera
  // e propria. Include anche la pagina della Categoria stessa (elenco
  // Squadre, dimenticata nella prima stesura): e' da li' che l'Admin
  // procede a cancellare le Squadre dopo le partite.
  revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}`);
  revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}/risultati`);
  revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}/tabellone`);

  return { success: true };
}

// Deriva vincitore/perdente id di una PartitaTorneo gia' completa (chiamante
// verifica haRisultatoCompleto prima) - riusa esitoPartita
// (lib/risultato-partita-torneo.ts), nessuna seconda implementazione.
function vincitorePerdenteId(partita: {
  squadraCasaId: string;
  squadraOspiteId: string;
  set1Casa: number | null;
  set1Ospite: number | null;
  set2Casa: number | null;
  set2Ospite: number | null;
  set3Casa: number | null;
  set3Ospite: number | null;
}): { vincitoreId: string; perdenteId: string } {
  const { setVintiCasa, setVintiOspite } = esitoPartita(
    { casa: partita.set1Casa as number, ospite: partita.set1Ospite as number },
    { casa: partita.set2Casa as number, ospite: partita.set2Ospite as number },
    partita.set3Casa !== null && partita.set3Ospite !== null
      ? { casa: partita.set3Casa, ospite: partita.set3Ospite }
      : undefined
  );

  return setVintiCasa > setVintiOspite
    ? { vincitoreId: partita.squadraCasaId, perdenteId: partita.squadraOspiteId }
    : { vincitoreId: partita.squadraOspiteId, perdenteId: partita.squadraCasaId };
}

// spec-20-4 Design Notes: side-effect di salvaRisultatoPartitaTorneoAction
// sotto, MAI un'azione manuale separata (l'AC di epics.md dice
// esplicitamente "vengono generate", voce passiva/automatica). Le due
// semifinali sorelle dello stesso tabellone decidono le due finali:
// vincitori vs vincitori (FINALE_VINCENTI, 1°/2° o 5°/6° posto), perdenti
// vs perdenti (FINALE_PERDENTI, 3°/4° o 7°/8° posto). No-op silenzioso
// (nessun errore, spec-20-4 I/O matrix) se l'altra semifinale non ha ancora
// un risultato, o se le finali di questo tabellone esistono gia'.
async function generaFinaliSeCompletate(
  categoriaTorneoId: string,
  tabellone: TabelloneTorneo
): Promise<void> {
  const partite = await elencaPartiteTorneo(categoriaTorneoId);
  const semifinali = partite.filter((p) => p.fase === "SEMIFINALE" && p.tabellone === tabellone);
  if (semifinali.length !== 2 || !semifinali.every(haRisultatoCompleto)) {
    return;
  }

  const finaliEsistenti = partite.some(
    (p) =>
      p.tabellone === tabellone && (p.fase === "FINALE_VINCENTI" || p.fase === "FINALE_PERDENTI")
  );
  if (finaliEsistenti) {
    return;
  }

  const [semi1, semi2] = semifinali;
  const { vincitoreId: vincitore1, perdenteId: perdente1 } = vincitorePerdenteId(semi1);
  const { vincitoreId: vincitore2, perdenteId: perdente2 } = vincitorePerdenteId(semi2);

  const righe = [
    {
      categoriaTorneoId,
      squadraCasaId: vincitore1,
      squadraOspiteId: vincitore2,
      fase: "FINALE_VINCENTI" as const,
      tabellone,
    },
    {
      categoriaTorneoId,
      squadraCasaId: perdente1,
      squadraOspiteId: perdente2,
      fase: "FINALE_PERDENTI" as const,
      tabellone,
    },
  ];

  try {
    await creaPartiteTorneo(righe);
  } catch (err) {
    // Stesso principio del review fix di generaCalendarioGironiAction sopra
    // (Story 20.3): due salvataggi concorrenti della seconda semifinale
    // potrebbero entrambi superare il check "finaliEsistenti" (check-then-act
    // non atomico) - il vincolo unico sulla tabella e' il vero cancello, una
    // violazione qui E' TIPICAMENTE idempotenza (l'altra chiamata concorrente
    // ha gia' creato le stesse righe). Review fix (Edge Case Hunter, Story
    // 20.4): non fidarsi ciecamente del codice P2002 - un vincolo unico puo'
    // scattare anche per un motivo diverso (bug futuro, dato inatteso). Si
    // verifica qui che le finali esistano DAVVERO prima di trattare l'errore
    // come un no-op silenzioso; se non esistono, l'eccezione originale viene
    // comunque propagata (il tabellone resterebbe altrimenti bloccato per
    // sempre, nessun percorso di recupero in questa story).
    if ((err as { code?: string }).code === "P2002") {
      const partiteDopo = await elencaPartiteTorneo(categoriaTorneoId);
      const finaliOraEsistenti = partiteDopo.some(
        (p) =>
          p.tabellone === tabellone && (p.fase === "FINALE_VINCENTI" || p.fase === "FINALE_PERDENTI")
      );
      if (finaliOraEsistenti) {
        return;
      }
    }
    throw err;
  }
}

// spec-20-4 Boundaries: il tabellone (le 4 semifinali) e' generato una sola
// volta per Categoria (idempotente - rifiutato se esistono gia'
// PartitaTorneo con fase !== GIRONE), solo quando la classifica di
// entrambi i gironi e' completa (ogni PartitaTorneo di fase GIRONE ha un
// risultato - incluso il caso limite "calendario mai generato", partite di
// girone assenti = classifica non completa) e richiede almeno 4 Squadre
// per girone (serve un 4° posto per il tabellone 5°-8°, decisione presa in
// spec-20-4 Design Notes - epics.md non la specifica esplicitamente).
// Incrocio letterale dell'AC di epics.md: 1°A-2°B/1°B-2°A per il tabellone
// 1°-4°, 3°A-4°B/3°B-4°A per il 5°-8°.
export async function generaTabelloneAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const categoriaTorneoId = String(formData.get("categoriaTorneoId") ?? "");
  if (!categoriaTorneoId) {
    return { error: { code: "VALIDATION", message: "Categoria non specificata." } };
  }

  try {
    const categoria = await trovaCategoriaTorneoPerId(categoriaTorneoId);
    if (!categoria) {
      return { error: { code: "VALIDATION", message: "Categoria non trovata." } };
    }

    // Idempotenza: rigenerare il tabellone dopo l'inserimento di risultati
    // di semifinale/finale li farebbe perdere - bloccata esplicitamente
    // qui, stesso identico principio di generaCalendarioGironiAction sopra.
    const numeroPartiteTabellone = await contaPartiteTorneoTabellone(categoriaTorneoId);
    if (numeroPartiteTabellone > 0) {
      return {
        error: {
          code: "VALIDATION",
          message: "Il tabellone è già stato generato per questa Categoria.",
        },
      };
    }

    const squadre = await elencaSquadreTorneo(categoriaTorneoId);
    const squadreGironeA = squadre.filter((s) => s.girone === "GIRONE_A");
    const squadreGironeB = squadre.filter((s) => s.girone === "GIRONE_B");

    if (squadreGironeA.length < 4 || squadreGironeB.length < 4) {
      return {
        error: {
          code: "VALIDATION",
          message: "Servono almeno 4 Squadre in ciascun girone per generare il tabellone.",
        },
      };
    }

    // A questo punto (nessuna PartitaTorneo di fase diversa da GIRONE)
    // tutte le partite della Categoria sono ancora incontri di girone -
    // nessun filtro su "fase" necessario qui, a differenza delle pagine
    // raggiunte dopo la generazione del tabellone.
    const partite = await elencaPartiteTorneo(categoriaTorneoId);
    const partiteGironeA = partite.filter((p) => p.squadraCasa.girone === "GIRONE_A");
    const partiteGironeB = partite.filter((p) => p.squadraCasa.girone === "GIRONE_B");

    // Review fix (Blind Hunter, Story 20.4): due stati distinti ("calendario
    // mai generato" vs "calendario generato ma incompleto") restituivano lo
    // stesso identico messaggio - l'Admin non poteva capire quale azione
    // gli mancasse (generare il calendario di girone, Story 20.3, oppure
    // solo finire di inserire i risultati). "partite.length === 0" copre il
    // primo caso: senza questo controllo esplicito, "ogni partita ha un
    // risultato" sarebbe vacuosamente vero su un array vuoto, generando un
    // tabellone da una classifica che non rappresenta alcun incontro
    // giocato.
    if (partiteGironeA.length === 0 || partiteGironeB.length === 0) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Devi prima generare il calendario di girone (e inserirne i risultati) per entrambi i gironi.",
        },
      };
    }
    if (!partiteGironeA.every(haRisultatoCompleto) || !partiteGironeB.every(haRisultatoCompleto)) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "Il tabellone può essere generato solo quando la classifica di entrambi i gironi è completa.",
        },
      };
    }

    const classificaA = calcolaClassificaGirone(squadreGironeA, partiteGironeA);
    const classificaB = calcolaClassificaGirone(squadreGironeB, partiteGironeB);

    const righe = [
      {
        categoriaTorneoId,
        squadraCasaId: classificaA[0].squadra.id,
        squadraOspiteId: classificaB[1].squadra.id,
        fase: "SEMIFINALE" as const,
        tabellone: "POSIZIONI_1_4" as const,
      },
      {
        categoriaTorneoId,
        squadraCasaId: classificaB[0].squadra.id,
        squadraOspiteId: classificaA[1].squadra.id,
        fase: "SEMIFINALE" as const,
        tabellone: "POSIZIONI_1_4" as const,
      },
      {
        categoriaTorneoId,
        squadraCasaId: classificaA[2].squadra.id,
        squadraOspiteId: classificaB[3].squadra.id,
        fase: "SEMIFINALE" as const,
        tabellone: "POSIZIONI_5_8" as const,
      },
      {
        categoriaTorneoId,
        squadraCasaId: classificaB[2].squadra.id,
        squadraOspiteId: classificaA[3].squadra.id,
        fase: "SEMIFINALE" as const,
        tabellone: "POSIZIONI_5_8" as const,
      },
    ];

    await creaPartiteTorneo(righe);

    revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}/tabellone`);
  } catch (err) {
    // Stesso principio del review fix di generaCalendarioGironiAction sopra
    // (Story 20.3): il controllo di idempotenza e' un check-then-act non
    // atomico - una violazione del vincolo unico (P2002) e' tradotta nello
    // stesso messaggio esplicito, mai un INTERNAL "Riprova" che non potrebbe
    // mai riuscire.
    if ((err as { code?: string }).code === "P2002") {
      return {
        error: {
          code: "VALIDATION",
          message: "Il tabellone è già stato generato per questa Categoria.",
        },
      };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile generare il tabellone. Riprova." },
    };
  }

  return { success: true };
}

// Legge e valida un singolo punteggio di set da FormData - stesso
// principio di "solo cifre, un cast diretto non protegge da dati malformati"
// gia' applicato ad anno/numeroMassimoSquadre sopra. Il messaggio include
// l'etichetta del campo: un form con 6 campi numerici quasi identici non
// puo' limitarsi a un generico "punteggio non valido".
// 99 non e' un limite pallavolistico reale (nessuna regola di punteggio e'
// validata qui, spec-20-3 Boundaries "Never") - e' solo un tetto di
// plausibilita' a due cifre, difesa in profondita' contro un valore assurdo
// digitato per errore o un campo manomesso, stesso principio gia' in uso
// per numeroMassimoSquadre/anno altrove in questo file.
const PUNTEGGIO_SET_MAX = 99;

function leggiPunteggioSet(
  formData: FormData,
  campo: string,
  etichetta: string
): { error: { code: string; message: string } } | { valore: number } {
  const grezzo = String(formData.get(campo) ?? "").trim();
  if (!grezzo) {
    return { error: { code: "VALIDATION", message: `${etichetta} è obbligatorio.` } };
  }
  if (!/^\d+$/.test(grezzo)) {
    return {
      error: {
        code: "VALIDATION",
        message: `${etichetta} deve essere un numero intero non negativo.`,
      },
    };
  }
  const valore = Number(grezzo);
  if (valore > PUNTEGGIO_SET_MAX) {
    return { error: { code: "VALIDATION", message: `${etichetta} non è un punteggio plausibile.` } };
  }
  return { valore };
}

type CampiRisultatoValidati = {
  set1: RisultatoSet;
  set2: RisultatoSet;
  set3?: RisultatoSet;
};

// set1/set2 sono sempre obbligatori (un incontro al meglio dei 3 set gioca
// sempre almeno 2 set); set3 e' una coppia tutto-o-niente (entrambi i campi
// valorizzati o entrambi vuoti) - un solo campo valorizzato e' un form
// malformato/manomesso, rifiutato qui prima ancora della validazione
// strutturale "al meglio dei 3 set" (risultatoValido,
// lib/risultato-partita-torneo.ts), che resta comunque il vero cancello
// finale chiamato dal caller.
function validaCampiRisultato(
  formData: FormData
): { error: { code: string; message: string } } | { valori: CampiRisultatoValidati } {
  const set1Casa = leggiPunteggioSet(formData, "set1Casa", "Il punteggio del set 1 (Casa)");
  if ("error" in set1Casa) return set1Casa;
  const set1Ospite = leggiPunteggioSet(formData, "set1Ospite", "Il punteggio del set 1 (Ospite)");
  if ("error" in set1Ospite) return set1Ospite;
  const set2Casa = leggiPunteggioSet(formData, "set2Casa", "Il punteggio del set 2 (Casa)");
  if ("error" in set2Casa) return set2Casa;
  const set2Ospite = leggiPunteggioSet(formData, "set2Ospite", "Il punteggio del set 2 (Ospite)");
  if ("error" in set2Ospite) return set2Ospite;

  const set3CasaGrezzo = String(formData.get("set3Casa") ?? "").trim();
  const set3OspiteGrezzo = String(formData.get("set3Ospite") ?? "").trim();

  let set3: RisultatoSet | undefined;
  if (set3CasaGrezzo || set3OspiteGrezzo) {
    if (!set3CasaGrezzo || !set3OspiteGrezzo) {
      return {
        error: { code: "VALIDATION", message: "Il punteggio del terzo set è incompleto." },
      };
    }
    const set3Casa = leggiPunteggioSet(formData, "set3Casa", "Il punteggio del set 3 (Casa)");
    if ("error" in set3Casa) return set3Casa;
    const set3Ospite = leggiPunteggioSet(formData, "set3Ospite", "Il punteggio del set 3 (Ospite)");
    if ("error" in set3Ospite) return set3Ospite;
    set3 = { casa: set3Casa.valore, ospite: set3Ospite.valore };
  }

  return {
    valori: {
      set1: { casa: set1Casa.valore, ospite: set1Ospite.valore },
      set2: { casa: set2Casa.valore, ospite: set2Ospite.valore },
      set3,
    },
  };
}

// Review fix (Edge Case Hunter, Story 20.4): un risultato di girone o di
// semifinale non e' piu' modificabile una volta che il tabellone/le finali
// derivate da esso sono gia' stati generati - altrimenti la correzione
// resterebbe silenziosamente non riflessa negli accoppiamenti/vincitori
// gia' derivati dal risultato originale, ora scaduto. Stesso principio
// "blocca invece di lasciare uno stato derivato stantio" gia' applicato al
// cambio di girone di una Squadra dopo la generazione del calendario
// (Story 20.3). Le finali (FINALE_VINCENTI/FINALE_PERDENTI) restano sempre
// modificabili: nessuna ulteriore fase e' derivata da loro in questa
// story, solo la classifica finale (sempre ricalcolata al volo).
async function erroreModificaBloccata(partita: {
  fase: FaseTorneo;
  tabellone: TabelloneTorneo | null;
  categoriaTorneoId: string;
}): Promise<{ code: string; message: string } | null> {
  if (partita.fase === "GIRONE") {
    const numeroPartiteTabellone = await contaPartiteTorneoTabellone(partita.categoriaTorneoId);
    if (numeroPartiteTabellone > 0) {
      return {
        code: "VALIDATION",
        message:
          "Non puoi modificare un risultato di girone: il tabellone è già stato generato per questa Categoria.",
      };
    }
    return null;
  }

  if (partita.fase === "SEMIFINALE" && partita.tabellone) {
    const partite = await elencaPartiteTorneo(partita.categoriaTorneoId);
    const finaliEsistenti = partite.some(
      (p) =>
        p.tabellone === partita.tabellone &&
        (p.fase === "FINALE_VINCENTI" || p.fase === "FINALE_PERDENTI")
    );
    if (finaliEsistenti) {
      return {
        code: "VALIDATION",
        message: "Non puoi modificare questo risultato: le finali sono già state generate.",
      };
    }
  }

  return null;
}

// spec-20-3 Boundaries: un punteggio e' valido solo se strutturalmente
// coerente con "al meglio dei 3 set" (risultatoValido, riusata qui e non
// duplicata) - la classifica di girone non e' toccata direttamente da
// questa azione, e' sempre ricalcolata al volo dalla pagina a partire dalle
// PartitaTorneo aggiornate (nessuno stato "classifica congelata"
// intermedio, AC di epics.md).
export async function salvaRisultatoPartitaTorneoAction(
  _prevState: TorneoActionState,
  formData: FormData
): Promise<TorneoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const categoriaTorneoId = String(formData.get("categoriaTorneoId") ?? "");
  if (!id || !categoriaTorneoId) {
    return { error: { code: "VALIDATION", message: "Incontro non specificato." } };
  }

  const validazione = validaCampiRisultato(formData);
  if ("error" in validazione) return validazione;
  const { set1, set2, set3 } = validazione.valori;

  if (!risultatoValido(set1, set2, set3)) {
    return {
      error: {
        code: "VALIDATION",
        message:
          "Il punteggio inserito non è coerente con il regolamento (al meglio dei 3 set).",
      },
    };
  }

  try {
    // Mirror del controllo "Categoria non trovata" delle altre azioni
    // Squadra sopra: serve anche a derivare edizioneTorneoId per
    // revalidatePath, nessun campo nascosto non verificato nel form.
    const categoria = await trovaCategoriaTorneoPerId(categoriaTorneoId);
    if (!categoria) {
      return { error: { code: "VALIDATION", message: "Categoria non trovata." } };
    }

    // Riletta PRIMA di scrivere (mai dal client, che non invia affatto
    // fase/tabellone in questo form e potrebbe comunque mentire su un campo
    // nascosto manomesso) - serve sia per il blocco sotto sia, dopo lo
    // scrittura, per decidere se generare le finali (fase/tabellone non
    // cambiano mai per una PartitaTorneo esistente, un'unica lettura basta
    // per entrambi gli usi).
    const partitaAttuale = await trovaPartitaTorneoPerId(id);
    if (partitaAttuale) {
      const bloccoModifica = await erroreModificaBloccata(partitaAttuale);
      if (bloccoModifica) {
        return { error: bloccoModifica };
      }
    }

    const risultato = await aggiornaRisultatoPartitaTorneo(id, categoriaTorneoId, {
      set1Casa: set1.casa,
      set1Ospite: set1.ospite,
      set2Casa: set2.casa,
      set2Ospite: set2.ospite,
      set3Casa: set3 ? set3.casa : null,
      set3Ospite: set3 ? set3.ospite : null,
    });
    if (risultato.count === 0) {
      return {
        error: { code: "VALIDATION", message: "Incontro non trovato in questa Categoria." },
      };
    }

    // spec-20-4: side-effect di generazione automatica delle finali - SOLO
    // se la partita appena salvata e' davvero una semifinale.
    if (partitaAttuale && partitaAttuale.fase === "SEMIFINALE" && partitaAttuale.tabellone) {
      await generaFinaliSeCompletate(categoriaTorneoId, partitaAttuale.tabellone);
    }

    // Entrambe le pagine che riusano questo Server Action (risultati/ per
    // il girone, tabellone/ per semifinali/finali - RisultatoPartitaTorneoForm
    // e' condiviso invariato, spec-20-4 Code Map) sono rivalidate: questa
    // azione non sa da sola su quale delle due si trova il chiamante.
    revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}/risultati`);
    revalidatePath(`/app/torneo/${categoria.edizioneTorneoId}/${categoriaTorneoId}/tabellone`);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile salvare il risultato. Riprova." },
    };
  }

  return { success: true };
}
