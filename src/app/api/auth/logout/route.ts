import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieName, revokeSession } from "@/lib/server/auth-store";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const cookieName = getSessionCookieName();
  const token = cookieStore.get(cookieName)?.value;
  if (token) await revokeSession(token);

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
