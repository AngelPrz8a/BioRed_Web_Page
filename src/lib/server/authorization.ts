import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCurrentUser as findCurrentUser,
  getSessionCookieName,
  type AuthenticatedUser,
} from "@/lib/server/auth-store";
import type { Role, SessionUser } from "@/lib/navigation";

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  return findCurrentUser(cookieStore.get(getSessionCookieName())?.value);
}

export function roleForUser(user: AuthenticatedUser): Exclude<Role, "particular"> {
  if (user.rol_global === "administrador") return "administrador";
  if (user.memberships.some((membership) => membership.rol_grupo === "coordinador")) {
    return "coordinador";
  }
  return "identificado";
}

export function landingPathForUser(user: AuthenticatedUser) {
  const role = roleForUser(user);
  return role === "administrador" ? "/admin" : role === "coordinador" ? "/coordinador" : "/espacio";
}

export function headerUserForUser(user: AuthenticatedUser): SessionUser {
  const role = roleForUser(user);
  const roleLabel =
    role === "administrador"
      ? "Administrador"
      : role === "coordinador"
        ? "Coordinador"
        : "Usuario identificado";
  const initials = user.nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es") ?? "")
    .join("");
  return { name: user.nombre, roleLabel, initials };
}

export async function requireAreaAccess(
  area: Exclude<Role, "particular">,
): Promise<AuthenticatedUser> {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");

  const allowed =
    area === "identificado" ||
    (area === "coordinador" &&
      user.rol_global === "usuario" &&
      user.memberships.some((membership) => membership.rol_grupo === "coordinador")) ||
    (area === "administrador" && user.rol_global === "administrador");
  if (!allowed) redirect(landingPathForUser(user));
  return user;
}
