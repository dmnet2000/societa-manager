import { ModificaPasswordForm } from "./ModificaPasswordForm";

// Nessun controllo di Ruolo qui (a differenza delle pagine sotto
// PROTECTED_ROUTES): route-guard.ts protegge già ogni pagina non elencata
// come pubblica con la sola condizione "sessione presente" - vedi Boundaries
// & Constraints della spec. Nessuna voce di navigazione: raggiunta solo dal
// menu profilo (app/NavBarClient.tsx).
export default function ModificaPasswordPage() {
  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <h1>Modifica password</h1>
        <ModificaPasswordForm />
      </div>
    </main>
  );
}
