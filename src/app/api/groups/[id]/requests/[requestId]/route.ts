import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import { AuthError, decideGroupJoinRequest } from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Inicia sesión para continuar.", 401);
    const { id, requestId } = await params;
    const groupId = Number(id);
    const applicationId = Number(requestId);
    if (
      !Number.isSafeInteger(groupId) || groupId < 1 ||
      !Number.isSafeInteger(applicationId) || applicationId < 1
    ) {
      throw new AuthError("El identificador del grupo o solicitud no es válido.", 400);
    }
    const body = await readJsonObject(request);
    if (
      Object.keys(body).some((key) => key !== "decision" && key !== "respuesta") ||
      (body.decision !== "aprobada" && body.decision !== "rechazada") ||
      body.respuesta !== undefined && typeof body.respuesta !== "string"
    ) {
      throw new AuthError("Indica si apruebas o rechazas la solicitud.", 400);
    }
    const application = await decideGroupJoinRequest(
      groupId,
      applicationId,
      body.decision,
      user,
      typeof body.respuesta === "string" ? body.respuesta : "",
    );
    return NextResponse.json({ application });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
