import type { Ruolo } from "@prisma/client";

export type ContenutoGuida = {
  rotta: string;
  titolo: string;
  ruoliAmmessi: Ruolo[];
  corpo: string[];
};

// Story 17.1 (Epic 17, Guida in-app e help contestuale): contenuto scritto
// in codice (no Markdown/CMS, decisione di analisi - nessuna nuova
// dipendenza, coerente con NFR6). "rotta" usa lo stesso valore di "prefix"
// in PROTECTED_ROUTES (lib/auth/route-guard.ts) - chiave di collegamento
// tra una pagina reale e il suo contenuto guida, non una mappa duplicata.
// "ruoliAmmessi" mirror di PROTECTED_ROUTES per la stessa rotta - se la
// rotta cambia i Ruoli ammessi, va aggiornato anche qui (nessuna singola
// fonte di verita' automatica, verificato non esserci un modo semplice di
// derivarlo senza importare route-guard.ts e complicare l'accoppiamento).
//
// Pilota su due rotte reali per validare entrambi gli scoping:
// - "/sponsor": tutti e sei i Ruoli (Story 16.2).
// - "/palestre": solo ADMIN/DIRIGENTE (Story 2.1).
export const CONTENUTI_GUIDA: ContenutoGuida[] = [
  {
    rotta: "/sponsor",
    titolo: "Sponsor",
    ruoliAmmessi: ["ALLENATORE", "ATLETA", "GENITORE", "SEGRETERIA", "DIRIGENTE", "ADMIN"],
    corpo: [
      "In questa sezione trovi i Banner pubblicitari e le Convenzioni attive della società, con immagine e descrizione.",
      "Per le Convenzioni puoi generare un voucher con il tuo Nome e Cognome, che certifica che fai parte della società e hai diritto alla scontistica indicata - il voucher viene mostrato a schermo, non salvato.",
      "Se sei Admin o Dirigente, in fondo alla pagina trovi anche il pannello di gestione per creare, modificare, attivare o disattivare gli Sponsor.",
    ],
  },
  {
    rotta: "/palestre",
    titolo: "Palestre",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    corpo: [
      "Qui gestisci l'elenco delle Palestre della società e i Campi al loro interno.",
      "Puoi creare una nuova Palestra (nome, indirizzo, posizione da un link Google Maps) e aggiungere Campi a una Palestra esistente.",
      "Palestre e Campi creati qui sono poi selezionabili quando si crea uno Slot (orario) in /orari.",
    ],
  },
];

// AC #1: indice /guida filtrato per Ruolo - un Utente vede solo le voci
// per cui ha almeno uno dei ruoliAmmessi (stesso principio "basta averne
// uno tra quelli richiesti" di requireRuolo/filtraVociNavigazione).
export function contenutiPerRuoli(ruoli: Ruolo[]): ContenutoGuida[] {
  return CONTENUTI_GUIDA.filter((c) => c.ruoliAmmessi.some((r) => ruoli.includes(r)));
}

// AC #3/#4: usata dall'aiuto contestuale in una pagina specifica - null se
// la rotta non ha un contenuto guida, o se l'Utente non ha un Ruolo
// ammesso per quella voce (stesso Utente non dovrebbe vedere un'icona "?"
// per una pagina che non può comunque raggiungere).
export function contenutoPerRotta(rotta: string, ruoli: Ruolo[]): ContenutoGuida | null {
  const contenuto = CONTENUTI_GUIDA.find((c) => c.rotta === rotta);
  if (!contenuto) return null;
  if (!contenuto.ruoliAmmessi.some((r) => ruoli.includes(r))) return null;
  return contenuto;
}
