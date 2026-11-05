import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import {
  CoordinatorGroupSelectorPage,
  CoordinatorGroupWorkspacePage,
  CoordinatorManagedGroupDetailPage,
  CoordinatorOverviewPage,
  CoordinatorPersonalModulesPage,
  CoordinatorPersonalRequestsPage,
  CoordinatorVisualizationsPage,
} from "@/components/workspace/CoordinatorPages";
import { AuthorizedModulePage } from "@/components/workspace/PersonalPages";
import {
  GroupDetailPage,
  GroupDirectoryPage,
} from "@/components/groups/GroupPages";
import {
  PublicModuleDetailPage,
  PublicModulesPage,
  PublicReadingsPage,
} from "@/components/catalog/PublicCatalogPages";
import { titleForPath } from "@/lib/titles";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ sensor?: string; grupo?: string; modulo?: string }>;
}) {
  const { slug = [] } = await params;
  const path = `/coordinador${slug.length ? "/" + slug.join("/") : ""}`;
  const query = await searchParams;
  const moduleBase = "/coordinador/explorar-modulos";

  if (path === "/coordinador" || path === "/coordinador/resumen") {
    return <CoordinatorOverviewPage groupId={query.grupo} />;
  }
  if (path === "/coordinador/explorar-grupos") {
    return <GroupDirectoryPage role="coordinador" scope="public" />;
  }
  if (path === "/coordinador/grupos") {
    return <CoordinatorGroupSelectorPage />;
  }
  if (/^\/coordinador\/grupos\/\d+$/.test(path)) {
    return <CoordinatorManagedGroupDetailPage groupId={Number(slug[1])} />;
  }
  if (/^\/coordinador\/explorar-grupos\/\d+$/.test(path)) {
    return <GroupDetailPage groupId={Number(slug[1])} role="coordinador" />;
  }
  if (path === "/coordinador/grupo/resumen") {
    return <CoordinatorOverviewPage groupId={query.grupo} />;
  }
  if (path === "/coordinador/grupo/modulos") {
    return <CoordinatorGroupWorkspacePage section="modules" groupId={query.grupo} />;
  }
  if (path === "/coordinador/grupo/miembros") {
    return <CoordinatorGroupWorkspacePage section="members" groupId={query.grupo} />;
  }
  if (
    path === "/coordinador/grupo/solicitudes" ||
    path === "/coordinador/grupo/accesos"
  ) {
    return <CoordinatorGroupWorkspacePage section="requests" groupId={query.grupo} />;
  }
  if (path === "/coordinador/grupo/configuracion") {
    return <CoordinatorGroupWorkspacePage section="settings" groupId={query.grupo} />;
  }
  if (path === "/coordinador/grupo/cambios") {
    return <CoordinatorGroupWorkspacePage section="changes" groupId={query.grupo} />;
  }
  if (path === "/coordinador/modulos") {
    return <CoordinatorPersonalModulesPage />;
  }
  if (/^\/coordinador\/modulos\/privados\/\d+$/.test(path)) {
    return <AuthorizedModulePage moduleId={Number(slug.at(-1))} role="coordinador" />;
  }
  if (path === "/coordinador/visualizaciones") {
    return <CoordinatorVisualizationsPage />;
  }
  if (path === "/coordinador/solicitudes") {
    return <CoordinatorPersonalRequestsPage />;
  }
  if (path === moduleBase) return <PublicModulesPage action={moduleBase} searchParams={query} />;
  if (path === "/coordinador/lecturas") {
    return <PublicReadingsPage action="/coordinador/lecturas" searchParams={query} />;
  }
  if (/^\/coordinador\/explorar-modulos\/\d+$/.test(path)) {
    return <PublicModuleDetailPage moduleId={slug[1]} moduleAction={moduleBase} />;
  }

  return <PlaceholderPage title={titleForPath("coordinador", path)} path={path} />;
}
