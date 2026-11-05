import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import { AuthError, requestGroupMembership } from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Inicia sesión para solicitar ingreso a un grupo.", 401);

    const body = await readJsonObject(request);
    const groupId = Number(body.id_grupo);
    if (!Number.isSafeInteger(groupId) || groupId < 1) {
      throw new AuthError("El identificador del grupo no es válido.", 400);
    }
    if (
      Object.keys(body).some((key) => key !== "id_grupo" && key !== "justificacion") ||
      body.justificacion !== undefined && typeof body.justificacion !== "string"
    ) {
      throw new AuthError("La solicitud contiene campos no válidos.", 400);
    }

    const application = await requestGroupMembership(
      groupId,
      user.id_usuario,
      typeof body.justificacion === "string" ? body.justificacion : "",
    );
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
