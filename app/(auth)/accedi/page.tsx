"use client";

import { useActionState } from "react";
import Link from "next/link";
import { accedi } from "./actions";

export default function AccediPage() {
  const [state, formAction, pending] = useActionState(accedi, undefined);

  return (
    <main>
      <h1>Accedi</h1>
      <form action={formAction}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
        {state?.error && <p role="alert">{state.error.message}</p>}
        <button disabled={pending} type="submit">
          Accedi
        </button>
      </form>
      <p>
        Non hai un account? <Link href="/registrati">Registrati</Link>
      </p>
    </main>
  );
}
