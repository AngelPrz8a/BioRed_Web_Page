import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonObject } from "@/lib/server/api-response";
import {
  createSession,
  getSessionCookieName,
  registerUser,
} from "@/lib/server/auth-store";
import { headerUserForUser, landingPathForUser } from "@/lib/server/authorization";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.privacyConsent !== true
    ) {
      return NextResponse.json(
        { error: "Completa tus datos y acepta la política de privacidad." },
        { status: 400 },
      );
    }

    const user = await registerUser({
      name: body.name,
      email: body.email,
      password: body.password,
    });
    const session = await createSession(user.id_usuario, true);
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
