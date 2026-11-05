import { NextResponse } from "next/server";
import { getSessionUser, headerUserForUser, landingPathForUser } from "@/lib/server/authorization";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: headerUserForUser(user),
    redirectTo: landingPathForUser(user),
  });
}
