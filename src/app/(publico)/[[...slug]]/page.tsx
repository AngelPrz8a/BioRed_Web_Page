import { notFound, redirect } from "next/navigation";
import {
  PasswordRecoveryConfirmationPage,
  PasswordRecoveryPage,
  RegistrationPage,
  SignInPage,
} from "@/components/auth/AuthPages";
import { ExplorePage, PublicGroupsPage } from "@/components/explore/PublicPages";
import { PrivacyPage } from "@/components/legal/PrivacyPage";
import {
  PublicModuleDetailPage,
  PublicModulesPage,
  PublicReadingsPage,
} from "@/components/catalog/PublicCatalogPages";
import { GroupDetailPage } from "@/components/groups/GroupPages";
import { getSessionUser, landingPathForUser, roleForUser } from "@/lib/server/authorization";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ sensor?: string; grupo?: string; modulo?: string }>;
}) {
  const { slug = [] } = await params;
  const path = `/${slug.join("/")}`;
  const query = await searchParams;
  const user = await getSessionUser();

  if (user) {
    const role = roleForUser(user);
    const base = role === "identificado" ? "/espacio" : `/${role === "administrador" ? "admin" : role}`;
    if (path === "/") redirect(landingPathForUser(user));
    if (path === "/ingresar" || path === "/registro") redirect(landingPathForUser(user));
    if (path === "/grupos") redirect(`${base}/explorar-grupos`);
    const groupMatch = /^\/grupos\/(\d+)$/.exec(path);
    if (groupMatch) {
      const groupBase = role === "coordinador" ? `${base}/explorar-grupos` : `${base}/grupos`;
      redirect(`${groupBase}/${groupMatch[1]}`);
    }
    if (path === "/modulos") redirect(`${base}/explorar-modulos`);
    const moduleMatch = /^\/modulos\/(\d+)$/.exec(path);
    if (moduleMatch) redirect(`${base}/explorar-modulos/${moduleMatch[1]}`);
    if (path === "/lecturas") redirect(`${base}/lecturas`);
  }

  if (path === "/") return <ExplorePage />;
  if (path === "/grupos") return <PublicGroupsPage />;
  if (/^\/grupos\/\d+$/.test(path)) {
    return <GroupDetailPage groupId={Number(slug[1])} role="particular" />;
  }
  if (path === "/modulos") return <PublicModulesPage searchParams={query} />;
  if (path === "/lecturas") return <PublicReadingsPage searchParams={query} />;
  if (/^\/modulos\/\d+$/.test(path)) {
    return <PublicModuleDetailPage moduleId={slug[1]} />;
  }
  if (path === "/recuperar-contrasena") return <PasswordRecoveryPage />;
  if (path === "/recuperar-contrasena/confirmacion") {
    return <PasswordRecoveryConfirmationPage />;
  }
  if (path === "/registro") return <RegistrationPage />;
  if (path === "/ingresar") return <SignInPage />;
  if (path === "/privacidad") return <PrivacyPage />;

  notFound();
}
