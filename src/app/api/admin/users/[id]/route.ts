import { NextResponse } from "next/server";
import { AuthError, updateUserGovernance } from "@/lib/server/auth-store";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import { getSessionUser } from "@/lib/server/authorization";

const globalRoles = ["usuario", "administrador"] as const;
const accountStatuses = ["activa", "inactiva", "suspendida", "pendiente"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getSessionUser();
    if (!actor) throw new AuthError("Inicia sesión para continuar.", 401);
    if (actor.rol_global !== "administrador") {
      throw new AuthError("No tienes permiso para gestionar usuarios.", 403);
    }

    const { id } = await params;
    const userId = Number(id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      throw new AuthError("El identificador de usuario no es válido.", 400);
    }
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    if (keys.some((key) => key !== "rol_global" && key !== "estado_cuenta")) {
      throw new AuthError("La solicitud contiene campos que no se pueden modificar.", 400);
    }
    if (
      (body.rol_global !== undefined &&
        !globalRoles.includes(body.rol_global as (typeof globalRoles)[number])) ||
      (body.estado_cuenta !== undefined &&
        !accountStatuses.includes(body.estado_cuenta as (typeof accountStatuses)[number]))
    ) {
      throw new AuthError("El rol o estado de cuenta no es válido.", 400);
    }

    const user = await updateUserGovernance(
      userId,
      {
        ...(body.rol_global !== undefined && {
          rol_global: body.rol_global as (typeof globalRoles)[number],
        }),
        ...(body.estado_cuenta !== undefined && {
          estado_cuenta: body.estado_cuenta as (typeof accountStatuses)[number],
        }),
      },
      actor.id_usuario,
    );
    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
