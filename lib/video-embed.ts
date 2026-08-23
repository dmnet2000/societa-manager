// Story 19.14 (Epic 19, Ruolo Site Manager): blocco Video dell'editor a
// blocchi delle Pagine pubbliche. Stesso principio gia' in uso per l'embed
// Facebook (Story 18.5, rendering server-side via Graph API, mai markup
// incollato dall'Utente): l'Utente inserisce solo un URL "umano" (il link
// alla pagina del video, come lo copierebbe dalla barra degli indirizzi di
// YouTube/Vimeo) - MAI un `src` di iframe, MAI un embed HTML incollato.
// estraiIdVideo() e' l'unico punto che interpreta quell'URL: riconosce
// esclusivamente i pattern noti (youtube.com/watch?v=, youtu.be/,
// vimeo.com/{id}) e restituisce {piattaforma, id} - un id gia' validato
// contro un insieme chiuso di caratteri (nessuna stringa arbitraria puo'
// mai emergere da qui). Va eseguita SEMPRE lato server (Server Action
// validaUrlVideoAction, pagine-pubbliche/actions.ts) prima che un blocco
// Video venga creato nell'editor - un Utente non deve mai poter forgiare
// platform/videoId direttamente lato client. costruisciSrcVideo() e'
// l'unica funzione che ricostruisce l'URL di embed (dominio
// "privacy-enhanced" www.youtube-nocookie.com invece di youtube.com, o
// player.vimeo.com) - sempre a partire da un {piattaforma, id} gia'
// validato, mai da un input diretto dell'utente.
export type PiattaformaVideo = "youtube" | "vimeo";

export type VideoRiconosciuto = { piattaforma: PiattaformaVideo; id: string };

// Insieme chiuso di caratteri per un id video valido - stessa filosofia
// "insieme chiuso di stringhe letterali" gia' seguita per data-align
// (lib/allineamenti.ts) e per direzione/URL altrove nel progetto. Un id
// YouTube e' sempre lungo 11 caratteri (base64url); un id Vimeo e' sempre
// una sequenza di cifre.
const ID_YOUTUBE_VALIDO = /^[A-Za-z0-9_-]{11}$/;
const ID_VIMEO_VALIDO = /^[0-9]{6,12}$/;

// Riconosce esclusivamente i tre pattern decisi in party mode (epics.md,
// Story 19.14): youtube.com/watch?v=, youtu.be/{id}, vimeo.com/{id}. Nessun
// altro host, nessun altro formato di percorso (es. /shorts/, /embed/) -
// un URL che non corrisponde a nessuno dei tre torna null, il chiamante
// (Server Action) lo rifiuta esplicitamente con "URL video non riconosciuto".
export function estraiIdVideo(valoreGrezzo: string): VideoRiconosciuto | null {
  const valore = valoreGrezzo.trim();
  if (!valore) return null;

  let url: URL;
  try {
    url = new URL(valore);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtube.com") {
    if (url.pathname !== "/watch") return null;
    const id = url.searchParams.get("v");
    return id && ID_YOUTUBE_VALIDO.test(id) ? { piattaforma: "youtube", id } : null;
  }

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return ID_YOUTUBE_VALIDO.test(id) ? { piattaforma: "youtube", id } : null;
  }

  if (host === "vimeo.com") {
    const id = url.pathname.slice(1);
    return ID_VIMEO_VALIDO.test(id) ? { piattaforma: "vimeo", id } : null;
  }

  return null;
}

// Riusata dal Server Action di salvataggio (pagine-pubbliche/actions.ts,
// creaPaginaPubblicaAction/aggiornaPaginaPubblicaAction) per ri-validare, al
// momento di salvare l'intera Pagina, ogni coppia platform/videoId gia'
// presente nel markup del blocco Video (data-platform/data-video-id) - difesa
// in profondita': un client manomesso potrebbe scrivere quegli attributi nel
// campo hidden contenutoHtml senza mai passare da validaUrlVideoAction. Stesso
// insieme chiuso di regex usato sopra, applicato pero' all'id gia' estratto
// (non a un URL) - e' il vero cancello al salvataggio.
export function videoIdRiconosciuto(piattaforma: string, id: string): boolean {
  if (piattaforma === "youtube") return ID_YOUTUBE_VALIDO.test(id);
  if (piattaforma === "vimeo") return ID_VIMEO_VALIDO.test(id);
  return false;
}

// Unica funzione che ricostruisce l'URL di embed - mai a partire da un input
// diretto dell'Utente, sempre da un {piattaforma, id} gia' passato da
// estraiIdVideo() o ri-validato da videoIdRiconosciuto(). Dominio
// "privacy-enhanced" per YouTube (youtube-nocookie.com, non youtube.com) -
// decisione esplicita in party mode (epics.md, Story 19.14).
export function costruisciSrcVideo(piattaforma: PiattaformaVideo, id: string): string {
  if (piattaforma === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  return `https://player.vimeo.com/video/${id}`;
}
