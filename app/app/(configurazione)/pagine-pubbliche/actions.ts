"use server";

import { revalidatePath } from "next/cache";
import type { Ruolo } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { rottaRiservata } from "@/lib/auth/route-guard";
import { invalidaCachePaginePubbliche } from "@/lib/auth/pagine-pubbliche-slug-cache";
import { sanitizzaHtml } from "@/lib/sanitizza-html";
import { createClient } from "@/lib/supabase/server";
import {
  creaPaginaPubblica,
  aggiornaPaginaPubblica,
  eliminaPaginaPubblica,
  trovaPaginaPubblicaPerId,
} from "@/lib/pagine-pubbliche";
import { caricaImmaginePaginaPubblica } from "@/lib/storage/pagine-pubbliche";
import {
  MIME_AMMESSI_IMMAGINE,
  DIMENSIONE_MASSIMA_IMMAGINE_BYTE,
  contenutoCorrispondeAlMimeImmagine,
} from "@/lib/storage/validazione-immagine";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione. Mirror strutturale di
// app/app/(configurazione)/menu-pubblico/actions.ts (Story 19.7).
export type PaginaPubblicaActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 19.10 (Epic 19, Ruolo Site Manager): AC #5 limita esplicitamente
// questa pagina ad ADMIN/SITE_MANAGER, non DIRIGENTE - stesso perimetro di
// /app/menu-pubblico (Story 19.7), funzionalita' nuova senza permesso
// preesistente da affiancare.
const RUOLI_GESTIONE_PAGINE_PUBBLICHE: Ruolo[] = ["ADMIN", "SITE_MANAGER"];

const LUNGHEZZA_MASSIMA_TITOLO = 100;
const LUNGHEZZA_MASSIMA_SLUG = 200;
// Code review (Blind Hunter): contenutoHtml e' @db.Text (nessun limite a
// livello di colonna), a differenza di titolo/slug sopra - un limite
// applicativo generoso (blob HTML arbitrariamente grande impedito) senza
// vincolare un contenuto "dépliant" legittimo, coerente con l'ampiezza
// decisa in party mode.
const LUNGHEZZA_MASSIMA_CONTENUTO = 200_000;

// A differenza di urlVoceMenuValido (menu-pubblico/actions.ts), qui non
// esiste il ramo "link esterno http/https": una PaginaPubblica e' sempre una
// rotta interna del sito (il contenuto vive nel database, non altrove), lo
// slug deve sempre iniziare con "/". Stesso controllo protocol-relative
// ("//host.esterno") e stessa esenzione "slugAttuale" per permettere di
// risalvare la STESSA Pagina con lo stesso slug invariato anche se
// rottaRiservata() lo considera riservato (isPublicRoute copre anche le
// Pagine pubbliche gia' esistenti) - mirror esatto di urlVoceMenuValido,
// stesso motivo documentato li' (Story 19.9 review fix, intent_gap).
function slugPaginaValido(valore: string, slugAttuale?: string): boolean {
  if (!valore || valore.length > LUNGHEZZA_MASSIMA_SLUG) return false;
  if (!valore.startsWith("/") || valore.startsWith("//")) return false;
  return valore === slugAttuale || !rottaRiservata(valore);
}

