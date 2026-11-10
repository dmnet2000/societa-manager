import "server-only";
import { NextResponse } from "next/server";
import type { CodiceErrore, ErroreApi } from "./contratto";

// Forma unica degli errori dell'API del tablet, definita dal contratto:
// { error: { code, message } }.
export function rispostaErroreTablet(
  code: CodiceErrore,
  message: string,
  status: number
): NextResponse<ErroreApi> {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
