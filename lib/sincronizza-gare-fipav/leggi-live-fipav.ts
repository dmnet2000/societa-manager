import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  analizzaHtmlClassificaFipav,
  analizzaHtmlGareFipav,
  type RigaClassificaFipav,
} from "@/lib/sincronizza-gare-fipav/parser";
import type { RigaGaraImportata } from "@/lib/importa-gare/parser";
// Story 18.34: import di solo tipo - vista-home-live.ts importa a sua volta
// LetturaLiveFipav da questo stesso file. "import type" e' erasable a
// compile-time (nessun modulo caricato a runtime), quindi non introduce una
// vera dipendenza circolare tra i due file.
import type { LetturaPerCampionato } from "@/lib/sincronizza-gare-fipav/vista-home-live";

// Story 18.33: lettura live (sola lettura, mai una scrittura su DB) del
// portale FIPAV per la home pubblica - UN solo fetch per Campionato copre
// sia i risultati sia la classifica (stessa pagina, Design Notes
// spec-18-33), a differenza di sincronizzaGareFipav (Story 10.11) che
// scrive su Partita per l'uso interno. Percorso interamente indipendente,
// mai chiamata da li'.

export type LetturaLiveFipav = {
  risultati: RigaGaraImportata[];
  classifica: RigaClassificaFipav[];
};

// 10 minuti - discrezione dello sviluppo (spec-18-33, Design Notes): un
// girone di pallavolo non cambia risultato/classifica piu' di una volta
// ogni pochi giorni, questa finestra evita una richiesta fresca per ogni
// singolo visitatore senza percepibilmente invecchiare il dato mostrato.
export const REVALIDATE_SECONDI_DEFAULT = 600;

// Review fix (Verification Gap Reviewer, confermato contro
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md):
// app/page.tsx ha `export const dynamic = "force-dynamic"` (necessario per
// gli altri contenuti della home, invariato da questa story) - una pagina
// force-dynamic forza OGNI fetch() a { cache: "no-store", next:
// { revalidate: 0 } }, ignorando sempre l'opzione next.revalidate passata a
// un fetch al suo interno (confermato testualmente nella doc: "'force-
// dynamic': ... equivalent to: Setting the option of every fetch() request
// in a layout or page to { cache: 'no-store', next: { revalidate: 0 } }").
// Senza questo wrapper, ogni singola visita della home avrebbe rifatto il
// fetch al portale FIPAV per ogni Campionato - esattamente il "fetch
// letterale per-singolo-visitatore" che la spec dice esplicitamente di
// evitare (Design Notes/Boundaries spec-18-33), il `next.revalidate` sul
// fetch sarebbe stato silenziosamente inefficace. `unstable_cache`
// (deprecato in Next.js 16 in favore della direttiva "use cache", ma quella
// richiede di abilitare `cacheComponents` in next.config.ts - non abilitato
// in questo progetto, un cambiamento di configurazione dell'intera app
// molto piu' ampio di quanto serva per questo fix) usa la Data Cache di
// Next.js, un livello indipendente da `dynamic`/`fetchCache` del segmento -
// funziona correttamente anche su questa pagina.
async function eseguiFetchEParsing(linkFipav: string): Promise<LetturaLiveFipav | null> {
  let html: string;
  try {
    // Stessa identica configurazione di fetch di sincronizzaGareFipav
    // (sincronizza-fipav-actions.ts:79-92, Boundaries spec-18-33) - mirror
    // esatto, non una seconda convenzione. Nessuna opzione next.revalidate
    // qui: sarebbe inefficace sotto force-dynamic (vedi il commento su
    // leggiLiveFipav sotto) - la cache breve e' interamente delegata a
    // unstable_cache, non al fetch stesso.
    const risposta = await fetch(linkFipav, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SocietaManagerBot/1.0)" },
    });
    if (!risposta.ok) {
      return null;
    }
    html = await risposta.text();
  } catch (err) {
    console.error("leggiLiveFipav: fetch fallito", err);
    return null;
  }

  try {
    // Entrambe le tabelle lanciano se la propria non e' presente (mirror
    // di analizzaHtmlGareFipav, vedi Design Notes/Code Map spec-18-33) -
    // se una sola delle due manca (formato pagina cambiato), l'intero
    // blocco per questo Campionato viene omesso (AC #5), non solo la meta'
    // mancante.
    const { righe: risultati } = analizzaHtmlGareFipav(html);
    const classifica = analizzaHtmlClassificaFipav(html);
    return { risultati, classifica };
  } catch (err) {
    console.error("leggiLiveFipav: parsing fallito", err);
    return null;
  }
}

