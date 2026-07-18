"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaLogoAction } from "./actions";

export function LogoForm() {
  const [state, formAction, pending] = useActionState(
    caricaLogoAction,
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
      <div>
        <label htmlFor="logo-file">Logo (PNG o JPG, max 2MB)</label>
        <input
          id="logo-file"
          name="file"
          type="file"
          accept=".png,.jpg,.jpeg"
          required
        />
      </div>
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      {state && "success" in state && <p role="status">Logo caricato.</p>}
      <button disabled={pending} type="submit">
        Carica logo
      </button>
    </form>
  );
}
