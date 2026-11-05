import { NextResponse } from "next/server";
import { AuthError, listGovernanceUsers } from "@/lib/server/auth-store";
import { apiErrorResponse } from "@/lib/server/api-response";
import { getSessionUser } from "@/lib/server/authorization";

export async function GET() {
  try {
    const actor = await getSessionUser();
    if (!actor) throw new AuthError("Inicia sesión para continuar.", 401);
    if (actor.rol_global !== "administrador") {
      throw new AuthError("No tienes permiso para gestionar usuarios.", 403);
    }
    return NextResponse.json({ users: await listGovernanceUsers() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
