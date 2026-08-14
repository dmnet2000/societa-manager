import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ConfigurazioneSocialFacebookDati = {
  id: string;
  accessToken: string;
  ultimaLetturaOk: boolean;
  ultimoErrore: string | null;
};

// Story 18.13: riga singola identificata da un id FISSO - stesso valore
// letterale gia' riusato da ID_CONFIGURAZIONE_SMTP (lib/db-rls/configurazione-smtp.ts)
// e dal singleton id di lib/configurazione-applicazione.ts. Nessuna
// collisione possibile: ogni tabella ha il proprio spazio di chiavi
// primarie indipendente. Stesso principio di upsert atomico su id fisso
// gia' stabilito per ConfigurazioneSmtp (nessun read-then-branch, nessuna
// race condition tra due salvataggi concorrenti).
export const ID_CONFIGURAZIONE_SOCIAL_FACEBOOK =
  "00000000-0000-0000-0000-000000000001";

// AC #4/#6: protetta da RLS ADMIN+DIRIGENTE (vedi Dev Notes della storia
// per la motivazione, diversa da ConfigurazioneSmtp che e' ADMIN-only) - il
// client Supabase passato deve avere la sessione dell'utente autenticato,
// oppure essere il client service-role (lib/auth-admin/client.ts) per
// letture da un contesto senza sessione (lib/facebook-graph.ts).
export async function leggiConfigurazioneSocialFacebook(
  supabase: SupabaseClient
): Promise<ConfigurazioneSocialFacebookDati | null> {
  const { data, error } = await supabase
    .from("configurazione_social_facebook")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Upsert su id fisso (ID_CONFIGURAZIONE_SOCIAL_FACEBOOK) - mirror esatto di
// salvaConfigurazioneSmtp. A differenza di quella funzione, qui NON esiste
// un caso "valore vuoto = non modificare" a questo livello: la Server
// Action chiamante (salvaTokenFacebookAction) e' responsabile di non
// invocare questa funzione affatto quando il campo del form e' vuoto - chi
// arriva qui vuole sempre scrivere un token reale.
//
// Salvare un nuovo token resetta sempre ultimaLetturaOk a true e
// ultimoErrore a null: quei due campi descrivono l'esito dell'ULTIMO
// tentativo di lettura dei post (scritto solo da lib/facebook-graph.ts),
// non lo stato del token appena inserito - senza il reset, un Admin che
// sostituisce un token scaduto continuerebbe a vedere l'avviso di errore
// del token precedente finche' la home pubblica non viene visitata di nuovo.
export async function salvaTokenFacebook(
  supabase: SupabaseClient,
  accessToken: string
): Promise<void> {
  const { error } = await supabase.from("configurazione_social_facebook").upsert(
    {
      id: ID_CONFIGURAZIONE_SOCIAL_FACEBOOK,
      accessToken,
      ultimaLetturaOk: true,
      ultimoErrore: null,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

// Scritto SOLO da lib/facebook-graph.ts dopo ogni tentativo di lettura dei
// post (successo o fallimento) - mai dalla pagina Admin. Upsert invece di
// update: se per qualunque motivo la riga non esiste ancora (es. lettura
// tentata prima che un token sia mai stato salvato - caso che
// leggiUltimiPostFacebook evita comunque a monte, vedi lib/facebook-graph.ts),
// un update silenzioso su una riga assente non fallirebbe ma non
// scriverebbe nulla; l'upsert garantisce che lo stato sia sempre osservabile.
export async function aggiornaStatoLetturaFacebook(
  supabase: SupabaseClient,
  esito: { ultimaLetturaOk: boolean; ultimoErrore: string | null }
): Promise<void> {
  const { error } = await supabase.from("configurazione_social_facebook").upsert(
    {
      id: ID_CONFIGURAZIONE_SOCIAL_FACEBOOK,
      ultimaLetturaOk: esito.ultimaLetturaOk,
      ultimoErrore: esito.ultimoErrore,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export type ConfigurazioneSocialFacebookSenzaToken = Omit<
  ConfigurazioneSocialFacebookDati,
  "accessToken"
>;

// AC #4: il token non deve MAI attraversare il confine Server Component ->
// Client Component - Next.js serializza ogni prop passata a un Client
// Component nel payload RSC inviato al browser, indipendentemente da cosa
// il componente client renderizza davvero nel DOM. Mirror esatto di
// rimuoviPassword (lib/db-rls/configurazione-smtp.ts).
export function rimuoviToken(
  configurazione: ConfigurazioneSocialFacebookDati
): ConfigurazioneSocialFacebookSenzaToken {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destrutturazione per omettere la chiave, vedi commento sopra
  const { accessToken: _accessToken, ...resto } = configurazione;
  return resto;
}
