import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Story 9.43 (AC #3, Matrix I/O riga "Cron promemoria, Certificato di
// un'Atleta rimossa"): nessun precedente di test per questo Route Handler
// nel progetto (mai testato prima) - file nuovo, scope minimo: solo il
// controllo di autorizzazione (per costruire una richiesta valida) e il
// nuovo comportamento di skip per un'Atleta non risolta da elencaAtlete
// (rimossa, col nuovo default che le esclude - lib/db-rls/atleta.ts).

const createAdminClientMock = vi.fn();
const elencaCertificatiMock = vi.fn();
const elencaAtleteMock = vi.fn();
const elencaEmailPerRuoloMock = vi.fn();
const elencaEmailCollegateAdAtletaMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const inviaEmailMock = vi.fn();
const calcolaGiorniAScadenzaMock = vi.fn();

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));
vi.mock("@/lib/db-rls/certificato-medico", () => ({
  elencaCertificati: elencaCertificatiMock,
}));
vi.mock("@/lib/db-rls/atleta", () => ({
  elencaAtlete: elencaAtleteMock,
}));
vi.mock("@/lib/utenti/email-per-ruolo", () => ({
  elencaEmailPerRuolo: elencaEmailPerRuoloMock,
}));
vi.mock("@/lib/utenti/email-destinatari-atleta", () => ({
  elencaEmailCollegateAdAtleta: elencaEmailCollegateAdAtletaMock,
}));
vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));
vi.mock("@/lib/email/invia-email", () => ({
  inviaEmail: inviaEmailMock,
}));
vi.mock("./calcola-giorni-a-scadenza", () => ({
  calcolaGiorniAScadenza: calcolaGiorniAScadenzaMock,
}));

const { GET } = await import("./route");

function buildRequest(authorization?: string) {
  return new NextRequest("https://example.test/api/cron/promemoria-certificati", {
    headers: authorization ? { authorization } : undefined,
  });
}

const CERTIFICATO_IN_SCADENZA = {
  atletaId: "atleta-1",
  dataFineValidita: "2026-10-22T00:00:00.000Z",
};

describe("GET /api/cron/promemoria-certificati", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "il-segreto-giusto");
    createAdminClientMock.mockReset();
    createAdminClientMock.mockReturnValue({ marker: "admin-client" });
    elencaCertificatiMock.mockReset();
    elencaCertificatiMock.mockResolvedValue([CERTIFICATO_IN_SCADENZA]);
    elencaAtleteMock.mockReset();
    elencaEmailPerRuoloMock.mockReset();
    elencaEmailPerRuoloMock.mockResolvedValue([]);
    elencaEmailCollegateAdAtletaMock.mockReset();
    elencaEmailCollegateAdAtletaMock.mockResolvedValue(["genitore@example.com"]);
    trovaAnnoAgonisticoCorrenteMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    inviaEmailMock.mockReset();
    inviaEmailMock.mockResolvedValue(undefined);
    calcolaGiorniAScadenzaMock.mockReset();
    calcolaGiorniAScadenzaMock.mockReturnValue(30);
  });

  it("returns 401 and touches nothing without the correct CRON_SECRET", async () => {
    const response = await GET(buildRequest("Bearer sbagliato"));

    expect(response.status).toBe(401);
    expect(elencaCertificatiMock).not.toHaveBeenCalled();
  });

  it("sends the reminder when the Atleta is resolved (baseline, not removed)", async () => {
    elencaAtleteMock.mockResolvedValue([{ id: "atleta-1", nome: "Rossi Maria" }]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(inviaEmailMock).toHaveBeenCalledTimes(1);
    expect(inviaEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        testo: expect.stringContaining("Rossi Maria"),
      })
    );
    expect(body).toEqual({ processati: 1, inviati: 1, falliti: 0, saltati: 0 });
  });

  // Story 9.43 (AC #3): il caso nuovo di questa story - l'Atleta del
  // Certificato non e' tra i risultati di elencaAtlete (rimossa, col nuovo
  // default che le esclude) - nessuna email, contata in "saltati", non un
  // errore ("falliti").
  it("skips the reminder, no email sent, when the Atleta is not resolved by elencaAtlete (removed)", async () => {
    elencaAtleteMock.mockResolvedValue([]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(inviaEmailMock).not.toHaveBeenCalled();
    expect(elencaEmailCollegateAdAtletaMock).not.toHaveBeenCalled();
    expect(body).toEqual({ processati: 1, inviati: 0, falliti: 0, saltati: 1 });
  });
});
