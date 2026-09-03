"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HOME_PATH } from "@/lib/auth/route-guard";

// Story 9.1: nessuno stato di ritorno { error }/{ success } come le altre
// Server Action del progetto - un fallimento di signOut() qui non ha un
// messaggio utile da mostrare (il pulsante e' nella barra di navigazione,
// non in un form con un'area di errore dedicata).
//
// Review fix (code review Story 9.1): fail-closed, stesso pattern di
// accedi/actions.ts e proxy.ts (ogni altra chiamata a signOut() nel
// progetto e' avvolta in try/catch) - senza, un'eccezione di rete verso
// Supabase Auth farebbe crashare la Server Action invece di rediretare
// pulito alla destinazione post-logoff (HOME_PATH, Story 9.42). redirect()
// lancia comunque un'eccezione speciale di Next.js per interrompere
// l'esecuzione: va richiamato FUORI dal blocco try (altrimenti il catch la
// intercetterebbe come se fosse un errore).
//
// Scope di signOut() non specificato (default "global", invalida tutte le
// sessioni dell'utente su ogni dispositivo): scelta deliberata confermata
// con l'utente durante la review (2026-07-25), non un default trascurato -
// coerente con l'aspettativa che "uscire" da un dispositivo condiviso (es.
// un tablet in palestra) chiuda la sessione ovunque, non solo li'.
export async function esci() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
    }
  } catch (err) {
    console.error(err);
  }
  // Story 9.7: senza questo, il layout che monta <NavBar/> resta nella
  // Client Cache del router Next.js e non viene ri-eseguito sulla
  // navigazione innescata dal redirect() qui sotto - la barra di
  // navigazione mostrava ancora l'utente autenticato nonostante la
  // sessione fosse gia' terminata (documentato in
  // node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md#Revalidating-all-data).
  // Story 18.1: <NavBar/> si e' spostata dal layout radice (app/layout.tsx)
  // al layout annidato di app/app/layout.tsx - il target resta "/app",
  // indipendentemente dalla destinazione del redirect() sotto (mai la home
  // pubblica, che non monta mai <NavBar/>, nessun motivo di invalidarla).
  // Chiamato sempre, indipendentemente dall'esito di signOut() sopra -
  // stesso principio fail-closed del redirect() stesso.
  revalidatePath("/app", "layout");
  // Story 9.42: destinazione post-logoff e' la home pubblica (HOME_PATH,
  // Story 18.1) invece di LOGIN_PATH ("/accedi") - un Utente che esce
  // ritrova l'esperienza da Visitatore del sito pubblico, con un link
  // "Accedi" per chi vuole rientrare subito (Story 18.1 AC #7). Stesso
  // identico percorso fail-closed di prima: chiamato sempre, sia sul
  // successo sia sull'errore di signOut() sopra.
  redirect(HOME_PATH);
}
