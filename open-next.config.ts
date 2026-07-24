import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Nessuna cache incrementale R2 (ISR/PPR): l'app e' quasi interamente
// server-rendered dinamico, il beneficio non giustifica di abilitare R2
// sul dashboard Cloudflare solo per questo - vedi wrangler.jsonc.
export default defineCloudflareConfig();
