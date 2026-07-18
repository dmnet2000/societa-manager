import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const trovaCertificatoPerAtletaMock = vi.fn();
const creaCertificatoMock = vi.fn();
const aggiornaCertificatoMock = vi.fn();

vi.mock("@/lib/db-rls/certificato-medico", () => ({
  trovaCertificatoPerAtleta: trovaCertificatoPerAtletaMock,
  creaCertificato: creaCertificatoMock,
  aggiornaCertificato: aggiornaCertificatoMock,
}));

const { unisciCertificato } = await import("./unisci-certificato");

const supabase = {} as never;

const nuovoCertificato = {
  dataInizioValidita: new Date("2026-06-01"),
  dataFineValidita: new Date("2027-06-01"),
  mesiValidita: 12,
  modulo: "A",
};

describe("unisciCertificato", () => {
  beforeEach(() => {
    trovaCertificatoPerAtletaMock.mockReset();
    creaCertificatoMock.mockReset();
    aggiornaCertificatoMock.mockReset();
  });

  it("creates a new CertificatoMedico when none exists yet (AC #2)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue(null);
    creaCertificatoMock.mockResolvedValue(undefined);

    await unisciCertificato(supabase, "atleta-1", nuovoCertificato);

    expect(creaCertificatoMock).toHaveBeenCalledWith(
      supabase,
      "atleta-1",
      nuovoCertificato
    );
    expect(aggiornaCertificatoMock).not.toHaveBeenCalled();
  });

  it("updates the existing CertificatoMedico when the new date is more recent (AC #1)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "cert-1",
      dataFineValidita: "2026-01-01T00:00:00.000Z",
    });
    aggiornaCertificatoMock.mockResolvedValue(undefined);

    await unisciCertificato(supabase, "atleta-1", nuovoCertificato);

    expect(aggiornaCertificatoMock).toHaveBeenCalledWith(
      supabase,
      "cert-1",
      nuovoCertificato
    );
    expect(creaCertificatoMock).not.toHaveBeenCalled();
  });

  it("does nothing when the new date is older than the existing one (AC #1)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "cert-1",
      dataFineValidita: "2028-01-01T00:00:00.000Z",
    });

    await unisciCertificato(supabase, "atleta-1", nuovoCertificato);

    expect(aggiornaCertificatoMock).not.toHaveBeenCalled();
    expect(creaCertificatoMock).not.toHaveBeenCalled();
  });

  it("keeps the existing modulo/mesiValidita/dataInizioValidita when the newer row leaves them blank (review fix)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "cert-1",
      dataInizioValidita: "2025-01-01T00:00:00.000Z",
      dataFineValidita: "2026-01-01T00:00:00.000Z",
      mesiValidita: 6,
      modulo: "B",
    });
    aggiornaCertificatoMock.mockResolvedValue(undefined);

    await unisciCertificato(supabase, "atleta-1", {
      dataInizioValidita: null,
      dataFineValidita: new Date("2027-06-01"),
      mesiValidita: null,
      modulo: null,
    });

    expect(aggiornaCertificatoMock).toHaveBeenCalledWith(supabase, "cert-1", {
      dataInizioValidita: new Date("2025-01-01T00:00:00.000Z"),
      dataFineValidita: new Date("2027-06-01"),
      mesiValidita: 6,
      modulo: "B",
    });
  });

  it("overrides existing fields with new non-null values (review fix)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "cert-1",
      dataInizioValidita: "2025-01-01T00:00:00.000Z",
      dataFineValidita: "2026-01-01T00:00:00.000Z",
      mesiValidita: 6,
      modulo: "B",
    });
    aggiornaCertificatoMock.mockResolvedValue(undefined);

    await unisciCertificato(supabase, "atleta-1", nuovoCertificato);

    expect(aggiornaCertificatoMock).toHaveBeenCalledWith(
      supabase,
      "cert-1",
      nuovoCertificato
    );
  });

  it("updates when the existing CertificatoMedico has no dataFineValidita yet (review fix, Story 4.1: campo diventato nullable)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "cert-1",
      dataFineValidita: null,
    });
    aggiornaCertificatoMock.mockResolvedValue(undefined);

    await unisciCertificato(supabase, "atleta-1", nuovoCertificato);

    expect(aggiornaCertificatoMock).toHaveBeenCalledWith(
      supabase,
      "cert-1",
      nuovoCertificato
    );
    expect(creaCertificatoMock).not.toHaveBeenCalled();
  });

  it("does nothing when the new date equals the existing one (AC #1)", async () => {
    trovaCertificatoPerAtletaMock.mockResolvedValue({
      id: "cert-1",
      dataFineValidita: "2027-06-01T00:00:00.000Z",
    });

    await unisciCertificato(supabase, "atleta-1", nuovoCertificato);

    expect(aggiornaCertificatoMock).not.toHaveBeenCalled();
    expect(creaCertificatoMock).not.toHaveBeenCalled();
  });
});
