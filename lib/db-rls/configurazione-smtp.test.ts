import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const maybeSingleMock = vi.fn();
const selectQueryMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({
  select: selectQueryMock,
  upsert: upsertMock,
}));

const supabase = { from: fromMock } as never;

const {
  leggiConfigurazioneSmtp,
  salvaConfigurazioneSmtp,
  rimuoviPassword,
  ID_CONFIGURAZIONE_SMTP,
} = await import("./configurazione-smtp");

const datiCompleti = {
  host: "smtps.aruba.it",
  porta: 465,
  sicura: true,
  utente: "info@esempio.it",
  password: "segreta123",
  mittente: "info@esempio.it",
  nomeMittente: "Polisportiva",
};

describe("leggiConfigurazioneSmtp", () => {
  beforeEach(() => {
    fromMock.mockClear();
    maybeSingleMock.mockReset();
  });

  it("restituisce la riga esistente (AC #2)", async () => {
    const riga = { id: ID_CONFIGURAZIONE_SMTP, ...datiCompleti };
    maybeSingleMock.mockResolvedValue({ data: riga, error: null });

    const risultato = await leggiConfigurazioneSmtp(supabase);

    expect(fromMock).toHaveBeenCalledWith("configurazione_smtp");
    expect(selectQueryMock).toHaveBeenCalledWith("*");
    expect(risultato).toEqual(riga);
  });

  it("restituisce null quando nessuna configurazione esiste ancora", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const risultato = await leggiConfigurazioneSmtp(supabase);

    expect(risultato).toBeNull();
  });

  it("throws when the query fails (incluso un rifiuto RLS, AC #5)", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(leggiConfigurazioneSmtp(supabase)).rejects.toThrow(
      "row-level security"
    );
  });
});

// Review fix: riga singola identificata da un id FISSO (ID_CONFIGURAZIONE_SMTP),
// salvata con un upsert atomico su quell'id - non piu' un read-then-branch
// (insert-se-assente/update-se-esiste) eseguito lato applicazione. Elimina
// sia la race condition (due salvataggi concorrenti potevano entrambi
// vedere "nessuna riga" e inserire due righe, rompendo .maybeSingle() per
// sempre) sia la doppia lettura ridondante del vecchio design.
describe("salvaConfigurazioneSmtp", () => {
  beforeEach(() => {
    fromMock.mockClear();
    upsertMock.mockReset();
  });

  it("fa upsert su un id fisso, sempre lo stesso (AC #1, review fix: nessuna race condition possibile)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await salvaConfigurazioneSmtp(supabase, datiCompleti);

    expect(fromMock).toHaveBeenCalledWith("configurazione_smtp");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, opzioni] = upsertMock.mock.calls[0];
    expect(payload.id).toBe(ID_CONFIGURAZIONE_SMTP);
    expect(payload.host).toBe("smtps.aruba.it");
    expect(payload.password).toBe("segreta123");
    expect(opzioni).toEqual({ onConflict: "id" });
  });

  it("omette password dal payload quando non fornita (Prerequisito #3, non deve mai azzerare la password esistente)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await salvaConfigurazioneSmtp(supabase, { ...datiCompleti, password: "" });

    const payload = upsertMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty("password");
    expect(payload.host).toBe("smtps.aruba.it");
  });

  it("throws when the upsert fails (incluso un rifiuto RLS, AC #5)", async () => {
    upsertMock.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      salvaConfigurazioneSmtp(supabase, datiCompleti)
    ).rejects.toThrow("row-level security");
  });
});

// Review fix: la password non deve mai attraversare il confine
// Server Component -> Client Component (Next.js serializza ogni prop nel
// payload RSC inviato al browser, indipendentemente da cosa il componente
// client renderizza davvero nel DOM - un <input> lasciato vuoto non basta).
describe("rimuoviPassword", () => {
  it("restituisce l'oggetto senza la chiave password (AC #2)", () => {
    const riga = { id: ID_CONFIGURAZIONE_SMTP, ...datiCompleti };

    const risultato = rimuoviPassword(riga);

    expect(risultato).not.toHaveProperty("password");
    expect(risultato).toEqual({
      id: ID_CONFIGURAZIONE_SMTP,
      host: "smtps.aruba.it",
      porta: 465,
      sicura: true,
      utente: "info@esempio.it",
      mittente: "info@esempio.it",
      nomeMittente: "Polisportiva",
    });
  });
});
