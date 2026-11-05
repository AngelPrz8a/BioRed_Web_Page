import {
  AdminAuditPage,
  AdminCatalogsPage,
  AdminModulesPage,
  AdminOverviewPage,
  AdminRequestsPage,
  AdminUsersPage,
  type AdminGroup,
  type AdminMembership,
  type AdminModule,
  type AdminRequest,
  type AdminSensor,
  type AdminUser,
} from "@/components/workspace/AdminPages";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import {
  AdminCreateGroupPage,
  GroupDetailPage,
  GroupDirectoryPage,
} from "@/components/groups/GroupPages";
import {
  PublicModuleDetailPage,
  PublicModulesPage,
  PublicReadingsPage,
} from "@/components/catalog/PublicCatalogPages";
import { AuthorizedModulePage } from "@/components/workspace/PersonalPages";
import {
  listGovernanceRequests,
  getGroupDetailForUser,
  getPublicCatalogData,
  listGovernanceMemberships,
  listGovernanceUsers,
  listGroupsForUser,
} from "@/lib/server/auth-store";
import { requireAreaAccess } from "@/lib/server/authorization";
import { titleForPath } from "@/lib/titles";

async function governanceData() {
  const actor = await requireAreaAccess("administrador");
  const [users, memberships, groups] = await Promise.all([
    listGovernanceUsers(),
    listGovernanceMemberships(),
    listGroupsForUser(actor, "all"),
  ]);
  const requests = await listGovernanceRequests();
  return {
    users: users as AdminUser[],
    memberships: memberships as AdminMembership[],
    groups: groups as AdminGroup[],
    requests: requests as AdminRequest[],
  };
}

async function moduleInventory() {
  const actor = await requireAreaAccess("administrador");
  const [groups, publicData] = await Promise.all([
    listGroupsForUser(actor, "all"),
    getPublicCatalogData(),
  ]);
  const details = await Promise.all(
    groups.map((group) => getGroupDetailForUser(group.id_grupo, actor)),
  );
  const modules: AdminModule[] = details.flatMap((detail) =>
    detail.modules.map((module) => ({
      id_modulo: module.id_modulo,
      grupo: detail.group.nombre,
      visibilidad: module.visibilidad,
      sensores: module.sensors,
    })),
  );
  const groupedModuleIds = new Set(modules.map((module) => module.id_modulo));
  for (const module of publicData.modules) {
    if (module.id_grupo !== null || groupedModuleIds.has(module.id_modulo)) continue;
    modules.push({
      id_modulo: module.id_modulo,
      grupo: "Sin grupo",
      visibilidad: module.visibilidad,
      sensores: publicData.sensors
        .filter((sensor) => sensor.id_modulo === module.id_modulo)
        .map((sensor) => sensor.tipo),
    });
  }
  return { modules, sensors: publicData.sensors as AdminSensor[] };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ sensor?: string; grupo?: string; modulo?: string }>;
}) {
  const { slug = [] } = await params;
  const path = `/admin${slug.length ? "/" + slug.join("/") : ""}`;
  const query = await searchParams;
  const moduleBase = "/admin/explorar-modulos";

  if (path === "/admin" || path === "/admin/resumen") {
    const data = await governanceData();
    return <AdminOverviewPage {...data} />;
  }
  if (path === "/admin/usuarios") {
    const data = await governanceData();
    return <AdminUsersPage users={data.users} memberships={data.memberships} groups={data.groups} />;
  }
  if (path === "/admin/auditoria") {
    const data = await governanceData();
    return <AdminAuditPage users={data.users} groups={data.groups} memberships={data.memberships} />;
  }
  if (path === "/admin/solicitudes") {
    const data = await governanceData();
    return <AdminRequestsPage requests={data.requests} />;
  }
  if (path === "/admin/modulos") {
    const data = await moduleInventory();
    return <AdminModulesPage modules={data.modules} />;
  }
  if (/^\/admin\/modulos\/privados\/\d+$/.test(path)) {
    return <AuthorizedModulePage moduleId={Number(slug.at(-1))} role="administrador" />;
  }
  if (path === "/admin/catalogos") {
    const data = await moduleInventory();
    return <AdminCatalogsPage sensors={data.sensors} />;
  }
  if (path === "/admin/explorar-grupos") {
    return <GroupDirectoryPage role="administrador" scope="public" />;
  }
  if (path === "/admin/grupos") {
    return <GroupDirectoryPage role="administrador" scope="all" />;
  }
  if (path === "/admin/grupos/nuevo") {
    return <AdminCreateGroupPage />;
  }
  if (/^\/admin\/grupos\/\d+$/.test(path)) {
    return <GroupDetailPage groupId={Number(slug[1])} role="administrador" />;
  }
  if (path === moduleBase) return <PublicModulesPage action={moduleBase} searchParams={query} />;
  if (path === "/admin/lecturas") {
    return <PublicReadingsPage action="/admin/lecturas" searchParams={query} />;
  }
  if (/^\/admin\/explorar-modulos\/\d+$/.test(path)) {
    return <PublicModuleDetailPage moduleId={slug[1]} moduleAction={moduleBase} />;
  }

  return <PlaceholderPage title={titleForPath("administrador", path)} path={path} />;
}
