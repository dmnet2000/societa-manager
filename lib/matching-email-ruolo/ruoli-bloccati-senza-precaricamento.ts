import type { Ruolo } from "@prisma/client";

// Story 9.41: gli unici due Ruoli per cui la registrazione è bloccata senza
// un precaricamento email preesistente - unica fonte di verità, condivisa
// da registrati/actions.ts (controllo pre-generateLink) e da
// precaricamento-ruoli/actions.ts (checkbox gestite dalla pagina Admin).
// Review fix (Blind Hunter): prima duplicata verbatim nei due file (un file
// "use server" può esportare solo funzioni async, mai una costante) - questo
// modulo non è "use server", entrambi i chiamanti già lo importano per
// normalizzaEmailRuolo/trovaPrecaricamentoRuolo.
export const RUOLI_BLOCCATI_SENZA_PRECARICAMENTO: Ruolo[] = ["SEGRETERIA", "DIRIGENTE"];
