import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import {
  AuthError,
  requestGroupRoleChange,
  requestModuleAccess,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";

const accessLevels = ["lectura", "escritura"] as const;
const allowedFields = new Set([
  "tipo",
  "id_grupo",
  "id_modulo",
  "nivel_acceso_solicitado",
  "rol_solicitado",
  "justificacion",
]);

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Inicia sesión para crear una solicitud.", 401);

    const body = await readJsonObject(request);
    if (Object.keys(body).some((key) => !allowedFields.has(key))) {
      throw new AuthError("La solicitud contiene campos no válidos.", 400);
    }
    if (body.justificacion !== undefined && typeof body.justificacion !== "string") {
      throw new AuthError("La justificación no es válida.", 400);
    }
    const justification = typeof body.justificacion === "string" ? body.justificacion : "";

    if (body.tipo === "acceso_modulo") {
      const moduleId = Number(body.id_modulo);
      if (!Number.isSafeInteger(moduleId) || moduleId < 1) {
        throw new AuthError("El identificador del módulo no es válido.", 400);
      }
      if (
        typeof body.nivel_acceso_solicitado !== "string" ||
        !accessLevels.includes(body.nivel_acceso_solicitado as (typeof accessLevels)[number]) ||
        body.id_grupo !== undefined ||
        body.rol_solicitado !== undefined
      ) {
        throw new AuthError("Indica un nivel de acceso válido para el módulo.", 400);
      }
      const application = await requestModuleAccess(
        moduleId,
        user.id_usuario,
        body.nivel_acceso_solicitado as (typeof accessLevels)[number],
        justification,
      );
      return NextResponse.json({ application }, { status: 201 });
    }

    if (body.tipo === "cambio_rol_grupo") {
      const groupId = Number(body.id_grupo);
      if (!Number.isSafeInteger(groupId) || groupId < 1) {
        throw new AuthError("El identificador del grupo no es válido.", 400);
      }
      if (
        body.rol_solicitado !== "coordinador" ||
        body.id_modulo !== undefined ||
        body.nivel_acceso_solicitado !== undefined
      ) {
        throw new AuthError("Solo puedes solicitar coordinación para un grupo.", 400);
      }
      const application = await requestGroupRoleChange(
        groupId,
        user.id_usuario,
        body.rol_solicitado,
        justification,
      );
      return NextResponse.json({ application }, { status: 201 });
    }

    throw new AuthError("El tipo de solicitud no es válido.", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
