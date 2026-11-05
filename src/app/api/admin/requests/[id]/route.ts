import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import {
  AuthError,
  decideGovernanceRequest,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getSessionUser();
    if (!actor) throw new AuthError("Inicia sesión para continuar.", 401);
    if (actor.rol_global !== "administrador") {
      throw new AuthError("Solo un administrador puede resolver solicitudes.", 403);
    }
    const { id } = await params;
    const requestId = Number(id);
    if (!Number.isSafeInteger(requestId) || requestId < 1) {
      throw new AuthError("El identificador de solicitud no es válido.", 400);
    }
    const body = await readJsonObject(request);
    if (
      Object.keys(body).some((key) => key !== "decision" && key !== "respuesta") ||
      (body.decision !== "aprobada" && body.decision !== "rechazada") ||
      body.respuesta !== undefined && typeof body.respuesta !== "string"
    ) {
      throw new AuthError("Indica una decisión y respuesta válidas.", 400);
    }
    const application = await decideGovernanceRequest(
      requestId,
      body.decision,
      actor,
      typeof body.respuesta === "string" ? body.respuesta : "",
    );
    return NextResponse.json({ application });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
