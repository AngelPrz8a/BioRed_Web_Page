import { notFound } from "next/navigation";
import {
  GroupDetailPage,
  GroupDirectoryPage,
} from "@/components/groups/GroupPages";
import {
  PublicModuleDetailPage,
  PublicModulesPage,
  PublicReadingsPage,
} from "@/components/catalog/PublicCatalogPages";
import {
  AddOwnModulePage,
  AuthorizedModulePage,
  CreateGroupPage,
  GroupActivationPage,
  ModuleAccessPage,
  MyModulesPage,
  MyGroupsPage,
  MyRequestsPage,
  MyVisualizationsPage,
  PrivateGroupJoinPage,
  ProfilePage,
  VisualizationEditorPage,
  WorkspaceHomePage,
} from "@/components/workspace/PersonalPages";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ sensor?: string; grupo?: string; modulo?: string }>;
}) {
  const { slug = [] } = await params;
  const path = `/espacio${slug.length ? "/" + slug.join("/") : ""}`;
  const query = await searchParams;
  const moduleBase = "/espacio/explorar-modulos";

  if (path === "/espacio" || path === "/espacio/resumen") {
    return <WorkspaceHomePage />;
  }
  if (path === "/espacio/explorar-grupos") {
    return <GroupDirectoryPage role="identificado" scope="public" />;
  }
  if (path === "/espacio/grupos") {
    return <MyGroupsPage />;
  }
  if (/^\/espacio\/grupos\/\d+$/.test(path)) {
    return <GroupDetailPage groupId={Number(slug[1])} role="identificado" />;
  }
  if (path === "/espacio/grupos/nuevo" || path === "/espacio/grupos/crear") {
    return <CreateGroupPage />;
  }
  if (
    /^\/espacio\/grupos\/\d+\/(?:solicitar-ingreso|unirse)$/.test(path) ||
    /^\/espacio\/solicitudes\/grupo\/\d+$/.test(path)
  ) {
    return <PrivateGroupJoinPage groupId={Number(slug.at(-1))} />;
  }
  if (path === moduleBase) return <PublicModulesPage action={moduleBase} searchParams={query} />;
  if (path === "/espacio/lecturas") {
    return <PublicReadingsPage action="/espacio/lecturas" searchParams={query} />;
  }
  if (/^\/espacio\/explorar-modulos\/\d+$/.test(path)) {
    return <PublicModuleDetailPage moduleId={slug[1]} moduleAction={moduleBase} />;
  }
  if (path === "/espacio/modulos") return <MyModulesPage />;
  if (/^\/espacio\/modulos\/privados\/\d+$/.test(path)) {
    return <AuthorizedModulePage moduleId={Number(slug.at(-1))} />;
  }
  if (path === "/espacio/modulos/nuevo" || path === "/espacio/modulos/agregar") {
    return <AddOwnModulePage />;
  }
  if (path === "/espacio/modulos/accesos" || path === "/espacio/modulos/solicitudes") {
    return <ModuleAccessPage />;
  }
  if (/^\/espacio\/solicitudes\/modulo\/\d+$/.test(path)) {
    return <ModuleAccessPage moduleId={Number(slug.at(-1))} />;
  }
  if (path === "/espacio/visualizaciones") return <MyVisualizationsPage />;
  if (
    path === "/espacio/visualizaciones/nueva" ||
    path === "/espacio/visualizaciones/editar" ||
    /^\/espacio\/visualizaciones\/\d+$/.test(path)
  ) {
    return <VisualizationEditorPage />;
  }
  if (path === "/espacio/solicitudes") return <MyRequestsPage />;
  if (
    path === "/espacio/solicitudes/habilitacion" ||
    path === "/espacio/solicitudes/crear-grupo" ||
    path === "/espacio/habilitacion"
  ) {
    return <GroupActivationPage />;
  }
  if (path === "/espacio/solicitudes/acceso-modulo") {
    return <ModuleAccessPage />;
  }
  if (path === "/espacio/cuenta" || path === "/espacio/perfil") return <ProfilePage />;

  notFound();
}
