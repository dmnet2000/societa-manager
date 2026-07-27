// Story 9.6 (estensione): riconosce le coordinate dentro un link di
// condivisione Google Maps incollato dall'Admin/Dirigente. Ordine di
// priorita' (il primo pattern che matcha vince): pin preciso (!3d/!4d,
// presente quando si tocca/rilascia un punto specifico - il piu' affidabile)
// prima del centro vista (@lat,lng,zoom, presente in quasi ogni link
// "Condividi" ma meno preciso se l'utente ha solo cercato un nome), prima dei
// parametri di query piu' vecchi (?q=/?ll=lat,lng) o del formato generato da
// questa stessa app (?query=lat,lng, vedi costruisciLinkNaviga - un Admin
// potrebbe incollare qui il link "Naviga" gia' mostrato altrove).
const PATTERN_PIN_PRECISO = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/;
const PATTERN_CENTRO_VISTA = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),/;
const PATTERN_QUERY = /[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;

// Review fix: senza un controllo di dominio, qualunque URL con una stringa a
// forma di coordinate (es. "https://esempio.com/?q=45,12") veniva accettato
// come se fosse un vero link Google Maps - violava l'AC che richiede un
// errore di validazione per link non riconoscibili, e apriva la porta a
// salvare/mostrare posizioni provenienti da domini arbitrari.
const DOMINI_GOOGLE_MAPS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

function isDominioGoogleMaps(url: URL): boolean {
  return DOMINI_GOOGLE_MAPS.has(url.hostname) || url.hostname.endsWith(".google.com");
}

// I link condivisi da mobile a volte vengono incollati senza lo schema
// (es. "maps.app.goo.gl/abc123") - si ritenta con "https://" prima di
// arrendersi, invece di scartarli solo perche' new URL() lancia senza schema.
function normalizzaUrl(link: string): URL | null {
  try {
    return new URL(link);
  } catch {
    try {
      return new URL(`https://${link}`);
    } catch {
      return null;
    }
  }
}

function coordinateValide(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function estraiCoordinateDaLinkMaps(
  link: string
): { lat: number; lng: number } | null {
  const testo = link.trim();
  if (!testo) {
    return null;
  }

  const url = normalizzaUrl(testo);
  if (!url || !isDominioGoogleMaps(url)) {
    return null;
  }

  for (const pattern of [PATTERN_PIN_PRECISO, PATTERN_CENTRO_VISTA, PATTERN_QUERY]) {
    const match = testo.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (coordinateValide(lat, lng)) {
        return { lat, lng };
      }
      return null;
    }
  }

  return null;
}

// Link brevi (tipici della condivisione da mobile) non contengono le
// coordinate nell'URL stesso - vanno risolti seguendo il redirect (vedi
// risolviLinkMaps in app/(orari-palestre)/palestre/actions.ts) prima di
// poter applicare estraiCoordinateDaLinkMaps.
export function isLinkMapsAccorciato(url: string): boolean {
  const parsed = normalizzaUrl(url);
  if (!parsed) {
    return false;
  }
  return parsed.hostname === "maps.app.goo.gl" || parsed.hostname === "goo.gl";
}