function leggiCampi(formData: FormData) {
  return {
    titolo: String(formData.get("titolo") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    // Non trimmato in modo aggressivo oltre lo spazio esterno: il markup
    // dell'editor (Tiptap) non deve essere alterato prima della
    // sanitizzazione, solo lo spazio bianco eventualmente introdotto dal
    // campo hidden stesso.
    contenutoHtml: String(formData.get("contenutoHtml") ?? "").trim(),
  };
}

// Code review (Blind Hunter + Edge Case Hunter, trovato indipendentemente
// da entrambi): un editor Tiptap "vuoto" (mai toccato, o svuotato del tutto)
// serializza a "<p></p>" - una stringa non vuota che superava il vecchio
// controllo `!campi.contenutoHtml`. Confrontare invece il contenuto SENZA
// tag: una Pagina con solo paragrafi vuoti non ha nulla da mostrare, ma una
// Pagina con almeno un'immagine (nessun testo, solo <img>) conta comunque
// come "ha contenuto" - stessa logica applicata al contenuto GIA'
// sanitizzato (non al grezzo): se l'allowlist di sanitizzaHtml() rimuove
// tutto (es. un utente incolla solo markup fuori allowlist), il risultato
// resta comunque vuoto e va rifiutato allo stesso modo, non solo il caso
// letterale "<p></p>".
function contenutoVisibilmenteVuoto(contenutoSicuro: string): boolean {
  const senzaTag = contenutoSicuro.replace(/<[^>]*>/g, "").trim();
  return senzaTag.length === 0 && !contenutoSicuro.includes("<img");
}

function validaCampi(
  campi: { titolo: string; slug: string },
  contenutoSicuro: string,
  slugAttuale?: string
): { code: string; message: string } | null {
  if (!campi.titolo) {
    return { code: "VALIDATION", message: "Il titolo è obbligatorio." };
  }
  if (campi.titolo.length > LUNGHEZZA_MASSIMA_TITOLO) {
    return {
      code: "VALIDATION",
      message: `Il titolo supera i ${LUNGHEZZA_MASSIMA_TITOLO} caratteri.`,
    };
  }
  if (!slugPaginaValido(campi.slug, slugAttuale)) {
    return {
      code: "VALIDATION",
      message:
        'URL non valido (deve iniziare con "/" e non può corrispondere a una rotta riservata del sito).',
    };
  }
  if (contenutoSicuro.length > LUNGHEZZA_MASSIMA_CONTENUTO) {
    return {
      code: "VALIDATION",
      message: `Il contenuto supera i ${LUNGHEZZA_MASSIMA_CONTENUTO.toLocaleString("it-IT")} caratteri.`,
    };
  }
  if (contenutoVisibilmenteVuoto(contenutoSicuro)) {
    return { code: "VALIDATION", message: "Il contenuto della pagina è obbligatorio." };
  }
  return null;
}

// Stessa validazione immagine di creaSponsor/aggiornaSponsor (sponsor/actions.ts,
// mirror, non reinventare) - vedi lib/storage/validazione-immagine.ts.
async function validaImmagine(
  file: FormDataEntryValue | null
): Promise<{ code: string; message: string } | { file: File }> {
  if (!(file instanceof File) || file.size === 0) {
    return { code: "VALIDATION", message: "Seleziona un'immagine da caricare." };
  }
  if (!MIME_AMMESSI_IMMAGINE.includes(file.type)) {
    return { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." };
  }
  if (file.size > DIMENSIONE_MASSIMA_IMMAGINE_BYTE) {
    return { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." };
  }
  if (!(await contenutoCorrispondeAlMimeImmagine(file))) {
    return {
      code: "VALIDATION",
      message: "Il contenuto del file non corrisponde al formato dichiarato.",
    };
  }
  return { file };
}

export async function creaPaginaPubblicaAction(
  _prevState: PaginaPubblicaActionState,
  formData: FormData
): Promise<PaginaPubblicaActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_PAGINE_PUBBLICHE);
  if (forbidden) return forbidden;

  const campi = leggiCampi(formData);

  // Boundaries & Constraints (spec-19-10, "Always"): ogni salvataggio passa
  // dalla sanitizzazione di lib/sanitizza-html.ts PRIMA di scrivere su
  // database - mai il solo passaggio al render (app/[...slug]/page.tsx,
  // Story 19.9, applica un secondo passaggio in lettura, difesa in
  // profondita', non un sostituto di questo). Sanitizzato PRIMA di
  // validaCampi (code review): il controllo "contenuto vuoto" deve guardare
  // cosa verra' DAVVERO salvato, non il grezzo pre-sanitizzazione - un
  // markup fuori allowlist che sanitizzaHtml() rimuove per intero deve
  // contare come vuoto allo stesso modo di un editor mai toccato.
  const contenutoSicuro = sanitizzaHtml(campi.contenutoHtml);

  const errore = validaCampi(campi, contenutoSicuro);
  if (errore) return { error: errore };

  try {
    await creaPaginaPubblica({
      titolo: campi.titolo,
      slug: campi.slug,
      contenutoHtml: contenutoSicuro,
    });
  } catch (err) {
    // Vincolo @unique su "slug" (prisma/schema.prisma) - una race tra due
    // creazioni con lo stesso URL, o un URL gia' in uso non colto dal
    // controllo sopra, viene rifiutata come errore utente esplicito
    // (spec-19-10, I/O matrix: "slug già in uso" -> VALIDATION), non come
    // INTERNAL generico.
    if ((err as { code?: string }).code === "P2002") {
      return {
        error: { code: "VALIDATION", message: "Questo URL è già utilizzato da un'altra Pagina." },
      };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare la Pagina. Riprova." },
    };
  }

  // Code review (Blind Hunter): senza questo, il Proxy (lib/auth/route-decision.ts,
  // Story 19.9) continua a fidarsi della cache edge-safe (TTL 90s) e puo'
  // reindirizzare un Visitatore anonimo a /accedi per una Pagina appena
  // creata invece di mostrargliela subito - in contraddizione con l'avviso
  // in UI ("subito visibile pubblicamente"). Invalidazione fail-soft
  // (nessun impatto sull'esito del salvataggio se fallisce): il prossimo
  // tentativo di lettura rilegge comunque dopo la scadenza naturale del TTL.
  invalidaCachePaginePubbliche();
  revalidatePath("/app/pagine-pubbliche");
  return { success: true };
}

export async function aggiornaPaginaPubblicaAction(
  _prevState: PaginaPubblicaActionState,
  formData: FormData
): Promise<PaginaPubblicaActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_PAGINE_PUBBLICHE);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const campi = leggiCampi(formData);
  // Letta PRIMA della validazione per esentare dal controllo rottaRiservata()
  // il caso "slug invariato" (vedi slugPaginaValido) - mirror esatto del fix
  // intent_gap gia' applicato a aggiornaVoceMenuPubblicoAction (Story 19.9).
  // Code review (Verification Gap): un errore DB qui NON viene piu' mascherato
  // da un "null" silenzioso - prima, un fallimento transitorio del lookup
  // faceva cadere paginaEsistente a null, quindi slugAttuale a undefined, e
  // un salvataggio perfettamente valido (stesso slug di sempre, solo
  // "riservato" per via dell'esenzione mancata) veniva rifiutato con un
  // fuorviante "URL non valido" invece di un onesto errore di sistema.
  let paginaEsistente: Awaited<ReturnType<typeof trovaPaginaPubblicaPerId>> = null;
  try {
    paginaEsistente = await trovaPaginaPubblicaPerId(id);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Pagina. Riprova." },
    };
  }

  const contenutoSicuro = sanitizzaHtml(campi.contenutoHtml);
  const errore = validaCampi(campi, contenutoSicuro, paginaEsistente?.slug);
  if (errore) return { error: errore };

  try {
    await aggiornaPaginaPubblica(id, {
      titolo: campi.titolo,
      slug: campi.slug,
      contenutoHtml: contenutoSicuro,
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return {
        error: { code: "VALIDATION", message: "Questo URL è già utilizzato da un'altra Pagina." },
      };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Pagina. Riprova." },
    };
  }

  // Code review (Blind Hunter): stesso motivo di creaPaginaPubblicaAction -
  // un cambio di slug o di contenuto deve riflettersi subito per un
  // Visitatore anonimo, non solo dopo la scadenza naturale del TTL.
  invalidaCachePaginePubbliche();
  revalidatePath("/app/pagine-pubbliche");
  return { success: true };
}