// Review fix (Verification Gap Reviewer, confermato contro
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md):
// app/page.tsx ha `export const dynamic = "force-dynamic"` (necessario per
// gli altri contenuti della home, invariato da questa story) - una pagina
// force-dynamic forza OGNI fetch() a { cache: "no-store", next:
// { revalidate: 0 } }, ignorando sempre l'opzione next.revalidate passata a
// un fetch al suo interno (confermato testualmente nella doc: "'force-
// dynamic': ... equivalent to: Setting the option of every fetch() request
// in a layout or page to { cache: 'no-store', next: { revalidate: 0 } }").
// Senza questo wrapper, ogni singola visita della home avrebbe rifatto il
// fetch al portale FIPAV per ogni Campionato - esattamente il "fetch
// letterale per-singolo-visitatore" che la spec dice esplicitamente di
// evitare (Design Notes/Boundaries spec-18-33). `unstable_cache` (deprecato
// in Next.js 16 in favore della direttiva "use cache", ma quella richiede
// di abilitare `cacheComponents` in next.config.ts - non abilitato in
// questo progetto, un cambiamento di configurazione dell'intera app molto
// piu' ampio di quanto serva per questo fix) usa la Data Cache di Next.js,
// un livello indipendente da `dynamic`/`fetchCache` del segmento - funziona
// correttamente anche su questa pagina. Non lancia MAI (stesso contratto
// esplicito di leggiUltimiPostFacebook, lib/facebook-graph.ts) - null su
// qualunque fallimento (risposta non-ok, eccezione di rete/timeout, o una
// delle due tabelle attese mancante/formato pagina cambiato). app/page.tsx
// chiama comunque con un .catch(() => null) aggiuntivo (Code Map
// spec-18-33) come seconda rete di sicurezza, ma questa funzione non
// dipende da quello per restare fail-soft.
export function leggiLiveFipav(
  linkFipav: string,
  revalidateSecondi: number = REVALIDATE_SECONDI_DEFAULT
): Promise<LetturaLiveFipav | null> {
  return unstable_cache(eseguiFetchEParsing, [linkFipav], {
    revalidate: revalidateSecondi,
  })(linkFipav);
}

// Story 18.34 (Code Map): estratta da app/page.tsx (query
// campionatiConLinkFipav + fetch live in parallelo per Campionato, Story
// 18.33) per essere riusabile identica sia dalla home sia da
// app/classifiche/page.tsx - mai due implementazioni parallele della stessa
// query+fetch (Boundaries spec-18-34). Stesso identico comportamento di
// prima: query scoped alla sola stagione richiesta con linkFipav non nullo
// (un Campionato senza linkFipav non genera alcun fetch ne' alcun blocco,
// AC #4 spec-18-33/#4 spec-18-34), fetch in parallelo (mai in sequenza) con
// doppia rete di sicurezza fail-soft (leggiLiveFipav non lancia mai da
// solo, il .catch(() => null) qui e' una seconda rete esplicita) - un
// Campionato il cui fetch fallisce non deve mai far fallire Promise.all per
// gli altri (AC #5 spec-18-33/#5 spec-18-34).
export async function leggiCampionatiConLetturaFipav(
  annoAgonisticoId: string
): Promise<LetturaPerCampionato[]> {
  const campionatiConLinkFipav = await prisma.campionato.findMany({
    where: { annoAgonisticoId, linkFipav: { not: null } },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      colore: true,
      linkFipav: true,
      gruppo: { select: { nome: true } },
    },
  });

  return Promise.all(
    campionatiConLinkFipav.map(async (campionato) => {
      if (!campionato.linkFipav) {
        return { campionato, lettura: null };
      }
      const lettura = await leggiLiveFipav(campionato.linkFipav).catch((err) => {
        console.error(err);
        return null;
      });
      return { campionato, lettura };
    })
  );
}
