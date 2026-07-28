import { RecuperaPasswordForm } from "./RecuperaPasswordForm";

// Pagina pubblica (lib/auth/route-guard.ts, Story 9.11): raggiungibile senza
// sessione, nessun controllo di Ruolo - stesso principio di /accedi/registrati.
export default function RecuperaPasswordPage() {
  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <h1>Recupera password</h1>
        <RecuperaPasswordForm />
      </div>
    </main>
  );
}
