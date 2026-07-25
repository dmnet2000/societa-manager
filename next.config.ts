import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Pacchetti con export condizionali specifici per il runtime "workerd"
  // (Cloudflare Workers/Pages, via @opennextjs/cloudflare): senza questa
  // esclusione Next.js li impacchetta con le condizioni Node.js di
  // default, e il bundling finale su Cloudflare fallisce a risolvere
  // l'entry point corretto (es. "pg-cloudflare", richiesto da "pg"/
  // @prisma/adapter-pg per aprire connessioni TCP dentro un Worker) - vedi
  // https://opennext.js.org/cloudflare/howtos/workerd.
  // "@prisma/client" (generator "prisma-client-js"): senza questa
  // esclusione Next.js risolve l'export "." con la condizione "node"
  // (motore nativo, richiede un binario OpenSSL specifico del sistema -
  // introvabile/incompatibile a runtime su Workers), invece della
  // condizione "workerd" del package (motore WASM, nessun binario nativo).
  // Errore osservato in produzione (2026-07-25): "PrismaClientInitializationError:
  // Prisma Client could not locate the Query Engine for runtime
  // debian-openssl-1.1.x".
  serverExternalPackages: ["pg", "pg-cloudflare", "@prisma/client"],
  experimental: {
    serverActions: {
      // Default Next.js 1MB - troppo basso per gli upload multipart di
      // questo progetto: certificati medici fino a 10MB (Story 4.1,
      // app/(certificati-medici)/certificato-medico/actions.ts) e logo
      // fino a 2MB (Story 7.2, app/(configurazione)/logo/actions.ts).
      // Scoperto durante la verifica dal vivo di Story 7.2 (un upload da
      // 2MB si bloccava silenziosamente prima di raggiungere la Server
      // Action) - lo stesso limite di default bloccava probabilmente
      // anche gli upload di certificati vicini ai 10MB dichiarati, mai
      // esercitati a quella dimensione reale nella verifica di Story 4.1.
      // 11mb copre il caso piu' grande (10MB) con margine per l'overhead
      // multipart (boundary, header di parte), come da guida Next.js.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
