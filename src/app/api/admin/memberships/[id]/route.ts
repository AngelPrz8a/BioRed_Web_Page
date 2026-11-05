import { NextResponse } from "next/server";
import { AuthError, updateMembershipGovernance } from "@/lib/server/auth-store";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import { getSessionUser } from "@/lib/server/authorization";

const groupRoles = ["miembro", "coordinador"] as const;
const membershipStatuses = ["activo", "inactivo", "pendiente"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getSessionUser();
    if (!actor) throw new AuthError("Inicia sesión para continuar.", 401);
    if (actor.rol_global !== "administrador") {
      throw new AuthError("No tienes permiso para gestionar membresías.", 403);
    }

    const { id } = await params;
    const membershipId = Number(id);
    if (!Number.isSafeInteger(membershipId) || membershipId < 1) {
      throw new AuthError("El identificador de membresía no es válido.", 400);
    }
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    if (keys.some((key) => key !== "rol_grupo" && key !== "estado")) {
      throw new AuthError("La solicitud contiene campos que no se pueden modificar.", 400);
    }
    if (
      (body.rol_grupo !== undefined &&
        !groupRoles.includes(body.rol_grupo as (typeof groupRoles)[number])) ||
      (body.estado !== undefined &&
        !membershipStatuses.includes(body.estado as (typeof membershipStatuses)[number]))
    ) {
      throw new AuthError("El rol o estado de membresía no es válido.", 400);
    }

    const membership = await updateMembershipGovernance(
      membershipId,
      {
        ...(body.rol_grupo !== undefined && {
          rol_grupo: body.rol_grupo as (typeof groupRoles)[number],
        }),
        ...(body.estado !== undefined && {
          estado: body.estado as (typeof membershipStatuses)[number],
        }),
      },
      actor.id_usuario,
    );
    return NextResponse.json({ membership });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
