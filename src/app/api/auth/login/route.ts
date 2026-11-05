import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import {
  authenticateUser,
  createSession,
  getSessionCookieName,
} from "@/lib/server/auth-store";
import { headerUserForUser, landingPathForUser } from "@/lib/server/authorization";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
    }
    const user = await authenticateUser(body.email, body.password);
    const remember = body.remember === true;
    const session = await createSession(user.id_usuario, remember);
    const response = NextResponse.json({
      user: headerUserForUser(user),
      redirectTo: landingPathForUser(user),
    });
    response.cookies.set(getSessionCookieName(), session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
