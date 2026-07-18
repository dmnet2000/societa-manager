"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaCertificato } from "./actions";

// Stesso pattern di NuovoSlotForm.tsx (Story 2.5): reset del form dopo un
// upload riuscito, cosi' l'input file non mostra piu' il vecchio nome.
export function CaricaCertificatoForm({ atletaId }: { atletaId: string }) {
  const [state, formAction, pending] = useActionState(
    caricaCertificato,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <div>
        <label htmlFor="certificato-file">
          File Certificato (PDF, JPG, PNG — max 10MB)
        </label>
        <input
          id="certificato-file"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
        />
      </div>
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      {state && "success" in state && (
        <p role="status">Certificato caricato.</p>
      )}
      <button disabled={pending} type="submit">
        Carica Certificato
      </button>
    </form>
  );
}
