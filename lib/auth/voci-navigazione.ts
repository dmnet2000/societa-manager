import type { Ruolo } from "@/generated/prisma/client";
import { PROTECTED_ROUTES } from "./route-guard";

export type VoceNavigazione = { href: string; label: string };

// Story 8.1 (AC #2/#3): filtra PROTECTED_ROUTES (stessa fonte di verita'
// gia' usata per l'autorizzazione, lib/auth/route-guard.ts) tenendo solo le
// voci il cui ruoliAmmessi interseca i Ruoli dell'Utente. Nessuna deduplica
// esplicita necessaria: ogni prefisso compare una sola volta in
// PROTECTED_ROUTES per costruzione, quindi un Utente con piu' Ruoli vede
// automaticamente l'unione senza ripetizioni.
export function filtraVociNavigazione(ruoli: Ruolo[]): VoceNavigazione[] {
  return PROTECTED_ROUTES.filter((route) =>
    route.ruoliAmmessi.some((r) => ruoli.includes(r))
  ).map((route) => ({ href: route.prefix, label: route.navLabel }));
}
