import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import {
  AuthError,
  createManagedGroup,
  listGroupsForUser,
  type GroupVisibility,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";

const visibilities: GroupVisibility[] = ["publico", "privado"];

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Inicia sesión para continuar.", 401);
    if (user.rol_global !== "administrador") {
      throw new AuthError("No tienes permiso para consultar todos los grupos.", 403);
    }
    return NextResponse.json({ groups: await listGroupsForUser(user, "all") });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Inicia sesión para continuar.", 401);
    if (user.rol_global !== "administrador") {
      throw new AuthError("Solo un administrador puede crear grupos.", 403);
    }
    const body = await readJsonObject(request);
    if (
      Object.keys(body).some((key) => !["nombre", "descripcion", "visibilidad"].includes(key)) ||
      typeof body.nombre !== "string" ||
      (body.descripcion !== undefined && typeof body.descripcion !== "string") ||
      !visibilities.includes(body.visibilidad as GroupVisibility)
    ) {
      throw new AuthError("Revisa el nombre, la descripción y la visibilidad del grupo.", 400);
    }
    const group = await createManagedGroup(
      {
        nombre: body.nombre,
        descripcion: body.descripcion ?? "",
        visibilidad: body.visibilidad as GroupVisibility,
      },
      user.id_usuario,
    );
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
