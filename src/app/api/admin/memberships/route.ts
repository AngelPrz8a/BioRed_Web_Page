import { NextResponse } from "next/server";
import {
  AuthError,
  createMembershipGovernance,
  listGovernanceMemberships,
} from "@/lib/server/auth-store";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import { getSessionUser } from "@/lib/server/authorization";

const groupRoles = ["miembro", "coordinador"] as const;
const membershipStatuses = ["activo", "inactivo", "pendiente"] as const;

export async function GET() {
  try {
    const actor = await getSessionUser();
    if (!actor) throw new AuthError("Inicia sesión para continuar.", 401);
    if (actor.rol_global !== "administrador") {
      throw new AuthError("No tienes permiso para gestionar membresías.", 403);
    }
    return NextResponse.json({ memberships: await listGovernanceMemberships() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getSessionUser();
    if (!actor) throw new AuthError("Inicia sesión para continuar.", 401);
    if (actor.rol_global !== "administrador") {
      throw new AuthError("No tienes permiso para gestionar membresías.", 403);
    }

    const body = await readJsonObject(request);
    const allowedKeys = ["id_usuario", "id_grupo", "rol_grupo", "estado"];
    if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
      throw new AuthError("La solicitud contiene campos que no se pueden modificar.", 400);
    }
    const userId = Number(body.id_usuario);
    const groupId = Number(body.id_grupo);
    if (
      !Number.isSafeInteger(userId) ||
      userId < 1 ||
      !Number.isSafeInteger(groupId) ||
      groupId < 1
    ) {
      throw new AuthError("Los identificadores de usuario y grupo son obligatorios.", 400);
    }
    const role = body.rol_grupo ?? "miembro";
    const status = body.estado ?? "activo";
    if (
      !groupRoles.includes(role as (typeof groupRoles)[number]) ||
      !membershipStatuses.includes(status as (typeof membershipStatuses)[number])
    ) {
      throw new AuthError("El rol o estado de membresía no es válido.", 400);
    }

    const membership = await createMembershipGovernance(
      {
        id_usuario: userId,
        id_grupo: groupId,
        rol_grupo: role as (typeof groupRoles)[number],
        estado: status as (typeof membershipStatuses)[number],
      },
      actor.id_usuario,
    );
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
