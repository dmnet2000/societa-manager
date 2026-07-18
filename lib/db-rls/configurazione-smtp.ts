import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ConfigurazioneSmtpDati = {
  id: string;
  host: string;
  porta: number;
  sicura: boolean;
  utente: string;
  password: string;
  mittente: string;
  nomeMittente: string | null;
};

// Review fix: riga singola identificata da un id FISSO, mai generato
// dinamicamente - permette un upsert atomico su questo id invece di un
// read-then-branch (insert-se-assente/update-se-esiste) lato applicazione,
// che apriva una race condition reale (due salvataggi concorrenti potevano
// entrambi osservare "nessuna riga esistente" e inserire due righe,
// rompendo .maybeSingle() in leggiConfigurazioneSmtp per sempre, per
// qualunque chiamante futuro incluso Story 4.3).
export const ID_CONFIGURAZIONE_SMTP = "00000000-0000-0000-0000-000000000001";

export type DatiConfigurazioneSmtp = {
  host: string;
  porta: number;
  sicura: boolean;
  utente: string;
  // Vuota/assente su un aggiornamento significa "non modificare la password
  // esistente" (Prerequisito #3 della storia) - obbligatoria solo al primo
  // salvataggio, validato dal chiamante (Server Action), non qui.
  password: string;
  mittente: string;
  nomeMittente: string | null;
};

// AD-9 esteso, AD-12: ConfigurazioneSmtp e' protetta da RLS (ADMIN-only) - il
// client Supabase passato deve avere la sessione dell'utente autenticato.
export async function leggiConfigurazioneSmtp(
  supabase: SupabaseClient
): Promise<ConfigurazioneSmtpDati | null> {
  const { data, error } = await supabase
    .from("configurazione_smtp")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Riga singola su id fisso (ID_CONFIGURAZIONE_SMTP): upsert atomico, mai un
// read-then-branch lato applicazione (review fix, elimina la race
// condition - vedi commento sulla costante). `password` viene OMESSA dal
// payload se vuota - PostgREST aggiorna solo le colonne presenti nel
// payload su conflitto, quindi ometterla lascia il valore esistente
// intatto, mai sovrascritta con una stringa vuota (Prerequisito #3: il
// form la lascia vuota quando l'Admin non vuole cambiarla).
export async function salvaConfigurazioneSmtp(
  supabase: SupabaseClient,
  dati: DatiConfigurazioneSmtp
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: ID_CONFIGURAZIONE_SMTP,
    host: dati.host,
    porta: dati.porta,
    sicura: dati.sicura,
    utente: dati.utente,
    mittente: dati.mittente,
    nomeMittente: dati.nomeMittente,
    updatedAt: new Date().toISOString(),
  };
  if (dati.password) {
    payload.password = dati.password;
  }

  const { error } = await supabase
    .from("configurazione_smtp")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
}

export type ConfigurazioneSmtpSenzaPassword = Omit<
  ConfigurazioneSmtpDati,
  "password"
>;

// Review fix: la password non deve MAI attraversare il confine Server
// Component -> Client Component - Next.js serializza ogni prop passata a un
// Client Component nel payload RSC inviato al browser, indipendentemente da
// cosa il componente client renderizza davvero nel DOM (un <input> lasciato
// vuoto non basta, il valore in chiaro resterebbe comunque visibile via
// view-source/devtools). Il chiamante (page.tsx) deve passare il risultato
// di questa funzione a ConfigurazioneSmtpForm, mai l'oggetto grezzo di
// leggiConfigurazioneSmtp.
export function rimuoviPassword(
  configurazione: ConfigurazioneSmtpDati
): ConfigurazioneSmtpSenzaPassword {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destrutturazione per omettere la chiave, vedi commento sopra
  const { password: _password, ...resto } = configurazione;
  return resto;
}