export async function eliminaPaginaPubblicaAction(
  _prevState: PaginaPubblicaActionState,
  formData: FormData
): Promise<PaginaPubblicaActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_PAGINE_PUBBLICHE);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");

  try {
    await eliminaPaginaPubblica(id);
  } catch (err) {
    // Race TOCTOU (due cancellazioni concorrenti sulla stessa Pagina) -
    // Prisma solleva P2025 ("Record to delete does not exist") se la riga e'
    // gia' sparita: trattato come successo idempotente, stesso principio gia'
    // usato per cancellaCampionato (campionati/actions.ts, Story 10.6).
    if ((err as { code?: string }).code === "P2025") {
      invalidaCachePaginePubbliche();
      revalidatePath("/app/pagine-pubbliche");
      return { success: true };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile eliminare la Pagina. Riprova." },
    };
  }

  // Code review (Blind Hunter): senza questo, una Pagina appena eliminata
  // resterebbe raggiungibile (falso "esiste") per un Visitatore anonimo fino
  // alla scadenza del TTL - il rendering pubblico (app/[...slug]/page.tsx)
  // tornerebbe comunque 404 (legge Prisma direttamente, non la cache), ma il
  // Proxy continuerebbe a lasciarla passare invece di applicare le regole
  // normali per un pathname sconosciuto.
  invalidaCachePaginePubbliche();
  revalidatePath("/app/pagine-pubbliche");
  return { success: true };
}

// Data & formati: a differenza delle tre azioni sopra, questa non e' legata
// a un <form action={...}>/useActionState - viene invocata direttamente
// dall'editor (PaginaPubblicaEditor.tsx, "use client") mentre l'Utente
// inserisce un'immagine, prima ancora che la Pagina sia stata salvata (una
// nuova Pagina non ha ancora un id). Nessun fetch client-side introdotto: e'
// comunque una Server Action, invocata come funzione asincrona ordinaria
// (RPC gestito dal framework), non una route HTTP scritta a mano.
export type CaricaImmaginePaginaResult =
  | { url: string }
  | { error: { code: string; message: string } };

export async function caricaImmaginePaginaAction(
  formData: FormData
): Promise<CaricaImmaginePaginaResult> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_PAGINE_PUBBLICHE);
  if (forbidden) return forbidden;

  const risultato = await validaImmagine(formData.get("file"));
  if (!("file" in risultato)) return { error: risultato };

  try {
    const supabase = await createClient();
    const url = await caricaImmaginePaginaPubblica(supabase, risultato.file);
    return { url };
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile caricare l'immagine. Riprova." },
    };
  }
}
