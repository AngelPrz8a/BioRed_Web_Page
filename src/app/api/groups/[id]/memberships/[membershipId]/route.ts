import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import {
  AuthError,
  updateGroupMembership,
  type GroupRole,
  type MembershipStatus,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";

const groupRoles: GroupRole[] = ["miembro", "coordinador"];
const statuses: MembershipStatus[] = ["activo", "inactivo", "pendiente"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> },
) {
  try {
    const actor = await getSessionUser();
    if (!actor) throw new AuthError("Inicia sesión para continuar.", 401);
    const { id, membershipId } = await params;
    const groupId = Number(id);
    const idMembership = Number(membershipId);
    if (
      !Number.isSafeInteger(groupId) || groupId < 1 ||
      !Number.isSafeInteger(idMembership) || idMembership < 1
    ) {
      throw new AuthError("El identificador del grupo o membresía no es válido.", 400);
    }
    const body = await readJsonObject(request);
    if (Object.keys(body).some((key) => key !== "rol_grupo" && key !== "estado")) {
      throw new AuthError("La solicitud contiene campos no válidos.", 400);
    }
    if (
      body.rol_grupo !== undefined &&
        (typeof body.rol_grupo !== "string" || !groupRoles.includes(body.rol_grupo as GroupRole)) ||
      body.estado !== undefined &&
        (typeof body.estado !== "string" || !statuses.includes(body.estado as MembershipStatus))
    ) {
      throw new AuthError("El rol o estado de membresía no es válido.", 400);
    }
    const membership = await updateGroupMembership(
      groupId,
      idMembership,
      {
        ...(body.rol_grupo !== undefined && { rol_grupo: body.rol_grupo as GroupRole }),
        ...(body.estado !== undefined && { estado: body.estado as MembershipStatus }),
      },
      actor,
    );
    return NextResponse.json({ membership });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
