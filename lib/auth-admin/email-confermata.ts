// Story 9.38: funzione pura estratta da app/app/(amministrazione)/admin/page.tsx
// (review fix - Verification Gap Reviewer: la logica non aveva alcun test
// diretto, invertirla o cambiare il fallback non avrebbe fatto fallire
// nessun test esistente, con una conseguenza reale - il form "Correggi
// email" sarebbe comparso/scomparso per le righe sbagliate). Mappa
// l'elenco restituito da admin.auth.admin.listUsers() (una sola chiamata
// per l'intera pagina, non una per riga - vedi Design Notes della story) in
// supabaseAuthId -> "l'email e' stata confermata".
export function calcolaEmailConfermataPerAuthId(
  users: { id: string; email_confirmed_at?: string | null }[]
): Map<string, boolean> {
  return new Map(users.map((u) => [u.id, Boolean(u.email_confirmed_at)]));
}
