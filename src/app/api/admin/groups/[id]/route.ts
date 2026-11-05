import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import {
  AuthError,
  updateManagedGroup,
  type GroupVisibility,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";

const visibilities: GroupVisibility[] = ["publico", "privado"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Inicia sesión para continuar.", 401);
    if (user.rol_global !== "administrador") {
      throw new AuthError("Solo un administrador puede modificar grupos.", 403);
    }
    const { id } = await params;
    const groupId = Number(id);
    if (!Number.isSafeInteger(groupId) || groupId < 1) {
      throw new AuthError("El identificador del grupo no es válido.", 400);
    }
    const body = await readJsonObject(request);
    if (
      Object.keys(body).some((key) => !["nombre", "descripcion", "visibilidad"].includes(key)) ||
      body.nombre !== undefined && typeof body.nombre !== "string" ||
      body.descripcion !== undefined &&
        body.descripcion !== null &&
        typeof body.descripcion !== "string" ||
      body.visibilidad !== undefined &&
        !visibilities.includes(body.visibilidad as GroupVisibility)
    ) {
      throw new AuthError("Los datos del grupo no son válidos.", 400);
    }
    const group = await updateManagedGroup(
      groupId,
      {
        ...(body.nombre !== undefined && { nombre: body.nombre as string }),
        ...(body.descripcion !== undefined && {
          descripcion: body.descripcion as string | null,
        }),
        ...(body.visibilidad !== undefined && {
          visibilidad: body.visibilidad as GroupVisibility,
        }),
      },
      user.id_usuario,
    );
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
