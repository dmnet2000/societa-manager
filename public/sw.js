// Story 14.2: Service Worker vanilla, nessuna libreria (Serwist richiede
// Webpack, questo progetto builda con Turbopack - vedi Dev Notes della
// story). Ambito volutamente minimo (epics.md, Epic 14): cache-first SOLO
// per asset statici con hash immutabile (/_next/static/*), network-only
// per tutto il resto. CACHE_NAME va incrementato manualmente ad ogni
// futura modifica sostanziale di questo file (vedi Dev Notes ->
// "Versionamento cache" della story) - non e' ribattezzato
// automaticamente da Next.js come /_next/static/*.
const CACHE_NAME = "societa-manager-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // Review: senza .catch() un precache fallito fa rigettare l'intera
  // installazione (il browser scarta il SW, silenziosamente) - qui non
  // c'e' un fallback migliore che "provarci comunque e continuare",
  // l'evento install non deve dipendere dalla riuscita del precache per
  // poter comunque attivarsi.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Review: .catch() cosi' clients.claim() (AC #2) viene eseguito
  // comunque anche se la pulizia delle cache stale fallisse.
  event.waitUntil(
    caches
      .keys()
      .then((nomiCache) =>
        Promise.all(
          nomiCache
            .filter((nome) => nome !== CACHE_NAME)
            .map((nome) => caches.delete(nome)),
        ),
      )
      .catch(() => {})
      .then(() => clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Navigazione (AC #1): sempre rete per prima, cache solo come fallback
  // dell'errore - mai cache-first per una pagina, mostrerebbe dati
  // stantii (AC #3). Review: il fallback scatta sia su rigetto di rete
  // sia su risposta non-2xx (es. 5xx/gateway-timeout, lo scenario
  // "connessione instabile" del titolo della story) - non solo
  // sull'assenza totale di rete. Risposta testuale minima come ultima
  // risorsa se anche offline.html non fosse in cache (es. install fallito
  // in precedenza).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((rispostaRete) =>
          rispostaRete.ok
            ? rispostaRete
            : caches.match(OFFLINE_URL).then((r) => r || rispostaRete),
        )
        .catch(() =>
          caches
            .match(OFFLINE_URL)
            .then(
              (r) =>
                r ||
                new Response("Connessione assente.", {
                  status: 503,
                  headers: { "Content-Type": "text/plain" },
                }),
            ),
        ),
    );
    return;
  }

  // Asset statici con hash nel nome file, immutabili per costruzione -
  // unico caso autorizzato a cache-first (AC #3/epics.md). Review: messo
  // in cache solo se la risposta e' 2xx (un 404 su un chunk rimosso da un
  // deploy successivo non deve restare in cache fino al prossimo bump di
  // CACHE_NAME) e .catch() sul fetch di rete (un rigetto non deve far
  // fallire respondWith con l'errore generico del browser).
  if (request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((risposta) => {
        if (risposta) {
          return risposta;
        }
        return fetch(request)
          .then((rispostaRete) => {
            if (rispostaRete.ok) {
              const clone = rispostaRete.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return rispostaRete;
          })
          .catch(
            () =>
              new Response("", { status: 504, statusText: "Offline" }),
          );
      }),
    );
    return;
  }

  // Tutto il resto (chiamate dati, Server Action, /api/*, navigazioni
  // escluse) - nessuna intercettazione, comportamento di rete normale del
  // browser: e' questo il "network-only" richiesto da AC #3/#4.
});
