"use client";

import { useActionState } from "react";
import { aggiornaCampo } from "./actions";
import styles from "./palestre.module.css";

type Campo = {
  id: string;
  nome: string;
};

export function CampoRow({ campo }: { campo: Campo }) {
  const [state, formAction, pending] = useActionState(aggiornaCampo, undefined);

  return (
    <li>
      <form action={formAction}>
        <input type="hidden" name="id" value={campo.id} />
        <div className={styles.campo}>
          <label htmlFor={`campo-nome-${campo.id}`}>Nome Campo</label>
          <input
            id={`campo-nome-${campo.id}`}
            name="nome"
            type="text"
            defaultValue={campo.nome}
            required
          />
        </div>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva
        </button>
      </form>
    </li>
  );
}
