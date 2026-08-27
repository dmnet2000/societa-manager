import type { Ruolo } from "@prisma/client";
import { RUOLI_VALIDI } from "./ruoli";

// Story 9.40: priorita' di ordinamento per Ruolo nella tabella Utenti di
// /app/admin - derivata da RUOLI_VALIDI (stesso array condiviso gia' usato
// per l'ordine del gruppo di checkbox in UtenteRow.tsx), non una lista
// separata da tenere manualmente allineata.
// Review fix (Blind Hunter): l'indice e' gia' disponibile come secondo
// argomento di .map, RUOLI_VALIDI.indexOf(ruolo) dentro il .map era una
// ricerca lineare ridondante (O(n^2) invece di O(n) - irrilevante sui soli 7
// Ruoli di oggi, ma inutile).
const PRIORITA_RUOLO: Record<Ruolo, number> = Object.fromEntries(
  RUOLI_VALIDI.map((ruolo, indice) => [ruolo, indice])
) as Record<Ruolo, number>;

// Mirror di ordinaPerPrioritaStato (lib/ordina-certificati-per-stato.ts): un
// criterio, una funzione pura. Un Utente con piu' Ruoli usa il Ruolo di
// indice piu' basso (piu' prioritario) - confermato con l'utente in fase di
// pianificazione. Un Utente senza alcun Ruolo (Math.min su array vuoto =
// Infinity) finisce in fondo, dopo tutti gli Utenti con almeno un Ruolo.
export function ordinaUtentiPerRuolo<T extends { ruoli: Ruolo[]; email: string }>(
  utenti: T[]
): T[] {
  return [...utenti].sort((a, b) => {
    const prioritaA = Math.min(...a.ruoli.map((r) => PRIORITA_RUOLO[r]));
    const prioritaB = Math.min(...b.ruoli.map((r) => PRIORITA_RUOLO[r]));
    const diff = prioritaA - prioritaB;
    if (diff !== 0) return diff;
    return a.email.localeCompare(b.email, "it");
  });
}

// Attivo prima di Disattivato, fallback alfabetico per email a parita' -
// stesso criterio dell'orderBy server-side esistente (page.tsx: orderBy:
// { email: "asc" }).
export function ordinaUtentiPerStato<T extends { attivo: boolean; email: string }>(
  utenti: T[]
): T[] {
  return [...utenti].sort((a, b) => {
    const diff = Number(b.attivo) - Number(a.attivo);
    if (diff !== 0) return diff;
    return a.email.localeCompare(b.email, "it");
  });
}
