// Story 9.41: unica fonte di normalizzazione email per il precaricamento
// Segreteria/Dirigente - riusata sia in scrittura (precaricamento) sia in
// lettura (matching in registrati/actions.ts), mai reimplementata altrove
// (mirror del principio "un modulo di matching condiviso", AD-5).
export function normalizzaEmailRuolo(email: string): string {
  return email.trim().toLowerCase();
}
