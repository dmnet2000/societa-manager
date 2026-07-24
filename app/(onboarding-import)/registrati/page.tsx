"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registrati } from "./actions";
import styles from "./registrati.module.css";

const RUOLI = [
  { value: "ALLENATORE", label: "Allenatore" },
  { value: "ATLETA", label: "Atleta" },
  { value: "GENITORE", label: "Genitore" },
  { value: "SEGRETERIA", label: "Segreteria" },
  { value: "DIRIGENTE", label: "Dirigente" },
  { value: "ADMIN", label: "Admin" },
];

export default function RegistratiPage() {
  const [state, formAction, pending] = useActionState(registrati, undefined);
  const [ruoliSelezionati, setRuoliSelezionati] = useState<string[]>([]);

  function toggleRuolo(value: string, checked: boolean) {
    setRuoliSelezionati((prev) =>
      checked ? [...prev, value] : prev.filter((r) => r !== value)
    );
  }

  return (
    <main>
      <h1>Registrati</h1>
      <form action={formAction} className={styles.form}>
        <div className={styles.campo}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className={styles.campo}>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
        <fieldset className={styles.fieldset}>
          <legend>Ruolo (uno o più)</legend>
          {RUOLI.map((ruolo) => (
            <label key={ruolo.value} className={styles.rigaRuolo}>
              <input
                type="checkbox"
                name="ruoli"
                value={ruolo.value}
                onChange={(e) => toggleRuolo(ruolo.value, e.target.checked)}
              />
              {ruolo.label}
            </label>
          ))}
        </fieldset>
        {ruoliSelezionati.includes("ALLENATORE") && (
          <div className={styles.campo}>
            <label htmlFor="codiceFiscaleAllenatore">
              Codice Fiscale (se sei già stato precaricato dalla società)
            </label>
            <input
              id="codiceFiscaleAllenatore"
              name="codiceFiscaleAllenatore"
              type="text"
            />
          </div>
        )}
        {ruoliSelezionati.includes("ATLETA") && (
          <div className={styles.campo}>
            <label htmlFor="codiceFiscaleAtleta">Il tuo Codice Fiscale</label>
            <input
              id="codiceFiscaleAtleta"
              name="codiceFiscaleAtleta"
              type="text"
              required
            />
          </div>
        )}
        {ruoliSelezionati.includes("GENITORE") && (
          <div className={styles.campo}>
            <label htmlFor="codiceFiscaleFiglio">
              Codice Fiscale della figlia/o
            </label>
            <input
              id="codiceFiscaleFiglio"
              name="codiceFiscaleFiglio"
              type="text"
              required
            />
          </div>
        )}
        {state?.error && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Registrati
        </button>
      </form>
      <p className={styles.link}>
        Hai già un account? <Link href="/accedi">Accedi</Link>
      </p>
    </main>
  );
}
