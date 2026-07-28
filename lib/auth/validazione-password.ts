export type ErroreValidazionePassword = { code: string; message: string };

// Estratta da app/modifica-password/actions.ts (Story 9.4) - riusata anche
// da app/(auth)/reimposta-password/actions.ts (Story 9.11) per non duplicare
// gli stessi due vincoli scoperti in code review della Story 9.4: lunghezza
// minima sul contenuto reale (trim, non sul conteggio grezzo - altrimenti una
// password di soli spazi supera il controllo) e massimo 72 byte (bcrypt,
// usato da Supabase Auth, tronca silenziosamente oltre quel limite).
export function validaNuovaPassword(
  nuovaPassword: string,
  confermaPassword: string
): ErroreValidazionePassword | null {
  if (nuovaPassword.trim().length < 8) {
    return {
      code: "VALIDATION",
      message: "La nuova password deve avere almeno 8 caratteri (non solo spazi).",
    };
  }

  if (nuovaPassword.length > 72) {
    return {
      code: "VALIDATION",
      message: "La nuova password non può superare i 72 caratteri.",
    };
  }

  if (nuovaPassword !== confermaPassword) {
    return {
      code: "VALIDATION",
      message: "La conferma non coincide con la nuova password.",
    };
  }

  return null;
}
