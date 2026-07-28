import { ReimpostaPasswordForm } from "./ReimpostaPasswordForm";

// Pagina pubblica (lib/auth/route-guard.ts, Story 9.11): raggiunta dal link
// ricevuto via email, senza sessione attiva finche' il form non invia il
// token (verifyOtp la stabilisce lato server, vedi actions.ts).
// searchParams e' una Promise in questa versione di Next.js (vedi
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md).
export default async function ReimpostaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash: tokenHash = "" } = await searchParams;

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <h1>Reimposta password</h1>
        <ReimpostaPasswordForm tokenHash={tokenHash} />
      </div>
    </main>
  );
}
