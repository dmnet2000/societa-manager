"use client";

import type { Ruolo } from "@prisma/client";
import { prioritaRuoloUtente } from "@/lib/ordina-utenti-per-ruolo-stato";
import { TabellaOrdinabile } from "@/app/TabellaOrdinabile";
import { UtenteRow } from "./UtenteRow";
import styles from "./admin.module.css";

type Utente = {
  id: string;
  email: string;
  attivo: boolean;
  ruoli: Ruolo[];
  emailConfermata: boolean;
  // Story 1.10: Atlete gia' collegate (mostrato solo per un Utente con Ruolo
  // GENITORE - vedi UtenteRow).
  atletiCollegati: { id: string; nome: string }[];
};

// Story 9.40: nuovo Client Component, mirror esatto della relazione
// conferma-certificati/page.tsx + ListaConfermati.tsx (Story 9.25) - AdminPage
// resta un Server Component async con accesso diretto a Prisma/Supabase Admin
// API, questo componente riceve l'array gia' shape-ato e gestisce solo
// l'interattivita' di ordinamento client-side (nessun round-trip server).
// L'ordinamento avviene cliccando le intestazioni (TabellaOrdinabile, come
// in ogni altra tabella dell'app) - sostituisce i 2 pulsanti "Ruolo"/"Stato"
// sopra la tabella. Ruoli: priorita' di RUOLI_VALIDI; Stato: in crescente
// Attivo prima di Disattivato (stesso ordine dei vecchi pulsanti).
export function ElencoUtenti({ utenti }: { utenti: Utente[] }) {
  return (
    <div className={styles.scrollWrapper}>
      <TabellaOrdinabile
        className={styles.tabella}
        colonne={[
          { etichetta: "Email" },
          { etichetta: "Ruoli" },
          { etichetta: "Stato" },
          { etichetta: "Funzioni", ordinabile: false },
          { etichetta: "Correggi email", ordinabile: false },
          { etichetta: "Figli collegati", ordinabile: false },
        ]}
        righe={utenti.map((utente) => ({
          // Include i Ruoli nella key: forza il remount (e quindi il
          // refresh delle checkbox non controllate) quando cambiano.
          chiave: `${utente.id}:${utente.ruoli.join(",")}`,
          valori: [
            utente.email,
            prioritaRuoloUtente(utente.ruoli),
            utente.attivo ? 0 : 1,
            null,
            null,
            null,
          ],
          riga: <UtenteRow utente={utente} />,
        }))}
      />
    </div>
  );
}
