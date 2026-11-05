import { NextResponse } from "next/server";
import { AuthError } from "@/lib/server/auth-store";

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AuthError("El cuerpo de la solicitud debe ser JSON válido.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthError("El cuerpo de la solicitud no tiene un formato válido.", 400);
  }
  return value as Record<string, unknown>;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Error en el servicio de autenticación BioRed:", error);
  return NextResponse.json({ error: "No fue posible completar la solicitud." }, { status: 500 });
}
